import { defineConfig, devices } from '@playwright/test';

const PORT = 3000;
const BASE_URL = `http://localhost:${PORT}`;

/**
 * E2E do Front contra a API simulada por page.route (ver e2e/support/api.ts). O build roda sem o modo mock do MSW,
 * e o NEXT_PUBLIC_API_URL aponta para o próprio servidor de teste: toda chamada a /api/v1 é interceptada no navegador.
 */
export default defineConfig({
  testDir: 'e2e',
  testMatch: '**/*.e2e.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: BASE_URL,
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    // sem Service Worker, nada passa por fora do page.route
    serviceWorkers: 'block',
    trace: 'on-first-retry'
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `pnpm build && pnpm start -p ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 5 * 60 * 1000,
    env: {
      NEXT_PUBLIC_API_URL: `${BASE_URL}/api`,
      // sem o client id, o botão do GitLab vai direto a /auth/error; o redirect volta para este servidor
      GITLAB_CLIENT_ID: 'e2e-gitlab',
      NEXT_PUBLIC_LOGIN_REDIRECT_URL: `${BASE_URL}/`
    }
  }
});
