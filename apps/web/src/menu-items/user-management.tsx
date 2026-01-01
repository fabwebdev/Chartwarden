// THIRD - PARTY
import { FormattedMessage } from 'react-intl';

// ASSETS
import {BrifecaseTick,User,KyberNetwork, Messages2, Calendar1, Kanban, Profile2User, Bill, UserSquare, ShoppingBag,Unlock, Setting2 } from 'iconsax-react';

// TYPE
import { NavItemType } from 'types/menu';

// ICONS
const icons = {
  applications: KyberNetwork,
  chat: Messages2,
  calendar: Calendar1,
  kanban: Kanban,
  customer: Profile2User,
  invoice: Bill,
  profile: UserSquare,
  ecommerce: ShoppingBag,
  users: User,
  permissions: Unlock,
  roles: BrifecaseTick,
  adminDashboard: Setting2,
};

// ==============================|| MENU ITEMS - APPLICATIONS ||============================== //
// Get user and permissions dynamically
const getUserData = () => {
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

const { user, permissions: userPermissions } = getUserData();

// Check if user has admin role
const isAdmin = user?.role === 'admin' || user?.role?.name === 'admin' || user?.role?.toLowerCase() === 'admin';

const hasPermission = (permissionName: string) => {
  // Admin users have all permissions
  if (isAdmin) {
    return true;
  }
  
  // Handle both array and string cases
  if (Array.isArray(userPermissions)) {
    return userPermissions.includes(permissionName);
  }
  return false;
}
const userManagement: NavItemType = {
  id: 'group-userManagement',
  title: <FormattedMessage id="user Management" />,
  icon: icons.applications,
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
    hasPermission('permissions_principal_menu') ? [{
        id: 'permissions',
        title: <FormattedMessage id="permissions" />,
        type: 'item',
        url: '/permissions',
        icon: icons.permissions,
        breadcrumbs: false
    }] : [],
    hasPermission('roles_principal_menu') ? [{
        id: 'roles',
        title: <FormattedMessage id="roles" />,
        type: 'item',
        url: '/roles',
        icon: icons.roles,
        breadcrumbs: false
    }] : [],
    hasPermission('users_principal_menu') ? [{
        id: 'users',
        title: <FormattedMessage id="users" />,
        type: 'item',
        url: '/users',
        icon: icons.users,
        breadcrumbs: false
    }] : []
  ),
};

export default userManagement;