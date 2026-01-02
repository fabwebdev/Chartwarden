/**
 * Socket.IO Service
 *
 * Provides real-time bidirectional communication with Socket.IO integration.
 * Handles connection lifecycle, authentication, rooms, and event broadcasting.
 *
 * Features:
 * - Connection state tracking (socket ID to user session mapping)
 * - Authentication middleware using Better Auth sessions
 * - Namespace/room architecture for channel isolation
 * - Event handlers with acknowledgment support
 * - Heartbeat/timeout configuration
 * - Structured logging for observability
 * - HIPAA-compliant (no PHI in logs)
 *
 * @module SocketIO.service
 */

import { Server } from "socket.io";
import auth from "../config/betterAuth.js";
import { db } from "../config/db.drizzle.js";
import { users, user_has_roles, roles, sessions, chat_messages, chat_participants, user_presence } from "../db/schemas/index.js";
import { eq, and } from "drizzle-orm";
import { ROLES, ROLE_PERMISSIONS } from "../config/rbac.js";
import { info, warn, error, debug } from "../utils/logger.js";
import { nanoid } from "nanoid";
import DOMPurify from "isomorphic-dompurify";

// Connection state tracking
const connectionState = new Map(); // socketId -> { userId, user, connectedAt, rooms, lastActivity }
const userConnections = new Map(); // userId -> Set<socketId>

// Metrics tracking
let metrics = {
  totalConnections: 0,
  activeConnections: 0,
  authFailures: 0,
  totalMessages: 0,
  reconnections: 0,
};

/**
 * Socket.IO Service singleton
 */
class SocketIOService {
  constructor() {
    this.io = null;
    this.server = null;
    this.isInitialized = false;
  }

  /**
   * Initialize Socket.IO with Fastify server
   * @param {object} fastifyServer - Fastify's underlying HTTP server
   * @param {object} options - Configuration options
   * @returns {Server} Socket.IO server instance
   */
  initialize(fastifyServer, options = {}) {
    if (this.isInitialized) {
      warn("Socket.IO already initialized, returning existing instance");
      return this.io;
    }

    this.server = fastifyServer;

    // Build CORS origins from environment or defaults
    const allowedOrigins = options.corsOrigins ||
      (process.env.CORS_ORIGIN
        ? process.env.CORS_ORIGIN.split(",").map(o => o.trim())
        : ["http://localhost:3000", "http://localhost:3001"]);

    // Socket.IO configuration
    const ioConfig = {
      cors: {
        origin: allowedOrigins,
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        credentials: true,
        allowedHeaders: ["Content-Type", "Authorization", "X-CSRF-TOKEN"],
      },
      // Connection settings
      pingInterval: options.pingInterval || 25000, // 25 seconds
      pingTimeout: options.pingTimeout || 20000,   // 20 seconds
      connectTimeout: options.connectTimeout || 45000, // 45 seconds
      // Transport configuration
      transports: ["websocket", "polling"],
      // Allow upgrades from polling to websocket
      allowUpgrades: true,
      // Compression
      perMessageDeflate: {
        threshold: 1024, // Only compress messages > 1KB
      },
      // Path for Socket.IO
      path: options.path || "/socket.io",
      // Adapter for horizontal scaling (can be configured for Redis)
      // adapter: options.adapter || undefined,
    };

    // Create Socket.IO server
    this.io = new Server(fastifyServer, ioConfig);

    // Apply authentication middleware
    this.io.use(this.authenticationMiddleware.bind(this));

    // Setup main namespace handlers
    this.setupMainNamespace();

    // Setup specialized namespaces
    this.setupNotificationsNamespace();
    this.setupChatNamespace();
    this.setupUpdatesNamespace();

    this.isInitialized = true;

    info("Socket.IO initialized successfully", {
      origins: allowedOrigins.length,
      pingInterval: ioConfig.pingInterval,
      pingTimeout: ioConfig.pingTimeout,
      transports: ioConfig.transports,
    });

    return this.io;
  }

