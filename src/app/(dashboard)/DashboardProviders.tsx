'use client';

import React, { useSyncExternalStore } from 'react';
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

const subscribe = () => () => undefined;

// O idioma salvo só é conhecido no navegador e o HTML do servidor sai em inglês: montar depois da hidratação evita
// a divergência.
export default function DashboardProviders({ children, initialUser, provider, loginAt }: Props) {
  const isClient = useSyncExternalStore(subscribe, () => true, () => false);
  if (!isClient) return null;

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
