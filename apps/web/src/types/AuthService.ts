import { useState } from "react";
import axiosInstance from '../hooks/useCookie';
import { useAuthStore } from '../store/authStore';

const AuthService = () => {
    const getUser = () => {
        const userString: any = localStorage.getItem('user');
        if (!userString) return null;
        try {
            return JSON.parse(userString);
        } catch (e) {
            return userString;
        }
    }

    const getPermissions = () => {
        const permissionsString: any = localStorage.getItem('permissions');
        if (!permissionsString) return [];
        try {
            return JSON.parse(permissionsString);
        } catch (e) {
            return permissionsString;
        }
    }

    const [user, setUser] = useState(getUser());
    const [permissions, setPermissions] = useState(getPermissions());

    const saveUser = (user: any, permissions: any) => {
        // Store user and permissions in localStorage (cookie-based auth, no token needed)
        localStorage.setItem('user', typeof user === 'string' ? user : JSON.stringify(user));
        localStorage.setItem('permissions', typeof permissions === 'string' ? permissions : JSON.stringify(permissions));

        setUser(user);
        setPermissions(permissions);

        // Sync with Zustand store
        const parsedUser = typeof user === 'string' ? JSON.parse(user) : user;
        const parsedPermissions = typeof permissions === 'string' ? JSON.parse(permissions) : permissions;
        useAuthStore.getState().setUser(parsedUser, parsedPermissions);
    }

    // Fetch user profile from /api/auth/me endpoint
    const getUserProfile = async () => {
        useAuthStore.getState().setLoading(true);
        try {
            const response = await axiosInstance.get("/auth/me");

            if (response.status === 200 && response.data?.data?.user) {
                const userData = response.data.data.user;
                const userPermissions = userData.permissions || [];

                // Update localStorage and state
                saveUser(userData, userPermissions);

                // Mark as initialized after successful auth check
                useAuthStore.getState().setInitialized(true);
                useAuthStore.getState().setLoading(false);

                return userData;
            }
            useAuthStore.getState().setLoading(false);
            return null;
        } catch (error: any) {
            // If 401, user is not authenticated
            if (error.response?.status === 401) {
                // Clear local storage
                localStorage.removeItem('user');
                localStorage.removeItem('permissions');
                setUser(null);
                setPermissions([]);

                // Clear Zustand store
                useAuthStore.getState().logout();
            }
            useAuthStore.getState().setInitialized(true);
            useAuthStore.getState().setLoading(false);
            return null;
        }
    };

    const logout = async () => {
        try {
            // Call the Better Auth sign-out endpoint
            await axiosInstance.post("/auth/sign-out");
        } catch (error) {
            console.error("Logout error:", error);
        } finally {
            // Clear local storage regardless of API call success
            localStorage.removeItem('user');
            localStorage.removeItem('permissions');

            // Update state to reflect logged out status
            setUser(null);
            setPermissions([]);

            // Clear Zustand store
            useAuthStore.getState().logout();

            // Force a page reload to ensure all components re-render with the new state
            if (typeof window !== 'undefined') {
                window.location.href = '/login';
            }
        }
    };

    // Helper function to check if user has a specific permission
    const hasPermission = (permission: string): boolean => {
        const userPermissions = getPermissions();
        return Array.isArray(userPermissions) && userPermissions.includes(permission);
    };

    return {
        setToken: saveUser, // Keep setToken name for backward compatibility
        user,
        permissions,
        getUser,
        getPermissions,
        getUserProfile,
        isLoggedIn: (): boolean => {
            // Always check localStorage directly to get the most current state
            const storedUser = getUser();
            return storedUser && storedUser.id !== undefined && storedUser.id !== 0;
        },
        hasPermission,
        logout
    }
}

export default AuthService;