  /**
   * Authentication middleware for Socket.IO connections
   * Validates Better Auth session from cookies
   */
  async authenticationMiddleware(socket, next) {
    try {
      // Extract session token from cookies in handshake
      const cookies = socket.handshake.headers.cookie;
      const sessionToken = this.extractSessionToken(cookies);

      if (!sessionToken) {
        debug("Socket auth failed: No session token", { socketId: socket.id });
        metrics.authFailures++;
        return next(new Error("Authentication required: No session token"));
      }

      // Validate session with Better Auth
      const session = await this.validateSession(sessionToken, socket.handshake.headers);

      if (!session) {
        debug("Socket auth failed: Invalid session", { socketId: socket.id });
        metrics.authFailures++;
        return next(new Error("Authentication failed: Invalid or expired session"));
      }

      // Load full user profile with role and permissions
      const userProfile = await this.loadUserProfile(session.user);

      // Attach user data to socket
      socket.user = userProfile;
      socket.sessionId = session.session?.id;
      socket.authenticated = true;

      debug("Socket authenticated", {
        socketId: socket.id,
        userId: userProfile.id,
        role: userProfile.role,
      });

      next();
    } catch (err) {
      error("Socket authentication error", {
        socketId: socket.id,
        error: err.message,
      });
      metrics.authFailures++;
      next(new Error("Authentication error: " + err.message));
    }
  }

  /**
   * Extract session token from cookie string
   */
  extractSessionToken(cookieString) {
    if (!cookieString) return null;

    const cookies = cookieString.split(";").reduce((acc, cookie) => {
      const [key, ...valueParts] = cookie.trim().split("=");
      acc[key] = valueParts.join("=");
      return acc;
    }, {});

    return cookies["better-auth.session_token"];
  }

  /**
   * Validate session token with Better Auth
   */
  async validateSession(sessionToken, headers) {
    try {
      // Build headers object for Better Auth
      const authHeaders = new Headers();
      Object.entries(headers).forEach(([key, value]) => {
        if (value) authHeaders.set(key, value);
      });

      // Create cookies object
      const cookies = {
        "better-auth.session_token": sessionToken,
      };

      // Get session from Better Auth
      const session = await auth.api.getSession({
        headers: authHeaders,
        cookies: cookies,
      });

      return session;
    } catch (err) {
      error("Session validation error", { error: err.message });
      return null;
    }
  }

  /**
   * Load full user profile with role and permissions
   */
  async loadUserProfile(user) {
    const profile = {
      id: user.id,
      email: user.email,
      firstName: null,
      lastName: null,
      role: ROLES.PATIENT,
      permissions: [],
    };

    try {
      // Get user details
      const dbUser = await db
        .select()
        .from(users)
        .where(eq(users.id, user.id))
        .limit(1);

      if (dbUser.length > 0) {
        profile.firstName = dbUser[0].firstName;
        profile.lastName = dbUser[0].lastName;
        profile.email = dbUser[0].email;
      }

      // Get user role
      const userRoles = await db
        .select()
        .from(user_has_roles)
        .where(eq(user_has_roles.user_id, user.id))
        .limit(1);

      if (userRoles.length > 0) {
        const roleRecords = await db
          .select()
          .from(roles)
          .where(eq(roles.id, userRoles[0].role_id))
          .limit(1);

        if (roleRecords.length > 0) {
          profile.role = roleRecords[0].name;
        }
      }

      // Get permissions for role
      profile.permissions = ROLE_PERMISSIONS[profile.role] || [];
    } catch (err) {
      error("Error loading user profile for socket", { error: err.message });
    }

    return profile;
  }

  /**
   * Setup main namespace connection handlers
   */
  setupMainNamespace() {
    this.io.on("connection", (socket) => {
      this.handleConnection(socket);

      // Event handlers
      socket.on("disconnect", (reason) => this.handleDisconnect(socket, reason));
      socket.on("error", (err) => this.handleError(socket, err));

      // Ping/pong for heartbeat
      socket.on("ping", (callback) => {
        if (typeof callback === "function") {
          callback({ timestamp: Date.now(), status: "pong" });
        }
      });

      // Join room
      socket.on("join:room", (roomName, callback) => {
        this.handleJoinRoom(socket, roomName, callback);
      });

      // Leave room
      socket.on("leave:room", (roomName, callback) => {
        this.handleLeaveRoom(socket, roomName, callback);
      });

      // Generic message handler
      socket.on("message", (data, callback) => {
        this.handleMessage(socket, data, callback);
      });
    });
  }

