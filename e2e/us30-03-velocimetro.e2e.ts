import { Page } from '@playwright/test';
import { expect, test } from './support/fixtures';
import * as repositorio from './fixtures/repositorio';
import { bomAte070, SETTINGS_PATH } from './fixtures/faixas';

const ADJUST_BANDS = 'Ajustar faixas';

const adjustBandsLink = (page: Page) => page.getByRole('link', { name: ADJUST_BANDS });
/**
 * O velocímetro e o link logo abaixo: o bloco mais interno que tem o link.
 * shortcut: preso à estrutura do cabeçalho, porque o velocímetro não tem test id nem aria-label em src/; troque por
 * getByTestId quando o Header ganhar um.
 */
const gauge = (page: Page) =>
  page
    .locator('div')
    .filter({ has: adjustBandsLink(page) })
    .last();

async function openRepository(page: Page) {
  await page.goto(repositorio.REPOSITORY_PATH);
  await expect(page.getByRole('heading', { name: 'MeasureSoftGram-Service' })).toBeVisible();
  await expect(gauge(page).locator('canvas')).toBeVisible();
}

test.describe('@US30.03-CA1 O badge do repositório usa as faixas do produto', () => {
  // o SVG do badge é desenhado pelo Service (utils/badge.py, Service#92), que tem os testes da faixa A a partir de 0,85
  test.skip('com a faixa A a partir de 0,85, um repositório com 0,82 tem o badge na faixa B (manual)', async () => {});
});

test.describe('@US30.03-CA2 O velocímetro mostra as 5 faixas do produto e o ponteiro no indicador atual', () => {
  test.use({ scenario: { ...repositorio.comDados, ...bomAte070 } });

  // as faixas e o ponteiro só existem no desenho do canvas; com Bom até 0,70, o 0,62 do Service fica em C
  test('desenho do velocímetro com a régua do produto e o ponteiro em 0,62 (snapshot)', async ({ page }) => {
    test.skip(!process.env.CI, 'a baseline do snapshot é gerada no CI (Linux), nunca no Mac');
    await openRepository(page);
    await expect(gauge(page)).toHaveScreenshot('velocimetro-faixas-do-produto.png');
  });
});

test.describe('@US30.03-CA3 Sem o modal antigo: o link "Ajustar faixas" leva à aba de faixas do produto', () => {
  test.use({ scenario: repositorio.comDados });

  test('a tela do repositório não tem mais a engrenagem do modal de faixas', async ({ page }) => {
    await openRepository(page);
    // o botão do modal antigo era só o ícone de engrenagem do MUI, sem rótulo
    await expect(page.getByTestId('SettingsIcon')).toHaveCount(0);
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });

  test('"Ajustar faixas" abre a aba "Faixas de qualidade" das configurações do produto', async ({ page }) => {
    await openRepository(page);
    await expect(adjustBandsLink(page)).toHaveAttribute('href', SETTINGS_PATH);
    await adjustBandsLink(page).click();
    await expect(page).toHaveURL(/\/settings\/?$/);
    await expect(page.getByRole('tab', { name: 'Faixas de qualidade' })).toHaveAttribute('aria-selected', 'true');
  });
});

test.describe('@US30.03-CA4 Repositório sem cálculo há mais de 30 dias continua com o badge "N/A" em cinza', () => {
  // regra do Service (utils/badge.py, is_stale), mantida e testada no Service#92
  test.skip('o badge de um repositório sem cálculo há mais de 30 dias é "N/A" em cinza (manual)', async () => {});
});
