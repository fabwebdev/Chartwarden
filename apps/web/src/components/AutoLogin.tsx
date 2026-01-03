'use client';

import { useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import axiosInstance from '../hooks/useCookie';
import AuthService from '../types/AuthService';

/**
 * AutoLogin Component
 *
 * Automatically logs in users in development mode for testing convenience.
 *
 * Features:
 * - Only runs in development (NODE_ENV === 'development')
 * - Only runs if NEXT_PUBLIC_DEV_AUTO_LOGIN is true
 * - Skips if user is already logged in
 * - Skips on login/register pages to avoid redirect loops
 * - Uses real authentication (not bypassed)
 *
 * Security:
 * - Disabled in production automatically
 * - Uses environment variables for credentials
 * - Can be disabled by setting NEXT_PUBLIC_DEV_AUTO_LOGIN=false
 */
const AutoLogin = () => {
  const router = useRouter();
  const pathname = usePathname();
  const { isLoggedIn, setToken } = AuthService();
  const hasAttemptedLogin = useRef(false);

  useEffect(() => {
    const attemptAutoLogin = async () => {
      // Only run in development
      if (process.env.NODE_ENV !== 'development') {
        return;
      }

      // Check if auto-login is enabled
      const autoLoginEnabled = process.env.NEXT_PUBLIC_DEV_AUTO_LOGIN === 'true';
      if (!autoLoginEnabled) {
        return;
      }

      // Skip if already logged in
      if (isLoggedIn()) {
        return;
      }

      // Skip on auth pages to avoid redirect loops
      const authPages = ['/login', '/register', '/forgot-password', '/reset-password'];
      if (authPages.some(page => pathname?.includes(page))) {
        return;
      }

      // Prevent multiple login attempts
      if (hasAttemptedLogin.current) {
        return;
      }

      hasAttemptedLogin.current = true;

      try {
        const email = process.env.NEXT_PUBLIC_DEV_EMAIL;
        const password = process.env.NEXT_PUBLIC_DEV_PASSWORD;

        if (!email || !password) {
          console.warn('[AutoLogin] Dev credentials not found in environment variables');
          return;
        }

        console.log('[AutoLogin] Attempting auto-login in development mode...');

        // Step 1: Login with Better Auth
        const loginResponse = await axiosInstance.post('/auth/sign-in/email', {
          email,
          password,
        });

        if (loginResponse.status === 200) {
          // Small delay to ensure cookie is set
          await new Promise(resolve => setTimeout(resolve, 500));

          // Step 2: Fetch user profile with permissions
          const profileResponse = await axiosInstance.get('/auth/me');

          if (profileResponse.status === 200 && profileResponse.data?.data?.user) {
            const user = profileResponse.data.data.user;
            const permissions = user.permissions || [];

            // Store user and permissions
            setToken(user, permissions);

            console.log('[AutoLogin] ✅ Auto-login successful');

            // Redirect to dashboard if on root or auth page
            if (pathname === '/' || authPages.some(page => pathname?.includes(page))) {
              router.push('/sample-page');
            }
          }
        }
      } catch (error: any) {
        // Don't spam console in dev mode, just log once
        if (error.response?.status === 401) {
          console.warn('[AutoLogin] Invalid dev credentials. Please check .env.local');
        } else if (error.code !== 'ERR_NETWORK') {
          console.error('[AutoLogin] Auto-login failed:', error.message);
        }
        // Reset flag to allow retry on next navigation
        hasAttemptedLogin.current = false;
      }
    };

    attemptAutoLogin();
  }, [pathname, isLoggedIn, setToken, router]);

  // This component doesn't render anything
  return null;
};

export default AutoLogin;
