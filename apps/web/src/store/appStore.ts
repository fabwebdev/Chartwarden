import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// ==============================|| APP STORE - TYPES ||============================== //

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  title?: string;
  duration?: number;
  timestamp: number;
}

export interface Breadcrumb {
  title: string;
  path?: string;
}

interface AppState {
  // Sidebar state
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;

  // Page state
  pageTitle: string;
  breadcrumbs: Breadcrumb[];

  // Loading states
  globalLoading: boolean;
  loadingMessage: string;

  // Notifications
  notifications: Notification[];

  // Modal state
  activeModal: string | null;
  modalData: Record<string, unknown>;

  // Actions - Sidebar
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;

  // Actions - Page
  setPageTitle: (title: string) => void;
  setBreadcrumbs: (breadcrumbs: Breadcrumb[]) => void;

  // Actions - Loading
  setGlobalLoading: (loading: boolean, message?: string) => void;

  // Actions - Notifications
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;

  // Actions - Modal
  openModal: (modalId: string, data?: Record<string, unknown>) => void;
  closeModal: () => void;

  // Actions - Reset
  resetAppState: () => void;
}

// ==============================|| APP STORE - INITIAL STATE ||============================== //

const initialState = {
  sidebarOpen: true,
  sidebarCollapsed: false,
  pageTitle: '',
  breadcrumbs: [],
  globalLoading: false,
  loadingMessage: '',
  notifications: [],
  activeModal: null,
  modalData: {},
};

// ==============================|| APP STORE ||============================== //

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Sidebar actions
      toggleSidebar: () => {
        set((state) => ({ sidebarOpen: !state.sidebarOpen }));
      },

      setSidebarOpen: (open) => {
        set({ sidebarOpen: open });
      },

      setSidebarCollapsed: (collapsed) => {
        set({ sidebarCollapsed: collapsed });
      },

      // Page actions
      setPageTitle: (title) => {
        set({ pageTitle: title });
        // Also update document title
        if (typeof document !== 'undefined') {
          document.title = title ? `${title} | Chartwarden` : 'Chartwarden';
        }
      },

      setBreadcrumbs: (breadcrumbs) => {
        set({ breadcrumbs });
      },

      // Loading actions
      setGlobalLoading: (loading, message = '') => {
        set({ globalLoading: loading, loadingMessage: message });
      },

      // Notification actions
      addNotification: (notification) => {
        const id = `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const newNotification: Notification = {
          ...notification,
          id,
          timestamp: Date.now(),
          duration: notification.duration ?? 5000,
        };

        set((state) => ({
          notifications: [...state.notifications, newNotification],
        }));

        // Auto-remove notification after duration
        if (newNotification.duration && newNotification.duration > 0) {
          setTimeout(() => {
            get().removeNotification(id);
          }, newNotification.duration);
        }
      },

      removeNotification: (id) => {
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
        }));
      },

      clearNotifications: () => {
        set({ notifications: [] });
      },

      // Modal actions
      openModal: (modalId, data = {}) => {
        set({ activeModal: modalId, modalData: data });
      },

      closeModal: () => {
        set({ activeModal: null, modalData: {} });
      },

      // Reset app state (useful for logout)
      resetAppState: () => {
        set({
          ...initialState,
          // Keep sidebar preferences
          sidebarOpen: get().sidebarOpen,
          sidebarCollapsed: get().sidebarCollapsed,
        });
      },
    }),
    {
      name: 'app-storage',
      storage: createJSONStorage(() => localStorage),
      // Only persist UI preferences, not transient state
      partialize: (state) => ({
        sidebarOpen: state.sidebarOpen,
        sidebarCollapsed: state.sidebarCollapsed,
      }),
    }
  )
);

// ==============================|| APP STORE - SELECTORS ||============================== //

export const selectSidebarOpen = (state: AppState) => state.sidebarOpen;
export const selectSidebarCollapsed = (state: AppState) => state.sidebarCollapsed;
export const selectPageTitle = (state: AppState) => state.pageTitle;
export const selectBreadcrumbs = (state: AppState) => state.breadcrumbs;
export const selectGlobalLoading = (state: AppState) => state.globalLoading;
export const selectNotifications = (state: AppState) => state.notifications;
export const selectActiveModal = (state: AppState) => state.activeModal;
