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
 * Redesenha o gráfico estreitando a janela e voltando, e espera o canvas voltar à largura de antes.
 * shortcut: contorna o pulso do ECharts 5.6, cuja animação de entrada termina com o recorte na borda da faixa e corta os
 * picos que passam dela (o clip: false só vale a partir do segundo desenho). Sem o redesenho, o snapshot sai com ou sem
 * os picos, conforme a página redesenhe ou não logo depois de abrir. Tire quando o pulso desenhar certo da primeira vez.
 */
export async function redrawChart(page: Page, canvas: Locator) {
  const viewport = page.viewportSize();
  const width = await canvas.getAttribute('width');
  if (!viewport || !width) throw new Error('o gráfico ainda não tem largura');
  // o echarts-for-react ignora o primeiro aviso de tamanho depois de montar (isInitialResize): se o estreitamento cair
  // nele, o gráfico não redesenha, e a janela estreita mais um pouco; definir o tamanho de novo não desfaz nada
  let narrower = viewport.width;
  await expect(async () => {
    narrower -= 50;
    await page.setViewportSize({ ...viewport, width: narrower });
    await expect(canvas).not.toHaveAttribute('width', width, { timeout: 1000 });
  }).toPass();
  await page.setViewportSize(viewport);
  await expect(canvas).toHaveAttribute('width', width);
}
