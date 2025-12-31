/**
 * Better Auth Client Configuration
 *
 * This client is used for OAuth social provider authentication.
 * Email/password authentication uses direct API calls for better control.
 */
import { createAuthClient } from "better-auth/react";

// Get the API base URL from environment
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';

// Create the Better Auth client for social authentication
export const authClient = createAuthClient({
  baseURL: API_BASE_URL,
  // Credentials must be included for cookies to work cross-origin
  fetchOptions: {
    credentials: 'include',
  },
});

// Export individual methods for convenience
export const { signIn, signOut, signUp, useSession } = authClient;

// Helper function to initiate Google OAuth
export const signInWithGoogle = async (callbackURL: string = '/sample-page') => {
  return await authClient.signIn.social({
    provider: 'google',
    callbackURL,
    errorCallbackURL: '/login?error=oauth',
    newUserCallbackURL: callbackURL,
  });
};

// Helper function to initiate GitHub OAuth
export const signInWithGitHub = async (callbackURL: string = '/sample-page') => {
  return await authClient.signIn.social({
    provider: 'github',
    callbackURL,
    errorCallbackURL: '/login?error=oauth',
    newUserCallbackURL: callbackURL,
  });
};
