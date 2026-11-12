#!/usr/bin/env node
/**
 * Publica na issue de cada US (ou bug), no repositório DOC, o resultado dos E2E por critério de aceitação.
 *
 * Lê o relatório JSON do Playwright, agrupa os testes pela tag `@USxx.yy-CAn` dos títulos e mantém um único comentário
 * por issue (achado pelo marcador), editado a cada run, com a tabela por CA e o histórico dos últimos runs.
 * O número da issue de cada US (ou bug, com a tag @BUGxx.yy-CAn) fica em e2e/acceptance-issues.json.
 *
 * Uso: node scripts/e2e-acceptance-comment.mjs [e2e-results.json] [--dry-run]
 * No CI precisa de DOC_ISSUES_TOKEN (token com permissão de escrita em issues do DOC); sem ele, só avisa e sai.
 */
import { existsSync, readFileSync } from 'node:fs';

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const RESULTS = args.find((arg) => !arg.startsWith('--')) ?? 'e2e-results.json';
const CONFIG = JSON.parse(readFileSync(new URL('../e2e/acceptance-issues.json', import.meta.url), 'utf8'));

const MARKER = '<!-- e2e-aceitacao -->';
const HISTORY_MARKER = /<!-- e2e-historico:(.*?) -->/s;
const HISTORY_SIZE = 10;
const TAG = /@((?:US|BUG)\d+\.\d+)-CA(\d+)/;

const env = process.env;
const API = env.GITHUB_API_URL ?? 'https://api.github.com';
const SERVER = env.GITHUB_SERVER_URL ?? 'https://github.com';
const RUN_URL = env.GITHUB_RUN_ID ? `${SERVER}/${env.GITHUB_REPOSITORY}/actions/runs/${env.GITHUB_RUN_ID}` : undefined;
const COMMIT_URL = env.GITHUB_SHA ? `${SERVER}/${env.GITHUB_REPOSITORY}/commit/${env.GITHUB_SHA}` : undefined;

/** Percorre as suítes do relatório e devolve um resultado por teste que tenha a tag no título ou num describe acima. */
function collect(suite, titles = [], out = []) {
  const path = suite.title ? [...titles, suite.title] : titles;
  for (const spec of suite.specs ?? []) {
    const tag = [...path, spec.title].map((title) => title.match(TAG)).find(Boolean);
    if (!tag) continue;
    for (const test of spec.tests) {
      // test.fixme marca bug conhecido do código; chega como skipped, igual ao pulado manual, e só a anotação separa os dois
      const fixme = (test.annotations ?? []).find((annotation) => annotation.type === 'fixme');
      const status = test.status === 'skipped' && fixme ? 'fixme' : test.status;
      // o motivo vira um item de lista no comentário: uma quebra de linha nele partiria o item
      const note = fixme?.description?.replace(/\s+/g, ' ');
      out.push({ us: tag[1], ca: Number(tag[2]), title: spec.title, status, note });
    }
  }
  for (const child of suite.suites ?? []) collect(child, path, out);
  return out;
}

const KNOWN_BUG = 'não atendido (bug conhecido)';

/**
 * status do Playwright: expected (passou), unexpected (falhou), flaky (passou numa nova tentativa), skipped (pulado,
 * verificação manual), mais o fixme do collect (bug conhecido: o CA não está atendido, mesmo sem falha no run).
 */
function summarize(tests) {
  const count = (status) => tests.filter((test) => test.status === status).length;
  const row = {
    total: tests.length,
    passed: count('expected'),
    flaky: count('flaky'),
    failed: count('unexpected'),
    known: count('fixme'),
    skipped: count('skipped')
  };
  if (row.failed) row.result = 'falhou';
  else if (row.known) row.result = KNOWN_BUG;
  else if (row.flaky) row.result = 'instável';
  else if (row.passed) row.result = row.skipped ? 'passou (com itens manuais)' : 'passou';
  else row.result = 'manual';
  return row;
}

function overall(rows) {
  if (rows.some((row) => row.failed)) return 'falhou';
  if (rows.some((row) => row.known)) return KNOWN_BUG;
  if (rows.some((row) => row.flaky)) return 'instável';
  return 'passou';
}

const now = () =>
  new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' });
const shortSha = () => (env.GITHUB_SHA ?? 'local').slice(0, 7);
const link = (text, url) => (url ? `[${text}](${url})` : text);

