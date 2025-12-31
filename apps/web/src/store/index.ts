// ==============================|| ZUSTAND STORES - EXPORTS ||============================== //

// Auth Store - User authentication state and permissions
export {
  useAuthStore,
  selectUser,
  selectPermissions,
  selectIsAuthenticated,
  selectIsInitialized,
  selectIsLoading,
} from './authStore';

// App Store - Application-wide UI state
export {
  useAppStore,
  selectSidebarOpen,
  selectSidebarCollapsed,
  selectPageTitle,
  selectBreadcrumbs,
  selectGlobalLoading,
  selectNotifications,
  selectActiveModal,
} from './appStore';
export type { Notification, NotificationType, Breadcrumb } from './appStore';

// Patient Store - Patient selection state
export { usePatientStore } from './patientStore';
