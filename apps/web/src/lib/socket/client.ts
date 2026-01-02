/**
 * Socket.IO Client Manager
 *
 * Singleton manager for Socket.IO client connections.
 * Handles connection lifecycle, namespaces, and event management.
 */

import { io, Socket, Manager } from 'socket.io-client';
import {
  getSocketConfig,
  getNamespaceConfig,
  getSocketErrorMessage,
  isBrowser,
} from './config';
import {
  SocketConnectionStatus,
  SocketNamespace,
  NAMESPACE_PATHS,
  ConnectedEventPayload,
} from './types';

// ==============================|| TYPES ||============================== //

type ConnectionCallback = (status: SocketConnectionStatus, data?: unknown) => void;
type EventCallback = (...args: unknown[]) => void;

interface NamespaceConnection {
  socket: Socket;
  status: SocketConnectionStatus;
  listeners: Map<string, Set<EventCallback>>;
}

// ==============================|| SOCKET CLIENT MANAGER ||============================== //

/**
 * SocketClientManager - Manages Socket.IO client connections
 *
 * Features:
 * - Singleton pattern prevents multiple instances
 * - Manages multiple namespace connections
 * - Handles reconnection and error recovery
 * - Provides event subscription/unsubscription
 * - Cleans up on disconnect
 */
class SocketClientManager {
  private static instance: SocketClientManager | null = null;

  private manager: Manager | null = null;
  private connections: Map<SocketNamespace, NamespaceConnection> = new Map();
  private connectionCallbacks: Set<ConnectionCallback> = new Set();
  private isInitialized = false;
  private reconnectAttempts = 0;

  private constructor() {
    // Private constructor for singleton
  }

  /**
   * Get the singleton instance
   */
  public static getInstance(): SocketClientManager {
    if (!SocketClientManager.instance) {
      SocketClientManager.instance = new SocketClientManager();
    }
    return SocketClientManager.instance;
  }

  /**
   * Initialize the socket manager (call once on app start)
   */
  public initialize(): void {
    if (!isBrowser()) {
      console.warn('SocketClientManager: Cannot initialize on server side');
      return;
    }

    if (this.isInitialized) {
      return;
    }

    const config = getSocketConfig();
    this.manager = new Manager(config.url, config.options);
    this.isInitialized = true;
  }

  /**
   * Connect to the main namespace
   * Should be called after successful authentication
   */
  public connect(): Socket | null {
    return this.connectToNamespace('main');
  }

  /**
   * Connect to a specific namespace
   */
  public connectToNamespace(namespace: SocketNamespace): Socket | null {
    if (!isBrowser()) {
      return null;
    }

    if (!this.isInitialized) {
      this.initialize();
    }

    // Return existing connection if already connected
    const existing = this.connections.get(namespace);
    if (existing && existing.status === 'connected') {
      return existing.socket;
    }

    const config = getSocketConfig();
    const namespacePath = NAMESPACE_PATHS[namespace];
    const namespaceConfig = getNamespaceConfig(namespacePath);

    // Create socket for namespace
    const socket = io(`${config.url}${namespacePath}`, namespaceConfig);

    // Track connection
    const connection: NamespaceConnection = {
      socket,
      status: 'connecting',
      listeners: new Map(),
    };
    this.connections.set(namespace, connection);
    this.notifyConnectionChange('connecting', { namespace });

    // Setup event handlers
    this.setupSocketHandlers(socket, namespace);

    // Connect
    socket.connect();

    return socket;
  }

  /**
   * Setup socket event handlers
   */
  private setupSocketHandlers(socket: Socket, namespace: SocketNamespace): void {
    // Connection successful
    socket.on('connect', () => {
      const connection = this.connections.get(namespace);
      if (connection) {
        connection.status = 'connected';
      }
      this.reconnectAttempts = 0;
      this.notifyConnectionChange('connected', { namespace, socketId: socket.id });
    });

    // Custom connected event from server
    socket.on('connected', (payload: ConnectedEventPayload) => {
      const connection = this.connections.get(namespace);
      if (connection) {
        connection.status = 'connected';
      }
      this.notifyConnectionChange('connected', { namespace, ...payload });
    });

    // Connection error
    socket.on('connect_error', (error) => {
      const connection = this.connections.get(namespace);
      if (connection) {
        connection.status = 'error';
      }

      const errorMessage = error.message || 'connect_error';
      console.error(`Socket ${namespace} connection error:`, errorMessage);
      this.notifyConnectionChange('error', {
        namespace,
        error: getSocketErrorMessage(errorMessage, error.message),
      });
    });

    // Disconnection
    socket.on('disconnect', (reason) => {
      const connection = this.connections.get(namespace);
      if (connection) {
        connection.status = 'disconnected';
      }
      this.notifyConnectionChange('disconnected', { namespace, reason });
    });

    // Reconnection attempt
    socket.io.on('reconnect_attempt', (attempt) => {
      const connection = this.connections.get(namespace);
      if (connection) {
        connection.status = 'reconnecting';
      }
      this.reconnectAttempts = attempt;
      this.notifyConnectionChange('reconnecting', { namespace, attempt });
    });

    // Reconnection successful
    socket.io.on('reconnect', () => {
      const connection = this.connections.get(namespace);
      if (connection) {
        connection.status = 'connected';
      }
      this.reconnectAttempts = 0;
      this.notifyConnectionChange('connected', { namespace, reconnected: true });
    });

    // Reconnection failed
    socket.io.on('reconnect_failed', () => {
      const connection = this.connections.get(namespace);
      if (connection) {
        connection.status = 'error';
      }
      this.notifyConnectionChange('error', {
        namespace,
        error: getSocketErrorMessage('reconnect_failed'),
      });
    });
  }

