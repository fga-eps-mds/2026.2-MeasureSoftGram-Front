// Lista as rotas que o E2E simulou e que o schema do Service não descreve (anotação "sem-contrato" de
// e2e/support/fixtures.ts), a partir do JSON do reporter do Playwright. Escreve no resumo do job quando roda na CI.
import { appendFileSync, readFileSync } from 'node:fs';

const file = process.argv[2] ?? 'e2e-results.json';
const routes = new Set();

(function walk(node) {
  if (Array.isArray(node)) return node.forEach(walk);
  if (!node || typeof node !== 'object') return;
  if (node.type === 'sem-contrato' && typeof node.description === 'string') routes.add(node.description);
  Object.values(node).forEach(walk);
})(JSON.parse(readFileSync(file, 'utf8')));

const sorted = [...routes].sort();
const report = sorted.length
  ? `### Rotas simuladas sem schema de resposta no Service (${sorted.length})\n\n` +
    'O E2E não confere o corpo destas respostas até o Service descrevê-las no OpenAPI.\n\n' +
    sorted.map((route) => `- \`${route}\``).join('\n') +
    '\n'
  : '### Todas as respostas simuladas foram conferidas contra o schema do Service\n';

console.log(report);
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, report);
