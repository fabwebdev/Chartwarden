# User Profile UI Feature

## Overview

This feature provides a comprehensive user profile management page at `/profile` where users can:
- View and edit their personal information (name, email, contact)
- Change their password with HIPAA-compliant security requirements
- Manage notification and application preferences
- Upload a profile avatar

## File Structure

```
apps/web/src/
├── views/profile/
│   ├── UserProfilePage.tsx    # Main profile page with tabs and avatar upload
│   ├── TabPersonal.tsx        # Personal information edit form
│   ├── TabPassword.tsx        # Password change form with requirements
│   ├── TabSettings.tsx        # User preferences and notifications
│   └── index.tsx              # Export file
├── api/
│   └── userProfile.ts         # API service for profile endpoints
└── app/(dashboard)/profile/
    └── page.tsx               # Route configuration

Backend:
services/api/src/
├── controllers/User.controller.js
│   ├── getUserById()          # Get user profile (with own-profile authorization)
│   ├── updateUser()           # Update profile (with own-profile authorization)
│   ├── changePassword()       # Change password with current password verification
│   └── getPasswordRequirements() # Get HIPAA password rules
└── routes/user.routes.js
    ├── GET /users/:id         # Users can view their own profile
    ├── PUT /users/:id         # Users can update their own profile (except roles)
    ├── POST /users/:id/password/change  # Change password
    └── GET /users/password-requirements # Public endpoint
```

## Features Implemented

### 1. Personal Information Tab
- **Edit fields**: First name, last name, email, phone number
- **Validation**: Yup schema validation for all fields
- **Avatar upload**: Click on avatar to upload new image
- **Real-time feedback**: Form validation with error messages
- **Success notifications**: Snackbar notifications for save operations
- **API endpoint**: `PUT /api/users/:id`

### 2. Password Change Tab
- **Security**: Requires current password verification
- **HIPAA Compliance**: Enforces 12+ character minimum
- **Password requirements**:
  - At least 12 characters
  - At least 1 lowercase letter (a-z)
  - At least 1 uppercase letter (A-Z)
  - At least 1 number (0-9)
  - At least 1 special character
- **Visual feedback**: Real-time validation indicators (green checkmarks)
- **Password history**: Backend prevents reuse of last 5 passwords
- **API endpoint**: `POST /api/users/:id/password/change`

### 3. Settings Tab
- **Notification preferences**:
  - Email notifications
  - System notifications
  - Activity confirmations
  - Language/locale updates
- **Storage**: LocalStorage (keyed by user ID)
- **Save/Cancel**: Clear action buttons with dirty state tracking

## API Endpoints

### Frontend API Service: `apps/web/src/api/userProfile.ts`

```typescript
// Get current user profile
getCurrentUserProfile(userId: string): Promise<UserProfileData>

// Update user profile
updateUserProfile(userId: string, data: UpdateProfileData): Promise<UserProfileData>

// Change password
changeUserPassword(userId: string, data: ChangePasswordData): Promise<void>

// Get password requirements
getPasswordRequirements(): Promise<PasswordRequirements>

// Upload avatar (prepared for future implementation)
uploadUserAvatar(userId: string, file: File): Promise<string>

// Preferences (localStorage-based)
getUserPreferences(userId: string): UserPreferences
saveUserPreferences(userId: string, preferences: UserPreferences): void
```

### Backend Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/users/:id` | User (own) or Admin | Get user profile |
| PUT | `/api/users/:id` | User (own) or Admin | Update user profile |
| POST | `/api/users/:id/password/change` | User (own) or Admin | Change password |
| GET | `/api/users/password-requirements` | Public | Get password requirements |
| POST | `/api/users/:id/avatar` | User (own) or Admin | Upload avatar (not yet implemented) |

## Authorization Model

### Self-Service Profile Access
Users can access and modify their **own** profile without special permissions:

```javascript
// Backend: User.controller.js
const isAdmin = request.user?.role === 'admin';
const isOwnProfile = requestingUserId === id;

if (!isOwnProfile && !isAdmin) {
  return 403; // Forbidden
}
```

### Restrictions for Non-Admins
- ✅ **Can edit**: name, firstName, lastName, email, contact, avatar
- ❌ **Cannot edit**: role, permissions, status, account locks

### Password Change Security
- ✅ Requires current password verification
- ✅ Validates password strength (HIPAA 12-char minimum)
- ✅ Checks password history (prevents reuse of last 5 passwords)
- ✅ Updates both `users` and `accounts` tables

## Usage

### Accessing the Profile Page

1. **Via URL**: Navigate to `/profile`
2. **Via Header Dropdown**: Click user avatar in header → "Edit Profile" or "View Profile"

### For Developers

```typescript
// Programmatic navigation
import { useRouter } from 'next/navigation';

const router = useRouter();
router.push('/profile');
```

### API Usage Example

```typescript
import {
  getCurrentUserProfile,
  updateUserProfile,
  changeUserPassword
} from 'api/userProfile';

// Get current user profile
const profile = await getCurrentUserProfile(userId);

// Update profile
await updateUserProfile(userId, {
  firstName: 'John',
  lastName: 'Doe',
  email: 'john.doe@example.com',
  contact: '555-1234'
});

// Change password
await changeUserPassword(userId, {
  currentPassword: 'OldPassword123!',
  newPassword: 'NewPassword123456!'
});
```

## Environment Setup

### Prerequisites
1. Backend API running on `http://localhost:3001`
2. PostgreSQL database with user tables
3. Better Auth configured for authentication
4. User must be logged in (cookie-based session)

