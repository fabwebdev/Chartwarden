'use client';

import { ReactElement } from 'react';

// PROJECT IMPORT
import ThemeCustomization from 'themes';
import { ConfigProvider } from 'contexts/ConfigContext';
import { AbilityProvider } from 'contexts/AbilityContext';
import { SocketProvider } from 'contexts/SocketContext';
import RTLLayout from 'components/RTLLayout';
import Locales from 'components/Locales';
import ScrollTop from 'components/ScrollTop';

import Notistack from 'components/third-party/Notistack';
import Snackbar from 'components/@extended/Snackbar';

// ==============================|| PROVIDER WRAPPER  ||============================== //

const ProviderWrapper = ({ children }: { children: ReactElement }) => {
  return (
    <ConfigProvider>
      <AbilityProvider>
        <SocketProvider autoConnect={true} connectNamespaces={['main', 'notifications']}>
          <ThemeCustomization>
            <RTLLayout>
              <Locales>
                <ScrollTop>
                  <Notistack>
                    <Snackbar />
                    {children}
                  </Notistack>
                </ScrollTop>
              </Locales>
            </RTLLayout>
          </ThemeCustomization>
        </SocketProvider>
      </AbilityProvider>
    </ConfigProvider>
  );
};

export default ProviderWrapper;