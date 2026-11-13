import { NextResponse, type NextRequest } from 'next/server';
import { getGithubAuthUrl, getGithubReauthorizeUrl, getGitlabAuthUrl } from '@services/Auth/oauthUrls';
import { cookieOptions, isSecureRequest, OAUTH_STATE_COOKIE, OAUTH_STATE_MAX_AGE_SECONDS } from '../../../../../shared/server/auth/cookies';
import { isOAuthProvider, serializeState, type OAuthProvider } from '../../../../../shared/server/auth/oauthState';
import { sanitizeReturnTo } from '../../../../../shared/server/auth/routes';
import { getServiceUrl, serviceFetch } from '../../../../../shared/server/auth/serviceFetch';

export const dynamic = 'force-dynamic';

const ERROR_PAGE = '/auth/error/';

interface Context {
  params: Promise<{ provider: string }>;
}

const clientIdOf = (provider: OAuthProvider) =>
  provider === 'github' ? process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID : process.env.GITLAB_CLIENT_ID;

async function isClientIdValid(provider: OAuthProvider, clientId: string): Promise<boolean> {
  const response = await serviceFetch(`${getServiceUrl()}/v1/accounts/${provider}/validate/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: clientId })
  });
  if (!response.ok) return false;

  const data = (await response.json().catch(() => null)) as { valid?: boolean } | null;
  return data?.valid === true;
}

export async function GET(request: NextRequest, { params }: Context) {
  const { provider } = await params;
  // relativo: o `request.url` traz a origem interna do contêiner (ex.: localhost:3000), não a pública
  const toErrorPage = () => new NextResponse(null, { status: 307, headers: { Location: ERROR_PAGE, 'Cache-Control': 'no-store' } });

  if (!isOAuthProvider(provider)) return toErrorPage();

  const clientId = clientIdOf(provider);
  if (!clientId) return toErrorPage();

  try {
    if (!(await isClientIdValid(provider, clientId))) return toErrorPage();
  } catch {
    return toErrorPage();
  }

  const searchParams = request.nextUrl.searchParams;
  const returnTo = sanitizeReturnTo(searchParams.get('returnTo'));
  const { nonce, cookieValue } = serializeState({ provider, returnTo });

  let authUrl: string;
  if (provider === 'gitlab') authUrl = getGitlabAuthUrl(nonce);
  else authUrl = searchParams.get('reauthorize') === '1' ? getGithubReauthorizeUrl(nonce) : getGithubAuthUrl(nonce);

  const response = NextResponse.redirect(authUrl);
  response.cookies.set(
    OAUTH_STATE_COOKIE,
    cookieValue,
    cookieOptions(isSecureRequest(request.url, request.headers), OAUTH_STATE_MAX_AGE_SECONDS)
  );
  response.headers.set('Cache-Control', 'no-store');

  return response;
}
