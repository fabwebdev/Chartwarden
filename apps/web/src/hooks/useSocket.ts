/**
 * Socket.IO Custom Hooks
 *
 * Reusable hooks for Socket.IO operations.
 */

import { useCallback, useEffect, useRef } from 'react';
import { useSocketContext } from 'contexts/SocketContext';
import { useSocketStore } from 'store/socketStore';
import {
  SocketNamespace,
  SocketConnectionStatus,
  NotificationPayload,
  ChatMessage,
  TypingIndicator,
  PatientUpdatePayload,
  EncounterUpdatePayload,
  RoomResponse,
  SubscribeResponse,
  SendMessageRequest,
  SendMessageResponse,
  MarkReadResponse,
} from 'lib/socket/types';

// ==============================|| MAIN SOCKET HOOK ||============================== //

/**
 * Main socket hook for general socket operations
 */
export function useSocket(namespace: SocketNamespace = 'main') {
  const context = useSocketContext();
  const connectionState = useSocketStore((state) => state.connections[namespace]);

  const on = useCallback(
    (event: string, callback: (...args: unknown[]) => void) => {
      return context.on(namespace, event, callback);
    },
    [context, namespace]
  );

  const off = useCallback(
    (event: string, callback: (...args: unknown[]) => void) => {
      context.off(namespace, event, callback);
    },
    [context, namespace]
  );

  const emit = useCallback(
    (event: string, ...args: unknown[]) => {
      context.emit(namespace, event, ...args);
    },
    [context, namespace]
  );

  const emitWithAck = useCallback(
    <T,>(event: string, data: unknown, timeout?: number) => {
      return context.emitWithAck<T>(namespace, event, data, timeout);
    },
    [context, namespace]
  );

  // Additional actions for notifications namespace
  const markNotificationAsRead = useCallback(
    (notificationIds: string[]) => {
      if (namespace === 'notifications') {
        return context.emitWithAck<MarkReadResponse>(
          'notifications',
          'mark:read',
          notificationIds
        );
      }
      return Promise.resolve({ success: false, error: 'Not on notifications namespace' });
    },
    [context, namespace]
  );

  const markAllNotificationsAsRead = useCallback(() => {
    const notifications = useSocketStore.getState().notifications;
    const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);

    if (namespace === 'notifications' && unreadIds.length > 0) {
      return context.emitWithAck<MarkReadResponse>(
        'notifications',
        'mark:read',
        unreadIds
      );
    }
    return Promise.resolve({ success: false, error: 'Not on notifications namespace or no unread' });
  }, [context, namespace]);

  return {
    // Connection state
    status: connectionState.status,
    isConnected: connectionState.status === 'connected',
    isConnecting: connectionState.status === 'connecting',
    isReconnecting: connectionState.status === 'reconnecting',
    error: connectionState.error,
    socketId: connectionState.socketId,
    reconnectAttempts: connectionState.reconnectAttempts,

    // Event handlers
    on,
    off,
    emit,
    emitWithAck,

    // Socket access
    socket: context.getSocket(namespace),

    // Connection management
    connect: () => context.connectToNamespace(namespace),
    disconnect: () => context.disconnectFromNamespace(namespace),

    // Notification actions (only available on notifications namespace)
    markNotificationAsRead: namespace === 'notifications' ? markNotificationAsRead : undefined,
    markAllNotificationsAsRead: namespace === 'notifications' ? markAllNotificationsAsRead : undefined,
  };
}

// ==============================|| SOCKET EVENT HOOK ||============================== //

/**
 * Hook to subscribe to a socket event
 * Automatically cleans up on unmount
 */
export function useSocketEvent<T = unknown>(
  namespace: SocketNamespace,
  event: string,
  callback: (data: T) => void,
  deps: unknown[] = []
) {
  const context = useSocketContext();
  const callbackRef = useRef(callback);

  // Update ref when callback changes
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    const handler = (data: unknown) => {
      callbackRef.current(data as T);
    };

    const unsubscribe = context.on(namespace, event, handler);

    return () => {
      unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [context, namespace, event, ...deps]);
}

