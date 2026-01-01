// THIRD - PARTY
import { FormattedMessage } from 'react-intl';

// ASSETS
import { MoneyRecive, Chart2, DocumentText, Receipt21, RefreshCircle, ReceiptItem } from 'iconsax-react';

// TYPE
import { NavItemType } from 'types/menu';

// ICONS
const icons = {
  billing: MoneyRecive,
  denials: RefreshCircle,
  analytics: Chart2,
  claims: DocumentText,
  payments: Receipt21,
  era: ReceiptItem
};

// ==============================|| MENU ITEMS - BILLING ||============================== //

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

// Check if user has any billing-related permissions
const hasBillingAccess = () => {
  if (isAdmin) {
    return true;
  }

  if (Array.isArray(userPermissions)) {
    return userPermissions.includes('denials:view') ||
           userPermissions.includes('denials:manage') ||
           userPermissions.includes('appeals:view') ||
           userPermissions.includes('appeals:manage') ||
           userPermissions.includes('billing_menu') ||
           userPermissions.includes('VIEW_REPORTS');
  }
  return false;
};

const billing: NavItemType = {
  id: 'group-billing',
  title: <FormattedMessage id="billing" defaultMessage="Billing" />,
  icon: icons.billing,
  type: 'group',
  children: ([] as NavItemType[]).concat(
    hasBillingAccess() ? [{
      id: 'billing-dashboard',
      title: <FormattedMessage id="billing-dashboard" defaultMessage="Claims Dashboard" />,
      type: 'item',
      url: '/billing',
      icon: icons.claims,
      breadcrumbs: false
    }] : [],
    hasBillingAccess() ? [{
      id: 'denial-management',
      title: <FormattedMessage id="denial-management" defaultMessage="Denial Management" />,
      type: 'item',
      url: '/denial-management',
      icon: icons.denials,
      breadcrumbs: false
    }] : [],
    hasBillingAccess() ? [{
      id: 'era-processing',
      title: <FormattedMessage id="era-processing" defaultMessage="ERA Processing" />,
      type: 'item',
      url: '/era',
      icon: icons.era,
      breadcrumbs: false
    }] : [],
    hasPermission('VIEW_REPORTS') || isAdmin ? [{
      id: 'analytics',
      title: <FormattedMessage id="analytics" defaultMessage="Analytics" />,
      type: 'item',
      url: '/analytics',
      icon: icons.analytics,
      breadcrumbs: false
    }] : []
  )
};

export default billing;
