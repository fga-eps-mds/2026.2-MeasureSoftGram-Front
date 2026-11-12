import { Page } from '@playwright/test';

/**
 * O /auth/oauth/<provedor> do Next responde com um redirect para o provedor, e o page.route não intercepta a requisição
 * que segue um redirect: o navegador iria ao GitLab de verdade. Aqui o servidor responde normalmente (valida o client id e
 * grava o cookie do state) e o redirect vira uma navegação da própria página, que o page.route do provedor intercepta.
 */
export async function followOAuthRedirectsInPage(page: Page): Promise<void> {
  await page.route('**/auth/oauth/**', async (route) => {
    const response = await route.fetch({ maxRedirects: 0 });
    const location = response.headers().location;
    if (!location || !/^https?:\/\//.test(location)) return route.fulfill({ response });

    const headers = { ...response.headers(), 'content-type': 'text/html' };
    delete headers.location;
    return route.fulfill({
      status: 200,
      headers,
      body: `<!doctype html><script>location.replace(${JSON.stringify(location)})</script>`
    });
  });
}
