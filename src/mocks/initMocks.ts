/**
 * Inicializa o modo mock de forma idempotente.
 *
 * So faz algo quando NEXT_PUBLIC_API_MOCKING === 'enabled' e roda no client.
 * Liga o Service Worker do MSW. A sessao fake vem do servidor: com o mock ligado o
 * proxy.ts nao valida e o getSession() devolve o usuario da fixture.
 * Quando o mock esta desligado, e um no-op inerte (nao afeta build nem testes).
 */
let started = false;

export async function initMocks(): Promise<void> {
  if (process.env.NEXT_PUBLIC_API_MOCKING !== 'enabled') return;
  if (typeof window === 'undefined') return;
  if (started) return;
  started = true;

  const { worker } = await import('./browser');
  await worker.start({
    onUnhandledRequest: 'bypass',
    serviceWorker: { url: '/mockServiceWorker.js' }
  });
}
