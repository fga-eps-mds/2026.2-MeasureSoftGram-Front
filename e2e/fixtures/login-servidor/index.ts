import { ApiHandlers } from '../../support/api';
import { REPOSITORY_PATH } from '../repositorio';

export type Provider = 'github' | 'gitlab';
export const PROVIDERS: Provider[] = ['github', 'gitlab'];

/** O que o servidor do Next pede ao Service no login de cada provedor e no "Finalizar Sessão". */
export const loginApi = (provider: Provider) => ({
  validate: `/v1/accounts/${provider}/validate/`,
  login: `/v1/accounts/${provider}/login/`,
  logout: '/v1/accounts/logout/'
});

/** O que o navegador pede numa sessão do GitHub, além do comum: as organizações do GitHub (aqui, nenhuma). */
export const githubSession: ApiHandlers = { '/v1/accounts/github-organizations/': [] };

/** O Service aceita o client id e troca o code pelo token, nos dois provedores: o caminho feliz (CA1 a CA4). */
export const loginOk: ApiHandlers = PROVIDERS.reduce<ApiHandlers>(
  (handlers, provider) => ({
    ...handlers,
    [loginApi(provider).validate]: { valid: true },
    [loginApi(provider).login]: { key: `e2e-token-${provider}` }
  }),
  { '/v1/accounts/logout/': { detail: 'Successfully logged out.' }, ...githubSession }
);

/**
 * Tela privada com query, para conferir que o returnTo leva a rota inteira até depois do login (CA1). Sem a barra final:
 * o proxy grava o caminho normalizado no returnTo.
 */
export const PRIVATE_PATH = `${REPOSITORY_PATH}?periodo=30`;

/** Chave em que o Front antigo (Next 12) guardava o token no localStorage (CA7). */
export const LEGACY_TOKEN_KEY = 'token';

/** Token para o qual o Service fake responde 503 na validação (ver e2e/support/mock-service.mjs): o Service fora do ar (CA5). */
export const SERVICE_DOWN_TOKEN = 'e2e-token-service-fora-do-ar';
