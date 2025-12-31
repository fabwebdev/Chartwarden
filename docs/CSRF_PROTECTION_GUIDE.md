# CSRF Protection Implementation Guide

**Implemented**: December 28, 2025
**Phase**: 0 - Critical Security Fixes
**Ticket**: #004
**CVSS Score**: 8.1 (High)

## Overview

Cross-Site Request Forgery (CSRF) protection has been implemented to prevent attackers from tricking authenticated users into performing unwanted actions.

## How It Works

1. **Backend generates CSRF token** - Signed, httpOnly cookie-based tokens
2. **Frontend fetches token** - GET `/api/auth/csrf-token`
3. **Frontend includes token** - In `x-csrf-token` header for all POST/PUT/DELETE/PATCH requests
4. **Backend validates token** - Rejects requests with missing/invalid tokens

## Backend Configuration

### Server Setup (server.js)

```javascript
// CSRF protection is registered in server.js
app.register(import("@fastify/csrf-protection"), {
  sessionPlugin: '@fastify/cookie',
  cookieOpts: {
    signed: true,
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    path: '/'
  }
});
```

### Token Endpoint

**GET /api/auth/csrf-token**

Returns a CSRF token for the client to use.

**Response:**
```json
{
  "status": 200,
  "csrfToken": "abc123..."
}
```

### Protected Routes

Apply CSRF protection to state-changing routes:

```javascript
import { csrfProtection } from '../middleware/csrf.middleware.js';

// Apply to specific route
fastify.post('/api/patients', {
  preHandler: [authenticate, csrfProtection]
}, async (request, reply) => {
  // Route handler
});

// Or apply to all routes in a plugin
fastify.addHook('onRequest', csrfAutoProtect);
```

## Frontend Integration

### 1. Fetch CSRF Token on App Initialization

```javascript
// On app load (e.g., in main.js or App.vue)
async function initCSRF() {
  try {
    const response = await fetch('/api/auth/csrf-token', {
      credentials: 'include' // Important: include cookies
    });

    const data = await response.json();

    // Store token (localStorage, sessionStorage, or state management)
    localStorage.setItem('csrfToken', data.csrfToken);

    console.log('✅ CSRF token initialized');
  } catch (error) {
    console.error('❌ Failed to fetch CSRF token:', error);
  }
}

// Call on app initialization
initCSRF();
```

### 2. Include Token in State-Changing Requests

#### Option A: Fetch API

```javascript
async function createPatient(patientData) {
  const csrfToken = localStorage.getItem('csrfToken');

  const response = await fetch('/api/patients', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-csrf-token': csrfToken // Include CSRF token
    },
    credentials: 'include', // Include cookies
    body: JSON.stringify(patientData)
  });

  if (response.status === 403) {
    // CSRF token invalid or expired - refetch and retry
    await initCSRF();
    return createPatient(patientData); // Retry request
  }

  return response.json();
}
```

#### Option B: Axios Interceptor

```javascript
import axios from 'axios';

// Set up axios defaults
axios.defaults.withCredentials = true;

// Add request interceptor to include CSRF token
axios.interceptors.request.use(
  (config) => {
    // Only add CSRF token for state-changing requests
    if (['post', 'put', 'delete', 'patch'].includes(config.method.toLowerCase())) {
      const csrfToken = localStorage.getItem('csrfToken');
      if (csrfToken) {
        config.headers['x-csrf-token'] = csrfToken;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle CSRF errors
axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If CSRF error (403) and not already retried
    if (error.response?.status === 403 && !originalRequest._retry) {
      originalRequest._retry = true;

      // Refetch CSRF token
      await initCSRF();

      // Retry original request with new token
      const csrfToken = localStorage.getItem('csrfToken');
      originalRequest.headers['x-csrf-token'] = csrfToken;

      return axios(originalRequest);
    }

    return Promise.reject(error);
  }
);

// Usage
async function createPatient(patientData) {
  const response = await axios.post('/api/patients', patientData);
  return response.data;
}
```

#### Option C: React Hook (useCSRF)