  /**
   * Setup /notifications namespace
   */
  setupNotificationsNamespace() {
    const notificationsNs = this.io.of("/notifications");

    notificationsNs.use(this.authenticationMiddleware.bind(this));

    notificationsNs.on("connection", (socket) => {
      debug("Notifications namespace connection", {
        socketId: socket.id,
        userId: socket.user?.id,
      });

      // Auto-join user's notification room
      const userRoom = `user:${socket.user.id}`;
      socket.join(userRoom);

      // Also join role-based room
      if (socket.user.role) {
        socket.join(`role:${socket.user.role}`);
      }

      socket.on("subscribe", (channels, callback) => {
        this.handleNotificationSubscribe(socket, channels, callback);
      });

      socket.on("unsubscribe", (channels, callback) => {
        this.handleNotificationUnsubscribe(socket, channels, callback);
      });

      socket.on("mark:read", (notificationIds, callback) => {
        this.handleMarkNotificationsRead(socket, notificationIds, callback);
      });

      socket.on("disconnect", () => {
        debug("Notifications namespace disconnect", {
          socketId: socket.id,
          userId: socket.user?.id,
        });
      });
    });
  }

  /**
   * Setup /chat namespace
   */
  setupChatNamespace() {
    const chatNs = this.io.of("/chat");

    chatNs.use(this.authenticationMiddleware.bind(this));

    chatNs.on("connection", (socket) => {
      debug("Chat namespace connection", {
        socketId: socket.id,
        userId: socket.user?.id,
      });

      socket.on("join:conversation", (conversationId, callback) => {
        this.handleJoinConversation(socket, conversationId, callback);
      });

      socket.on("leave:conversation", (conversationId, callback) => {
        this.handleLeaveConversation(socket, conversationId, callback);
      });

      socket.on("send:message", (data, callback) => {
        this.handleChatMessage(socket, data, callback);
      });

      socket.on("typing:start", async (conversationId) => {
        try {
          // Update presence to track typing
          await db
            .update(user_presence)
            .set({
              typing_in_room_id: conversationId,
              last_active_at: new Date(),
              updated_at: new Date()
            })
            .where(eq(user_presence.user_id, socket.user.id));

          socket.to(`conversation:${conversationId}`).emit("user:typing", {
            userId: socket.user.id,
            userName: `${socket.user.firstName || ""} ${socket.user.lastName || ""}`.trim(),
            conversationId,
          });
        } catch (err) {
          error("Error updating typing status", { error: err.message });
        }
      });

      socket.on("typing:stop", async (conversationId) => {
        try {
          // Clear typing status
          await db
            .update(user_presence)
            .set({
              typing_in_room_id: null,
              last_active_at: new Date(),
              updated_at: new Date()
            })
            .where(eq(user_presence.user_id, socket.user.id));

          socket.to(`conversation:${conversationId}`).emit("user:stopped_typing", {
            userId: socket.user.id,
            conversationId,
          });
        } catch (err) {
          error("Error clearing typing status", { error: err.message });
        }
      });

      socket.on("disconnect", () => {
        debug("Chat namespace disconnect", {
          socketId: socket.id,
          userId: socket.user?.id,
        });
      });
    });
  }

  /**
   * Setup /updates namespace for live data updates
   */
  setupUpdatesNamespace() {
    const updatesNs = this.io.of("/updates");

    updatesNs.use(this.authenticationMiddleware.bind(this));

    updatesNs.on("connection", (socket) => {
      debug("Updates namespace connection", {
        socketId: socket.id,
        userId: socket.user?.id,
      });

      // Subscribe to patient updates (requires permission)
      socket.on("subscribe:patient", (patientId, callback) => {
        this.handlePatientSubscribe(socket, patientId, callback);
      });

      // Subscribe to encounter updates
      socket.on("subscribe:encounter", (encounterId, callback) => {
        this.handleEncounterSubscribe(socket, encounterId, callback);
      });

      // Unsubscribe from updates
      socket.on("unsubscribe", (resourceType, resourceId, callback) => {
        const room = `${resourceType}:${resourceId}`;
        socket.leave(room);
        if (typeof callback === "function") {
          callback({ success: true, room });
        }
      });

      socket.on("disconnect", () => {
        debug("Updates namespace disconnect", {
          socketId: socket.id,
          userId: socket.user?.id,
        });
      });
    });
  }

