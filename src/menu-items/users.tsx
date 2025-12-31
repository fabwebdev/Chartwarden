// THIRD - PARTY
import { FormattedMessage } from 'react-intl';

// ASSETS
import { User } from 'iconsax-react';

// TYPE
import { NavItemType } from 'types/menu';

// ICONS
const icons = {
  users: User
};

// ==============================|| MENU ITEMS - SAMPLE PAGE ||============================== //

const users: NavItemType = {
  id: 'users',
  title: <FormattedMessage id="users" />,
  type: 'group',
  url: '/users',
  icon: icons.users
};

export default users;
