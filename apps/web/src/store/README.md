# Zustand State Management - Chartwarden

This directory contains the Zustand stores for global state management in the Chartwarden application.

## Store Architecture

The application uses **Zustand** for state management with the following stores:

### 1. Auth Store (`authStore.ts`)
Manages user authentication state and permissions.

**State:**
- `user: UserProfile | null` - Current user profile
- `permissions: string[]` - User permissions
- `isAuthenticated: boolean` - Authentication status
- `isInitialized: boolean` - Whether initial auth check is complete
- `isLoading: boolean` - Loading state for auth operations

**Actions:**
- `setUser(user, permissions?)` - Set user and optionally permissions
- `setPermissions(permissions)` - Update permissions
- `setInitialized(initialized)` - Mark store as initialized
- `setLoading(loading)` - Set loading state
- `logout()` - Clear all auth state
- `hasPermission(permission)` - Check if user has a specific permission
- `hasAnyPermission(permissions)` - Check if user has any of the specified permissions
- `hasAllPermissions(permissions)` - Check if user has all of the specified permissions

**Persistence:**
- Stores `user`, `permissions`, and `isAuthenticated` in localStorage under key `auth-storage`

### 2. App Store (`appStore.ts`)
Manages application-wide UI state.

**State:**
- `sidebarOpen: boolean` - Sidebar visibility
- `sidebarCollapsed: boolean` - Sidebar collapsed state
- `pageTitle: string` - Current page title
- `breadcrumbs: Breadcrumb[]` - Page breadcrumbs
- `globalLoading: boolean` - Global loading state
- `loadingMessage: string` - Loading message
- `notifications: Notification[]` - Active notifications
- `activeModal: string | null` - Currently active modal ID
- `modalData: Record<string, unknown>` - Modal data payload

**Actions:**
- `toggleSidebar()` - Toggle sidebar visibility
- `setSidebarOpen(open)` - Set sidebar visibility
- `setSidebarCollapsed(collapsed)` - Set sidebar collapsed state
- `setPageTitle(title)` - Set page title (also updates document.title)
- `setBreadcrumbs(breadcrumbs)` - Set breadcrumbs
- `setGlobalLoading(loading, message?)` - Set global loading state
- `addNotification(notification)` - Add a notification (auto-removes after duration)
- `removeNotification(id)` - Remove a notification
- `clearNotifications()` - Clear all notifications
- `openModal(modalId, data?)` - Open a modal
- `closeModal()` - Close the active modal
- `resetAppState()` - Reset app state (preserves sidebar preferences)

**Persistence:**
- Only persists `sidebarOpen` and `sidebarCollapsed` in localStorage under key `app-storage`
- Notifications, modals, and other transient state are NOT persisted

### 3. Patient Store (`patientStore.ts`)
Manages patient selection state (existing).

## Hooks

### `useAuth()`
Comprehensive authentication hook built on top of the auth store.

**Usage:**
```typescript
import useAuth from 'hooks/useAuth';

function MyComponent() {
  const {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
    hasPermission
  } = useAuth();

  // Login
  const handleLogin = async () => {
    const result = await login('email@example.com', 'password');
    if (result.success) {
      console.log('Logged in:', result.user);
    }
  };

  // Check permission
  if (hasPermission('patients:write')) {
    // Show edit button
  }

  // Logout
  const handleLogout = async () => {
    await logout();
  };
}
```

**Features:**
- Automatic CASL ability synchronization
- Login/logout functions
- Permission checking helpers
- Syncs with localStorage for backwards compatibility

### `useApp()`
Application state management hook.

**Usage:**
```typescript
import useApp from 'hooks/useApp';

function MyComponent() {
  const {
    sidebarOpen,
    toggleSidebar,
    setPageMeta,
    notifySuccess,
    notifyError,
    globalLoading,
    setGlobalLoading
  } = useApp();

  // Set page metadata
  useEffect(() => {
    setPageMeta('Patients', [
      { title: 'Dashboard', path: '/' },
      { title: 'Patients', path: '/patients' }
    ]);
  }, []);

  // Show notification
  const handleSave = async () => {
    setGlobalLoading(true, 'Saving patient...');
    try {
      await savePatient();
      notifySuccess('Patient saved successfully!');
    } catch (error) {
      notifyError('Failed to save patient', 'Error');
    } finally {
      setGlobalLoading(false);
    }
  };

  // Toggle sidebar
  return (
    <button onClick={toggleSidebar}>
      {sidebarOpen ? 'Close' : 'Open'} Sidebar
    </button>
  );
}
```

