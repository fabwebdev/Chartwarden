import { useAuthStore } from 'store/authStore';

// ==============================|| HOOKS - USER ||============================== //

/**
 * Custom hook for accessing the current user from Zustand auth store
 * Returns the user object or null if not authenticated
 */
const useUser = () => {
  const user = useAuthStore((state) => state.user);
  return user;
};

export default useUser;

