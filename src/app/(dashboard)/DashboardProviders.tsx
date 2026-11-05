'use client';

import React from 'react';
import { AuthProvider } from '@contexts/Auth';
import { OrganizationProvider } from '@contexts/OrganizationProvider';
import { RepositoryProvider } from '@contexts/RepositoryProvider';
import { ProductProvider } from '@contexts/ProductProvider';

interface Props {
  children: React.ReactNode;
  initialUser: User | null;
  provider: Providers;
  loginAt: number | null;
}

/** Contextos que só existem com sessão: as páginas públicas não os montam. */
export default function DashboardProviders({ children, initialUser, provider, loginAt }: Props) {
  return (
    <AuthProvider initialUser={initialUser} provider={provider} loginAt={loginAt}>
      <OrganizationProvider>
        <RepositoryProvider>
          <ProductProvider>{children}</ProductProvider>
        </RepositoryProvider>
      </OrganizationProvider>
    </AuthProvider>
  );
}
