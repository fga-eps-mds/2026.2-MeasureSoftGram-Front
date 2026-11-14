import { Page } from '@playwright/test';
import { checkResponse, documentedStatus } from './contract';

/**
 * Resposta com status, corpo e cabeçalhos; um handler que devolve outra coisa responde com ela em JSON e com o status que
 * o Service documenta para a rota (201 na criação, 204 na remoção, 200 no resto).
 */
export interface Reply {
  status: number;
  json?: unknown;
  headers?: Record<string, string>;
}

/** O JSON da resposta, um Reply ou uma função da URL e do método pedidos (undefined conta como rota sem handler). */
export type Handler = unknown | Reply | ((url: URL, method: string) => unknown | Reply | undefined);

/** Caminhos a partir de /v1 (sem o /bff), como os services do Front montam. */
export type ApiHandlers = Record<string, Handler>;

export interface MockApi {
  /** Pedidos sem handler, com método e query; o teste falha se não ficar vazio. */
  unhandled: string[];
  /** Respostas simuladas que não batem com o schema do Service; o teste falha se não ficar vazio. */
  contract: string[];
  /** Rotas do Service cujo schema não descreve a resposta: saem no relatório, sem falhar o teste. */
  uncovered: Set<string>;
  /** Troca ou acrescenta a resposta de uma rota no meio do teste. */
  set(path: string, handler: Handler): void;
  /**
   * Segura as respostas das rotas até o teste chamar a função devolvida: o estado de carregamento fica na tela o tempo
   * que o teste precisar, sem depender da velocidade da máquina.
   */
  hold(...paths: string[]): () => void;
}

export const serverError: Reply = { status: 500, json: { detail: 'Erro interno do servidor.' } };

function isReply(value: unknown): value is Reply {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as Reply).status === 'number' &&
    Object.keys(value).every((key) => ['status', 'json', 'headers'].includes(key))
  );
}

/** Caminho a partir de /v1, sem a barra final (alguns services a omitem). */
function normalize(path: string): string {
  const start = path.indexOf('/v1/');
  return (start === -1 ? path : path.slice(start)).replace(/\/$/, '');
}

/**
 * Simula a API: toda chamada do navegador ao /bff/v1 (que o servidor do Next repassaria ao Service) é respondida pelos
 * handlers, por caminho exato. Uma rota sem handler responde 501 e entra em unhandled, para a fixture do teste acusar em
 * vez de passar em silêncio.
 */
export async function mockApi(page: Page, handlers: ApiHandlers): Promise<MockApi> {
  const routes = new Map(Object.entries(handlers).map(([path, handler]) => [normalize(path), handler]));
  const held = new Map<string, Promise<void>>();
  const unhandled: string[] = [];
  const contract: string[] = [];
  const uncovered = new Set<string>();

  await page.route('**/bff/v1/**', async (route) => {
    const url = new URL(route.request().url());
    const path = normalize(url.pathname);
    const handler = routes.get(path);
    const method = route.request().method();
    const result = typeof handler === 'function' ? handler(url, method) : handler;

    if (result === undefined) {
      unhandled.push(`${method} ${path}${url.search}`);
      return route.fulfill({ status: 501, json: { detail: 'Rota sem handler no E2E.' } });
    }

    const reply: Reply = isReply(result) ? result : { status: documentedStatus(method, path), json: result };
    const check = checkResponse(method, path, reply.status, reply.json ?? null);
    if (check.error) contract.push(check.error);
    if (check.uncovered) uncovered.add(check.uncovered);
    await held.get(path);
    if (reply.status === 204) return route.fulfill({ status: 204, headers: reply.headers });
    return route.fulfill({ status: reply.status, json: reply.json ?? null, headers: reply.headers });
  });

  return {
    unhandled,
    contract,
    uncovered,
    set: (path, handler) => routes.set(normalize(path), handler),
    hold: (...paths) => {
      let release = () => {};
      const gate = new Promise<void>((resolve) => {
        release = resolve;
      });
      paths.forEach((path) => held.set(normalize(path), gate));
      return release;
    }
  };
}