```javascript
// hooks/useCSRF.js
import { useState, useEffect } from 'react';

export function useCSRF() {
  const [csrfToken, setCsrfToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchToken = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/auth/csrf-token', {
        credentials: 'include'
      });
      const data = await response.json();
      setCsrfToken(data.csrfToken);
      localStorage.setItem('csrfToken', data.csrfToken);
      setError(null);
    } catch (err) {
      setError(err);
      console.error('Failed to fetch CSRF token:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchToken();
  }, []);

  return { csrfToken, loading, error, refreshToken: fetchToken };
}

// Usage in component
function PatientForm() {
  const { csrfToken, loading } = useCSRF();

  const handleSubmit = async (formData) => {
    const response = await fetch('/api/patients', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-csrf-token': csrfToken
      },
      credentials: 'include',
      body: JSON.stringify(formData)
    });

    return response.json();
  };

  if (loading) return <div>Loading...</div>;

  return <form onSubmit={handleSubmit}>...</form>;
}
```

### 3. Handle CSRF Errors

```javascript
async function makeProtectedRequest(url, options) {
  let csrfToken = localStorage.getItem('csrfToken');

  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'x-csrf-token': csrfToken
    },
    credentials: 'include'
  });

  // Handle CSRF error
  if (response.status === 403) {
    const error = await response.json();

    if (error.error === 'Invalid CSRF Token' || error.error === 'CSRF Token Missing') {
      console.warn('CSRF token invalid, refreshing...');

      // Fetch new token
      await initCSRF();
      csrfToken = localStorage.getItem('csrfToken');

      // Retry request with new token
      return fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          'x-csrf-token': csrfToken
        },
        credentials: 'include'
      });
    }
  }

  return response;
}
```

## Testing

### Manual Testing with curl

```bash
# 1. Get CSRF token
curl -c cookies.txt http://localhost:3000/api/auth/csrf-token

# 2. Use token in POST request
curl -b cookies.txt \
  -H "Content-Type: application/json" \
  -H "x-csrf-token: <token-from-step-1>" \
  -d '{"name":"Test"}' \
  http://localhost:3000/api/patients

# 3. Test without token (should fail with 403)
curl -b cookies.txt \
  -H "Content-Type: application/json" \
  -d '{"name":"Test"}' \
  http://localhost:3000/api/patients
```

### Postman Testing

1. **Get CSRF Token**:
   - Method: GET
   - URL: `http://localhost:3000/api/auth/csrf-token`
   - Copy the `csrfToken` from response

2. **Use Token**:
   - Method: POST
   - URL: `http://localhost:3000/api/patients`
   - Headers: `x-csrf-token: <paste-token-here>`
   - Body: Your JSON data

## Development Mode

To disable CSRF protection in local development (NOT recommended):

```bash
# .env
DISABLE_CSRF=true
NODE_ENV=development
```

**⚠️  WARNING**: Never disable CSRF in production!

## Security Considerations

### ✅ DO

- Always include CSRF token in state-changing requests (POST/PUT/DELETE/PATCH)
- Store token in memory or localStorage (not in cookies - that defeats the purpose)
- Refresh token if it expires (handle 403 errors)
- Use `credentials: 'include'` for all API requests
- Enable CSRF in production

### ❌ DON'T

- Don't store CSRF token in cookies (defeats CSRF protection)
- Don't include token in URL query parameters (can leak in logs/referrers)
- Don't disable CSRF protection in production
- Don't share tokens between users
- Don't hardcode tokens

## Common Errors

### Error: "CSRF Token Missing"

**Cause**: Request missing `x-csrf-token` header

**Solution**:
```javascript
headers: {
  'x-csrf-token': csrfToken
}
```

### Error: "Invalid CSRF Token"

**Cause**: Token expired or invalid

**Solution**:
```javascript
// Refetch token
await fetch('/api/auth/csrf-token');
// Retry request
```

### Error: "CSRF validation failed"

**Cause**: Missing cookies (credentials not included)

**Solution**:
```javascript
fetch('/api/endpoint', {
  credentials: 'include' // Add this!
});
```

## Compliance

**HIPAA**: §164.312(a)(1) - Access Control
- CSRF protection prevents unauthorized actions on behalf of authenticated users
- Protects against unauthorized access to ePHI

**OWASP Top 10**: A01:2021 - Broken Access Control
- CSRF is a form of broken access control
- This implementation follows OWASP CSRF prevention best practices

## References

- [@fastify/csrf-protection Documentation](https://github.com/fastify/csrf-protection)
- [OWASP CSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- [HIPAA Security Rule §164.312(a)(1)](https://www.hhs.gov/hipaa/for-professionals/security/laws-regulations/index.html)

---

**Last Updated**: December 28, 2025
**Next Review**: March 28, 2026
