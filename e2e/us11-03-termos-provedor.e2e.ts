import { readFileSync } from 'fs';
import { expect, test } from './support/fixtures';
import { PRODUCT_PATH } from './fixtures/common';
import { DISTRIBUTION_PATH } from './fixtures/distribuicao';
import { comTelas, importacaoComErro, semRepositorios } from './fixtures/termos';
import { expectOnlyTermsOf, Language, seedLanguage } from './support/terms';

/** As telas que mostram os termos do provedor: o nome e a rota. */
const TELAS = [
  { nome: 'Organizações', rota: '/organizations/' },
  { nome: 'Produtos', rota: '/products/' },
  { nome: 'Cadastro de produto', rota: '/products/create/' },
  { nome: 'Home', rota: '/home/' },
  { nome: 'Sobre', rota: '/about/' },
  { nome: 'Visão Geral do produto', rota: `${PRODUCT_PATH}/` },
  { nome: 'Repositórios', rota: `${PRODUCT_PATH}/repositories/` },
  { nome: 'Cadastro de repositório', rota: `${PRODUCT_PATH}/repositories/manage-repository/` },
  { nome: 'Tela do repositório', rota: `${PRODUCT_PATH}/repositories/1/` },
  { nome: 'Releases', rota: `${PRODUCT_PATH}/releases/` },
  { nome: 'Planejar release', rota: `${PRODUCT_PATH}/releases/create/` },
  { nome: 'Dashboard Visão Geral', rota: `${PRODUCT_PATH}/dashboards/overview/` },
  { nome: 'Dashboard Evolução Temporal', rota: `${PRODUCT_PATH}/dashboards/temporal/` },
  { nome: 'Dashboard Metamodelo', rota: `${PRODUCT_PATH}/dashboards/metamodelo/` },
  { nome: 'Dashboard Análise por Entidade', rota: `${PRODUCT_PATH}/dashboards/entidade/` },
  { nome: 'Dashboard Distribuição Estatística', rota: DISTRIBUTION_PATH },
  { nome: 'Dashboard Relações e Correlações', rota: `${PRODUCT_PATH}/dashboards/relacoes/` }
];

const LANGUAGES: Language[] = ['pt', 'en'];

test.describe('@US11.03-CA1 Termos do provedor da sessão em vez dos do outro', () => {
  test.use({ scenario: comTelas });

  test.describe('GitLab', () => {
    test.use({ provider: 'gitlab' });

    test('o menu lateral fala em Projetos, e a importação em Projetos e Grupos', async ({ page }) => {
      await seedLanguage(page, 'pt');
      await page.goto(`${PRODUCT_PATH}/`);
      await expect(page.getByLabel('Projetos do Produto')).toBeAttached();
      await expect(page.getByText('Projetos', { exact: true }).first()).toBeVisible();

      await page.goto('/products/');
      await expect(page.getByText('Importação de Projetos')).toBeVisible();
      await expect(page.getByText('Grupos do GitLab').first()).toBeVisible();
      await expect(
        page.getByText('Selecione seu grupo e o produto correspondente para gerenciar seus projetos.')
      ).toBeVisible();
    });
  });

  test.describe('GitHub', () => {
    test.use({ provider: 'github' });

    test('o menu lateral fala em Repositórios, e a importação em Repositórios e Organizações', async ({ page }) => {
      await seedLanguage(page, 'pt');
      await page.goto(`${PRODUCT_PATH}/`);
      await expect(page.getByLabel('Repositórios do Produto')).toBeAttached();
      await expect(page.getByText('Repositórios', { exact: true }).first()).toBeVisible();

      await page.goto('/products/');
      await expect(page.getByText('Importação de Repositórios')).toBeVisible();
      await expect(page.getByText('Organizações do GitHub').first()).toBeVisible();
    });
  });
});

