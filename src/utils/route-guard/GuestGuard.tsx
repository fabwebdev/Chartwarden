'use client';

import { useEffect, useState } from 'react';

// NEXT
import { useRouter } from 'next/navigation';

// PROJECT IMPORTS
// TYPES
import { GuardProps } from 'types/auth';
import AuthService from 'types/AuthService';

// ==============================|| GUEST GUARD ||============================== //

const GuestGuard = ({ children }: GuardProps) => {
  const router = useRouter();
  const { isLoggedIn } = AuthService();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      // Check if we're already on the login page to avoid redirect loops
      if (typeof window !== 'undefined' && window.location.pathname === '/login') {
        setIsChecking(false);
        return;
      }
      
      // Small delay to ensure state is updated after logout
      await new Promise(resolve => setTimeout(resolve, 100));
      
      if (isLoggedIn()) {
        router.push('/sample-page');
      } else {
        // Only render children if not logged in
        setIsChecking(false);
      }
    };
    
    checkAuth();
  }, [isLoggedIn, router]);

  // Show nothing while checking auth status
  if (isChecking) {
    return null;
  }

  return <>{children}</>;
};

export default GuestGuard;