  /**
   * Disconnect from a specific namespace
   */
  public disconnectFromNamespace(namespace: SocketNamespace): void {
    const connection = this.connections.get(namespace);
    if (connection) {
      // Remove all listeners
      connection.listeners.forEach((callbacks, event) => {
        callbacks.forEach((callback) => {
          connection.socket.off(event, callback);
        });
      });
      connection.listeners.clear();

      // Disconnect socket
      connection.socket.disconnect();
      this.connections.delete(namespace);
      this.notifyConnectionChange('disconnected', { namespace });
    }
  }

  /**
   * Disconnect from all namespaces
   */
  public disconnect(): void {
    this.connections.forEach((_, namespace) => {
      this.disconnectFromNamespace(namespace);
    });

    if (this.manager) {
      this.manager = null;
    }

    this.isInitialized = false;
    this.reconnectAttempts = 0;
  }

  /**
   * Get socket for a namespace
   */
  public getSocket(namespace: SocketNamespace = 'main'): Socket | null {
    const connection = this.connections.get(namespace);
    return connection?.socket || null;
  }

  /**
   * Get connection status for a namespace
   */
  public getStatus(namespace: SocketNamespace = 'main'): SocketConnectionStatus {
    const connection = this.connections.get(namespace);
    return connection?.status || 'disconnected';
  }

  /**
   * Check if connected to a namespace
   */
  public isConnected(namespace: SocketNamespace = 'main'): boolean {
    return this.getStatus(namespace) === 'connected';
  }

  /**
   * Subscribe to an event on a namespace
   */
  public on(
    namespace: SocketNamespace,
    event: string,
    callback: EventCallback
  ): () => void {
    const connection = this.connections.get(namespace);
    if (!connection) {
      console.warn(`Socket ${namespace} not connected. Event "${event}" will be registered when connected.`);
      return () => {};
    }

    // Track listener
    if (!connection.listeners.has(event)) {
      connection.listeners.set(event, new Set());
    }
    connection.listeners.get(event)!.add(callback);

    // Register with socket
    connection.socket.on(event, callback);

    // Return unsubscribe function
    return () => {
      this.off(namespace, event, callback);
    };
  }

  /**
   * Unsubscribe from an event on a namespace
   */
  public off(namespace: SocketNamespace, event: string, callback: EventCallback): void {
    const connection = this.connections.get(namespace);
    if (connection) {
      connection.socket.off(event, callback);
      connection.listeners.get(event)?.delete(callback);
    }
  }

  /**
   * Emit an event on a namespace
   */
  public emit(
    namespace: SocketNamespace,
    event: string,
    ...args: unknown[]
  ): void {
    const connection = this.connections.get(namespace);
    if (connection && connection.status === 'connected') {
      connection.socket.emit(event, ...args);
    } else {
      console.warn(`Cannot emit "${event}" - socket ${namespace} not connected`);
    }
  }

  /**
   * Emit an event with acknowledgment callback
   */
  public emitWithAck<T>(
    namespace: SocketNamespace,
    event: string,
    data: unknown,
    timeout = 10000
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const connection = this.connections.get(namespace);
      if (!connection || connection.status !== 'connected') {
        reject(new Error(`Socket ${namespace} not connected`));
        return;
      }

      const timeoutId = setTimeout(() => {
        reject(new Error(`Event "${event}" timed out after ${timeout}ms`));
      }, timeout);

      connection.socket.emit(event, data, (response: T) => {
        clearTimeout(timeoutId);
        resolve(response);
      });
    });
  }

  /**
   * Register a connection status callback
   */
  public onConnectionChange(callback: ConnectionCallback): () => void {
    this.connectionCallbacks.add(callback);
    return () => {
      this.connectionCallbacks.delete(callback);
    };
  }

  /**
   * Notify all connection callbacks
   */
  private notifyConnectionChange(status: SocketConnectionStatus, data?: unknown): void {
    this.connectionCallbacks.forEach((callback) => {
      try {
        callback(status, data);
      } catch (error) {
        console.error('Connection callback error:', error);
      }
    });
  }

  /**
   * Get current reconnect attempts
   */
  public getReconnectAttempts(): number {
    return this.reconnectAttempts;
  }
}

// Export singleton instance getter
export const getSocketManager = (): SocketClientManager => {
  return SocketClientManager.getInstance();
};

// Export for type usage
export type { SocketClientManager };
