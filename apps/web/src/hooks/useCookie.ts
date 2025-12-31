/**
 * HTTP Client Hook
 *
 * Re-exports the centralized HTTP client for backwards compatibility.
 * New code should import directly from 'lib/http' instead.
 *
 * @deprecated Use `import { http } from 'lib/http'` or `import httpClient from 'lib/http'` instead.
 *
 * @example
 * // Old way (still works)
 * import http from 'hooks/useCookie';
 *
 * // New way (preferred)
 * import { http } from 'lib/http';
 */

import httpClient from '../lib/http/client';

export default httpClient;