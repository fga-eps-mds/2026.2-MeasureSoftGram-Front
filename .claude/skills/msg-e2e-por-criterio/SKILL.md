---
name: msg-e2e-por-criterio
description: Gera e escreve o E2E (Playwright) de uma US do MeasureSoftGram Front a partir dos critérios de aceitação da issue no DOC, um describe por CA.
---

# E2E por critério de aceitação (MeasureSoftGram Front)

Use quando alguém pedir o teste E2E de uma US do `2026.2-MeasureSoftGram-Front` ("faz o e2e da US22.01", "gera os cenários da minha US"). O resultado é um arquivo `e2e/usXX-YY-<pagina>.e2e.ts` com **um `describe` por critério de aceitação**, as fixtures da página e a US no mapa de issues, pronto para PR.

O modelo a seguir é a US21.03: `e2e/us21-03-distribuicao.e2e.ts` e `e2e/fixtures/distribuicao/`. Leia os dois antes de escrever.

## Pré-requisitos: confira na base antes de começar

Partes deste fluxo chegam com PRs que podem ainda não estar no `develop`. Confira cada uma e, se faltar, siga o plano B e avise a pessoa:

| O que | Vem com | Se não estiver na base |
| --- | --- | --- |
| `RELEASES_API` e `releases` exportados por `e2e/fixtures/common.ts` | PR do E2E da US21.01 | Defina a rota `${PRODUCT_API}/release/` e um `releases.json` na fixture da própria página, como `e2e/fixtures/distribuicao/` faz |
| `e2e/acceptance-issues.json` e o comentário automático na issue (passo do `e2e.yml` com o secret `DOC_ISSUES_TOKEN`) | #109 | Pule o Passo 8 e diga que o resultado não vai sozinho para a issue |
| Helpers comuns em `e2e/support/helpers.ts`, `api.hold` e as opções de idioma e sessão do fixture base | PR de follow-up da revisão dos E2E por critério | Copie o helper que faltar para o arquivo da US e avise no PR |

## Como a infraestrutura funciona (não reconfigure)

- Playwright só com Chromium. `pnpm e2e` faz o build do Next e sobe `next start` em `localhost:3000`; nada depende do Service nem da VM.
- `e2e/support/api.ts`: `page.route` responde a cada `/api/v1/...` pelo **caminho exato**. Rota sem handler responde 501 e o teste **falha no fim** (`rotas da API pedidas sem handler`).
- `e2e/support/session.ts`: sessão fake no `localStorage`; o usuário já está logado.
- `e2e/support/fixtures.ts`: `test` já grava o idioma (`locale_lang = 'pt'`), semeia a sessão e os handlers de `e2e/fixtures/common.ts`. Cada `describe` escolhe o cenário com `test.use({ scenario })`; `test.use({ session: false })` começa sem sessão (tela de login); `api.set(path, handler)` troca uma resposta no meio do teste; `api.hold(...paths)` segura as respostas até o teste chamar a função que ele devolve. Não repita o `beforeEach` do idioma nem recrie o fixture.
- `e2e/support/helpers.ts`: `card`, `select`, `choose`, `levelButton`/`chooseLevel` (botões), `levelTab`/`chooseLevelTab` (abas), `downloadCsv`, `csvLines` e `bandSwatch`. Use esses em vez de escrever outros iguais no arquivo da US.
- `e2e/fixtures/common.ts` exporta `ORGANIZATION_ID`, `PRODUCT_ID`, `PRODUCT_PATH`, `PRODUCT_API`, `EMPTY_PAGE`, `RELEASES_API`, `releases` (R1 encerrada, R2 atual), `semProduto` (organização sem produto) e `common`. Reaproveite; não duplique.
- O CI (`.github/workflows/e2e.yml`) roda em todo PR e push para `develop` e `main`. Com o #109, no push, publica o resultado por CA num comentário da issue da US (mapa em `e2e/acceptance-issues.json`).

## Passo 1: ler os critérios da issue

```bash
gh issue view <n> -R fga-eps-mds/2026.2-MeasureSoftGram-DOC --json title,state,body,comments
```

- Pegue a seção **Critérios de Aceitação**. Numere `CA1..CAn` na ordem em que aparecem; cenários BDD (`Cenário 1..n`) viram `CA1..CAn` na mesma ordem.
- Leia os comentários do PO (`hneri`): ajustes de redação ou de comportamento valem como critério.
- **Sem critérios na issue, pare** e diga à pessoa que a US precisa de CA antes do teste. Não invente critério.

