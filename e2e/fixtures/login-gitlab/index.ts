import { ApiHandlers, serverError } from '../../support/api';

/** O que o Front pede ao Service no login com o GitLab (Auth.tsx, services/Auth) e no "Finalizar Sessão". */
export const LOGIN_API = {
  validate: '/v1/accounts/gitlab/validate/',
  login: '/v1/accounts/gitlab/login/',
  logout: '/v1/accounts/logout/'
};

/** A chave que o Service devolve pelo code do GitLab; dali em diante o Front a manda como "Token <chave>". */
export const GITLAB_TOKEN = 'e2e-token-gitlab';

/** O Service aceita o client id, troca o code pelo token e encerra a sessão: o caminho feliz (CA1, CA2, CA4, CA6). */
export const loginOk: ApiHandlers = {
  [LOGIN_API.validate]: { valid: true },
  [LOGIN_API.login]: { key: GITLAB_TOKEN },
  [LOGIN_API.logout]: { detail: 'Successfully logged out.' }
};

/** O Service não confirma o client id: o Front nem sai para o GitLab (CA5). */
export const validateFalha: ApiHandlers = { ...loginOk, [LOGIN_API.validate]: serverError };

/** O Service recusa o code que o GitLab devolveu (CA5, falha). */
export const login400: ApiHandlers = {
  ...loginOk,
  [LOGIN_API.login]: { status: 400, json: { non_field_errors: ['Não foi possível autenticar com o GitLab.'] } }
};

/** O GitLab fora do ar: o Service responde 502 ao trocar o code (CA5, indisponibilidade). */
export const login502: ApiHandlers = {
  ...loginOk,
  [LOGIN_API.login]: { status: 502, json: { detail: 'Bad Gateway' } }
};
