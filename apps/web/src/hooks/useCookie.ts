import axios from 'axios';

// Helper function to ensure baseURL always ends with /api
const getBaseURL = () => {
  const envURL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';
  
  // Remove trailing slash if present
  const cleanURL = envURL.replace(/\/$/, '');
  
  // Append /api if not already present
  const baseURL = cleanURL.endsWith('/api') ? cleanURL : `${cleanURL}/api`;
  
  // Log the base URL for debugging (in both dev and prod)
  if (typeof window !== 'undefined') {
    console.log('🔗 API Base URL:', baseURL);
    console.log('📝 Environment Variable:', process.env.NEXT_PUBLIC_API_BASE_URL || 'Not set (using default)');
  }
  
  return baseURL;
};

// Create an Axios instance with cookie-based authentication
const baseURL = getBaseURL();
const axiosInstance = axios.create({
  baseURL: baseURL,
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  },
  // IMPORTANT: Include cookies in all requests for session-based authentication
  // This ensures cookies are sent with every request (equivalent to credentials: 'include' in fetch)
  withCredentials: true
});

// Request interceptor to verify credentials are being sent (for debugging)
axiosInstance.interceptors.request.use(
  (config) => {
    // CRITICAL: Always ensure withCredentials is true (cannot be overridden)
    // This is required for cookie-based authentication to work
    config.withCredentials = true;
    
    // Note: Origin header is automatically set by the browser and cannot be manually set
    // The browser sets Origin to the frontend's origin (e.g., http://localhost:3001)
    // This is a security feature and cannot be overridden
    
    // Log cookie info (in both dev and prod for debugging)
    if (typeof window !== 'undefined') {
      const cookies = document.cookie;
      const hasSessionCookie = cookies.includes('better-auth.session_token');
      
      console.log(`📤 Request to ${config.url}:`, {
        method: config.method?.toUpperCase(),
        withCredentials: config.withCredentials, // Should always be true
        baseURL: config.baseURL,
        fullURL: `${config.baseURL}${config.url}`,
        hasSessionCookie: hasSessionCookie,
        frontendOrigin: window.location.origin, // This is what Origin header will be
        backendOrigin: config.baseURL?.replace('/api', ''),
        // Note: Origin header is automatically set by browser to frontendOrigin
        // Check Network tab to see actual headers sent
      });
      
      if (!hasSessionCookie && config.url?.includes('/auth/me')) {
        console.error('❌ CRITICAL: No session cookie found before /auth/me request!');
        console.error('📋 All cookies:', cookies || 'No cookies found');
        console.error('🔍 This request will fail with 401 Unauthorized');
        console.error('💡 The cookie was likely not set due to SameSite=Lax on cross-origin request');
        console.error('✅ Backend must change cookie to: SameSite=None; Secure');
        
        // Check if it's cross-origin
        const frontendOrigin = window.location.origin;
        const backendOrigin = config.baseURL?.replace('/api', '') || '';
        if (frontendOrigin !== backendOrigin) {
          console.error('🌐 Cross-origin detected:', {
            frontend: frontendOrigin,
            backend: backendOrigin
          });
        }
      }
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle 401 errors (unauthorized)
axiosInstance.interceptors.response.use(
  (response) => {
    // Log response headers to verify set-cookie is present (in both dev and prod)
    if (typeof window !== 'undefined') {
      const setCookieHeader = response.headers['set-cookie'] || response.headers['Set-Cookie'];
      if (setCookieHeader) {
        const cookieString = Array.isArray(setCookieHeader) ? setCookieHeader[0] : setCookieHeader;
        console.log(`✅ Received set-cookie header for ${response.config.url}:`, cookieString);
        
        // Check for SameSite attribute
        if (cookieString.includes('SameSite=Lax') || cookieString.includes('SameSite=lax')) {
          const currentOrigin = window.location.origin;
          const apiOrigin = response.config.baseURL?.replace('/api', '') || '';
          
          // Check if it's a cross-origin request
          if (currentOrigin !== apiOrigin && apiOrigin !== '') {
            console.error('⚠️ COOKIE CONFIGURATION ISSUE DETECTED!');
            console.error('The cookie is set with SameSite=Lax, but this is a cross-origin request.');
            console.error('Frontend:', currentOrigin);
            console.error('Backend:', apiOrigin);
            console.error('Solution: Backend must set SameSite=None (with Secure=true) for cross-origin requests.');
            console.error('Current cookie:', cookieString);
          }
        }
      } else if (response.config.url?.includes('/auth/sign-in')) {
        console.warn('⚠️ No Set-Cookie header received in login response!');
      }
    }
    return response;
  },
  (error) => {
    // Log error details (in both dev and prod for debugging)
    if (typeof window !== 'undefined') {
      const fullURL = error.config?.baseURL && error.config?.url 
        ? `${error.config.baseURL}${error.config.url}` 
        : error.config?.url || 'Unknown URL';
      
      console.error(`❌ Request failed:`, {
        url: fullURL,
        method: error.config?.method?.toUpperCase(),
        status: error.response?.status,
        statusText: error.response?.statusText,
        message: error.response?.data?.message || error.message,
        baseURL: error.config?.baseURL,
        // Check if cookie was sent (browser handles this, check Network tab)
        // If 401 and no cookie was sent, it's likely a cookie configuration issue
      });
    }
    
    // If we get a 401, the session is invalid
    if (error.response?.status === 401) {
      // Clear local storage
      localStorage.removeItem('user');
      localStorage.removeItem('permissions');
      
      // Only redirect if we're not already on the login page
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;