import { defineConfig, devices } from '@playwright/test';
import { OAUTH_SERVER_PROJECT, OAUTH_SERVER_TAG, SERVICE_PORT } from './e2e/support/service';

const PORT = 3000;
const BASE_URL = `http://localhost:${PORT}`;
const SERVICE_URL = `http://localhost:${SERVICE_PORT}`;

/**
 * E2E do Front. O navegador fala só com o /bff, e toda chamada a /bff/v1 é interceptada por page.route (ver
 * e2e/support/api.ts). O que o servidor do Next pede ao Service por conta própria (validar o token da sessão, o client id
 * do OAuth, trocar o code, encerrar a sessão) vai para o Service fake de e2e/support/mock-service.mjs.
 *
 * Os testes com a tag @oauth-servidor trocam as respostas do Service fake, que é um só para todos: eles ficam num projeto
 * próprio, que roda um teste por vez, e os demais nunca dependem dessas respostas.
 */
export default defineConfig({
  testDir: 'e2e',
  testMatch: '**/*.e2e.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // o JSON fica fora de playwright-report (o reporter HTML limpa a pasta) e alimenta scripts/e2e-acceptance-comment.mjs
  reporter: [['list'], ['html', { open: 'never' }], ['json', { outputFile: 'e2e-results.json' }]],
  use: {
    baseURL: BASE_URL,
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    // sem Service Worker, nada passa por fora do page.route
    serviceWorkers: 'block',
    trace: 'on-first-retry'
  },
  projects: [
    { name: 'chromium', grepInvert: new RegExp(OAUTH_SERVER_TAG), use: { ...devices['Desktop Chrome'] } },
    { name: OAUTH_SERVER_PROJECT, grep: new RegExp(OAUTH_SERVER_TAG), workers: 1, use: { ...devices['Desktop Chrome'] } }
  ],
  webServer: [
    {
      command: 'node e2e/support/mock-service.mjs',
      url: `${SERVICE_URL}/__e2e/health`,
      reuseExistingServer: !process.env.CI,
      env: { E2E_SERVICE_PORT: String(SERVICE_PORT) }
    },
    {
      command: `pnpm build && pnpm start -p ${PORT}`,
      url: BASE_URL,
      reuseExistingServer: !process.env.CI,
      timeout: 5 * 60 * 1000,
      env: {
        SERVICE_URL: `${SERVICE_URL}/api`,
        // sem o client id, o botão do GitLab vai direto a /auth/error; o redirect volta para este servidor
        GITLAB_CLIENT_ID: 'e2e-gitlab',
        NEXT_PUBLIC_LOGIN_REDIRECT_URL: `${BASE_URL}/`
      }
    }
  ]
});
