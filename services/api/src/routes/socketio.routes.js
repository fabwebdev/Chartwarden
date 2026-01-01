/**
 * Socket.IO Management Routes
 *
 * Provides endpoints for Socket.IO monitoring and management:
 * - Health check for WebSocket connectivity
 * - Metrics and connection statistics
 * - Admin operations (broadcast, disconnect users)
 *
 * @module routes/socketio.routes
 */

import { authenticate } from "../middleware/betterAuth.middleware.js";
import { requireRole } from "../middleware/rbac.middleware.js";
import { ROLES } from "../config/rbac.js";
import socketIOService, { socketMetrics } from "../services/SocketIO.service.js";

async function socketIORoutes(fastify, options) {
  /**
   * GET /api/socket.io/health
   * Health check for Socket.IO service
   * Public endpoint for monitoring
   */
  fastify.get("/health", async (request, reply) => {
    const isInitialized = socketIOService.isInitialized;
    const metrics = socketIOService.getMetrics();

    return reply.send({
      success: true,
      data: {
        status: isInitialized ? "healthy" : "not_initialized",
        initialized: isInitialized,
        activeConnections: metrics.activeConnections,
        connectedUsers: metrics.connectedUsers,
        timestamp: new Date().toISOString(),
      },
    });
  });

  /**
   * GET /api/socket.io/metrics
   * Get Socket.IO metrics and statistics
   * Requires admin role
   */
  fastify.get(
    "/metrics",
    {
      preHandler: [authenticate, requireRole(ROLES.ADMIN)],
    },
    async (request, reply) => {
      const metrics = socketIOService.getMetrics();

      return reply.send({
        success: true,
        data: {
          connections: {
            total: metrics.totalConnections,
            active: metrics.activeConnections,
            uniqueUsers: metrics.connectedUsers,
          },
          authentication: {
            failures: metrics.authFailures,
          },
          messages: {
            total: metrics.totalMessages,
          },
          reconnections: metrics.reconnections,
          timestamp: new Date().toISOString(),
        },
      });
    }
  );

  /**
   * GET /api/socket.io/connections
   * Get list of active connections (admin only)
   */
  fastify.get(
    "/connections",
    {
      preHandler: [authenticate, requireRole(ROLES.ADMIN)],
    },
    async (request, reply) => {
      // Get all connected sockets from the main namespace
      const io = socketIOService.io;
      if (!io) {
        return reply.code(503).send({
          success: false,
          error: "Socket.IO not initialized",
        });
      }

      const sockets = await io.fetchSockets();
      const connections = sockets.map((socket) => ({
        socketId: socket.id,
        userId: socket.user?.id,
        role: socket.user?.role,
        rooms: Array.from(socket.rooms),
        connectedAt: socketIOService.getConnectionInfo(socket.id)?.connectedAt,
      }));

      return reply.send({
        success: true,
        data: {
          count: connections.length,
          connections,
        },
      });
    }
  );

  /**
   * GET /api/socket.io/user/:userId/status
   * Check if a specific user is connected
   */
  fastify.get(
    "/user/:userId/status",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      const { userId } = request.params;

      // Users can check their own status, admins can check anyone
      if (request.user.id !== userId && request.user.role !== ROLES.ADMIN) {
        return reply.code(403).send({
          success: false,
          error: "Not authorized to check this user's status",
        });
      }

      const isConnected = socketIOService.isUserConnected(userId);
      const socketIds = socketIOService.getUserSockets(userId);

      return reply.send({
        success: true,
        data: {
          userId,
          isConnected,
          connectionCount: socketIds.length,
        },
      });
    }
  );

  /**
   * POST /api/socket.io/broadcast
   * Broadcast a message to all connected clients (admin only)
   */
  fastify.post(
    "/broadcast",
    {
      preHandler: [authenticate, requireRole(ROLES.ADMIN)],
      schema: {
        body: {
          type: "object",
          required: ["event", "data"],
          properties: {
            event: { type: "string" },
            data: { type: "object" },
            room: { type: "string" },
          },
        },
      },
    },
    async (request, reply) => {
      const { event, data, room } = request.body;

      if (room) {
        socketIOService.toRoom(room, event, data);
      } else {
        socketIOService.broadcast(event, data);
      }

      return reply.send({
        success: true,
        message: room
          ? `Event '${event}' broadcast to room '${room}'`
          : `Event '${event}' broadcast to all clients`,
      });
    }
  );

  /**
   * POST /api/socket.io/notify/:userId
   * Send a notification to a specific user (admin only)
   */
  fastify.post(
    "/notify/:userId",
    {
      preHandler: [authenticate, requireRole(ROLES.ADMIN)],
      schema: {
        body: {
          type: "object",
          required: ["title", "message"],
          properties: {
            title: { type: "string" },
            message: { type: "string" },
            type: { type: "string", enum: ["info", "success", "warning", "error"] },
            data: { type: "object" },
          },
        },
      },
    },
    async (request, reply) => {
      const { userId } = request.params;
      const { title, message, type = "info", data } = request.body;

      socketIOService.notifyUser(userId, { title, message, type, data });

      return reply.send({
        success: true,
        message: `Notification sent to user ${userId}`,
      });
    }
  );

  /**
   * POST /api/socket.io/notify/role/:role
   * Send a notification to all users with a specific role (admin only)
   */
  fastify.post(
    "/notify/role/:role",
    {
      preHandler: [authenticate, requireRole(ROLES.ADMIN)],
      schema: {
        body: {
          type: "object",
          required: ["title", "message"],
          properties: {
            title: { type: "string" },
            message: { type: "string" },
            type: { type: "string", enum: ["info", "success", "warning", "error"] },
            data: { type: "object" },
          },
        },
      },
    },
    async (request, reply) => {
      const { role } = request.params;
      const { title, message, type = "info", data } = request.body;

      // Validate role
      if (!Object.values(ROLES).includes(role)) {
        return reply.code(400).send({
          success: false,
          error: `Invalid role: ${role}`,
        });
      }

      socketIOService.notifyRole(role, { title, message, type, data });

      return reply.send({
        success: true,
        message: `Notification sent to all users with role '${role}'`,
      });
    }
  );

  /**
   * DELETE /api/socket.io/disconnect/:socketId
   * Disconnect a specific socket (admin only)
   */
  fastify.delete(
    "/disconnect/:socketId",
    {
      preHandler: [authenticate, requireRole(ROLES.ADMIN)],
    },
    async (request, reply) => {
      const { socketId } = request.params;

      const io = socketIOService.io;
      if (!io) {
        return reply.code(503).send({
          success: false,
          error: "Socket.IO not initialized",
        });
      }

      const sockets = await io.fetchSockets();
      const socket = sockets.find((s) => s.id === socketId);

      if (!socket) {
        return reply.code(404).send({
          success: false,
          error: `Socket ${socketId} not found`,
        });
      }

      socket.disconnect(true);

      return reply.send({
        success: true,
        message: `Socket ${socketId} disconnected`,
      });
    }
  );

  /**
   * DELETE /api/socket.io/disconnect/user/:userId
   * Disconnect all sockets for a specific user (admin only)
   */
  fastify.delete(
    "/disconnect/user/:userId",
    {
      preHandler: [authenticate, requireRole(ROLES.ADMIN)],
    },
    async (request, reply) => {
      const { userId } = request.params;

      const io = socketIOService.io;
      if (!io) {
        return reply.code(503).send({
          success: false,
          error: "Socket.IO not initialized",
        });
      }

      const socketIds = socketIOService.getUserSockets(userId);
      if (socketIds.length === 0) {
        return reply.code(404).send({
          success: false,
          error: `No active connections for user ${userId}`,
        });
      }

      const sockets = await io.fetchSockets();
      let disconnected = 0;

      for (const socket of sockets) {
        if (socketIds.includes(socket.id)) {
          socket.disconnect(true);
          disconnected++;
        }
      }

      return reply.send({
        success: true,
        message: `Disconnected ${disconnected} socket(s) for user ${userId}`,
      });
    }
  );
}

export default socketIORoutes;