  /**
   * Handle new connection
   */
  async handleConnection(socket) {
    metrics.totalConnections++;
    metrics.activeConnections++;

    const userId = socket.user?.id;
    const connectionInfo = {
      userId,
      user: socket.user,
      connectedAt: new Date(),
      rooms: new Set(),
      lastActivity: new Date(),
    };

    // Track connection
    connectionState.set(socket.id, connectionInfo);

    // Track user connections (for targeting specific users)
    if (userId) {
      if (!userConnections.has(userId)) {
        userConnections.set(userId, new Set());
      }
      userConnections.get(userId).add(socket.id);

      // Update or create user presence
      try {
        await db
          .insert(user_presence)
          .values({
            id: nanoid(),
            user_id: userId,
            status: 'online',
            socket_id: socket.id,
            is_connected: true,
            last_seen_at: new Date(),
            last_active_at: new Date(),
            user_agent: socket.handshake.headers['user-agent'] || null,
            ip_address: socket.handshake.address || null
          })
          .onConflictDoUpdate({
            target: user_presence.user_id,
            set: {
              status: 'online',
              socket_id: socket.id,
              is_connected: true,
              last_seen_at: new Date(),
              last_active_at: new Date(),
              user_agent: socket.handshake.headers['user-agent'] || null,
              ip_address: socket.handshake.address || null,
              updated_at: new Date()
            }
          });
      } catch (err) {
        error("Error updating user presence on connection", { error: err.message, userId });
      }
    }

    info("Socket connected", {
      socketId: socket.id,
      userId,
      role: socket.user?.role,
      activeConnections: metrics.activeConnections,
    });

    // Send welcome event
    socket.emit("connected", {
      socketId: socket.id,
      userId,
      timestamp: Date.now(),
      serverTime: new Date().toISOString(),
    });
  }

  /**
   * Handle disconnection
   */
  async handleDisconnect(socket, reason) {
    metrics.activeConnections = Math.max(0, metrics.activeConnections - 1);

    const connectionInfo = connectionState.get(socket.id);
    const userId = connectionInfo?.userId;

    // Clean up connection state
    connectionState.delete(socket.id);

    // Clean up user connections and update presence
    if (userId && userConnections.has(userId)) {
      userConnections.get(userId).delete(socket.id);

      // If user has no more active connections, mark as offline
      if (userConnections.get(userId).size === 0) {
        userConnections.delete(userId);

        try {
          await db
            .update(user_presence)
            .set({
              status: 'offline',
              is_connected: false,
              socket_id: null,
              typing_in_room_id: null,
              last_seen_at: new Date(),
              updated_at: new Date()
            })
            .where(eq(user_presence.user_id, userId));
        } catch (err) {
          error("Error updating user presence on disconnect", { error: err.message, userId });
        }
      }
    }

    info("Socket disconnected", {
      socketId: socket.id,
      userId,
      reason,
      duration: connectionInfo ? Date.now() - connectionInfo.connectedAt.getTime() : 0,
      activeConnections: metrics.activeConnections,
    });
  }

  /**
   * Handle socket errors
   */
  handleError(socket, err) {
    error("Socket error", {
      socketId: socket.id,
      userId: socket.user?.id,
      error: err.message,
    });
  }

