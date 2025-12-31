/**
 * HTTP Client Module
 *
 * Centralized HTTP client with Axios, featuring:
 * - Base URL configuration from environment variables
 * - Request interceptors for credentials and logging
 * - Response interceptors for error handling
 * - Standardized error types with HttpError class
 * - SWR-compatible fetchers
 * - TypeScript support throughout
 *
 * @example
 * // Import the http client
 * import { http } from 'lib/http';
 *
 * // Make API requests
 * const users = await http.get<User[]>('/users');
 * const newUser = await http.post<User>('/users', { name: 'John' });
 *
 * // With SWR
 * import { fetcher } from 'lib/http';
 * const { data } = useSWR('/users', fetcher);
 *
 * // Handle errors
 * import { HttpError } from 'lib/http';
 * try {
 *   await http.get('/protected');
 * } catch (error) {
 *   if (error instanceof HttpError && error.isAuthError()) {
 *     // Handle authentication error
 *   }
 * }
 */

// Main HTTP client
export { default as httpClient, http, fetcher, fetcherWithConfig, fetcherPost, extractData, isSuccessResponse, getApiBaseURL } from './client';

// Types
export { HttpError } from './types';
export type {
  ApiResponse,
  ApiErrorResponse,
  PaginatedResponse,
  HttpRequestConfig,
  HttpClientConfig,
  ExtractData,
  ApiResult,
} from './types';

// Configuration
export { httpConfig, defaultHeaders, getErrorMessage, errorMessages, isDevelopment, isBrowser, NETWORK_ERROR_MESSAGE } from './config';

// Interceptors (for advanced use cases)
export {
  credentialsInterceptor,
  csrfInterceptor,
  clearCsrfToken,
  requestLoggerInterceptor,
  requestErrorHandler,
  responseSuccessHandler,
  responseErrorHandler,
} from './interceptors';
