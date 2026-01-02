'use client';

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useCallback,
  ReactNode,
  useMemo,
} from 'react';
import { Socket } from 'socket.io-client';
import { getSocketManager, SocketClientManager } from 'lib/socket/client';
import { isBrowser } from 'lib/socket/config';
import {
  SocketNamespace,
  SocketConnectionStatus,
  NotificationPayload,
} from 'lib/socket/types';
import { useSocketStore } from 'store/socketStore';
import { useAuthStore } from 'store/authStore';

// ==============================|| CONTEXT TYPE ||============================== //

interface SocketContextType {
  // Connection management
  connect: () => void;
  connectToNamespace: (namespace: SocketNamespace) => Socket | null;
  disconnect: () => void;
  disconnectFromNamespace: (namespace: SocketNamespace) => void;

  // Connection state
  isConnected: (namespace?: SocketNamespace) => boolean;
  getStatus: (namespace?: SocketNamespace) => SocketConnectionStatus;

  // Socket access
  getSocket: (namespace?: SocketNamespace) => Socket | null;

  // Event handling
  on: (namespace: SocketNamespace, event: string, callback: (...args: unknown[]) => void) => () => void;
  off: (namespace: SocketNamespace, event: string, callback: (...args: unknown[]) => void) => void;
  emit: (namespace: SocketNamespace, event: string, ...args: unknown[]) => void;
  emitWithAck: <T>(namespace: SocketNamespace, event: string, data: unknown, timeout?: number) => Promise<T>;

  // Manager access
  manager: SocketClientManager | null;
}

// ==============================|| CONTEXT ||============================== //

const SocketContext = createContext<SocketContextType | undefined>(undefined);

// ==============================|| PROVIDER PROPS ||============================== //

interface SocketProviderProps {
  children: ReactNode;
  autoConnect?: boolean;
  connectNamespaces?: SocketNamespace[];
}

// ==============================|| SOCKET PROVIDER ||============================== //

/**
 * SocketProvider - Provides Socket.IO context to the application
 *
 * Features:
 * - Auto-connects on authentication
 * - Auto-disconnects on logout
 * - Syncs connection state to Zustand store
 * - Handles notification events automatically
 * - Cleans up on unmount
 *
 * Usage:
 * 1. Wrap authenticated parts of your app with <SocketProvider>
 * 2. Use useSocket() hook to access socket functionality
 * 3. Use useSocketStore() for reactive connection state
 */
