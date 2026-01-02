// TYPES
import { NavItemType } from 'types/menu';
import hospice from './hospice';
import billing from './billing';
import reports from './reports';
import admin from './admin';
import applications from './applications';
import samplePage from './sample-page';
import pages from './pages';
import support from './support';

// Dynamic imports that need to be rebuilt
import { FormattedMessage } from 'react-intl';
import {BrifecaseTick,User, Setting2, People, Unlock } from 'iconsax-react';

// ==============================|| MENU ITEMS ||============================== //

// Function to get user data from localStorage (client-side only)
const getUserData = () => {
  if (typeof window === 'undefined') {
    return { user: null, permissions: [] };
  }

  try {
    const userString = localStorage.getItem('user');
    const permissionsString = localStorage.getItem('permissions');

    const user = userString ? JSON.parse(userString) : null;
    const permissions = permissionsString ? JSON.parse(permissionsString) : [];

    return { user, permissions };
  } catch (e) {
    return { user: null, permissions: [] };
  }
};

// Function to build user management menu dynamically with permission checks
const buildUserManagementMenu = (): NavItemType => {
  const { user, permissions: userPermissions } = getUserData();

  const isAdmin = user?.role === 'admin' || user?.role?.name === 'admin' || user?.role?.toLowerCase() === 'admin';

  const hasPermission = (permissionName: string) => {
    if (isAdmin) return true;
    if (Array.isArray(userPermissions)) {
      return userPermissions.includes(permissionName);
    }
    return false;
  };

  const icons = {
    users: User,
    permissions: Unlock,
    roles: BrifecaseTick,
    adminDashboard: Setting2,
    staff: People,
  };

  return {
    id: 'group-userManagement',
    title: <FormattedMessage id="user Management" />,
    icon: icons.adminDashboard,
    type: 'group',
    children: ([] as NavItemType[]).concat(
      // Admin Dashboard - shown to admins and users with manage:users permission
      (isAdmin || hasPermission('manage:users')) ? [{
        id: 'admin-user-management',
        title: <FormattedMessage id="Admin Dashboard" />,
        type: 'item',
        url: '/admin/user-management',
        icon: icons.adminDashboard,
        breadcrumbs: false
      }] : [],
      // Permissions - shown to users with permissions_principal_menu permission
      hasPermission('permissions_principal_menu') ? [{
        id: 'permissions',
        title: <FormattedMessage id="permissions" />,
        type: 'item',
        url: '/permissions',
        icon: icons.permissions,
        breadcrumbs: false
      }] : [],
      // Roles - shown to users with roles_principal_menu permission
      hasPermission('roles_principal_menu') ? [{
        id: 'roles',
        title: <FormattedMessage id="roles" />,
        type: 'item',
        url: '/roles',
        icon: icons.roles,
        breadcrumbs: false
      }] : [],
      // Users - shown to users with users_principal_menu permission
      hasPermission('users_principal_menu') ? [{
        id: 'users',
        title: <FormattedMessage id="users" />,
        type: 'item',
        url: '/users',
        icon: icons.users,
        breadcrumbs: false
      }] : [],
      // Staff Directory - shown to admins and users with staff permissions
      (isAdmin || hasPermission('manage:staff') || hasPermission('view:staff')) ? [{
        id: 'staff-directory',
        title: <FormattedMessage id="Staff Directory" />,
        type: 'item',
        url: '/admin/staff',
        icon: icons.staff,
        breadcrumbs: false
      }] : []
    )
  };
};

// Build menu items - this gets called fresh each time
const getMenuItems = (): { items: NavItemType[] } => {
  return {
    items: [
      buildUserManagementMenu(),
      hospice,
      billing,
      reports,
      admin,
      // applications,
      samplePage,
      // pages,
      // support
    ].filter(Boolean)
  };
};

// Export both the function and a default object for backward compatibility
export { getMenuItems };

const menuItems = getMenuItems();
export default menuItems;