test.describe('@US11.03-CA2 Termos consistentes em cada tipo de elemento (GitLab)', () => {
  test.use({ provider: 'gitlab', scenario: comTelas });

  test.beforeEach(async ({ page }) => seedLanguage(page, 'pt'));

  test('filtro: o seletor da Distribuição se chama Projeto', async ({ page }) => {
    await page.goto(DISTRIBUTION_PATH);
    await expect(page.getByRole('combobox', { name: /^Projeto/ })).toBeVisible();
    await expect(page.getByRole('combobox', { name: /^Repositório/ })).toHaveCount(0);
  });

  test('tooltip: o item do menu explica "Projetos do Produto"', async ({ page }) => {
    await page.goto(`${PRODUCT_PATH}/`);
    await expect(page.getByLabel('Projetos do Produto')).toBeAttached();
    await expect(page.getByLabel('Repositórios do Produto')).toHaveCount(0);
  });

  test.describe('mensagem de estado vazio', () => {
    test.use({ scenario: semRepositorios });

    test('o produto sem projetos diz "projetos" na Distribuição', async ({ page }) => {
      await page.goto(DISTRIBUTION_PATH);
      await expect(page.getByText('Este produto ainda não tem projetos')).toBeVisible();
    });
  });

  test.describe('notificação de erro', () => {
    test.use({ scenario: importacaoComErro });

    test('a falha ao listar os grupos do GitLab avisa com "grupos"', async ({ page }) => {
      await page.goto('/products/');
      await expect(page.getByText(/Erro ao (buscar|carregar) grupos/).first()).toBeVisible();
    });
  });

  test('gráfico: o Gráfico MSG sem releases descreve o acompanhamento dos projetos', async ({ page }) => {
    await page.goto(`${PRODUCT_PATH}/`);
    await expect(page.getByText(/acompanha o TSQMI dos projetos/)).toBeVisible();
  });

  test('relatório: o CSV da Distribuição tem a coluna Projeto, e não Repositório', async ({ page }) => {
    await page.goto(DISTRIBUTION_PATH);
    await expect(page.getByTestId('distribution-period')).toBeVisible();
    const [csv] = await Promise.all([
      page.waitForEvent('download'),
      page
        .getByRole('region', { name: 'Resumo estatístico e IQR' })
        .getByRole('button', { name: 'Exportar .csv' })
        .click()
    ]);
    const header = readFileSync((await csv.path()) ?? '', 'utf8').split('\r\n')[0];
    expect(header).toContain('Projeto');
    expect(header).not.toContain('Repositório');
  });
});

test.describe('@US11.03-CA3 Nenhuma tela mistura termos de provedores diferentes', () => {
  (['gitlab', 'github'] as const).forEach((provider) => {
    LANGUAGES.forEach((language) => {
      test.describe(`${provider}, ${language}`, () => {
        test.use({ scenario: comTelas, provider });

        test.beforeEach(async ({ page }) => seedLanguage(page, language));

        TELAS.forEach((tela) => {
          test(`${tela.nome}`, async ({ page }) => {
            await page.goto(tela.rota);
            await page.waitForLoadState('networkidle');
            await expectOnlyTermsOf(page, provider, language);
          });
        });
      });
    });
  });
});

test.describe('@US11.03-CA4 Termos atualizados ao trocar de provedor sem recarregar', () => {
  // O PO definiu (14/10) que o login é atrelado a um provedor: trocar de provedor é sair e entrar de novo pelo OAuth,
  // fora do E2E (US11.01). A troca do contexto sem recarregar tem teste unitário em useProviderTerms.spec.tsx.
  test.skip('manual: sair, entrar pelo outro provedor e conferir que os termos mudaram', () => {});
});

test.describe('@US11.03-CA5 Sem termo equivalente no provedor, o vocabulário neutro é consistente', () => {
  test.use({ scenario: comTelas, provider: 'credentials' });

  LANGUAGES.forEach((language) => {
    test.describe(language, () => {
      test.beforeEach(async ({ page }) => seedLanguage(page, language));

      TELAS.forEach((tela) => {
        test(`${tela.nome}: vocabulário padrão, sem termos do GitLab`, async ({ page }) => {
          await page.goto(tela.rota);
          await page.waitForLoadState('networkidle');
          await expectOnlyTermsOf(page, 'credentials', language);
        });
      });
    });
  });

  // pergunta em aberto na DOC#114: quais são os termos neutros? Sem resposta do PO, não há o que conferir
  test.skip('os termos neutros definidos pelo PO', () => {});
});