export function SocketProvider({
  children,
  autoConnect = true,
  connectNamespaces = ['main', 'notifications'],
}: SocketProviderProps) {
  const managerRef = useRef<SocketClientManager | null>(null);
  const connectedRef = useRef(false);

  // Zustand store for socket state
  const setConnectionStatus = useSocketStore((state) => state.setConnectionStatus);
  const setSocketId = useSocketStore((state) => state.setSocketId);
  const setConnectionError = useSocketStore((state) => state.setConnectionError);
  const setLastConnectedAt = useSocketStore((state) => state.setLastConnectedAt);
  const resetReconnectAttempts = useSocketStore((state) => state.resetReconnectAttempts);
  const incrementReconnectAttempts = useSocketStore((state) => state.incrementReconnectAttempts);
  const addNotification = useSocketStore((state) => state.addNotification);
  const addNotifications = useSocketStore((state) => state.addNotifications);
  const resetAll = useSocketStore((state) => state.resetAll);

  // Auth store for checking authentication
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isInitialized = useAuthStore((state) => state.isInitialized);

  // Initialize manager on mount
  useEffect(() => {
    if (!isBrowser()) return;

    managerRef.current = getSocketManager();
    managerRef.current.initialize();

    // Subscribe to connection changes
    const unsubscribe = managerRef.current.onConnectionChange((status, data) => {
      const eventData = data as { namespace?: SocketNamespace; socketId?: string; error?: string; attempt?: number } | undefined;
      const namespace = eventData?.namespace || 'main';

      setConnectionStatus(namespace, status);

      if (status === 'connected') {
        setSocketId(namespace, eventData?.socketId || null);
        setLastConnectedAt(namespace, new Date());
        resetReconnectAttempts(namespace);
      } else if (status === 'error') {
        setConnectionError(namespace, eventData?.error || 'Connection error');
      } else if (status === 'reconnecting') {
        incrementReconnectAttempts(namespace);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [
    setConnectionStatus,
    setSocketId,
    setConnectionError,
    setLastConnectedAt,
    resetReconnectAttempts,
    incrementReconnectAttempts,
  ]);

  // Auto-connect when authenticated
  useEffect(() => {
    if (!isBrowser() || !autoConnect || !isInitialized) return;

    const manager = managerRef.current;
    if (!manager) return;

    if (isAuthenticated && !connectedRef.current) {
      // Connect to specified namespaces
      connectNamespaces.forEach((namespace) => {
        const socket = manager.connectToNamespace(namespace);

        // Setup notification listener for notifications namespace
        if (namespace === 'notifications' && socket) {
          socket.on('notification', (payload: NotificationPayload) => {
            addNotification(payload);
          });

          socket.on('notification:batch', (payloads: NotificationPayload[]) => {
            addNotifications(payloads);
          });
        }
      });
      connectedRef.current = true;
    } else if (!isAuthenticated && connectedRef.current) {
      // Disconnect on logout
      manager.disconnect();
      resetAll();
      connectedRef.current = false;
    }
  }, [
    isAuthenticated,
    isInitialized,
    autoConnect,
    connectNamespaces,
    addNotification,
    addNotifications,
    resetAll,
  ]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (managerRef.current && connectedRef.current) {
        managerRef.current.disconnect();
        connectedRef.current = false;
      }
    };
  }, []);

  // Context methods
  const connect = useCallback(() => {
    managerRef.current?.connect();
    connectedRef.current = true;
  }, []);

  const connectToNamespace = useCallback((namespace: SocketNamespace) => {
    return managerRef.current?.connectToNamespace(namespace) || null;
  }, []);

  const disconnect = useCallback(() => {
    managerRef.current?.disconnect();
    resetAll();
    connectedRef.current = false;
  }, [resetAll]);

  const disconnectFromNamespace = useCallback((namespace: SocketNamespace) => {
    managerRef.current?.disconnectFromNamespace(namespace);
  }, []);

  const isConnected = useCallback((namespace: SocketNamespace = 'main') => {
    return managerRef.current?.isConnected(namespace) || false;
  }, []);

  const getStatus = useCallback((namespace: SocketNamespace = 'main') => {
    return managerRef.current?.getStatus(namespace) || 'disconnected';
  }, []);

  const getSocket = useCallback((namespace: SocketNamespace = 'main') => {
    return managerRef.current?.getSocket(namespace) || null;
  }, []);

  const on = useCallback(
    (namespace: SocketNamespace, event: string, callback: (...args: unknown[]) => void) => {
      return managerRef.current?.on(namespace, event, callback) || (() => {});
    },
    []
  );

  const off = useCallback(
    (namespace: SocketNamespace, event: string, callback: (...args: unknown[]) => void) => {
      managerRef.current?.off(namespace, event, callback);
    },
    []
  );

  const emit = useCallback(
    (namespace: SocketNamespace, event: string, ...args: unknown[]) => {
      managerRef.current?.emit(namespace, event, ...args);
    },
    []
  );

  const emitWithAck = useCallback(
    <T,>(namespace: SocketNamespace, event: string, data: unknown, timeout?: number) => {
      if (!managerRef.current) {
        return Promise.reject(new Error('Socket manager not initialized'));
      }
      return managerRef.current.emitWithAck<T>(namespace, event, data, timeout);
    },
    []
  );

  // Memoize context value
  const contextValue = useMemo(
    (): SocketContextType => ({
      connect,
      connectToNamespace,
      disconnect,
      disconnectFromNamespace,
      isConnected,
      getStatus,
      getSocket,
      on,
      off,
      emit,
      emitWithAck,
      manager: managerRef.current,
    }),
    [
      connect,
      connectToNamespace,
      disconnect,
      disconnectFromNamespace,
      isConnected,
      getStatus,
      getSocket,
      on,
      off,
      emit,
      emitWithAck,
    ]
  );

  return (
    <SocketContext.Provider value={contextValue}>
      {children}
    </SocketContext.Provider>
  );
}

// ==============================|| HOOK ||============================== //

/**
 * Hook to access socket context
 * Must be used within a SocketProvider
 */
export function useSocketContext(): SocketContextType {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocketContext must be used within a SocketProvider');
  }
  return context;
}

export { SocketContext };
export type { SocketContextType };
