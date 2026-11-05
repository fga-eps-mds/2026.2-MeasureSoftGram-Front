import { NextResponse, type NextRequest } from 'next/server';
import {
  clearCookies,
  clearSessionCookies,
  cookieOptions,
  isSecureRequest,
  LOGIN_AT_COOKIE,
  OAUTH_STATE_COOKIE,
  PROVIDER_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  TOKEN_COOKIE
} from '../../../shared/server/auth/cookies';
import { isSameOrigin } from '../../../shared/server/auth/origin';
import { verifyState } from '../../../shared/server/auth/oauthState';
import { sanitizeReturnTo } from '../../../shared/server/auth/routes';
import { getServiceUrl } from '../../../shared/server/auth/validateToken';

export const dynamic = 'force-dynamic';

const DEFAULT_DESTINATION = '/home/';
const LOGIN_FAILED_MESSAGE = 'Erro desconhecido';

const json = (body: object, status = 200) => NextResponse.json(body, { status });

const serviceErrorMessage = async (response: Response): Promise<string> => {
  try {
    const data = (await response.json()) as { non_field_errors?: string[]; detail?: string };
    return data.non_field_errors?.[0] ?? data.detail ?? LOGIN_FAILED_MESSAGE;
  } catch {
    return LOGIN_FAILED_MESSAGE;
  }
};

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request.headers, request.url)) return json({ error: 'forbidden' }, 403);

  const secure = isSecureRequest(request.url, request.headers);
  const body = (await request.json().catch(() => null)) as { state?: string; code?: string; error?: string } | null;

  // o state é de uso único: some em qualquer resposta, inclusive nas de erro
  const respond = (payload: object, status = 200) => {
    const response = json(payload, status);
    clearCookies(response.cookies, [OAUTH_STATE_COOKIE], secure);
    return response;
  };

  const context = verifyState(request.cookies.get(OAUTH_STATE_COOKIE)?.value, body?.state);
  if (!context) return respond({ error: 'invalid_state' }, 400);

  const returnTo = sanitizeReturnTo(context.returnTo);

  if (body?.error) {
    const hasSession = Boolean(request.cookies.get(TOKEN_COOKIE)?.value);
    return respond({
      outcome: body.error === 'access_denied' ? 'cancelled' : 'provider_error',
      redirectTo: hasSession ? returnTo : null
    });
  }

  if (!body?.code) return respond({ error: 'missing_code' }, 400);

  let upstream: Response;
  try {
    upstream = await fetch(`${getServiceUrl()}/v1/accounts/${context.provider}/login/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ code: body.code }),
      cache: 'no-store'
    });
  } catch {
    return respond({ error: 'login_failed', message: 'Serviço indisponível.' }, 502);
  }

  if (!upstream.ok) {
    return respond({ error: 'login_failed', message: await serviceErrorMessage(upstream) }, upstream.status === 400 ? 400 : 502);
  }

  const { key } = (await upstream.json().catch(() => ({}))) as { key?: string };
  if (!key) return respond({ error: 'login_failed', message: LOGIN_FAILED_MESSAGE }, 502);

  const response = respond({ outcome: 'success', provider: context.provider, redirectTo: returnTo ?? DEFAULT_DESTINATION });
  const options = cookieOptions(secure, SESSION_MAX_AGE_SECONDS);
  response.cookies.set(TOKEN_COOKIE, key, options);
  response.cookies.set(PROVIDER_COOKIE, context.provider, options);
  response.cookies.set(LOGIN_AT_COOKIE, String(Date.now()), options);

  return response;
}

export async function DELETE(request: NextRequest) {
  if (!isSameOrigin(request.headers, request.url)) return json({ error: 'forbidden' }, 403);

  const secure = isSecureRequest(request.url, request.headers);
  const token = request.cookies.get(TOKEN_COOKIE)?.value;

  if (token) {
    await fetch(`${getServiceUrl()}/v1/accounts/logout/`, {
      method: 'DELETE',
      headers: { Authorization: `Token ${token}` },
      cache: 'no-store'
    }).catch(() => undefined);
  }

  const response = json({ ok: true });
  clearSessionCookies(response.cookies, secure);
  return response;
}