  /**
   * Handle room join
   */
  handleJoinRoom(socket, roomName, callback) {
    try {
      // Validate room name
      if (!roomName || typeof roomName !== "string") {
        throw new Error("Invalid room name");
      }

      // Check authorization for room (basic check - extend as needed)
      if (!this.canJoinRoom(socket.user, roomName)) {
        throw new Error("Not authorized to join this room");
      }

      socket.join(roomName);

      // Track room membership
      const connectionInfo = connectionState.get(socket.id);
      if (connectionInfo) {
        connectionInfo.rooms.add(roomName);
        connectionInfo.lastActivity = new Date();
      }

      debug("Socket joined room", {
        socketId: socket.id,
        userId: socket.user?.id,
        room: roomName,
      });

      if (typeof callback === "function") {
        callback({ success: true, room: roomName });
      }
    } catch (err) {
      error("Error joining room", {
        socketId: socket.id,
        room: roomName,
        error: err.message,
      });

      if (typeof callback === "function") {
        callback({ success: false, error: err.message });
      }
    }
  }

  /**
   * Handle room leave
   */
  handleLeaveRoom(socket, roomName, callback) {
    try {
      socket.leave(roomName);

      // Track room membership
      const connectionInfo = connectionState.get(socket.id);
      if (connectionInfo) {
        connectionInfo.rooms.delete(roomName);
        connectionInfo.lastActivity = new Date();
      }

      debug("Socket left room", {
        socketId: socket.id,
        userId: socket.user?.id,
        room: roomName,
      });

      if (typeof callback === "function") {
        callback({ success: true, room: roomName });
      }
    } catch (err) {
      error("Error leaving room", {
        socketId: socket.id,
        room: roomName,
        error: err.message,
      });

      if (typeof callback === "function") {
        callback({ success: false, error: err.message });
      }
    }
  }

  /**
   * Handle generic message
   */
  handleMessage(socket, data, callback) {
    metrics.totalMessages++;

    const connectionInfo = connectionState.get(socket.id);
    if (connectionInfo) {
      connectionInfo.lastActivity = new Date();
    }

    debug("Message received", {
      socketId: socket.id,
      userId: socket.user?.id,
      type: data?.type,
    });

    // Validate message data
    if (!data || typeof data !== "object") {
      if (typeof callback === "function") {
        callback({ success: false, error: "Invalid message format" });
      }
      return;
    }

    // Process message based on type
    const response = {
      success: true,
      messageId: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      receivedAt: Date.now(),
    };

    if (typeof callback === "function") {
      callback(response);
    }
  }

  /**
   * Handle notification subscription
   */
  handleNotificationSubscribe(socket, channels, callback) {
    try {
      const subscribedChannels = [];

      if (Array.isArray(channels)) {
        channels.forEach((channel) => {
          if (this.canSubscribeToChannel(socket.user, channel)) {
            socket.join(`notification:${channel}`);
            subscribedChannels.push(channel);
          }
        });
      } else if (typeof channels === "string") {
        if (this.canSubscribeToChannel(socket.user, channels)) {
          socket.join(`notification:${channels}`);
          subscribedChannels.push(channels);
        }
      }

      debug("Notification subscription", {
        socketId: socket.id,
        userId: socket.user?.id,
        channels: subscribedChannels,
      });

      if (typeof callback === "function") {
        callback({ success: true, subscribedChannels });
      }
    } catch (err) {
      if (typeof callback === "function") {
        callback({ success: false, error: err.message });
      }
    }
  }

  /**
   * Handle notification unsubscription
   */
  handleNotificationUnsubscribe(socket, channels, callback) {
    try {
      const unsubscribedChannels = [];

      if (Array.isArray(channels)) {
        channels.forEach((channel) => {
          socket.leave(`notification:${channel}`);
          unsubscribedChannels.push(channel);
        });
      } else if (typeof channels === "string") {
        socket.leave(`notification:${channels}`);
        unsubscribedChannels.push(channels);
      }

      if (typeof callback === "function") {
        callback({ success: true, unsubscribedChannels });
      }
    } catch (err) {
      if (typeof callback === "function") {
        callback({ success: false, error: err.message });
      }
    }
  }

  /**
   * Handle mark notifications as read
   */
  handleMarkNotificationsRead(socket, notificationIds, callback) {
    // This would typically interact with a notification service
    debug("Mark notifications read", {
      socketId: socket.id,
      userId: socket.user?.id,
      count: Array.isArray(notificationIds) ? notificationIds.length : 1,
    });

    if (typeof callback === "function") {
      callback({ success: true, markedIds: notificationIds });
    }
  }

