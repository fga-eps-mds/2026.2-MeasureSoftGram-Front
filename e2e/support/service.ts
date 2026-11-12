import { expect } from '@playwright/test';
import type { ApiHandlers, Reply } from './api';

/** Porta do Service fake (e2e/support/mock-service.mjs), que o servidor do Next usa como SERVICE_URL. */
export const SERVICE_PORT = 3100;
const CONTROL = `http://localhost:${SERVICE_PORT}/__e2e`;

/** Projeto do playwright.config.ts que roda um teste por vez: só ele troca as respostas do Service fake. */
export const OAUTH_SERVER_PROJECT = 'oauth-servidor';
/** Tag dos testes que dependem do que o servidor do Next pede ao Service (OAuth, troca do code, logout). */
export const OAUTH_SERVER_TAG = '@oauth-servidor';

/** Caminhos que o servidor do Next pede ao Service por conta própria; o resto vem do navegador pelo /bff. */
const SERVER_SIDE = /^\/v1\/accounts\/(?:(?:gitlab|github)\/(?:validate|login)|logout)\/$/;

export interface ServiceRequest {
  method: string;
  path: string;
  search: string;
  authorization?: string;
  body: unknown;
  response: any;
}

function isReply(value: unknown): value is Reply {
  return typeof value === 'object' && value !== null && typeof (value as Reply).status === 'number';
}

/** As respostas do cenário que o servidor do Next pede ao Service, no formato do Service fake. */
export function serverSideHandlers(handlers: ApiHandlers): Record<string, { status: number; json: unknown }> {
  return Object.fromEntries(
    Object.entries(handlers)
      .filter(([path]) => SERVER_SIDE.test(path))
      .map(([path, handler]) => [path, isReply(handler) ? { status: handler.status, json: handler.json } : { status: 200, json: handler }])
  );
}

/** Troca as respostas do Service fake e limpa os pedidos registrados. */
export async function setServiceScenario(handlers: ApiHandlers): Promise<void> {
  const response = await fetch(`${CONTROL}/scenario`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(serverSideHandlers(handlers))
  });
  expect(response.ok, 'Service fake do E2E fora do ar').toBe(true);
}

export async function serviceRequests(): Promise<ServiceRequest[]> {
  const response = await fetch(`${CONTROL}/requests`);
  return (await response.json()) as ServiceRequest[];
}

/** Espera o servidor do Next pedir o caminho ao Service e devolve o último pedido que casa. */
export async function waitForServiceRequest(
  path: string,
  match: (request: ServiceRequest) => boolean = () => true
): Promise<ServiceRequest> {
  let found: ServiceRequest | undefined;
  await expect
    .poll(
      async () => {
        found = (await serviceRequests()).filter((request) => request.path === path && match(request)).pop();
        return Boolean(found);
      },
      { message: `pedido do Next ao Service em ${path}` }
    )
    .toBe(true);
  return found as ServiceRequest;
}
