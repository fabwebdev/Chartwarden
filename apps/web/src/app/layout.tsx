import type { Metadata, Viewport } from 'next';

import './globals.css';

// PROJECT IMPORTS
import ProviderWrapper from './ProviderWrapper';

export const metadata: Metadata = {
  title: {
    default: 'Chartwarden - Hospice EHR',
    template: '%s | Chartwarden'
  },
  description: 'HIPAA-compliant Electronic Health Record system for hospice care providers',
  keywords: ['hospice', 'EHR', 'healthcare', 'medical records', 'patient care', 'HIPAA'],
  authors: [{ name: 'Chartwarden' }],
  robots: {
    index: false,
    follow: false
  }
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1
};

export default function RootLayout({ children }: { children: React.ReactElement }) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>
        <ProviderWrapper>{children}</ProviderWrapper>
      </body>
    </html>
  );
}
