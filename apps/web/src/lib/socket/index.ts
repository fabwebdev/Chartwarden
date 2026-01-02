/**
 * Socket.IO Client Library
 *
 * Re-exports for convenient imports.
 */

// Client manager
export { getSocketManager } from './client';
export type { SocketClientManager } from './client';

// Configuration
export {
  getSocketURL,
  getSocketConfig,
  getNamespaceConfig,
  getSocketErrorMessage,
  SOCKET_ERROR_MESSAGES,
  RECONNECTION_CONFIG,
  TIMEOUT_CONFIG,
  TRANSPORT_CONFIG,
  isDevelopment,
  isBrowser,
} from './config';
export type { SocketClientConfig } from './config';

// Types
export {
  NAMESPACE_PATHS,
} from './types';

export type {
  SocketConnectionStatus,
  SocketConnectionState,
  SocketNamespace,
  ConnectedEventPayload,
  RoomResponse,
  NotificationPayload,
  MarkReadResponse,
  ChatMessage,
  TypingIndicator,
  SendMessageRequest,
  SendMessageResponse,
  PatientUpdatePayload,
  EncounterUpdatePayload,
  SubscribeResponse,
  MainServerEvents,
  MainClientEvents,
  NotificationsServerEvents,
  NotificationsClientEvents,
  ChatServerEvents,
  ChatClientEvents,
  UpdatesServerEvents,
  UpdatesClientEvents,
} from './types';
