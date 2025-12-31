// THIRD - PARTY
import { FormattedMessage } from 'react-intl';

// ASSETS
import {BrifecaseTick,User,KyberNetwork, Messages2, Calendar1, Kanban, Profile2User, Bill, UserSquare, ShoppingBag,Unlock } from 'iconsax-react';

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
  permissions:Unlock,
  roles:BrifecaseTick,
  hospice:Profile2User,
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

// Check if user has any patient-related permissions
const hasPatientAccess = () => {
  if (isAdmin) {
    return true;
  }
  
  if (Array.isArray(userPermissions)) {
    // Check for both old permission format (patients_principal_menu) and new format (view:patient, update:patient)
    return userPermissions.includes('patients_principal_menu') ||
           userPermissions.includes('view:patient') ||
           userPermissions.includes('update:patient') ||
           userPermissions.includes('create:patient') ||
           userPermissions.includes('delete:patient');
  }
  return false;
}

const hospice: NavItemType = {
  id: 'group-hospice',
  title: <FormattedMessage id="hospice" />,
  icon: icons.applications,
  type: 'group',
  children: ([] as NavItemType[]).concat(
    hasPatientAccess() ? [{
        id: 'patients',
        title: <FormattedMessage id="patients" />,
        type: 'item',
        url: '/patients',
        icon: icons.hospice,
        breadcrumbs: false
    }] : []
  ),
};

export default hospice;