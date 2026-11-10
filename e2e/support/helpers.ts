import { readFileSync } from 'fs';
import { Locator, Page } from '@playwright/test';
import { expect } from './fixtures';

/** O cartão de um quadro (section com aria-label); exato, porque "Característica" está em "Subcaracterísticas". */
export const card = (page: Page, title: string): Locator => page.getByRole('region', { name: title, exact: true });

/** Os seletores da tela: o nome acessível do combobox do MUI começa pelo rótulo. */
export const select = (page: Page, label: string): Locator =>
  page.getByRole('combobox', { name: new RegExp(`^${label}`) });

export async function choose(page: Page, label: string, option: string) {
  await select(page, label).click();
  await page.getByRole('option', { name: option, exact: true }).click();
}

/** Os botões do nível do modelo (Distribuição, Relações): um grupo com o botão marcado em aria-pressed. */
export const levelButton = (page: Page, label: string): Locator =>
  page.getByRole('group', { name: 'Nível do modelo' }).getByRole('button', { name: label, exact: true });

export async function chooseLevel(page: Page, label: string) {
  const button = levelButton(page, label);
  await button.click();
  await expect(button).toHaveAttribute('aria-pressed', 'true');
}

/** As abas do nível do modelo (Análise por Entidade): a aba escolhida fica com aria-selected. */
export const levelTab = (page: Page, label: string): Locator =>
  page.getByRole('tablist', { name: 'Nível do modelo' }).getByRole('tab', { name: label, exact: true });

export async function chooseLevelTab(page: Page, label: string) {
  const tab = levelTab(page, label);
  await tab.click();
  await expect(tab).toHaveAttribute('aria-selected', 'true');
}

/** As linhas de um CSV exportado, sem a marca de ordem de bytes do começo. */
export function csvLines(content: string): string[] {
  return content
    .replace(/^\uFEFF/, '')
    .trim()
    .split(/\r?\n/);
}

/** Clica no botão, confere o nome do arquivo baixado e devolve as linhas do CSV. */
export async function downloadCsv(page: Page, button: Locator, fileName: RegExp): Promise<string[]> {
  const [download] = await Promise.all([page.waitForEvent('download'), button.click()]);
  expect(download.suggestedFilename()).toMatch(fileName);
  const content = readFileSync((await download.path()) ?? '', 'utf8');
  // o Excel em português precisa da marca de ordem de bytes para os acentos e do ";" entre as colunas
  expect(content.startsWith('\uFEFF')).toBe(true);
  return csvLines(content);
}

/**
 * O quadrado da cor de uma faixa na legenda, logo antes do rótulo dela.
 * shortcut: preso ao DOM (irmão anterior do rótulo), porque o quadrado não tem papel, test id nem aria-label em src/;
 * troque por getByTestId quando a legenda ganhar um.
 */
export const bandSwatch = (scope: Page | Locator, label: string): Locator =>
  scope.getByText(label, { exact: true }).locator('xpath=preceding-sibling::div[1]');

/**
 * Carrega a fonte antes do desenho do gráfico. O pulso escreve no canvas em Roboto, que vem do Google Fonts com
 * display=swap: se o ECharts desenha antes de a fonte chegar, o texto sai na fonte reserva e não é redesenhado, e o
 * snapshot muda de uma execução para outra.
 */
export async function loadFont(page: Page, family: string) {
  await expect
    .poll(() =>
      page.evaluate(async (family) => {
        const faces = [...document.fonts].filter((face) => face.family.replace(/["']/g, '') === family);
        await Promise.all(faces.map((face) => face.load()));
        return faces.length;
      }, family)
    )
    .toBeGreaterThan(0);
}
