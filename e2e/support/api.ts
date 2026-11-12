import { Page } from '@playwright/test';

/** Resposta com status, corpo e cabeçalhos; um handler que devolve outra coisa responde 200 com ela em JSON. */
export interface Reply {
  status: number;
  json?: unknown;
  headers?: Record<string, string>;
}

/** O JSON da resposta, um Reply ou uma função da URL pedida (undefined conta como rota sem handler). */
export type Handler = unknown | Reply | ((url: URL) => unknown | Reply | undefined);

/** Caminhos a partir de /v1 (sem o /api), como os services do Front montam. */
export type ApiHandlers = Record<string, Handler>;

export interface MockApi {
  /** Pedidos sem handler, com método e query; o teste falha se não ficar vazio. */
  unhandled: string[];
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
 * Simula a API: toda chamada a /api/v1 do navegador é respondida pelos handlers, por caminho exato. Uma rota sem handler
 * responde 501 e entra em unhandled, para a fixture do teste acusar em vez de passar em silêncio.
 */
export async function mockApi(page: Page, handlers: ApiHandlers): Promise<MockApi> {
  const routes = new Map(Object.entries(handlers).map(([path, handler]) => [normalize(path), handler]));
  const held = new Map<string, Promise<void>>();
  const unhandled: string[] = [];

  await page.route('**/api/v1/**', async (route) => {
    const url = new URL(route.request().url());
    const path = normalize(url.pathname);
    const handler = routes.get(path);
    const result = typeof handler === 'function' ? handler(url) : handler;

    if (result === undefined) {
      unhandled.push(`${route.request().method()} ${path}${url.search}`);
      return route.fulfill({ status: 501, json: { detail: 'Rota sem handler no E2E.' } });
    }

    const reply: Reply = isReply(result) ? result : { status: 200, json: result };
    await held.get(path);
    return route.fulfill({ status: reply.status, json: reply.json ?? null, headers: reply.headers });
  });

  return {
    unhandled,
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
