import { useCallback, useEffect } from 'react';
import { useAuthStore } from 'store/authStore';
import axiosInstance from './useCookie';
import { useAbility } from 'contexts/AbilityContext';

// ==============================|| HOOKS - AUTH ||============================== //

/**
 * Custom hook for authentication operations using Zustand store
 * Provides a clean API for components to interact with auth state
 */
const useAuth = () => {
  // Get state from Zustand store
  const user = useAuthStore((state) => state.user);
  const permissions = useAuthStore((state) => state.permissions);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isInitialized = useAuthStore((state) => state.isInitialized);
  const isLoading = useAuthStore((state) => state.isLoading);

  // Get actions from Zustand store
  const setUser = useAuthStore((state) => state.setUser);
  const setPermissions = useAuthStore((state) => state.setPermissions);
  const setInitialized = useAuthStore((state) => state.setInitialized);
  const setLoading = useAuthStore((state) => state.setLoading);
  const logoutStore = useAuthStore((state) => state.logout);
  const hasPermissionStore = useAuthStore((state) => state.hasPermission);
  const hasAnyPermissionStore = useAuthStore((state) => state.hasAnyPermission);
  const hasAllPermissionsStore = useAuthStore((state) => state.hasAllPermissions);

  // Get CASL ability functions
  let updateAbilityFromRole: ((role: string) => void) | null = null;
  try {
    const abilityContext = useAbility();
    updateAbilityFromRole = abilityContext.updateAbilityFromRole;
  } catch {
    // AbilityProvider may not be mounted yet during initial render
  }

  // Sync CASL abilities when user role changes
  useEffect(() => {
    if (user?.role && updateAbilityFromRole) {
      updateAbilityFromRole(user.role);
    }
  }, [user?.role, updateAbilityFromRole]);

  // Fetch user profile and sync with store
  const fetchUserProfile = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axiosInstance.get('/auth/me');

      if (response.status === 200 && response.data?.data?.user) {
        const userData = response.data.data.user;
        const userPermissions = userData.permissions || [];

        // Update Zustand store
        setUser(userData, userPermissions);

        // Also sync to localStorage for backwards compatibility
        localStorage.setItem('user', JSON.stringify(userData));
        localStorage.setItem('permissions', JSON.stringify(userPermissions));

        setInitialized(true);
        setLoading(false);

        return userData;
      }

      setLoading(false);
      return null;
    } catch (error: any) {
      if (error.response?.status === 401) {
        // Clear everything on auth failure
        logoutStore();
        localStorage.removeItem('user');
        localStorage.removeItem('permissions');
      }
      setInitialized(true);
      setLoading(false);
      return null;
    }
  }, [setUser, setInitialized, setLoading, logoutStore]);

  // Login function
  const login = useCallback(
    async (email: string, password: string) => {
      setLoading(true);
      try {
        const loginResponse = await axiosInstance.post('/auth/sign-in/email', {
          email,
          password,
        });

        if (loginResponse.status === 200) {
          // Add small delay to ensure cookie is set
          await new Promise((resolve) => setTimeout(resolve, 500));

          // Fetch user profile
          const userData = await fetchUserProfile();

          if (userData) {
            return { success: true, user: userData };
          }

          return { success: false, error: 'Failed to fetch user profile' };
        }

        return { success: false, error: 'Login failed' };
      } catch (error: any) {
        setLoading(false);
        const errorMessage =
          error.response?.data?.message ||
          (error.code === 'ERR_NETWORK' ? 'The server is not available' : 'Login failed');
        return { success: false, error: errorMessage };
      }
    },
    [setLoading, fetchUserProfile]
  );

  // Logout function
  const logout = useCallback(async () => {
    try {
      await axiosInstance.post('/auth/sign-out');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear localStorage
      localStorage.removeItem('user');
      localStorage.removeItem('permissions');

      // Clear Zustand store
      logoutStore();

      // Redirect to login
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
  }, [logoutStore]);

  // Check if user has a specific permission
  const hasPermission = useCallback(
    (permission: string): boolean => {
      return hasPermissionStore(permission);
    },
    [hasPermissionStore]
  );

  // Check if user has any of the specified permissions
  const hasAnyPermission = useCallback(
    (requiredPermissions: string[]): boolean => {
      return hasAnyPermissionStore(requiredPermissions);
    },
    [hasAnyPermissionStore]
  );

  // Check if user has all of the specified permissions
  const hasAllPermissions = useCallback(
    (requiredPermissions: string[]): boolean => {
      return hasAllPermissionsStore(requiredPermissions);
    },
    [hasAllPermissionsStore]
  );

  return {
    // State
    user,
    permissions,
    isAuthenticated,
    isInitialized,
    isLoading,

    // Actions
    login,
    logout,
    fetchUserProfile,
    setUser,
    setPermissions,

    // Permission helpers
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
  };
};

export default useAuth;
