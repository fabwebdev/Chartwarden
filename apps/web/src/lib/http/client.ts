/**
 * HTTP Client
 *
 * Centralized Axios instance with request/response interceptors,
 * authentication handling, and standardized error processing.
 *
 * @example
 * // Basic usage
 * import { http } from 'lib/http';
 *
 * // GET request
 * const response = await http.get<UserData>('/users/me');
 *
 * // POST request
 * const newUser = await http.post<User>('/users', { name: 'John' });
 *
 * // With custom config
 * const data = await http.get('/public/data', { skipAuth: true });
 */

import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { httpConfig, defaultHeaders, getApiBaseURL } from './config';
import {
  credentialsInterceptor,
  csrfInterceptor,
  requestLoggerInterceptor,
  requestErrorHandler,
  responseSuccessHandler,
  responseErrorHandler,
} from './interceptors';
import { ApiResponse, HttpRequestConfig } from './types';

// ==============================|| AXIOS INSTANCE ||============================== //

/**
 * Create the main Axios instance with base configuration
 */
const createHttpClient = (): AxiosInstance => {
  const instance = axios.create({
    baseURL: httpConfig.baseURL,
    timeout: httpConfig.timeout,
    headers: defaultHeaders,
    withCredentials: httpConfig.withCredentials,
  });

  // Add request interceptors (executed in order)
  // 1. Ensure credentials (cookies) are included
  instance.interceptors.request.use(credentialsInterceptor, requestErrorHandler);
  // 2. Add CSRF token for state-changing requests
  instance.interceptors.request.use(csrfInterceptor, requestErrorHandler);
  // 3. Log requests in development
  instance.interceptors.request.use(requestLoggerInterceptor, requestErrorHandler);

  // Add response interceptors
  instance.interceptors.response.use(responseSuccessHandler, responseErrorHandler);

  return instance;
};

/**
 * Main HTTP client instance
 */
const httpClient = createHttpClient();

// ==============================|| HTTP CLIENT API ||============================== //

/**
 * HTTP client with typed methods for API requests
 */
export const http = {
  /**
   * The underlying Axios instance
   */
  instance: httpClient,

  /**
   * GET request
   */
  async get<T = unknown>(url: string, config?: HttpRequestConfig): Promise<AxiosResponse<T>> {
    return httpClient.get<T>(url, config);
  },

  /**
   * POST request
   */
  async post<T = unknown>(url: string, data?: unknown, config?: HttpRequestConfig): Promise<AxiosResponse<T>> {
    return httpClient.post<T>(url, data, config);
  },

  /**
   * PUT request
   */
  async put<T = unknown>(url: string, data?: unknown, config?: HttpRequestConfig): Promise<AxiosResponse<T>> {
    return httpClient.put<T>(url, data, config);
  },

  /**
   * PATCH request
   */
  async patch<T = unknown>(url: string, data?: unknown, config?: HttpRequestConfig): Promise<AxiosResponse<T>> {
    return httpClient.patch<T>(url, data, config);
  },

  /**
   * DELETE request
   */
  async delete<T = unknown>(url: string, config?: HttpRequestConfig): Promise<AxiosResponse<T>> {
    return httpClient.delete<T>(url, config);
  },
};

// ==============================|| SWR FETCHERS ||============================== //

/**
 * SWR fetcher for GET requests
 * Returns the response data directly
 *
 * @example
 * const { data } = useSWR('/users', fetcher);
 */
export const fetcher = async <T = unknown>(url: string): Promise<T> => {
  const response = await httpClient.get<T>(url);
  return response.data;
};

/**
 * SWR fetcher with custom config
 *
 * @example
 * const { data } = useSWR(['/users', { params: { page: 1 } }], fetcherWithConfig);
 */
export const fetcherWithConfig = async <T = unknown>([url, config]: [string, HttpRequestConfig?]): Promise<T> => {
  const response = await httpClient.get<T>(url, config);
  return response.data;
};

/**
 * SWR fetcher for POST requests (mutations)
 *
 * @example
 * const { trigger } = useSWRMutation('/users', fetcherPost);
 * trigger({ name: 'John' });
 */
export const fetcherPost = async <T = unknown>(url: string, { arg }: { arg: unknown }): Promise<T> => {
  const response = await httpClient.post<T>(url, arg);
  return response.data;
};

// ==============================|| UTILITY FUNCTIONS ||============================== //

/**
 * Extract data from an API response
 * Useful for unwrapping the standard { success, data } response format
 */
export const extractData = <T>(response: AxiosResponse<ApiResponse<T>>): T | undefined => {
  return response.data.data;
};

/**
 * Check if a response was successful
 */
export const isSuccessResponse = (response: AxiosResponse<ApiResponse>): boolean => {
  return response.data.success === true;
};

/**
 * Get the current API base URL
 */
export { getApiBaseURL };

// ==============================|| DEFAULT EXPORT ||============================== //

export default httpClient;
