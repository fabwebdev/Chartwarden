/**
 * Socket.IO Client Configuration
 *
 * Centralized configuration for Socket.IO client connection.
 */

import { ManagerOptions, SocketOptions } from 'socket.io-client';

// ==============================|| ENVIRONMENT HELPERS ||============================== //

/**
 * Get the Socket.IO server URL from environment
 * Uses the same base URL as the API, without the /api suffix
 */
export const getSocketURL = (): string => {
  const envURL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';
  // Remove /api suffix if present, and trailing slash
  return envURL.replace(/\/api\/?$/, '').replace(/\/$/, '');
};

/**
 * Check if we're in development mode
 */
export const isDevelopment = (): boolean => {
  return process.env.NODE_ENV === 'development';
};

/**
 * Check if we're in the browser
 */
export const isBrowser = (): boolean => {
  return typeof window !== 'undefined';
};

// ==============================|| SOCKET.IO CONFIG ||============================== //

/**
 * Socket.IO client configuration options
 * Matches backend SocketIO.service.js configuration
 */
export interface SocketClientConfig {
  url: string;
  options: Partial<ManagerOptions & SocketOptions>;
}

/**
 * Default reconnection configuration
 */
export const RECONNECTION_CONFIG = {
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 10000,
  randomizationFactor: 0.5,
} as const;

/**
 * Default timeout configuration
 */
export const TIMEOUT_CONFIG = {
  timeout: 45000, // Match backend connectTimeout
  ackTimeout: 10000,
} as const;

/**
 * Default transport configuration
 */
export const TRANSPORT_CONFIG = {
  transports: ['websocket', 'polling'] as ('websocket' | 'polling')[],
  upgrade: true, // Allow upgrade from polling to websocket
} as const;

/**
 * Get the complete Socket.IO client configuration
 */
export const getSocketConfig = (): SocketClientConfig => {
  return {
    url: getSocketURL(),
    options: {
      // Authentication - cookies will be sent with credentials
      withCredentials: true,

      // Reconnection settings
      ...RECONNECTION_CONFIG,

      // Timeout settings
      ...TIMEOUT_CONFIG,

      // Transport settings
      ...TRANSPORT_CONFIG,

      // Path for Socket.IO (must match server)
      path: '/socket.io',

      // Auto-connect disabled - we connect manually after auth
      autoConnect: false,

      // Extra headers for debugging
      extraHeaders: isDevelopment()
        ? {
            'X-Client-Type': 'chartwarden-web',
          }
        : undefined,

      // Force new connection (don't reuse)
      forceNew: false,

      // Multiplexing - share connection across namespaces
      multiplex: true,
    },
  };
};

/**
 * Get namespace-specific configuration
 */
export const getNamespaceConfig = (namespace: string): Partial<ManagerOptions & SocketOptions> => {
  const baseConfig = getSocketConfig().options;

  // Namespace-specific overrides can be added here
  switch (namespace) {
    case '/notifications':
      return {
        ...baseConfig,
        // Notifications can be more aggressive with reconnection
        reconnectionAttempts: 15,
      };
    case '/chat':
      return {
        ...baseConfig,
        // Chat might need faster reconnection
        reconnectionDelay: 500,
      };
    case '/updates':
      return {
        ...baseConfig,
        // Updates can use default settings
      };
    default:
      return baseConfig;
  }
};

// ==============================|| ERROR MESSAGES ||============================== //

/**
 * User-friendly error messages for socket events
 */
export const SOCKET_ERROR_MESSAGES: Record<string, string> = {
  connect_error: 'Unable to connect to real-time server. Please check your connection.',
  connect_timeout: 'Connection to real-time server timed out. Retrying...',
  disconnect: 'Disconnected from real-time server.',
  reconnect_failed: 'Failed to reconnect after multiple attempts.',
  authentication_required: 'Please log in to use real-time features.',
  authentication_failed: 'Session expired. Please log in again.',
};

/**
 * Get a user-friendly error message
 */
export const getSocketErrorMessage = (errorCode: string, fallback?: string): string => {
  return SOCKET_ERROR_MESSAGES[errorCode] || fallback || 'A connection error occurred.';
};
