import React from 'react';
import { redirect } from 'next/navigation';
import Layout from '@components/Layout';
import { getSession } from '../../shared/server/auth/session';
import DashboardProviders from './DashboardProviders';

/**
 * O proxy.ts já barrou quem não tem sessão. Aqui o servidor lê o usuário uma vez e o entrega ao AuthProvider, então o
 * nome já sai no HTML. Este layout lê cookies: todas as rotas privadas são dinâmicas.
 */
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect('/auth');

  return (
    <DashboardProviders initialUser={session.user as User | null} provider={session.provider} loginAt={session.loginAt}>
      <Layout>{children}</Layout>
    </DashboardProviders>
  );
}
