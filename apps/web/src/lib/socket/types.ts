/**
 * Socket.IO Client Types
 *
 * Type definitions for Socket.IO events and payloads.
 * Matches the backend SocketIO.service.js event structure.
 */

// ==============================|| CONNECTION TYPES ||============================== //

/**
 * Connection status enum
 */
export type SocketConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error';

/**
 * Socket connection state
 */
export interface SocketConnectionState {
  status: SocketConnectionStatus;
  socketId: string | null;
  error: string | null;
  reconnectAttempts: number;
  lastConnectedAt: Date | null;
}

/**
 * Connected event payload from server
 */
export interface ConnectedEventPayload {
  socketId: string;
  userId: string;
  timestamp: number;
  serverTime: string;
}

// ==============================|| ROOM TYPES ||============================== //

/**
 * Room join/leave callback response
 */
export interface RoomResponse {
  success: boolean;
  room?: string;
  error?: string;
}

// ==============================|| NOTIFICATION TYPES ||============================== //

/**
 * Notification payload from server
 */
export interface NotificationPayload {
  id: string;
  type: string;
  title: string;
  message: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  data?: Record<string, unknown>;
  createdAt: string;
  read: boolean;
}

/**
 * Mark read callback response
 */
export interface MarkReadResponse {
  success: boolean;
  count?: number;
  error?: string;
}

// ==============================|| CHAT TYPES ||============================== //

/**
 * Chat message payload
 */
export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  content: string;
  createdAt: string;
  attachments?: Array<{
    id: string;
    name: string;
    type: string;
    url: string;
  }>;
}

/**
 * Typing indicator payload
 */
export interface TypingIndicator {
  userId: string;
  userName: string;
  conversationId: string;
}

/**
 * Send message request
 */
export interface SendMessageRequest {
  conversationId: string;
  content: string;
  attachments?: string[];
}

/**
 * Send message response
 */
export interface SendMessageResponse {
  success: boolean;
  message?: ChatMessage;
  error?: string;
}

// ==============================|| UPDATE TYPES ||============================== //

/**
 * Patient update payload
 */
export interface PatientUpdatePayload {
  patientId: string;
  updateType: 'created' | 'updated' | 'deleted' | 'status_change';
  data: Record<string, unknown>;
  timestamp: string;
  updatedBy: string;
}

/**
 * Encounter update payload
 */
export interface EncounterUpdatePayload {
  encounterId: string;
  patientId: string;
  updateType: 'created' | 'updated' | 'deleted' | 'signed' | 'status_change';
  data: Record<string, unknown>;
  timestamp: string;
  updatedBy: string;
}

/**
 * Subscribe response
 */
export interface SubscribeResponse {
  success: boolean;
  room?: string;
  error?: string;
}

// ==============================|| NAMESPACE TYPES ||============================== //

/**
 * Available Socket.IO namespaces
 */
export type SocketNamespace = 'main' | 'notifications' | 'chat' | 'updates';

/**
 * Namespace paths matching backend configuration
 */
export const NAMESPACE_PATHS: Record<SocketNamespace, string> = {
  main: '/',
  notifications: '/notifications',
  chat: '/chat',
  updates: '/updates',
};

// ==============================|| EVENT TYPES ||============================== //

/**
 * Server-to-client events for main namespace
 */
export interface MainServerEvents {
  connected: (payload: ConnectedEventPayload) => void;
  error: (error: string) => void;
  disconnect: (reason: string) => void;
}

/**
 * Client-to-server events for main namespace
 */
export interface MainClientEvents {
  ping: (callback: (response: { timestamp: number; status: string }) => void) => void;
  'join:room': (roomName: string, callback: (response: RoomResponse) => void) => void;
  'leave:room': (roomName: string, callback: (response: RoomResponse) => void) => void;
  message: (data: unknown, callback: (response: unknown) => void) => void;
}

/**
 * Server-to-client events for notifications namespace
 */
export interface NotificationsServerEvents {
  notification: (payload: NotificationPayload) => void;
  'notification:batch': (payload: NotificationPayload[]) => void;
}

/**
 * Client-to-server events for notifications namespace
 */
export interface NotificationsClientEvents {
  subscribe: (channels: string[], callback: (response: SubscribeResponse) => void) => void;
  unsubscribe: (channels: string[], callback: (response: SubscribeResponse) => void) => void;
  'mark:read': (notificationIds: string[], callback: (response: MarkReadResponse) => void) => void;
}

/**
 * Server-to-client events for chat namespace
 */
export interface ChatServerEvents {
  message: (payload: ChatMessage) => void;
  'user:typing': (payload: TypingIndicator) => void;
  'user:stopped_typing': (payload: Pick<TypingIndicator, 'userId' | 'conversationId'>) => void;
}

/**
 * Client-to-server events for chat namespace
 */
export interface ChatClientEvents {
  'join:conversation': (conversationId: string, callback: (response: RoomResponse) => void) => void;
  'leave:conversation': (conversationId: string, callback: (response: RoomResponse) => void) => void;
  'send:message': (data: SendMessageRequest, callback: (response: SendMessageResponse) => void) => void;
  'typing:start': (conversationId: string) => void;
  'typing:stop': (conversationId: string) => void;
}

/**
 * Server-to-client events for updates namespace
 */
export interface UpdatesServerEvents {
  'patient:update': (payload: PatientUpdatePayload) => void;
  'encounter:update': (payload: EncounterUpdatePayload) => void;
}

/**
 * Client-to-server events for updates namespace
 */
export interface UpdatesClientEvents {
  'subscribe:patient': (patientId: string, callback: (response: SubscribeResponse) => void) => void;
  'subscribe:encounter': (encounterId: string, callback: (response: SubscribeResponse) => void) => void;
  unsubscribe: (resourceType: string, resourceId: string, callback: (response: SubscribeResponse) => void) => void;
}
