import React from 'react';
import type { Metadata } from 'next';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v16-appRouter';
import StyledComponentsRegistry from '@components/StyledComponentsRegistry';
import '@styles/globals.css';
import GoogleFonts from '../shared/server/fonts/GoogleFonts';
import Providers from './providers';

export const metadata: Metadata = {
  description: 'Meça a qualidade do seu software de forma objetiva, com base em métricas coletadas do seu próprio pipeline.',
  icons: { icon: '/images/svg/logo.svg' }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <GoogleFonts />
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
