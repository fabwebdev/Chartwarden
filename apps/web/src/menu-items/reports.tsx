// THIRD - PARTY
import { FormattedMessage } from 'react-intl';

// ASSETS
import { DocumentText } from 'iconsax-react';

// TYPE
import { NavItemType } from 'types/menu';

// ICONS
const icons = {
  reports: DocumentText
};

// ==============================|| MENU ITEMS - REPORTS ||============================== //

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

const reports: NavItemType = {
  id: 'group-reports',
  title: <FormattedMessage id="Reports" />,
  icon: icons.reports,
  type: 'group',
  children: ([] as NavItemType[]).concat(
    // Reports - shown to admins and users with VIEW_REPORTS or GENERATE_REPORTS permission
    isAdmin || hasPermission('VIEW_REPORTS') || hasPermission('GENERATE_REPORTS')
      ? [
          {
            id: 'reports-list',
            title: <FormattedMessage id="Reports" />,
            type: 'item',
            url: '/reports',
            icon: icons.reports,
            breadcrumbs: false
          }
        ]
      : []
  )
};

export default reports;
