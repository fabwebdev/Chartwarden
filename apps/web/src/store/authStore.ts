import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { UserProfile } from 'types/auth';

// ==============================|| AUTH STORE - TYPES ||============================== //

interface AuthState {
  // State
  user: UserProfile | null;
  permissions: string[];
  isAuthenticated: boolean;
  isInitialized: boolean;
  isLoading: boolean;

  // Actions
  setUser: (user: UserProfile | null, permissions?: string[]) => void;
  setPermissions: (permissions: string[]) => void;
  setInitialized: (initialized: boolean) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;
}

// ==============================|| AUTH STORE ||============================== //

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      permissions: [],
      isAuthenticated: false,
      isInitialized: false,
      isLoading: false,

      // Set user and optionally permissions
      setUser: (user, permissions) => {
        set({
          user,
          isAuthenticated: !!user && !!user.id,
          ...(permissions !== undefined && { permissions }),
        });
      },

      // Set permissions separately
      setPermissions: (permissions) => {
        set({ permissions });
      },

      // Mark store as initialized (after initial auth check)
      setInitialized: (initialized) => {
        set({ isInitialized: initialized });
      },

      // Set loading state
      setLoading: (loading) => {
        set({ isLoading: loading });
      },

      // Clear all auth state on logout
      logout: () => {
        set({
          user: null,
          permissions: [],
          isAuthenticated: false,
          isLoading: false,
        });
      },

      // Check if user has a specific permission
      hasPermission: (permission) => {
        const { permissions } = get();
        return permissions.includes(permission);
      },

      // Check if user has any of the specified permissions
      hasAnyPermission: (requiredPermissions) => {
        const { permissions } = get();
        return requiredPermissions.some((p) => permissions.includes(p));
      },

      // Check if user has all of the specified permissions
      hasAllPermissions: (requiredPermissions) => {
        const { permissions } = get();
        return requiredPermissions.every((p) => permissions.includes(p));
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      // Only persist user and permissions, not transient state
      partialize: (state) => ({
        user: state.user,
        permissions: state.permissions,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// ==============================|| AUTH STORE - SELECTORS ||============================== //

// Convenience selectors for common use cases
export const selectUser = (state: AuthState) => state.user;
export const selectPermissions = (state: AuthState) => state.permissions;
export const selectIsAuthenticated = (state: AuthState) => state.isAuthenticated;
export const selectIsInitialized = (state: AuthState) => state.isInitialized;
export const selectIsLoading = (state: AuthState) => state.isLoading;
