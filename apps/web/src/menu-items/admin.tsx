// THIRD - PARTY
import { FormattedMessage } from 'react-intl';

// ASSETS
import { Chart, Activity, Setting2 } from 'iconsax-react';

// TYPE
import { NavItemType } from 'types/menu';

// ICONS
const icons = {
  qapi: Chart,
  performance: Activity,
  settings: Setting2
};

// ==============================|| MENU ITEMS - ADMIN ||============================== //
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
};

const admin: NavItemType = {
  id: 'group-admin',
  title: <FormattedMessage id="Administration" />,
  icon: icons.settings,
  type: 'group',
  children: ([] as NavItemType[]).concat(
    // QAPI Dashboard - shown to admins and users with appropriate clinical permissions
    (isAdmin || hasPermission('VIEW_CLINICAL_NOTES') || hasPermission('VIEW_PATIENT_DETAILS')) ? [{
        id: 'qapi-dashboard',
        title: <FormattedMessage id="QAPI Dashboard" />,
        type: 'item',
        url: '/admin/qapi',
        icon: icons.qapi,
        breadcrumbs: false
    }] : [],
    // Performance Dashboard - shown to admins and users with VIEW_REPORTS permission
    (isAdmin || hasPermission('VIEW_REPORTS')) ? [{
        id: 'performance-dashboard',
        title: <FormattedMessage id="Performance Monitoring" />,
        type: 'item',
        url: '/admin/performance',
        icon: icons.performance,
        breadcrumbs: false
    }] : []
  )
};

export default admin;
