import { expect, test } from './support/fixtures';
import { comDados, DISTRIBUTION_PATH, erro500, semAnalise, semRelease } from './fixtures/distribuicao';

const TITLE = '5. Distribuição Estatística';
const CARD_TITLES = [
  'Histograma',
  'Curva de densidade',
  'Boxplot e percentis do nível',
  'Dispersão das análises no tempo',
  'Resumo estatístico e IQR'
];

/** Carregamento da página em cada cenário de fixture; os critérios (CAn) ficam para a Tarefa 4. */
test.describe('@US21.03 Distribuição Estatística: carregamento', () => {
  test.describe('release com análises', () => {
    test.use({ scenario: comDados });

    test('mostra o período da release e os cinco quadros', async ({ page }) => {
      await page.goto(DISTRIBUTION_PATH);
      await expect(page.getByRole('heading', { level: 1, name: TITLE })).toBeVisible();
      await expect(page.getByTestId('distribution-period')).toContainText('8 análises no período');
      for (const title of CARD_TITLES) {
        await expect(page.getByRole('region', { name: title })).toBeVisible();
      }
      await expect(page.getByTestId('distribution-grid')).not.toHaveAttribute('aria-busy', 'true');
    });
  });

  test.describe('repositório sem análise na release', () => {
    test.use({ scenario: semAnalise });

    test('mostra o estado sem análise, com o período da release', async ({ page }) => {
      await page.goto(DISTRIBUTION_PATH);
      await expect(page.getByText(/não tem análises de TSQMI na release R2/)).toBeVisible();
      await expect(page.getByRole('link', { name: 'Ver como configurar a coleta' })).toBeVisible();
    });
  });

  test.describe('produto sem release', () => {
    test.use({ scenario: semRelease });

    test('convida a planejar a primeira release', async ({ page }) => {
      await page.goto(DISTRIBUTION_PATH);
      await expect(page.getByText('Este produto ainda não tem release')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Planejar release' })).toBeVisible();
    });
  });

  test.describe('erro 500 na distribuição', () => {
    test.use({ scenario: erro500 });

    test('mostra a falha com o botão de tentar novamente', async ({ page }) => {
      await page.goto(DISTRIBUTION_PATH);
      await expect(page.getByText('Não foi possível carregar a distribuição')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Tentar novamente' })).toBeVisible();
    });
  });
});