// ==============================|| CONNECTION STATUS HOOK ||============================== //

/**
 * Hook to get connection status for a namespace
 */
export function useSocketStatus(namespace: SocketNamespace = 'main'): {
  status: SocketConnectionStatus;
  isConnected: boolean;
  isConnecting: boolean;
  isReconnecting: boolean;
  error: string | null;
} {
  const connectionState = useSocketStore((state) => state.connections[namespace]);

  return {
    status: connectionState.status,
    isConnected: connectionState.status === 'connected',
    isConnecting: connectionState.status === 'connecting',
    isReconnecting: connectionState.status === 'reconnecting',
    error: connectionState.error,
  };
}

// ==============================|| NOTIFICATIONS HOOK ||============================== //

/**
 * Hook for notification namespace operations
 */
export function useSocketNotifications() {
  const context = useSocketContext();
  const notifications = useSocketStore((state) => state.notifications);
  const unreadCount = useSocketStore((state) => state.unreadCount);
  const markNotificationRead = useSocketStore((state) => state.markNotificationRead);
  const markAllNotificationsRead = useSocketStore((state) => state.markAllNotificationsRead);
  const connectionState = useSocketStore((state) => state.connections.notifications);

  // Subscribe to notification channels
  const subscribe = useCallback(
    (channels: string[]) => {
      return context.emitWithAck<SubscribeResponse>(
        'notifications',
        'subscribe',
        channels
      );
    },
    [context]
  );

  // Unsubscribe from channels
  const unsubscribe = useCallback(
    (channels: string[]) => {
      return context.emitWithAck<SubscribeResponse>(
        'notifications',
        'unsubscribe',
        channels
      );
    },
    [context]
  );

  // Mark notifications as read on server and locally
  const markRead = useCallback(
    async (notificationIds: string[]) => {
      try {
        const response = await context.emitWithAck<MarkReadResponse>(
          'notifications',
          'mark:read',
          notificationIds
        );

        if (response.success) {
          notificationIds.forEach((id) => markNotificationRead(id));
        }

        return response;
      } catch (error) {
        console.error('Failed to mark notifications as read:', error);
        return { success: false, error: String(error) };
      }
    },
    [context, markNotificationRead]
  );

  // Subscribe to notification events
  const onNotification = useCallback(
    (callback: (notification: NotificationPayload) => void) => {
      return context.on('notifications', 'notification', callback as (...args: unknown[]) => void);
    },
    [context]
  );

  return {
    // State
    notifications,
    unreadCount,
    isConnected: connectionState.status === 'connected',
    status: connectionState.status,

    // Actions
    subscribe,
    unsubscribe,
    markRead,
    markAllRead: markAllNotificationsRead,
    onNotification,

    // Connect to namespace
    connect: () => context.connectToNamespace('notifications'),
  };
}

// ==============================|| CHAT HOOK ||============================== //

/**
 * Hook for chat namespace operations
 */
