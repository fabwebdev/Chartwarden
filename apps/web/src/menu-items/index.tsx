// TYPES
import { NavItemType } from 'types/menu';
import userManagement from './user-management';
import hospice from './hospice';
import applications from './applications';
import samplePage from './sample-page';
import pages from './pages';
import support from './support';
// ==============================|| MENU ITEMS ||============================== //

const menuItems: { items: NavItemType[] } = {
  items: [userManagement
    ,hospice,
    // applications,
    samplePage,
    // pages,
    // support
  ].filter(Boolean)
};

export default menuItems;
