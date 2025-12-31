/**
 * HTTP Client Types
 *
 * Standardized type definitions for API responses and error handling.
 */

import { AxiosError, AxiosRequestConfig } from 'axios';

// ==============================|| API RESPONSE TYPES ||============================== //

/**
 * Standard API success response structure
 * Matches the backend ApiResponse format
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
}

/**
 * Standard API error response structure
 */
export interface ApiErrorResponse {
  success: false;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  message?: string;
}

/**
 * Paginated API response structure
 */
export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ==============================|| HTTP ERROR TYPES ||============================== //

/**
 * Custom HTTP error class with additional context
 */
export class HttpError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly details?: Record<string, unknown>;
  public readonly isNetworkError: boolean;
  public readonly originalError: AxiosError;

  constructor(
    message: string,
    status: number,
    code: string,
    originalError: AxiosError,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.code = code;
    this.details = details;
    this.isNetworkError = !originalError.response;
    this.originalError = originalError;
  }

  /**
   * Check if error is an authentication error (401)
   */
  isAuthError(): boolean {
    return this.status === 401;
  }

  /**
   * Check if error is a forbidden error (403)
   */
  isForbidden(): boolean {
    return this.status === 403;
  }

  /**
   * Check if error is a not found error (404)
   */
  isNotFound(): boolean {
    return this.status === 404;
  }

  /**
   * Check if error is a validation error (400 or 422)
   */
  isValidationError(): boolean {
    return this.status === 400 || this.status === 422;
  }

  /**
   * Check if error is a server error (5xx)
   */
  isServerError(): boolean {
    return this.status >= 500;
  }
}

// ==============================|| REQUEST CONFIG TYPES ||============================== //

/**
 * Extended axios config with custom options
 */
export interface HttpRequestConfig extends AxiosRequestConfig {
  /**
   * Skip authentication header for this request
   */
  skipAuth?: boolean;

  /**
   * Skip error handling (don't redirect on 401, etc.)
   */
  skipErrorHandling?: boolean;

  /**
   * Skip CSRF token for this request
   * Useful for auth endpoints (sign-in, sign-up) that don't require CSRF
   */
  skipCsrf?: boolean;

  /**
   * Custom retry configuration
   */
  retry?: {
    count: number;
    delay: number;
  };
}

// ==============================|| HTTP CLIENT CONFIG ||============================== //

/**
 * HTTP client configuration options
 */
export interface HttpClientConfig {
  /**
   * Base URL for API requests
   */
  baseURL: string;

  /**
   * Request timeout in milliseconds
   */
  timeout: number;

  /**
   * Enable debug logging
   */
  debug: boolean;

  /**
   * Include credentials (cookies) with requests
   */
  withCredentials: boolean;
}

// ==============================|| UTILITY TYPES ||============================== //

/**
 * Extract the data type from an API response
 */
export type ExtractData<T> = T extends ApiResponse<infer U> ? U : never;

/**
 * Make a type that can be either the success type or an error
 */
export type ApiResult<T> = ApiResponse<T> | ApiErrorResponse;
