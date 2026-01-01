/**
 * User Profile API Service
 *
 * API service for user profile management endpoints.
 * Includes personal information updates, password changes, and preference management.
 *
 * Backend Routes:
 * - GET /api/users/:id - Get user profile
 * - PUT /api/users/:id - Update user profile
 * - POST /api/users/:id/password/change - Change user password
 */

import http from 'hooks/useCookie';

// ==============================|| TYPES ||============================== //

export interface UserProfileData {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  image?: string;
  contact?: string;
  role?: string;
  roles?: Array<{ id: number; name: string }>;
  is_active?: boolean;
  last_login_at?: string;
  password_changed_at?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface UpdateProfileData {
  name?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  contact?: string;
  image?: string;
}

export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
}

export interface UserPreferences {
  emailNotifications: boolean;
  systemNotifications: boolean;
  orderConfirmations: boolean;
  languageUpdates: boolean;
}

// ==============================|| USER PROFILE ROUTES ||============================== //

/**
 * Get current user profile
 * Uses the user ID from auth store
 */
export const getCurrentUserProfile = async (userId: string) => {
  const response = await http.get(`/users/${userId}`);
  return response.data;
};

/**
 * Update user profile
 * @requires Auth: User can only update their own profile
 */
export const updateUserProfile = async (userId: string, profileData: UpdateProfileData) => {
  const response = await http.put(`/users/${userId}`, profileData);
  return response.data;
};

/**
 * Change user password
 * @requires Auth: User can only change their own password
 * @param currentPassword - Current password for verification
 * @param newPassword - New password (minimum 12 characters per HIPAA requirement)
 */
export const changeUserPassword = async (userId: string, data: ChangePasswordData) => {
  const response = await http.post(`/users/${userId}/password/change`, data);
  return response.data;
};

/**
 * Get password requirements
 * Public endpoint - no auth required
 */
export const getPasswordRequirements = async () => {
  const response = await http.get('/users/password-requirements');
  return response.data;
};

/**
 * Upload user avatar
 * @param file - Image file to upload
 */
export const uploadUserAvatar = async (userId: string, file: File): Promise<string> => {
  const formData = new FormData();
  formData.append('avatar', file);

  const response = await http.post(`/users/${userId}/avatar`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

// ==============================|| USER PREFERENCES ||============================== //

// Note: User preferences are stored locally since there's no backend endpoint for this
// In a production system, these would be stored in the database

const PREFERENCES_STORAGE_KEY = 'user_preferences';

/**
 * Get user preferences from local storage
 */
export const getUserPreferences = (userId: string): UserPreferences => {
  try {
    const stored = localStorage.getItem(`${PREFERENCES_STORAGE_KEY}_${userId}`);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // Ignore parse errors
  }

  // Default preferences
  return {
    emailNotifications: true,
    systemNotifications: true,
    orderConfirmations: true,
    languageUpdates: false,
  };
};

/**
 * Save user preferences to local storage
 */
export const saveUserPreferences = (userId: string, preferences: UserPreferences): void => {
  localStorage.setItem(`${PREFERENCES_STORAGE_KEY}_${userId}`, JSON.stringify(preferences));
};

export default {
  getCurrentUserProfile,
  updateUserProfile,
  changeUserPassword,
  getPasswordRequirements,
  uploadUserAvatar,
  getUserPreferences,
  saveUserPreferences,
};