  /**
   * Handle joining a chat conversation
   */
  async handleJoinConversation(socket, conversationId, callback) {
    try {
      // Validate user has access to this conversation
      const participation = await db
        .select()
        .from(chat_participants)
        .where(
          and(
            eq(chat_participants.room_id, conversationId),
            eq(chat_participants.user_id, socket.user.id),
            eq(chat_participants.is_active, true)
          )
        )
        .limit(1);

      if (participation.length === 0) {
        throw new Error("Not authorized to access this conversation");
      }

      const room = `conversation:${conversationId}`;
      socket.join(room);

      // Update user presence to indicate they're in this room
      await db
        .update(user_presence)
        .set({
          typing_in_room_id: null,
          last_active_at: new Date(),
          updated_at: new Date()
        })
        .where(eq(user_presence.user_id, socket.user.id));

      debug("Joined conversation", {
        socketId: socket.id,
        userId: socket.user?.id,
        conversationId,
      });

      // Notify others in the conversation
      socket.to(room).emit("user:joined", {
        userId: socket.user.id,
        userName: `${socket.user.firstName || ""} ${socket.user.lastName || ""}`.trim(),
        timestamp: Date.now(),
      });

      if (typeof callback === "function") {
        callback({ success: true, conversationId });
      }
    } catch (err) {
      error("Error joining conversation", { error: err.message, conversationId });
      if (typeof callback === "function") {
        callback({ success: false, error: err.message });
      }
    }
  }

  /**
   * Handle leaving a chat conversation
   */
  handleLeaveConversation(socket, conversationId, callback) {
    try {
      const room = `conversation:${conversationId}`;
      socket.leave(room);

      // Notify others in the conversation
      socket.to(room).emit("user:left", {
        userId: socket.user.id,
        timestamp: Date.now(),
      });

      if (typeof callback === "function") {
        callback({ success: true, conversationId });
      }
    } catch (err) {
      if (typeof callback === "function") {
        callback({ success: false, error: err.message });
      }
    }
  }

  /**
   * Handle chat message with database persistence
   */
  async handleChatMessage(socket, data, callback) {
    try {
      const { conversationId, content, replyToId } = data;

      if (!conversationId || !content) {
        throw new Error("Missing required fields: conversationId and content");
      }

      // Validate user is participant
      const participation = await db
        .select()
        .from(chat_participants)
        .where(
          and(
            eq(chat_participants.room_id, conversationId),
            eq(chat_participants.user_id, socket.user.id),
            eq(chat_participants.is_active, true)
          )
        )
        .limit(1);

      if (participation.length === 0) {
        throw new Error("Not authorized to send messages to this room");
      }

      // Sanitize content to prevent XSS
      const sanitizedContent = DOMPurify.sanitize(content, {
        ALLOWED_TAGS: [],
        ALLOWED_ATTR: []
      });

      // Persist message to database
      const [message] = await db
        .insert(chat_messages)
        .values({
          id: nanoid(),
          room_id: conversationId,
          sender_id: socket.user.id,
          content: sanitizedContent,
          reply_to_id: replyToId || null,
          is_deleted: false
        })
        .returning();

      // Format message for broadcast
      const broadcastMessage = {
        id: message.id,
        room_id: message.room_id,
        sender_id: message.sender_id,
        senderName: `${socket.user.firstName || ""} ${socket.user.lastName || ""}`.trim(),
        content: message.content,
        reply_to_id: message.reply_to_id,
        is_edited: message.is_edited,
        is_deleted: message.is_deleted,
        created_at: message.created_at,
        updated_at: message.updated_at
      };

      // Broadcast to conversation room (including sender)
      this.io.of("/chat").to(`conversation:${conversationId}`).emit("new:message", broadcastMessage);

      // Clear typing indicator for sender
      await db
        .update(user_presence)
        .set({
          typing_in_room_id: null,
          last_active_at: new Date(),
          updated_at: new Date()
        })
        .where(eq(user_presence.user_id, socket.user.id));

      // Notify typing stopped
      socket.to(`conversation:${conversationId}`).emit("user:stopped_typing", {
        userId: socket.user.id,
        conversationId,
      });

      debug("Chat message persisted and sent", {
        messageId: message.id,
        conversationId,
        senderId: socket.user.id,
      });

      if (typeof callback === "function") {
        callback({ success: true, message: broadcastMessage });
      }
    } catch (err) {
      error("Error handling chat message", { error: err.message, conversationId: data.conversationId });
      if (typeof callback === "function") {
        callback({ success: false, error: err.message });
      }
    }
  }

