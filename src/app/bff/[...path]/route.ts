import { NextResponse, type NextRequest } from 'next/server';
import { clearSessionCookies, isSecureRequest, TOKEN_COOKIE } from '../../../shared/server/auth/cookies';
import { isSameOrigin } from '../../../shared/server/auth/origin';
import { getServiceUrl } from '../../../shared/server/auth/validateToken';

export const dynamic = 'force-dynamic';

const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const NO_BODY_STATUS = new Set([204, 205, 304]);
const FORWARDED_REQUEST_HEADERS = ['content-type', 'accept', 'accept-language'];
const FORWARDED_RESPONSE_HEADERS = ['content-type', 'content-disposition'];

interface Context {
  params: Promise<{ path: string[] }>;
}

const json = (body: object, status: number) => NextResponse.json(body, { status });

const isAllowedPath = (segments: string[]): boolean =>
  segments.length > 1 &&
  segments[0] === 'v1' &&
  segments.every((segment) => segment !== '' && !['.', '..'].includes(segment) && !/[\\/]/.test(segment));

const buildTarget = (segments: string[], request: NextRequest): string => {
  // o BFF não segue redirects (o Django responde 301 sem a barra final): o cliente deve mandar a URL já com a barra
  const { pathname, search } = new URL(request.url);
  const trailingSlash = pathname.endsWith('/') ? '/' : '';

  return `${getServiceUrl()}/${segments.map(encodeURIComponent).join('/')}${trailingSlash}${search}`;
};

async function handle(request: NextRequest, { params }: Context) {
  const { path: rawSegments } = await params;
  const segments = rawSegments.map((segment) => {
    try {
      return decodeURIComponent(segment);
    } catch {
      return segment;
    }
  });

  if (!isAllowedPath(segments)) return json({ detail: 'Caminho inválido.' }, 400);

  if (WRITE_METHODS.has(request.method) && !isSameOrigin(request.headers, request.url)) {
    return json({ detail: 'Origem não permitida.' }, 403);
  }

  const secure = isSecureRequest(request.url, request.headers);
  const token = request.cookies.get(TOKEN_COOKIE)?.value;
  if (!token) return json({ detail: 'As credenciais de autenticação não foram fornecidas.' }, 401);

  const headers = new Headers({ Authorization: `Token ${token}` });
  FORWARDED_REQUEST_HEADERS.forEach((name) => {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  });

  let upstream: Response;
  try {
    upstream = await fetch(buildTarget(segments, request), {
      method: request.method,
      headers,
      body: WRITE_METHODS.has(request.method) ? await request.arrayBuffer() : undefined,
      redirect: 'manual',
      cache: 'no-store'
    });
  } catch {
    return json({ detail: 'Serviço indisponível.' }, 502);
  }

  const responseHeaders = new Headers();
  FORWARDED_RESPONSE_HEADERS.forEach((name) => {
    const value = upstream.headers.get(name);
    if (value) responseHeaders.set(name, value);
  });
  upstream.headers.forEach((value, name) => {
    if (name.toLowerCase().startsWith('x-total-')) responseHeaders.set(name, value);
  });

  const response = new NextResponse(NO_BODY_STATUS.has(upstream.status) ? null : upstream.body, {
    status: upstream.status,
    headers: responseHeaders
  });

  if (upstream.status === 401) clearSessionCookies(response.cookies, secure);

  return response;
}

export {
  handle as GET,
  handle as POST,
  handle as PUT,
  handle as PATCH,
  handle as DELETE,
  handle as HEAD
};
