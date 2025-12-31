/**
 * Axios Interceptors
 *
 * Request and response interceptors for the HTTP client.
 * Handles authentication, logging, CSRF protection, and error processing.
 */

import { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../../store/authStore';
import { HttpError, HttpRequestConfig } from './types';
import { getErrorMessage, getApiBaseURL, isBrowser, isDevelopment, NETWORK_ERROR_MESSAGE } from './config';

// ==============================|| CSRF TOKEN MANAGEMENT ||============================== //

/**
 * CSRF Token Cache
 * Stores the current CSRF token with expiration tracking
 */
interface CsrfTokenCache {
  token: string | null;
  fetchedAt: number | null;
  fetchPromise: Promise<string | null> | null;
}

const csrfCache: CsrfTokenCache = {
  token: null,
  fetchedAt: null,
  fetchPromise: null,
};

// CSRF token is valid for 30 minutes (conservative estimate)
const CSRF_TOKEN_TTL = 30 * 60 * 1000;

/**
 * Check if the current CSRF token is still valid
 */
function isCsrfTokenValid(): boolean {
  if (!csrfCache.token || !csrfCache.fetchedAt) {
    return false;
  }
  return Date.now() - csrfCache.fetchedAt < CSRF_TOKEN_TTL;
}

/**
 * Fetch a new CSRF token from the server
 * Uses deduplication to prevent multiple concurrent fetches
 */
async function fetchCsrfToken(): Promise<string | null> {
  // If there's already a fetch in progress, wait for it
  if (csrfCache.fetchPromise) {
    return csrfCache.fetchPromise;
  }

  // Start a new fetch
  csrfCache.fetchPromise = (async () => {
    try {
      const baseURL = getApiBaseURL();
      const response = await fetch(`${baseURL}/auth/csrf-token`, {
        method: 'GET',
        credentials: 'include', // Include cookies for session
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        if (isDevelopment() && isBrowser()) {
          console.warn('[CSRF] Failed to fetch CSRF token:', response.status);
        }
        return null;
      }

      const data = await response.json();
      const token = data.csrfToken;

      if (token) {
        csrfCache.token = token;
        csrfCache.fetchedAt = Date.now();

        if (isDevelopment() && isBrowser()) {
          console.log('[CSRF] Token fetched successfully');
        }
      }

      return token;
    } catch (error) {
      if (isDevelopment() && isBrowser()) {
        console.error('[CSRF] Error fetching token:', error);
      }
      return null;
    } finally {
      csrfCache.fetchPromise = null;
    }
  })();

  return csrfCache.fetchPromise;
}

/**
 * Get a valid CSRF token, fetching a new one if necessary
 */
async function getCsrfToken(): Promise<string | null> {
  if (isCsrfTokenValid()) {
    return csrfCache.token;
  }
  return fetchCsrfToken();
}

/**
 * Clear the cached CSRF token
 * Call this when the user logs out or when a CSRF error occurs
 */
export function clearCsrfToken(): void {
  csrfCache.token = null;
  csrfCache.fetchedAt = null;
  csrfCache.fetchPromise = null;
}

/**
 * Routes that should skip CSRF token (auth endpoints)
 */
const CSRF_EXEMPT_ROUTES = [
  '/auth/sign-in',
  '/auth/sign-up',
  '/auth/sign-out',
  '/auth/csrf-token',
  '/auth/sign-in/email',
];

/**
 * Check if a URL should skip CSRF protection
 */
function shouldSkipCsrf(url: string | undefined, method: string | undefined): boolean {
  // Only state-changing methods need CSRF
  const statefulMethods = ['POST', 'PUT', 'DELETE', 'PATCH'];
  if (!method || !statefulMethods.includes(method.toUpperCase())) {
    return true;
  }

  // Check for exempt routes
  if (url) {
    return CSRF_EXEMPT_ROUTES.some(route => url.includes(route));
  }

  return false;
}

// ==============================|| REQUEST INTERCEPTORS ||============================== //

/**
 * Request interceptor to ensure credentials are always included
 * Required for cookie-based authentication with Better Auth
 */
export const credentialsInterceptor = (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
  // Always ensure withCredentials is true for cookie-based auth
  config.withCredentials = true;
  return config;
};

/**
 * Request interceptor to add CSRF token to state-changing requests
 * Fetches token from server if not cached or expired
 */
export const csrfInterceptor = async (config: InternalAxiosRequestConfig): Promise<InternalAxiosRequestConfig> => {
  const extendedConfig = config as HttpRequestConfig;

  // Skip if explicitly disabled
  if (extendedConfig.skipCsrf) {
    return config;
  }

  // Skip if this is not a state-changing request or is an exempt route
  if (shouldSkipCsrf(config.url, config.method)) {
    return config;
  }

  // Only add CSRF token in browser environment
  if (!isBrowser()) {
    return config;
  }

  try {
    const token = await getCsrfToken();

    if (token) {
      // Add CSRF token to request headers
      config.headers = config.headers || {};
      config.headers['x-csrf-token'] = token;

      if (isDevelopment()) {
        console.log('[CSRF] Token added to request:', config.url);
      }
    } else if (isDevelopment()) {
      console.warn('[CSRF] No token available for request:', config.url);
    }
  } catch (error) {
    if (isDevelopment()) {
      console.error('[CSRF] Error adding token to request:', error);
    }
    // Continue without CSRF token - server will reject if required
  }

  return config;
};

/**
 * Request interceptor for debug logging (development only)
 */
export const requestLoggerInterceptor = (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
  if (!isDevelopment() || !isBrowser()) {
    return config;
  }

  const fullURL = `${config.baseURL}${config.url}`;
  console.log(`[HTTP] ${config.method?.toUpperCase()} ${fullURL}`);

  return config;
};

/**
 * Request error handler
 */
export const requestErrorHandler = (error: AxiosError): Promise<never> => {
  if (isDevelopment() && isBrowser()) {
    console.error('[HTTP] Request configuration error:', error.message);
  }
  return Promise.reject(error);
};

// ==============================|| RESPONSE INTERCEPTORS ||============================== //

/**
 * Response success handler with optional logging
 */
export const responseSuccessHandler = (response: AxiosResponse): AxiosResponse => {
  if (isDevelopment() && isBrowser()) {
    const { config, status } = response;
    console.log(`[HTTP] ${status} ${config.method?.toUpperCase()} ${config.url}`);
  }
  return response;
};

/**
 * Response error handler with standardized error processing
 */
export const responseErrorHandler = (error: AxiosError): Promise<never> => {
  const config = error.config as HttpRequestConfig | undefined;

  // Skip error handling if explicitly requested
  if (config?.skipErrorHandling) {
    return Promise.reject(error);
  }

  // Extract error details
  const status = error.response?.status || 0;
  const responseData = error.response?.data as Record<string, unknown> | undefined;

  // Determine error message
  let message: string;
  let code: string;
  let details: Record<string, unknown> | undefined;

  if (!error.response) {
    // Network error (server unreachable)
    message = NETWORK_ERROR_MESSAGE;
    code = 'NETWORK_ERROR';
  } else if (responseData?.error && typeof responseData.error === 'object') {
    // Structured error response from API
    const apiError = responseData.error as { code?: string; message?: string; details?: Record<string, unknown> };
    message = apiError.message || getErrorMessage(status);
    code = apiError.code || `HTTP_${status}`;
    details = apiError.details;
  } else if (typeof responseData?.message === 'string') {
    // Simple message in response
    message = responseData.message;
    code = `HTTP_${status}`;
  } else {
    // Fall back to default message
    message = getErrorMessage(status);
    code = `HTTP_${status}`;
  }

  // Log error in development
  if (isDevelopment() && isBrowser()) {
    console.error(`[HTTP] Error ${status}:`, message, {
      url: error.config?.url,
      method: error.config?.method?.toUpperCase(),
      code,
    });
  }

  // Handle 401 Unauthorized - redirect to login
  if (status === 401 && isBrowser()) {
    handleUnauthorizedError();
  }

  // Handle 403 Forbidden - check for CSRF error
  if (status === 403 && isBrowser()) {
    handleCsrfError(responseData);
  }

  // Create and throw HttpError
  const httpError = new HttpError(message, status, code, error, details);
  return Promise.reject(httpError);
};

/**
 * Handle 401 unauthorized errors
 * Clears auth state and redirects to login
 */
const handleUnauthorizedError = (): void => {
  // Clear localStorage
  localStorage.removeItem('user');
  localStorage.removeItem('permissions');

  // Clear CSRF token cache
  clearCsrfToken();

  // Clear Zustand auth store
  useAuthStore.getState().logout();

  // Redirect to login if not already there
  if (!window.location.pathname.includes('/login')) {
    window.location.href = '/login';
  }
};

/**
 * Handle CSRF errors (403 with CSRF-related message)
 * Clears the token cache so a fresh token will be fetched on retry
 */
const handleCsrfError = (responseData: Record<string, unknown> | undefined): boolean => {
  if (!responseData) return false;

  // Check for CSRF-specific error responses
  const error = responseData.error as string | undefined;
  const message = responseData.message as string | undefined;

  const isCsrfError =
    error?.includes('CSRF') ||
    message?.includes('CSRF') ||
    error === 'CSRF Token Missing' ||
    error === 'Invalid CSRF Token';

  if (isCsrfError) {
    if (isDevelopment() && isBrowser()) {
      console.warn('[CSRF] Token rejected, clearing cache for retry');
    }
    clearCsrfToken();
    return true;
  }

  return false;
};
