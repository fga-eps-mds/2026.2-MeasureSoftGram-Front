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

/**
 * Contextos que só existem com sessão: as páginas públicas não os montam.
 *
 * O conteúdo só é montado no navegador, depois da hidratação. O idioma salvo (localStorage) só é conhecido ali, e o
 * HTML do servidor sai em inglês: hidratar o dashboard em português dava erro de hidratação, e o ECharts era
 * inicializado duas vezes quando o React refazia a árvore. A proteção de rota continua no proxy.ts.
 */
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
