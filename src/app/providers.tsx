'use client';

import React, { useEffect, useState } from 'react';
import Theme from '@components/Theme';
import { ToastContainer } from 'react-toastify';
import FlashMessage from '@components/FlashMessage';
import { SWRConfig } from 'swr';
import I18nProvider from '../shared/i18n/I18nProvider';

// Modo mock (issue #64): quando NEXT_PUBLIC_API_MOCKING === 'enabled', o worker
// MSW precisa subir antes de qualquer render para interceptar as chamadas do
// axios. Fora do modo mock o valor inicial ja e true e nada acontece.
const isMockingEnabled = process.env.NEXT_PUBLIC_API_MOCKING === 'enabled';

export default function Providers({ children }: { children: React.ReactNode }) {
  const [mockingReady, setMockingReady] = useState(!isMockingEnabled);

  // Sobe o worker MSW (client-only) antes de renderizar.
  useEffect(() => {
    if (!isMockingEnabled) return;
    import('../mocks/initMocks')
      .then(({ initMocks }) => initMocks())
      .catch((error) => console.error('Falha ao iniciar o modo mock:', error))
      .finally(() => setMockingReady(true));
  }, []);

  // No modo mock, espera o worker MSW estar pronto antes de montar a aplicacao.
  if (!mockingReady) return null;

  return (
    <I18nProvider>
      <SWRConfig value={{ revalidateOnFocus: false, dedupingInterval: 60000, shouldRetryOnError: false }}>
        <ToastContainer
          position="top-right"
          autoClose={5000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="light"
        />
        <FlashMessage />
        <Theme>{children}</Theme>
      </SWRConfig>
    </I18nProvider>
  );
}