  /**
   * Handle patient subscription
   */
  handlePatientSubscribe(socket, patientId, callback) {
    try {
      // Check permission
      if (!socket.user.permissions.includes("view:patient")) {
        throw new Error("Not authorized to subscribe to patient updates");
      }

      const room = `patient:${patientId}`;
      socket.join(room);

      debug("Subscribed to patient updates", {
        socketId: socket.id,
        userId: socket.user?.id,
        patientId,
      });

      if (typeof callback === "function") {
        callback({ success: true, patientId });
      }
    } catch (err) {
      if (typeof callback === "function") {
        callback({ success: false, error: err.message });
      }
    }
  }

  /**
   * Handle encounter subscription
   */
  handleEncounterSubscribe(socket, encounterId, callback) {
    try {
      // Check permission
      if (!socket.user.permissions.includes("view:clinical_notes")) {
        throw new Error("Not authorized to subscribe to encounter updates");
      }

      const room = `encounter:${encounterId}`;
      socket.join(room);

      debug("Subscribed to encounter updates", {
        socketId: socket.id,
        userId: socket.user?.id,
        encounterId,
      });

      if (typeof callback === "function") {
        callback({ success: true, encounterId });
      }
    } catch (err) {
      if (typeof callback === "function") {
        callback({ success: false, error: err.message });
      }
    }
  }

  /**
   * Check if user can join a room
   */
  canJoinRoom(user, roomName) {
    if (!user || !roomName) return false;

    // Admin can join any room
    if (user.role === ROLES.ADMIN) return true;

    // User can join their own user room
    if (roomName === `user:${user.id}`) return true;

    // User can join their role room
    if (roomName === `role:${user.role}`) return true;

    // Additional room authorization logic can be added here
    // For patient/encounter rooms, check permissions
    if (roomName.startsWith("patient:")) {
      return user.permissions.includes("view:patient");
    }

    if (roomName.startsWith("encounter:")) {
      return user.permissions.includes("view:clinical_notes");
    }

    return true; // Default allow for general rooms
  }

  /**
   * Check if user can subscribe to a notification channel
   */
  canSubscribeToChannel(user, channel) {
    if (!user || !channel) return false;

    // Admin can subscribe to any channel
    if (user.role === ROLES.ADMIN) return true;

    // Channel-specific authorization
    switch (channel) {
      case "system":
        return true; // All users can receive system notifications
      case "admin":
        return user.role === ROLES.ADMIN;
      case "clinical":
        return [ROLES.ADMIN, ROLES.DOCTOR, ROLES.NURSE].includes(user.role);
      case "billing":
        return [ROLES.ADMIN, ROLES.STAFF].includes(user.role);
      default:
        return true;
    }
  }

  // ============= PUBLIC API FOR BROADCASTING =============

  /**
   * Emit event to all connected clients
   * @param {string} event - Event name
   * @param {*} data - Event data
   */
  broadcast(event, data) {
    if (!this.io) {
      warn("Socket.IO not initialized, cannot broadcast");
      return;
    }
    this.io.emit(event, data);
  }

  /**
   * Emit event to a specific room
   * @param {string} room - Room name
   * @param {string} event - Event name
   * @param {*} data - Event data
   */
  toRoom(room, event, data) {
    if (!this.io) {
      warn("Socket.IO not initialized, cannot emit to room");
      return;
    }
    this.io.to(room).emit(event, data);
  }

