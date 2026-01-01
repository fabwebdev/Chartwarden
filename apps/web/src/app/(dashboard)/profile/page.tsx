// PROJECT IMPORTS
import UserProfilePage from 'views/profile/UserProfilePage';

/**
 * ==============================|| USER PROFILE PAGE ||==============================
 *
 * User profile management page with three main sections:
 *
 * 1. Personal Information Tab:
 *    - View and edit first name, last name, email, and contact
 *    - Upload profile avatar
 *    - Changes are saved via PUT /api/users/:id
 *
 * 2. Password Tab:
 *    - Change user password
 *    - HIPAA-compliant password requirements (12+ characters)
 *    - Password validation with visual feedback
 *    - Uses POST /api/users/:id/password/change
 *
 * 3. Settings Tab:
 *    - Email notification preferences
 *    - System notification preferences
 *    - Activity confirmation preferences
 *    - Language update preferences
 *    - Preferences stored in localStorage
 *
 * BACKEND API ROUTES:
 * - GET /api/users/:id - Fetch user profile data
 * - PUT /api/users/:id - Update user profile
 * - POST /api/users/:id/password/change - Change password
 *
 * AUTHENTICATION:
 * - Requires authenticated user
 * - Uses auth store for current user ID
 * - Cookie-based session authentication
 */

const ProfilePage = () => {
  return <UserProfilePage />;
};

export default ProfilePage;