## Passo 2: achar a página e o que ela pede

- A página fica em `src/pages/products/[product]/...` (ex.: `dashboards/<nome>/`). Abra o hook dela (`use<Nome>.ts`) e liste os endpoints, que vêm de `productQuery` em `src/shared/services/product.ts` (caminho a partir de `/v1/...` e query).
- Para cada componente, anote se é **DOM** (MUI, tabelas, textos, botões) ou **canvas** (`@components/ECharts`). Isso decide como cada CA é testado.

## Passo 3: classificar cada CA e mostrar antes de escrever

| Classe | Quando | Como |
| --- | --- | --- |
| E2E | O resultado está no DOM | `getByRole`, `getByText`, `getByTestId`, `toHaveAttribute` |
| E2E pelo CSV | O conteúdo está num gráfico em canvas, mas a página exporta CSV | Baixar o CSV e comparar as linhas |
| Snapshot | Só o desenho mostra o critério (cores, eixos, curvas) | `toHaveScreenshot`, pulado fora do CI |
| Manual | Tooltip, hover ou clique em ponto de canvas | `test.skip('... (manual)')` com o motivo |
| Fora do Front | Regra do Service, do Core ou da CLI (cálculo, permissão, persistência) | Não entra no E2E; diga na tabela |

Mostre essa tabela (CA, resumo, classe, como) à pessoa e **espere o OK antes de escrever o código**. Se um CA de canvas puder virar E2E por algo no DOM (legenda, resumo, `aria-label`, `data-render-ms`, CSV), prefira isso a manual.

## Passo 4: fixtures

Em `e2e/fixtures/<pagina>/`: JSONs no formato do Service e um `index.ts` com um objeto de handlers por cenário. Partir de respostas reais da homologação ajuda a acertar o formato, mas **anonimize antes de commitar**: troque nomes de repositórios, usuários e organizações reais por dados de exemplo, como os de `src/mocks/fixtures/`.

```ts
import { ApiHandlers, serverError } from '../../support/api';
import { PRODUCT_API, PRODUCT_PATH, RELEASES_API, releases } from '../common';
// semProduto (organização sem produto, para o CA do menu) já vem de ../common
import dados from './dados.json';
import dadosR1 from './dados-r1.json';

export const PAGINA_PATH = `${PRODUCT_PATH}/dashboards/<pagina>/`;
export const PAGINA_API = { releases: RELEASES_API, dados: `${PRODUCT_API}/<endpoint>/` };

/** Uma frase dizendo o que o cenário tem e para qual CA serve. */
export const comDados: ApiHandlers = {
  [PAGINA_API.releases]: releases,
  // handler pode ser função da URL, para responder conforme a query
  [PAGINA_API.dados]: (url: URL) => (url.searchParams.get('release_id') === '1' ? dadosR1 : dados)
};
export const semRelease: ApiHandlers = { [PAGINA_API.releases]: [] };
export const erro500: ApiHandlers = { ...comDados, [PAGINA_API.dados]: serverError };
```

Cenários mínimos: com dados, vazio, erro 500 e os casos de borda que os CAs citam. Toda rota que a página pede precisa de handler; se o teste acusar rota sem handler, acrescente-a (ou não navegue para outra página no teste).

## Passo 5: o arquivo de teste

`e2e/usXX-YY-<pagina>.e2e.ts`, um `describe` por CA, com a tag no começo do título:

```ts
import { expect, test } from './support/fixtures';
import { comDados, PAGINA_PATH } from './fixtures/<pagina>';

const TITLE = '<título h1 da página>';

test.describe('@US22.01-CA1 <resumo do critério>', () => {
  test.use({ scenario: comDados });

  test('<o que o teste confere>', async ({ page }) => {
    await page.goto(PAGINA_PATH);
    await expect(page.getByRole('heading', { level: 1, name: TITLE })).toBeVisible();
    // ...
  });
});
```

Padrões que já existem e devem ser repetidos:

