/**
 * Socket.IO Connection Store
 *
 * Zustand store for managing Socket.IO connection state.
 * Includes localStorage persistence for notifications.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  SocketConnectionStatus,
  SocketConnectionState,
  SocketNamespace,
  NotificationPayload,
} from 'lib/socket/types';

// ==============================|| SOCKET STORE TYPES ||============================== //

interface SocketState {
  // Connection states per namespace
  connections: Record<SocketNamespace, SocketConnectionState>;

  // Notification state
  notifications: NotificationPayload[];
  unreadCount: number;
  toastQueue: NotificationPayload[];

  // Actions
  setConnectionStatus: (namespace: SocketNamespace, status: SocketConnectionStatus) => void;
  setSocketId: (namespace: SocketNamespace, socketId: string | null) => void;
  setConnectionError: (namespace: SocketNamespace, error: string | null) => void;
  incrementReconnectAttempts: (namespace: SocketNamespace) => void;
  resetReconnectAttempts: (namespace: SocketNamespace) => void;
  setLastConnectedAt: (namespace: SocketNamespace, date: Date | null) => void;

  // Notification actions
  addNotification: (notification: NotificationPayload) => void;
  addNotifications: (notifications: NotificationPayload[]) => void;
  markNotificationRead: (notificationId: string) => void;
  markAllNotificationsRead: () => void;
  clearNotifications: () => void;
  removeNotification: (notificationId: string) => void;

  // Toast queue actions
  addToToastQueue: (notification: NotificationPayload) => void;
  clearToastQueue: () => void;

  // Reset
  resetConnection: (namespace: SocketNamespace) => void;
  resetAll: () => void;
}

// ==============================|| STORAGE CONFIG ||============================== //

const STORAGE_KEY = 'chartwarden-socket-store';
const MAX_NOTIFICATIONS = 100; // Limit stored notifications to prevent storage bloat

// ==============================|| INITIAL STATE ||============================== //

const createInitialConnectionState = (): SocketConnectionState => ({
  status: 'disconnected',
  socketId: null,
  error: null,
  reconnectAttempts: 0,
  lastConnectedAt: null,
});

const initialConnections: Record<SocketNamespace, SocketConnectionState> = {
  main: createInitialConnectionState(),
  notifications: createInitialConnectionState(),
  chat: createInitialConnectionState(),
  updates: createInitialConnectionState(),
};

// ==============================|| SOCKET STORE ||============================== //

export const useSocketStore = create<SocketState>()(
  persist(
    (set, get) => ({
      // Initial state
      connections: { ...initialConnections },
      notifications: [],
      unreadCount: 0,
      toastQueue: [],

  // Connection status
  setConnectionStatus: (namespace, status) => {
    set((state) => ({
      connections: {
        ...state.connections,
        [namespace]: {
          ...state.connections[namespace],
          status,
          // Clear error on successful connection
          error: status === 'connected' ? null : state.connections[namespace].error,
        },
      },
    }));
  },

  // Socket ID
  setSocketId: (namespace, socketId) => {
    set((state) => ({
      connections: {
        ...state.connections,
        [namespace]: {
          ...state.connections[namespace],
          socketId,
        },
      },
    }));
  },

  // Connection error
  setConnectionError: (namespace, error) => {
    set((state) => ({
      connections: {
        ...state.connections,
        [namespace]: {
          ...state.connections[namespace],
          error,
          status: error ? 'error' : state.connections[namespace].status,
        },
      },
    }));
  },

  // Reconnect attempts
  incrementReconnectAttempts: (namespace) => {
    set((state) => ({
      connections: {
        ...state.connections,
        [namespace]: {
          ...state.connections[namespace],
          reconnectAttempts: state.connections[namespace].reconnectAttempts + 1,
        },
      },
    }));
  },

  resetReconnectAttempts: (namespace) => {
    set((state) => ({
      connections: {
        ...state.connections,
        [namespace]: {
          ...state.connections[namespace],
          reconnectAttempts: 0,
        },
      },
    }));
  },

  // Last connected timestamp
  setLastConnectedAt: (namespace, date) => {
    set((state) => ({
      connections: {
        ...state.connections,
        [namespace]: {
          ...state.connections[namespace],
          lastConnectedAt: date,
        },
      },
    }));
  },

  // Add single notification
  addNotification: (notification) => {
    set((state) => {
      // Check for duplicates
      if (state.notifications.some((n) => n.id === notification.id)) {
        return state;
      }

      // Add to toast queue if unread
      const updatedToastQueue = notification.read
        ? state.toastQueue
        : [notification, ...state.toastQueue];

      // Limit total notifications stored
      const updatedNotifications = [notification, ...state.notifications].slice(0, MAX_NOTIFICATIONS);

      return {
        notifications: updatedNotifications,
        unreadCount: notification.read ? state.unreadCount : state.unreadCount + 1,
        toastQueue: updatedToastQueue,
      };
    });
  },

  // Add multiple notifications
  addNotifications: (notifications) => {
    set((state) => {
      const existingIds = new Set(state.notifications.map((n) => n.id));
      const newNotifications = notifications.filter((n) => !existingIds.has(n.id));
      const newUnread = newNotifications.filter((n) => !n.read).length;

      // Add unread notifications to toast queue
      const unreadNotifications = newNotifications.filter((n) => !n.read);
      const updatedToastQueue = [...unreadNotifications, ...state.toastQueue];

      // Limit total notifications stored
      const updatedNotifications = [...newNotifications, ...state.notifications].slice(0, MAX_NOTIFICATIONS);

      return {
        notifications: updatedNotifications,
        unreadCount: state.unreadCount + newUnread,
        toastQueue: updatedToastQueue,
      };
    });
  },

  // Mark notification as read
  markNotificationRead: (notificationId) => {
    set((state) => {
      const notification = state.notifications.find((n) => n.id === notificationId);
      if (!notification || notification.read) {
        return state;
      }

      return {
        notifications: state.notifications.map((n) =>
          n.id === notificationId ? { ...n, read: true } : n
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
      };
    });
  },

  // Mark all notifications as read
  markAllNotificationsRead: () => {
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    }));
  },

  // Clear all notifications
  clearNotifications: () => {
    set({
      notifications: [],
      unreadCount: 0,
    });
  },

  // Remove single notification
  removeNotification: (notificationId) => {
    set((state) => {
      const notification = state.notifications.find((n) => n.id === notificationId);
      const wasUnread = notification && !notification.read;

      return {
        notifications: state.notifications.filter((n) => n.id !== notificationId),
        unreadCount: wasUnread ? Math.max(0, state.unreadCount - 1) : state.unreadCount,
      };
    });
  },

  // Add to toast queue
  addToToastQueue: (notification) => {
    set((state) => ({
      toastQueue: [notification, ...state.toastQueue],
    }));
  },

  // Clear toast queue
  clearToastQueue: () => {
    set({ toastQueue: [] });
  },

  // Reset single connection
  resetConnection: (namespace) => {
    set((state) => ({
      connections: {
        ...state.connections,
        [namespace]: createInitialConnectionState(),
      },
    }));
  },

  // Reset all state
  resetAll: () => {
    set({
      connections: { ...initialConnections },
      notifications: [],
      unreadCount: 0,
      toastQueue: [],
    });
  },
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      // Only persist notifications and unread count, not connection state
      partialize: (state) => ({
        notifications: state.notifications,
        unreadCount: state.unreadCount,
      }),
    }
  )
);

// ==============================|| SELECTORS ||============================== //

export const selectConnectionStatus = (namespace: SocketNamespace) => (state: SocketState) =>
  state.connections[namespace].status;

export const selectConnectionState = (namespace: SocketNamespace) => (state: SocketState) =>
  state.connections[namespace];

export const selectIsConnected = (namespace: SocketNamespace) => (state: SocketState) =>
  state.connections[namespace].status === 'connected';

export const selectNotifications = (state: SocketState) => state.notifications;

export const selectUnreadCount = (state: SocketState) => state.unreadCount;

export const selectConnectionError = (namespace: SocketNamespace) => (state: SocketState) =>
  state.connections[namespace].error;
