/**
 * Service fake do E2E. Responde só ao que o servidor do Next pede ao Service por conta própria: a validação do token
 * (proxy e layout), o client id do OAuth, a troca do code pelo token e o logout. O que o navegador pede passa pelo /bff
 * e é simulado por page.route (ver e2e/support/api.ts), sem chegar aqui.
 *
 * Os testes do projeto `oauth-servidor` (um por vez) trocam as respostas por /__e2e/scenario e leem os pedidos
 * recebidos em /__e2e/requests (ver e2e/support/service.ts).
 */
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';

const PORT = Number(process.env.E2E_SERVICE_PORT ?? 3100);
const user = JSON.parse(readFileSync(new URL('../../src/mocks/fixtures/user.json', import.meta.url), 'utf8'));

/** Token que o Service recusa (401): para os cenários de sessão inválida. */
const INVALID_TOKEN = 'e2e-token-invalido';
const LOGIN_PATH = /^\/v1\/accounts\/(gitlab|github)\/login\/$/;
const VALIDATE_PATH = /^\/v1\/accounts\/(gitlab|github)\/validate\/$/;

/** Respostas trocadas pelo teste, por caminho exato a partir de /v1. */
let scenario = {};
let requests = [];
let logins = 0;

const reply = (status, json) => ({ status, json });

/**
 * Cada login devolve uma chave nova: o Next guarda por 60 s a validação de cada token, e um token repetido entre os
 * testes deixaria de chegar aqui.
 */
function withFreshKey(path, answer) {
  if (!LOGIN_PATH.test(path) || answer.status >= 300 || typeof answer.json?.key !== 'string') return answer;
  logins += 1;
  return { ...answer, json: { ...answer.json, key: `${answer.json.key}-${logins}` } };
}

function defaultAnswer(method, path, authorization) {
  if (method === 'GET' && path === '/v1/accounts/') {
    const token = authorization?.replace(/^Token /, '');
    return !token || token === INVALID_TOKEN ? reply(401, { detail: 'Token inválido.' }) : reply(200, user);
  }
  const login = path.match(LOGIN_PATH);
  if (method === 'POST' && login) return reply(200, { key: `e2e-token-${login[1]}` });
  if (method === 'POST' && VALIDATE_PATH.test(path)) return reply(200, { valid: true });
  if (method === 'DELETE' && path === '/v1/accounts/logout/') return reply(200, { detail: 'Successfully logged out.' });
  return reply(404, { detail: 'Rota sem resposta no Service fake do E2E.' });
}

const readBody = (request) =>
  new Promise((resolve) => {
    let data = '';
    request.on('data', (chunk) => {
      data += chunk;
    });
    request.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : null);
      } catch {
        resolve(data);
      }
    });
  });

const send = (response, { status, json }) => {
  response.writeHead(status, { 'Content-Type': 'application/json' });
  response.end(JSON.stringify(json ?? null));
};

createServer(async (request, response) => {
  const url = new URL(request.url ?? '/', `http://localhost:${PORT}`);
  const body = await readBody(request);

  if (url.pathname === '/__e2e/health') return send(response, reply(200, { ok: true }));
  if (url.pathname === '/__e2e/requests') return send(response, reply(200, requests));
  if (url.pathname === '/__e2e/scenario') {
    scenario = request.method === 'PUT' ? (body ?? {}) : {};
    requests = [];
    return send(response, reply(200, { ok: true }));
  }

  // o Next chama o Service em /api/v1/...
  const start = url.pathname.indexOf('/v1/');
  const path = start === -1 ? url.pathname : url.pathname.slice(start);
  const authorization = request.headers.authorization;
  const answer = withFreshKey(path, scenario[path] ?? defaultAnswer(request.method, path, authorization));

  requests.push({ method: request.method, path, search: url.search, authorization, body, response: answer.json });
  return send(response, answer);
}).listen(PORT, () => {
  console.log(`Service fake do E2E em http://localhost:${PORT}`);
});