### Running Locally

```bash
# Start PostgreSQL
docker-compose up -d

# Start backend (from services/api)
cd services/api
npm run dev

# Start frontend (from apps/web)
cd apps/web
npm run dev

# Access profile page
open http://localhost:3000/profile
```

## Security Considerations

### HIPAA Compliance
- ✅ 12-character minimum password length
- ✅ Password complexity requirements enforced
- ✅ Password history tracking (prevents reuse)
- ✅ Audit logging for password changes (backend)
- ✅ Encrypted password storage (bcrypt with salt)

### Authorization
- ✅ Users can only access their own profile
- ✅ Role changes require admin permissions
- ✅ Current password required for password changes
- ✅ Failed login attempts tracked (backend)

### Data Protection
- ✅ Password never sent to frontend
- ✅ HTTPS required in production (configured via reverse proxy)
- ✅ Cookie-based authentication with httpOnly flag
- ✅ Input validation on both frontend and backend

## Testing

### Manual Testing Checklist

#### Personal Information Tab
- [ ] Load profile page and verify user data displays
- [ ] Edit first name and save - should update successfully
- [ ] Edit last name and save - should update successfully
- [ ] Edit email to existing email - should show error
- [ ] Edit phone number - should validate format
- [ ] Click avatar and upload image - should show preview
- [ ] Save without changes - button should be disabled
- [ ] Cancel after changes - should revert to original values

#### Password Change Tab
- [ ] Enter incorrect current password - should show error
- [ ] Enter password < 12 characters - should show validation error
- [ ] Enter password without uppercase - should show visual indicator
- [ ] Enter password without number - should show visual indicator
- [ ] Enter password without special char - should show visual indicator
- [ ] Enter valid password but mismatch confirm - should show error
- [ ] Enter valid password matching all requirements - should succeed
- [ ] Password requirements display correctly with green checkmarks
- [ ] Form clears after successful password change

#### Settings Tab
- [ ] Toggle email notifications - should update state
- [ ] Toggle system notifications - should update state
- [ ] Save settings - should persist to localStorage
- [ ] Reload page - settings should be restored
- [ ] Cancel changes - should revert to saved state

### Automated Testing

Create a Playwright test for E2E verification:

```typescript
// Example test structure
test('user can update their profile', async ({ page }) => {
  await page.goto('http://localhost:3000/login');
  await login(page, 'user@example.com', 'password');

  await page.goto('http://localhost:3000/profile');

  // Update personal info
  await page.fill('[name="firstName"]', 'John');
  await page.fill('[name="lastName"]', 'Doe');
  await page.click('button:has-text("Save Changes")');

  await expect(page.locator('text=Profile updated successfully')).toBeVisible();
});
```

## Troubleshooting

### Common Issues

**Issue**: Profile page redirects to login
- **Cause**: User not authenticated
- **Solution**: Ensure user is logged in with valid session

**Issue**: 403 Forbidden when accessing profile
- **Cause**: Authorization check failing
- **Solution**: Verify `request.user.id` matches URL parameter `:id`

**Issue**: Password change fails with "Current password is incorrect"
- **Cause**: Wrong current password entered
- **Solution**: Verify user is entering correct current password

**Issue**: Profile data not loading
- **Cause**: Backend API not responding
- **Solution**: Check backend is running on port 3001, check network tab

**Issue**: Avatar upload not working
- **Cause**: Backend endpoint not implemented
- **Solution**: The `POST /api/users/:id/avatar` endpoint needs to be implemented

**Issue**: Settings not persisting
- **Cause**: localStorage cleared or different userId
- **Solution**: Check browser localStorage for `user_preferences_{userId}` key

### Debug Mode

Enable debug logging in the frontend:

```typescript
// In userProfile.ts
console.log('API Request:', { userId, data });
console.log('API Response:', response);
```

Check backend logs:

```bash
# Backend logs show authorization checks
cd services/api
tail -f logs/app.log
```

## Future Enhancements

### Planned Features
- [ ] Implement avatar upload endpoint in backend
- [ ] Add email verification for email changes
- [ ] Add two-factor authentication (2FA) settings
- [ ] Add account activity log
- [ ] Add export user data (GDPR compliance)
- [ ] Add delete account option
- [ ] Move preferences from localStorage to backend database
- [ ] Add preference for notification channels (email, SMS, push)
- [ ] Add timezone and language settings
- [ ] Add accessibility preferences (font size, contrast)

### Backend Enhancements
- [ ] Create dedicated endpoint for current user (`/api/me`)
- [ ] Implement avatar storage (S3 or local filesystem)
- [ ] Add user preferences table to database
- [ ] Add audit logging for all profile changes
- [ ] Add rate limiting for password change attempts
- [ ] Send email notification when profile is updated
- [ ] Send email notification when password is changed

## Additional Resources

- **Backend Controller**: `services/api/src/controllers/User.controller.js`
- **Backend Routes**: `services/api/src/routes/user.routes.js`
- **Frontend API**: `apps/web/src/api/userProfile.ts`
- **Password Security**: `services/api/src/utils/passwordSecurity.js`
- **Auth Store**: `apps/web/src/store/authStore.ts`
- **Better Auth Config**: `services/api/src/config/betterAuth.js`

## Support

For issues or questions:
1. Check this README
2. Review the code comments in the implementation files
3. Check the backend API logs for authorization errors
4. Verify database schema matches expected structure
