// TYPES
import { NavItemType } from 'types/menu';
import userManagement from './user-management';
import hospice from './hospice';
import billing from './billing';
import reports from './reports';
import admin from './admin';
import applications from './applications';
import samplePage from './sample-page';
import pages from './pages';
import support from './support';
// ==============================|| MENU ITEMS ||============================== //

const menuItems: { items: NavItemType[] } = {
  items: [userManagement
    ,hospice,
    billing,
    reports,
    admin,
    // applications,
    samplePage,
    // pages,
    // support
  ].filter(Boolean)
};

export default menuItems;