  /**
   * Emit event to a specific user (all their connections)
   * @param {string} userId - User ID
   * @param {string} event - Event name
   * @param {*} data - Event data
   */
  toUser(userId, event, data) {
    if (!this.io) {
      warn("Socket.IO not initialized, cannot emit to user");
      return;
    }

    const socketIds = userConnections.get(userId);
    if (socketIds) {
      socketIds.forEach((socketId) => {
        this.io.to(socketId).emit(event, data);
      });
    }
  }

  /**
   * Emit notification to a user
   * @param {string} userId - User ID
   * @param {object} notification - Notification object
   */
  notifyUser(userId, notification) {
    const event = "notification";
    const data = {
      id: notification.id || `notif_${Date.now()}`,
      type: notification.type || "info",
      title: notification.title,
      message: notification.message,
      data: notification.data,
      timestamp: Date.now(),
    };

    // Send via /notifications namespace
    if (this.io) {
      this.io.of("/notifications").to(`user:${userId}`).emit(event, data);
    }
  }

  /**
   * Broadcast notification to a role
   * @param {string} role - Role name
   * @param {object} notification - Notification object
   */
  notifyRole(role, notification) {
    const event = "notification";
    const data = {
      id: notification.id || `notif_${Date.now()}`,
      type: notification.type || "info",
      title: notification.title,
      message: notification.message,
      data: notification.data,
      timestamp: Date.now(),
    };

    if (this.io) {
      this.io.of("/notifications").to(`role:${role}`).emit(event, data);
    }
  }

  /**
   * Emit patient update event
   * @param {string} patientId - Patient ID
   * @param {string} updateType - Type of update (e.g., 'vitals', 'medications', 'notes')
   * @param {object} data - Update data
   */
  emitPatientUpdate(patientId, updateType, data) {
    if (this.io) {
      this.io.of("/updates").to(`patient:${patientId}`).emit("patient:update", {
        patientId,
        updateType,
        data,
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Emit encounter update event
   * @param {string} encounterId - Encounter ID
   * @param {string} updateType - Type of update
   * @param {object} data - Update data
   */
  emitEncounterUpdate(encounterId, updateType, data) {
    if (this.io) {
      this.io.of("/updates").to(`encounter:${encounterId}`).emit("encounter:update", {
        encounterId,
        updateType,
        data,
        timestamp: Date.now(),
      });
    }
  }

  // ============= METRICS & MONITORING =============

  /**
   * Get current connection metrics
   * @returns {object} Metrics object
   */
  getMetrics() {
    return {
      ...metrics,
      connectedUsers: userConnections.size,
      timestamp: Date.now(),
    };
  }

  /**
   * Get all connected socket IDs for a user
   * @param {string} userId - User ID
   * @returns {string[]} Array of socket IDs
   */
  getUserSockets(userId) {
    const socketIds = userConnections.get(userId);
    return socketIds ? Array.from(socketIds) : [];
  }

  /**
   * Check if a user is currently connected
   * @param {string} userId - User ID
   * @returns {boolean} True if user has at least one connection
   */
  isUserConnected(userId) {
    return userConnections.has(userId) && userConnections.get(userId).size > 0;
  }

  /**
   * Get connection info for a socket
   * @param {string} socketId - Socket ID
   * @returns {object|null} Connection info
   */
  getConnectionInfo(socketId) {
    return connectionState.get(socketId) || null;
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    if (!this.io) return;

    info("Shutting down Socket.IO...", {
      activeConnections: metrics.activeConnections,
    });

    // Notify all clients
    this.broadcast("server:shutdown", {
      message: "Server is shutting down",
      timestamp: Date.now(),
    });

    // Close all connections
    const sockets = await this.io.fetchSockets();
    for (const socket of sockets) {
      socket.disconnect(true);
    }

    // Close the server
    this.io.close();
    this.io = null;
    this.isInitialized = false;

    // Clear state
    connectionState.clear();
    userConnections.clear();

    info("Socket.IO shutdown complete");
  }
}

// Export singleton instance
const socketIOService = new SocketIOService();
export default socketIOService;

// Export metrics for monitoring
export { metrics as socketMetrics };