- **Esperar o gráfico desenhar:** `await expect(area).toHaveAttribute('data-render-ms', /^\d+$/)`.
- **Card do dashboard:** `card(page, '<título do card>')` (o `region` com aria-label, nome exato).
- **Seletor do MUI:** `select(page, 'Release')` e `choose(page, 'Release', 'R1')`.
- **CSV:** `const linhas = await downloadCsv(page, botão, /^msgram-<pagina>-\d{4}-\d{2}-\d{2}\.csv$/)`; ele confere o nome e a marca de ordem de bytes do começo. O arquivo usa `;` entre colunas e vírgula decimal. Para o CSV de dentro de um `.zip`, `csvLines(conteúdo)`.
- **Erro e "Tentar novamente":** cenário `erro500`; conferir `not.toContainText(/500|Erro interno|Request failed/)`; depois `api.set(rota, handlerBom)`, clicar e ver os dados voltarem.
- **Carregando:** cenário com dados e `const libera = api.hold(rota)` antes do `goto`; confira o selo e a mensagem, chame `libera()` e veja os dados. Não use atraso fixo na fixture: numa CI lenta ele acaba antes ou depois da hora.
- **Manual:** `test.skip('<o que seria testado> (manual)', async () => {});` com um comentário do motivo (ex.: tooltip em canvas).
- **Snapshot:** `test.skip(!process.env.CI, 'a baseline do snapshot é gerada no CI (Linux), nunca no Mac');` e `await expect(locator).toHaveScreenshot('<nome>.png')`, sem `maxDiffPixels`: a tolerância esconde regressões pequenas, como a cor de um marcador, e também afrouxa a espera do Playwright por duas capturas seguidas iguais, então num gráfico animado a baseline sai no meio da animação. Sem ela, o Playwright espera o desenho parar.
- **Nível do modelo:** `chooseLevel(page, 'Característica')` (botões) ou `chooseLevelTab` (abas): um clique só e a espera pelo `aria-pressed`/`aria-selected`. Não ponha o clique dentro de `toPass`: a nova tentativa pode desfazer o primeiro clique de um botão que alterna. Se o clique se perder logo depois da carga, espere o estado que mostra a página pronta (o `data-render-ms`, o `aria-busy` da grade) antes de clicar.
- **Locators:** papel acessível, `data-testid`, aria-label ou escopo no card. Nada de `locator('..')`, xpath de irmão ou `nth()` quando um rótulo resolve (ex.: `totals.filter({ has: page.getByText('Repositórios', { exact: true }) })`). Se não houver gancho em `src/`, diga no PR qual `data-testid` falta.
- Nunca use `waitForTimeout`. Espere por estado.

## Passo 6: rodar

- Use **Node 20**, a mesma versão do CI (`e2e.yml`, `test.yml`) e do Dockerfile. Com o Node 26 do Homebrew, o build do Next 12 falhou localmente. Se `pnpm` não estiver no PATH, use `npx -y pnpm@9`.
- `pnpm e2e --grep @USxx.yy --repeat-each=3`: precisa passar as 3 vezes, sem flaky.
- `pnpm exec eslint <arquivos>` e `pnpm exec prettier --write <arquivos>`.
- Para ver o relatório: `npx playwright show-report`.

## Passo 7: snapshot (só se houver)

A baseline é gerada no CI, nunca local:

```bash
git push -u origin <branch>
gh workflow run e2e.yml -R fga-eps-mds/2026.2-MeasureSoftGram-Front --ref <branch> -f update_snapshots=true
# o workflow run não imprime o id: pegue o run mais recente da branch
gh run list -R fga-eps-mds/2026.2-MeasureSoftGram-Front --workflow e2e.yml --branch <branch> -L 1
gh run watch <run-id> -R fga-eps-mds/2026.2-MeasureSoftGram-Front
gh run download <run-id> -R fga-eps-mds/2026.2-MeasureSoftGram-Front -n e2e-snapshots
```

Copie os `.png` para `e2e/<arquivo>.e2e.ts-snapshots/` e commite.

## Passo 8: mapa da issue

Se o arquivo não existir na base, veja os pré-requisitos. Se a US não estiver nele, acrescente `"USxx.yy": <número da issue no DOC>` **dentro de `issues`** (o arquivo é `{ "repository": "...", "issues": { "US21.03": 128 } }`). Só histórias entram no mapa; issues fechadas que viraram cenário de outra US ficam de fora.

## Passo 9: PR

- Título: `test(e2e): cenários de aceitação de <página> por critério (USxx.yy)`.
- Corpo: a tabela CA → como foi testado (E2E, CSV, snapshot, manual, fora do Front) e o resultado das 3 execuções locais.
- O E2E vai no mesmo PR da US ou num PR separado, conforme o time decidir na doc.
- Commits e PR só com o nome de quem fez: sem `Co-authored-by` nem linha de atribuição a IA.
- Depois do merge em `develop`, confira o comentário com a tabela por CA na issue da US. Os itens manuais listados ali são validados por outra pessoa, com print como evidência (quem desenvolveu não testa).
