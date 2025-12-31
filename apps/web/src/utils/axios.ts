/**
 * Axios Services - Legacy Export
 *
 * This file is maintained for backwards compatibility with older imports.
 * New code should use the centralized HTTP client from 'lib/http'.
 *
 * @deprecated Use `import { http, fetcher } from 'lib/http'` instead.
 */

import httpClient, { fetcher as httpFetcher, fetcherWithConfig } from '../lib/http/client';
import { AxiosRequestConfig } from 'axios';

// Re-export the http client as axiosServices for compatibility
const axiosServices = httpClient;

export default axiosServices;

/**
 * SWR-compatible fetcher for GET requests
 * @deprecated Use `import { fetcher } from 'lib/http'` instead
 */
export const fetcher = async (args: string | [string, AxiosRequestConfig]) => {
  if (Array.isArray(args)) {
    return fetcherWithConfig(args);
  }
  return httpFetcher(args);
};

/**
 * SWR-compatible fetcher for POST requests
 * @deprecated Use `import { fetcherPost } from 'lib/http'` instead
 */
export const fetcherPost = async (args: string | [string, AxiosRequestConfig]) => {
  const [url, config] = Array.isArray(args) ? args : [args];
  const res = await axiosServices.post(url, { ...config });
  return res.data;
};