export function useSocketChat() {
  const context = useSocketContext();
  const connectionState = useSocketStore((state) => state.connections.chat);

  // Join a conversation room
  const joinConversation = useCallback(
    (conversationId: string) => {
      return context.emitWithAck<RoomResponse>(
        'chat',
        'join:conversation',
        conversationId
      );
    },
    [context]
  );

  // Leave a conversation room
  const leaveConversation = useCallback(
    (conversationId: string) => {
      return context.emitWithAck<RoomResponse>(
        'chat',
        'leave:conversation',
        conversationId
      );
    },
    [context]
  );

  // Send a message
  const sendMessage = useCallback(
    (data: SendMessageRequest) => {
      return context.emitWithAck<SendMessageResponse>(
        'chat',
        'send:message',
        data
      );
    },
    [context]
  );

  // Start typing indicator
  const startTyping = useCallback(
    (conversationId: string) => {
      context.emit('chat', 'typing:start', conversationId);
    },
    [context]
  );

  // Stop typing indicator
  const stopTyping = useCallback(
    (conversationId: string) => {
      context.emit('chat', 'typing:stop', conversationId);
    },
    [context]
  );

  // Subscribe to message events
  const onMessage = useCallback(
    (callback: (message: ChatMessage) => void) => {
      return context.on('chat', 'message', callback as (...args: unknown[]) => void);
    },
    [context]
  );

  // Subscribe to typing events
  const onTyping = useCallback(
    (callback: (data: TypingIndicator) => void) => {
      return context.on('chat', 'user:typing', callback as (...args: unknown[]) => void);
    },
    [context]
  );

  // Subscribe to stopped typing events
  const onStoppedTyping = useCallback(
    (callback: (data: Pick<TypingIndicator, 'userId' | 'conversationId'>) => void) => {
      return context.on('chat', 'user:stopped_typing', callback as (...args: unknown[]) => void);
    },
    [context]
  );

  return {
    // State
    isConnected: connectionState.status === 'connected',
    status: connectionState.status,

    // Room management
    joinConversation,
    leaveConversation,

    // Messaging
    sendMessage,
    onMessage,

    // Typing indicators
    startTyping,
    stopTyping,
    onTyping,
    onStoppedTyping,

    // Connect to namespace
    connect: () => context.connectToNamespace('chat'),
  };
}

// ==============================|| UPDATES HOOK ||============================== //

/**
 * Hook for updates namespace operations (patient/encounter updates)
 */
export function useSocketUpdates() {
  const context = useSocketContext();
  const connectionState = useSocketStore((state) => state.connections.updates);

  // Subscribe to patient updates
  const subscribeToPatient = useCallback(
    (patientId: string) => {
      return context.emitWithAck<SubscribeResponse>(
        'updates',
        'subscribe:patient',
        patientId
      );
    },
    [context]
  );

  // Subscribe to encounter updates
  const subscribeToEncounter = useCallback(
    (encounterId: string) => {
      return context.emitWithAck<SubscribeResponse>(
        'updates',
        'subscribe:encounter',
        encounterId
      );
    },
    [context]
  );

  // Unsubscribe from updates
  const unsubscribe = useCallback(
    (resourceType: 'patient' | 'encounter', resourceId: string) => {
      return context.emitWithAck<SubscribeResponse>(
        'updates',
        'unsubscribe',
        { resourceType, resourceId }
      );
    },
    [context]
  );

  // Subscribe to patient update events
  const onPatientUpdate = useCallback(
    (callback: (update: PatientUpdatePayload) => void) => {
      return context.on('updates', 'patient:update', callback as (...args: unknown[]) => void);
    },
    [context]
  );

  // Subscribe to encounter update events
  const onEncounterUpdate = useCallback(
    (callback: (update: EncounterUpdatePayload) => void) => {
      return context.on('updates', 'encounter:update', callback as (...args: unknown[]) => void);
    },
    [context]
  );

  return {
    // State
    isConnected: connectionState.status === 'connected',
    status: connectionState.status,

    // Subscriptions
    subscribeToPatient,
    subscribeToEncounter,
    unsubscribe,

    // Event listeners
    onPatientUpdate,
    onEncounterUpdate,

    // Connect to namespace
    connect: () => context.connectToNamespace('updates'),
  };
}

// ==============================|| PING HOOK ||============================== //

/**
 * Hook for ping/pong heartbeat
 */
export function useSocketPing() {
  const context = useSocketContext();

  const ping = useCallback(async () => {
    const startTime = Date.now();
    try {
      const response = await context.emitWithAck<{ timestamp: number; status: string }>(
        'main',
        'ping',
        {},
        5000
      );
      const latency = Date.now() - startTime;
      return {
        success: true,
        latency,
        serverTimestamp: response.timestamp,
      };
    } catch (error) {
      return {
        success: false,
        latency: -1,
        error: String(error),
      };
    }
  }, [context]);

  return { ping };
}

export default useSocket;
