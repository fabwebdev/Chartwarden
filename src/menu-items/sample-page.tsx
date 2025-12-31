// THIRD - PARTY
import { FormattedMessage } from 'react-intl';

// ASSETS
import { DocumentCode2 } from 'iconsax-react';

// TYPE
import { NavItemType } from 'types/menu';

// ICONS
const icons = {
  samplePage: DocumentCode2
};

// ==============================|| MENU ITEMS - SAMPLE PAGE ||============================== //

const samplePage: NavItemType = {
  id: 'sample-page',
  title: <FormattedMessage id="sample-page" />,
  type: 'group',
  url: '/sample-page',
  icon: icons.samplePage
};

export default samplePage;
