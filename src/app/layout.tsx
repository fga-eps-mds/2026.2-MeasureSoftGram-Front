import React from 'react';
import type { Metadata } from 'next';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v16-appRouter';
import StyledComponentsRegistry from '@components/StyledComponentsRegistry';
import '@styles/globals.css';
import Providers from './providers';

export const metadata: Metadata = {
  description: 'Meça a qualidade do seu software de forma objetiva, com base em métricas coletadas do seu próprio pipeline.',
  icons: { icon: '/images/svg/logo.svg' }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;700&family=Roboto:wght@300;400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans" suppressHydrationWarning>
        <AppRouterCacheProvider>
          <StyledComponentsRegistry>
            <Providers>{children}</Providers>
          </StyledComponentsRegistry>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