function render(us, tests, history) {
  const byCa = new Map();
  for (const test of tests) byCa.set(test.ca, [...(byCa.get(test.ca) ?? []), test]);
  const rows = [...byCa.entries()].sort(([a], [b]) => a - b).map(([ca, items]) => ({ ca, ...summarize(items) }));
  const result = overall(rows);
  const manual = tests.filter((test) => test.status === 'skipped');
  const bugs = tests.filter((test) => test.status === 'fixme');

  const entry = { date: now(), branch: env.GITHUB_REF_NAME ?? 'local', sha: shortSha(), result, run: RUN_URL };
  const nextHistory = [entry, ...history].slice(0, HISTORY_SIZE);

  const lines = [
    MARKER,
    '## Aceitação automática (E2E)',
    '',
    `Testes \`@${us}-CAn\` no último push para \`${entry.branch}\`: **${result}**.`,
    `${link(`Run ${env.GITHUB_RUN_ID ?? 'local'}`, RUN_URL)} · commit ${link(`\`${entry.sha}\``, COMMIT_URL)} · ${
      entry.date
    } (Brasília)`,
    '',
    '| CA | Testes | Passaram | Instáveis | Falharam | Bug conhecido | Manuais | Resultado |',
    '| --- | --- | --- | --- | --- | --- | --- | --- |',
    ...rows.map(
      (row) =>
        `| CA${row.ca} | ${row.total} | ${row.passed} | ${row.flaky} | ${row.failed} | ${row.known} | ${row.skipped} | ${row.result} |`
    ),
    ''
  ];
  if (bugs.length) {
    // o fixme não volta a rodar sozinho: depois da correção, alguém troca por test para o CA voltar a ser verificado
    lines.push(
      'Bugs conhecidos (`test.fixme`; depois da correção, troque por `test` para o CA voltar a ser verificado):',
      ''
    );
    bugs.forEach((test) => {
      const note = test.note ? ` (${test.note})` : '';
      lines.push(`- CA${test.ca}: ${test.title}${note}`);
    });
    lines.push('');
  }
  if (manual.length) {
    lines.push('Verificação manual (pulados no E2E):', '');
    for (const test of manual) lines.push(`- CA${test.ca}: ${test.title}`);
    lines.push('');
  }
  lines.push(
    `Relatório completo: artefato \`playwright-report\` do ${link('run', RUN_URL)} (fica 30 dias).`,
    '',
    `<details><summary>Histórico (últimos ${HISTORY_SIZE} runs)</summary>`,
    '',
    '| Data | Branch | Commit | Resultado | Run |',
    '| --- | --- | --- | --- | --- |',
    ...nextHistory.map(
      (item) => `| ${item.date} | ${item.branch} | \`${item.sha}\` | ${item.result} | ${link('abrir', item.run)} |`
    ),
    '',
    '</details>',
    `<!-- e2e-historico:${JSON.stringify(nextHistory)} -->`
  );
  return lines.join('\n');
}

async function github(path, init = {}) {
  const response = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${env.DOC_ISSUES_TOKEN}`,
      'X-GitHub-Api-Version': '2022-11-28',
      ...(init.body ? { 'Content-Type': 'application/json' } : {})
    }
  });
  if (!response.ok) throw new Error(`${init.method ?? 'GET'} ${path}: ${response.status} ${await response.text()}`);
  return response.json();
}

async function findComment(issue) {
  for (let page = 1; ; page += 1) {
    const comments = await github(`/repos/${CONFIG.repository}/issues/${issue}/comments?per_page=100&page=${page}`);
    const found = comments.find((comment) => comment.body?.includes(MARKER));
    if (found || comments.length < 100) return found;
  }
}

function readHistory(comment) {
  const match = comment?.body?.match(HISTORY_MARKER);
  if (!match) return [];
  try {
    return JSON.parse(match[1]);
  } catch {
    return [];
  }
}

async function main() {
  if (!existsSync(RESULTS)) {
    console.log(`Sem ${RESULTS}: os E2E não chegaram a rodar, nada a publicar.`);
    return;
  }
  if (!DRY_RUN && !env.DOC_ISSUES_TOKEN) {
    console.log('::notice::DOC_ISSUES_TOKEN não configurado: o resultado não foi publicado nas issues das US.');
    return;
  }

  const report = JSON.parse(readFileSync(RESULTS, 'utf8'));
  const tests = (report.suites ?? []).flatMap((suite) => collect(suite));
  const byUs = new Map();
  for (const test of tests) byUs.set(test.us, [...(byUs.get(test.us) ?? []), test]);

  let failures = 0;
  for (const [us, items] of [...byUs.entries()].sort()) {
    const issue = CONFIG.issues[us];
    if (!issue) {
      console.log(`::warning::${us} tem E2E mas não está em e2e/acceptance-issues.json.`);
      continue;
    }
    try {
      if (DRY_RUN) {
        console.log(`--- ${CONFIG.repository}#${issue} (${us}) ---\n${render(us, items, [])}\n`);
        continue;
      }
      const comment = await findComment(issue);
      const body = render(us, items, readHistory(comment));
      const path = comment
        ? `/repos/${CONFIG.repository}/issues/comments/${comment.id}`
        : `/repos/${CONFIG.repository}/issues/${issue}/comments`;
      await github(path, { method: comment ? 'PATCH' : 'POST', body: JSON.stringify({ body }) });
      console.log(`${us}: ${comment ? 'atualizado' : 'criado'} o comentário em ${CONFIG.repository}#${issue}.`);
    } catch (error) {
      failures += 1;
      console.log(`::warning::${us}: não foi possível publicar em ${CONFIG.repository}#${issue}: ${error.message}`);
    }
  }
  if (failures) process.exitCode = 1;
}

await main();
