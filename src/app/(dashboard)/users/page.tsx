// PROJECT IMPORTS
import UsersPagePage from 'views/users-view/UsersPage';

/**
 * ==============================|| Users PAGE ||============================== 
 * 
 * BACKEND API ROUTES (✅ ACTIVE & CONFIRMED):
 * Base path: /api
 * All routes require authentication (behind authenticate middleware)
 * All routes use consistent /users prefix (RESTful)
 * 
 * GET    /api/users      - Get all users (returns users with their roles)
 * POST   /api/users      - Create a new user
 * GET    /api/users/:id  - Get user by ID
 * PUT    /api/users/:id  - Update user
 * DELETE /api/users/:id  - Delete user
 * 
 * ALL USER-RELATED API ENDPOINTS:
 * 
 * 1. GET /api/users
 *    - Backend Route: GET /api/users ✅ ACTIVE
 *    - Frontend Call: http.get('/users')
 *    - Description: Get all users with their roles
 *    - Used in: UsersPage.tsx (fetchUserData)
 *    - Response: Array of user objects with roles
 *    - Authentication: Required
 * 
 * 2. GET /api/users/:id
 *    - Backend Route: GET /api/users/:id ✅ ACTIVE (Updated from /api/user/:id)
 *    - Frontend Call: http.get(`/users/${userId}`)
 *    - Params: id (user ID)
 *    - Description: Get user by ID
 *    - Used in: EditUser.tsx (fetchUserData)
 *    - Response: { user: {...}, role: "..." }
 *    - Authentication: Required
 * 
 * 3. POST /api/users
 *    - Backend Route: POST /api/users ✅ ACTIVE (Updated from /api/user/store)
 *    - Frontend Call: http.post('/users', formData)
 *    - Description: Create a new user
 *    - Used in: AddUser.tsx (handleSubmit)
 *    - Method: POST
 *    - Content-Type: multipart/form-data
 *    - Body: FormData with fields:
 *      - avatar: File (optional)
 *      - first_name: string
 *      - last_name: string
 *      - email: string
 *      - password: string
 *      - role: string
 *      - contact: string
 *    - Authentication: Required
 * 
 * 4. PUT /api/users/:id
 *    - Backend Route: PUT /api/users/:id ✅ ACTIVE (Updated from /api/user/update/:id)
 *    - Frontend Call: http.put(`/users/${userId}`, editedUserData)
 *    - Params: id (user ID)
 *    - Description: Update user
 *    - Used in: EditUser.tsx (handleSubmit)
 *    - Method: PUT
 *    - Body: JSON object with user data to update
 *    - Authentication: Required
 * 
 * 5. DELETE /api/users/:id
 *    - Backend Route: DELETE /api/users/:id ✅ ACTIVE (Updated from /api/user/:id)
 *    - Frontend Call: http.delete(`/users/${userId}`)
 *    - Params: id (user ID)
 *    - Description: Delete user
 *    - Used in: UsersPage.tsx (handleDeleteUser)
 *    - Method: DELETE
 *    - Authentication: Required
 * 
 * RELATED API ENDPOINTS (used in user management):
 * 
 * 6. GET /api/rbac/roles
 *    - Backend Route: GET /api/rbac/roles
 *    - Frontend Call: http.get('/rbac/roles')
 *    - Description: Fetch all roles (for dropdown selection)
 *    - Used in: AddUser.tsx, EditUser.tsx, RolesPage.tsx (fetchRoleData)
 *    - Response: Array of role objects
 * 
 * 7. GET /api/permissions
 *    - Backend Route: GET /api/permissions
 *    - Frontend Call: http.get('/permissions')
 *    - Note: For permission CRUD operations, use /api/permissions
 *    - For fetching permissions in roles context, may use /api/rbac/permissions
 *    - Description: Fetch all permissions (admin only)
 *    - Used in: UsersPage.tsx, PermissionsPage.tsx, RolesPage.tsx, etc.
 *    - Response: Array of permission objects
 * 
 * All API calls use the http instance from 'hooks/useCookie' which includes:
 * - Base URL: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000/api'
 * - withCredentials: true (for cookie-based authentication)
 * - Automatic 401 error handling (redirects to login)
 * 
 * ✅ All frontend routes are correctly aligned with backend routes
 * ✅ All routes are ACTIVE and require authentication
 * ✅ Cookie-based authentication is automatically handled via withCredentials: true
 */

const UsersPage = () => {
  return <UsersPagePage />;
};

export default UsersPage;
