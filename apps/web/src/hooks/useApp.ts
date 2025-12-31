import { useCallback } from 'react';
import { useAppStore, NotificationType, Breadcrumb } from 'store/appStore';

// ==============================|| HOOKS - APP ||============================== //

/**
 * Custom hook for application-wide state management using Zustand store
 * Provides a clean API for components to interact with app state
 */
const useApp = () => {
  // Sidebar state
  const sidebarOpen = useAppStore((state) => state.sidebarOpen);
  const sidebarCollapsed = useAppStore((state) => state.sidebarCollapsed);
  const toggleSidebar = useAppStore((state) => state.toggleSidebar);
  const setSidebarOpen = useAppStore((state) => state.setSidebarOpen);
  const setSidebarCollapsed = useAppStore((state) => state.setSidebarCollapsed);

  // Page state
  const pageTitle = useAppStore((state) => state.pageTitle);
  const breadcrumbs = useAppStore((state) => state.breadcrumbs);
  const setPageTitle = useAppStore((state) => state.setPageTitle);
  const setBreadcrumbs = useAppStore((state) => state.setBreadcrumbs);

  // Loading state
  const globalLoading = useAppStore((state) => state.globalLoading);
  const loadingMessage = useAppStore((state) => state.loadingMessage);
  const setGlobalLoading = useAppStore((state) => state.setGlobalLoading);

  // Notifications
  const notifications = useAppStore((state) => state.notifications);
  const addNotification = useAppStore((state) => state.addNotification);
  const removeNotification = useAppStore((state) => state.removeNotification);
  const clearNotifications = useAppStore((state) => state.clearNotifications);

  // Modal state
  const activeModal = useAppStore((state) => state.activeModal);
  const modalData = useAppStore((state) => state.modalData);
  const openModal = useAppStore((state) => state.openModal);
  const closeModal = useAppStore((state) => state.closeModal);

  // Reset
  const resetAppState = useAppStore((state) => state.resetAppState);

  // Helper to show different notification types
  const notify = useCallback(
    (type: NotificationType, message: string, title?: string, duration?: number) => {
      addNotification({ type, message, title, duration });
    },
    [addNotification]
  );

  // Convenience methods for notifications
  const notifySuccess = useCallback(
    (message: string, title?: string) => notify('success', message, title),
    [notify]
  );

  const notifyError = useCallback(
    (message: string, title?: string) => notify('error', message, title, 8000),
    [notify]
  );

  const notifyWarning = useCallback(
    (message: string, title?: string) => notify('warning', message, title),
    [notify]
  );

  const notifyInfo = useCallback(
    (message: string, title?: string) => notify('info', message, title),
    [notify]
  );

  // Helper to set page metadata
  const setPageMeta = useCallback(
    (title: string, breadcrumbItems?: Breadcrumb[]) => {
      setPageTitle(title);
      if (breadcrumbItems) {
        setBreadcrumbs(breadcrumbItems);
      }
    },
    [setPageTitle, setBreadcrumbs]
  );

  return {
    // Sidebar
    sidebarOpen,
    sidebarCollapsed,
    toggleSidebar,
    setSidebarOpen,
    setSidebarCollapsed,

    // Page
    pageTitle,
    breadcrumbs,
    setPageTitle,
    setBreadcrumbs,
    setPageMeta,

    // Loading
    globalLoading,
    loadingMessage,
    setGlobalLoading,

    // Notifications
    notifications,
    addNotification,
    removeNotification,
    clearNotifications,
    notify,
    notifySuccess,
    notifyError,
    notifyWarning,
    notifyInfo,

    // Modal
    activeModal,
    modalData,
    openModal,
    closeModal,

    // Reset
    resetAppState,
  };
};

export default useApp;
