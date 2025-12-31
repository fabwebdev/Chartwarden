'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import AuthService from 'types/AuthService';
import axiosInstance from 'hooks/useCookie';

/**
 * OAuth Callback Page
 *
 * This page handles the redirect from OAuth providers (Google, GitHub).
 * After successful OAuth authentication, Better Auth sets cookies and redirects here.
 * We then fetch the user profile and complete the sign-in process.
 */
const OAuthCallbackPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(true);
  const { setToken } = AuthService();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Check for error in URL params
        const errorParam = searchParams.get('error');
        if (errorParam) {
          setError(errorParam);
          setIsProcessing(false);
          return;
        }

        // Wait a moment for cookies to be set
        await new Promise(resolve => setTimeout(resolve, 500));

        // Fetch user profile (session should be established via cookies)
        const profileResponse = await axiosInstance.get('/auth/me');

        if (profileResponse.status === 200 && profileResponse.data?.data?.user) {
          const user = profileResponse.data.data.user;
          const permissions = user.permissions || [];

          // Store user and permissions
          setToken(user, permissions);

          // Get the intended redirect URL or default to sample-page
          const callbackURL = searchParams.get('callbackURL') || '/sample-page';

          // Redirect to the intended page
          router.push(callbackURL);
        } else {
          setError('Failed to fetch user profile after OAuth authentication');
          setIsProcessing(false);
        }
      } catch (err: any) {
        console.error('OAuth callback error:', err);
        setError(err?.response?.data?.message || err?.message || 'OAuth authentication failed');
        setIsProcessing(false);
      }
    };

    handleCallback();
  }, [router, searchParams, setToken]);

  if (error) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          gap: 2,
          p: 3,
        }}
      >
        <Alert severity="error" sx={{ maxWidth: 400, width: '100%' }}>
          {error}
        </Alert>
        <Button
          variant="contained"
          onClick={() => router.push('/login')}
        >
          Back to Login
        </Button>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        gap: 2,
      }}
    >
      <CircularProgress size={48} />
      <Typography variant="h6">
        {isProcessing ? 'Completing sign in...' : 'Redirecting...'}
      </Typography>
    </Box>
  );
};

export default OAuthCallbackPage;
