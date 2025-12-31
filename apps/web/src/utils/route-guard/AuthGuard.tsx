'use client';

import { useEffect, useState, useRef } from 'react';

// NEXT
import { useRouter } from 'next/navigation';

// PROJECT IMPORTS

// TYPES
import { GuardProps } from 'types/auth';
import AuthService from 'types/AuthService';

// ==============================|| AUTH GUARD ||============================== //

const AuthGuard = ({ children }: GuardProps) => {
  const { isLoggedIn, getUserProfile } = AuthService();
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);
  const hasCheckedRef = useRef(false);

  useEffect(() => {
    // Prevent multiple simultaneous checks
    if (hasCheckedRef.current) return;
    
    const checkAuth = async () => {
      hasCheckedRef.current = true;
      
      try {
        // First check localStorage for quick check
        if (!isLoggedIn()) {
          // Try to verify session with API call
          const user = await getUserProfile();
          
          if (!user) {
            // No valid session, redirect to login
            router.push('/login');
            return;
          }
        } else {
          // User exists in localStorage, verify session is still valid
          const user = await getUserProfile();
          
          if (!user) {
            // Session expired, redirect to login
            router.push('/login');
            return;
          }
        }
        
        // User is authenticated, render children
        setIsChecking(false);
      } catch (error) {
        console.error('Auth check error:', error);
        router.push('/login');
      }
    };
    
    checkAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array - only run once on mount

  // Show nothing while checking auth status
  if (isChecking) {
    return null;
  }

  return <>{children}</>;
};

export default AuthGuard;