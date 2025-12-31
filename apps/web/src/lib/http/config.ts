/**
 * HTTP Client Configuration
 *
 * Centralized configuration for the Axios HTTP client.
 */

import { HttpClientConfig } from './types';

// ==============================|| ENVIRONMENT HELPERS ||============================== //

/**
 * Get the API base URL from environment variables
 * Ensures the URL always ends with /api
 */
export const getApiBaseURL = (): string => {
  const envURL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';

  // Remove trailing slash if present
  const cleanURL = envURL.replace(/\/$/, '');

  // Append /api if not already present
  return cleanURL.endsWith('/api') ? cleanURL : `${cleanURL}/api`;
};

/**
 * Check if we're running in development mode
 */
export const isDevelopment = (): boolean => {
  return process.env.NODE_ENV === 'development';
};

/**
 * Check if we're running in the browser
 */
export const isBrowser = (): boolean => {
  return typeof window !== 'undefined';
};

// ==============================|| HTTP CONFIG ||============================== //

/**
 * Default HTTP client configuration
 */
export const httpConfig: HttpClientConfig = {
  baseURL: getApiBaseURL(),
  timeout: 30000, // 30 seconds
  debug: isDevelopment(),
  withCredentials: true, // Required for cookie-based authentication
};

/**
 * Default headers for all requests
 */
export const defaultHeaders: Record<string, string> = {
  Accept: 'application/json',
  'Content-Type': 'application/json',
};

// ==============================|| ERROR MESSAGES ||============================== //

/**
 * User-friendly error messages for common HTTP status codes
 */
export const errorMessages: Record<number, string> = {
  400: 'Invalid request. Please check your input.',
  401: 'Your session has expired. Please log in again.',
  403: 'You do not have permission to perform this action.',
  404: 'The requested resource was not found.',
  408: 'Request timed out. Please try again.',
  409: 'A conflict occurred. The resource may have been modified.',
  422: 'Validation failed. Please check your input.',
  429: 'Too many requests. Please wait before trying again.',
  500: 'An internal server error occurred. Please try again later.',
  502: 'The server is temporarily unavailable. Please try again later.',
  503: 'The service is temporarily unavailable. Please try again later.',
  504: 'The server took too long to respond. Please try again.',
};

/**
 * Get a user-friendly error message for an HTTP status code
 */
export const getErrorMessage = (status: number, fallback?: string): string => {
  return errorMessages[status] || fallback || 'An unexpected error occurred.';
};

/**
 * Network error message when server is unreachable
 */
export const NETWORK_ERROR_MESSAGE = 'Unable to connect to the server. Please check your internet connection.';
