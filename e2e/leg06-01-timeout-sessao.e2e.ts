import { Page } from '@playwright/test';
import { expect, test } from './support/fixtures';
import { SESSION_COOKIES } from './support/session';

/**
 * US006 de 2026.1 (Front#9 e #12, "Gerenciar timeout de sessão"). A issue não tem critérios em BDD: os critérios são os
 * do comportamento atual (Auth.context.tsx). A sessão dura 2 horas desde o login, com aviso 10 minutos antes do fim.
 */
const MINUTE = 60 * 1000;
const WARNING = 'Sua sessão expirará em menos de 10 minutos. Salve seu trabalho para evitar perda de dados.';
const EXPIRED = 'Sua sessão expirou. Por favor, faça login novamente!';

/** Abre a Home com a sessão iniciada há `minutes` minutos (o início fica no cookie que o login grava). */
async function openHomeLoggedFor(page: Page, minutes: number) {
  await page
    .context()
    .addCookies([
      { name: SESSION_COOKIES.loginAt, value: String(Date.now() - minutes * MINUTE), url: 'http://localhost' }
    ]);
  await page.goto('/home/');
}

/** O modal do aviso não tem papel próprio: os botões "Entendi" e "Sair Agora" são só dele. */
const understood = (page: Page) => page.getByRole('button', { name: 'Entendi' });
const leaveNow = (page: Page) => page.getByRole('button', { name: 'Sair Agora' });

test.describe('@LEG06.01-CA1 Aviso 10 minutos antes do fim da sessão', () => {
  test('a sessão com 1h55 de uso mostra o aviso, e "Entendi" continua na tela', async ({ page }) => {
    await openHomeLoggedFor(page, 115);
    await expect(page.getByRole('alert').filter({ hasText: WARNING }).first()).toBeVisible();
    await understood(page).click();
    await expect(understood(page)).toHaveCount(0);
    await expect(leaveNow(page)).toHaveCount(0);
    await expect(page).toHaveURL(/\/home\/?$/);
  });

  test('a sessão recente não mostra o aviso', async ({ page }) => {
    await openHomeLoggedFor(page, 30);
    await expect(page.getByText('usuario-mock')).toBeVisible();
    await expect(page.getByText(WARNING)).toHaveCount(0);
  });
});

test.describe('@LEG06.01-CA2 "Sair Agora" no aviso encerra a sessão', () => {
  test('volta à página pública com a mensagem de saída', async ({ page }) => {
    await openHomeLoggedFor(page, 115);
    await leaveNow(page).click();
    await expect(page).toHaveURL('/');
    await expect(page.getByText('Volte logo para acompanhar seus produtos!')).toBeVisible();
  });
});

test.describe('@LEG06.01-CA3 Ao fim das 2 horas a sessão é encerrada', () => {
  test('volta à página pública com "Sua sessão expirou"', async ({ page }) => {
    await openHomeLoggedFor(page, 121);
    await expect(page).toHaveURL('/');
    await expect(page.getByText(EXPIRED)).toBeVisible();
  });
});