**Notification Helpers:**
- `notifySuccess(message, title?)` - Show success notification
- `notifyError(message, title?)` - Show error notification (8s duration)
- `notifyWarning(message, title?)` - Show warning notification
- `notifyInfo(message, title?)` - Show info notification

### `useUser()`
Simple hook to get the current user.

**Usage:**
```typescript
import useUser from 'hooks/useUser';

function MyComponent() {
  const user = useUser();

  if (!user) {
    return <div>Not logged in</div>;
  }

  return <div>Welcome, {user.name}!</div>;
}
```

## Direct Store Access

You can also access stores directly without using hooks:

```typescript
import { useAuthStore, useAppStore } from 'store';

// Get current state
const user = useAuthStore.getState().user;
const isAuthenticated = useAuthStore.getState().isAuthenticated;

// Subscribe to changes
useAuthStore.subscribe((state) => {
  console.log('Auth state changed:', state);
});

// Call actions
useAuthStore.getState().setUser(userData, permissions);
useAppStore.getState().notifySuccess('Operation completed');
```

## Selectors

For optimal performance, use the exported selectors:

```typescript
import { useAuthStore, selectUser, selectIsAuthenticated } from 'store';

function MyComponent() {
  // Only re-renders when user changes
  const user = useAuthStore(selectUser);

  // Only re-renders when isAuthenticated changes
  const isAuthenticated = useAuthStore(selectIsAuthenticated);
}
```

**Available Selectors:**

**Auth Store:**
- `selectUser`
- `selectPermissions`
- `selectIsAuthenticated`
- `selectIsInitialized`
- `selectIsLoading`

**App Store:**
- `selectSidebarOpen`
- `selectSidebarCollapsed`
- `selectPageTitle`
- `selectBreadcrumbs`
- `selectGlobalLoading`
- `selectNotifications`
- `selectActiveModal`

## Integration with Existing Code

The stores integrate seamlessly with existing code:

### AuthService Integration
`AuthService.ts` has been updated to sync with the Zustand auth store. All auth operations now update both localStorage (for backwards compatibility) and the Zustand store.

### Axios Interceptor Integration
The axios interceptor (`useCookie.ts`) now clears the Zustand auth store on 401 responses, ensuring state consistency.

## Best Practices

1. **Use hooks in components** - Prefer `useAuth()` and `useApp()` over direct store access
2. **Use selectors for performance** - Prevents unnecessary re-renders
3. **Don't mutate state** - Always use the provided actions
4. **Notifications are auto-removed** - Default duration is 5 seconds (8 seconds for errors)
5. **Permission checks** - Use `hasPermission()`, `hasAnyPermission()`, or `hasAllPermissions()`
6. **Logout clears everything** - Calling `logout()` clears localStorage and Zustand state
7. **Page titles** - Using `setPageTitle()` automatically updates `document.title`

## TypeScript Types

All stores are fully typed. Import types from the store modules:

```typescript
import type { Notification, NotificationType, Breadcrumb } from 'store';

const notification: Notification = {
  id: '123',
  type: 'success',
  message: 'Operation completed',
  timestamp: Date.now()
};
```

## Migration Guide

### From AuthService to useAuth

**Before:**
```typescript
const { user, isLoggedIn, logout } = AuthService();

if (isLoggedIn()) {
  // ...
}
```

**After:**
```typescript
const { user, isAuthenticated, logout } = useAuth();

if (isAuthenticated) {
  // ...
}
```

### From Context to Zustand

**Before:**
```typescript
const { config } = useContext(ConfigContext);
```

**After:**
```typescript
const { sidebarOpen, pageTitle } = useApp();
```

## Troubleshooting

### Store not persisting
Check that localStorage is available and not blocked. The stores use `localStorage` for persistence.

### Notifications not showing
Ensure you have a notification component that reads from `useApp().notifications` and renders them.

### Permission checks failing
Verify that permissions are loaded correctly via `useAuth().permissions`. Check that the user has been fetched from the backend.

### State not updating
Make sure you're calling the action functions, not mutating state directly:

**Wrong:**
```typescript
const state = useAuthStore.getState();
state.user = newUser; // ❌ Don't mutate
```

**Correct:**
```typescript
useAuthStore.getState().setUser(newUser); // ✅ Use actions
```
