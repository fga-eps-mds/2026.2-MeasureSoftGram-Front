import { NextResponse, type NextRequest } from 'next/server';
import { clearSessionCookies, isSecureRequest, TOKEN_COOKIE } from './shared/server/auth/cookies';
import { isMockingEnabled } from './shared/server/auth/mocking';
import { isPublicPath, normalizePath, sanitizeReturnTo } from './shared/server/auth/routes';
import { validateToken } from './shared/server/auth/validateToken';

const HOME = '/home/';
const LOGIN = '/auth';
const OAUTH_CALLBACK = '/auth/callback/';

export async function proxy(request: NextRequest) {
  if (isMockingEnabled()) return NextResponse.next();

  const { pathname, search, searchParams } = request.nextUrl;
  const path = normalizePath(pathname);
  const secure = isSecureRequest(request.url, request.headers);
  const token = request.cookies.get(TOKEN_COOKIE)?.value;

  if (path === '/' && (searchParams.has('code') || searchParams.has('error'))) {
    return NextResponse.redirect(new URL(`${OAUTH_CALLBACK}${search}`, request.url));
  }

  const redirectToLogin = (clearSession: boolean) => {
    const loginUrl = new URL(LOGIN, request.url);
    loginUrl.searchParams.set('returnTo', `${path}${search}`);

    const response = NextResponse.redirect(loginUrl);
    if (clearSession) clearSessionCookies(response.cookies, secure);
    return response;
  };

  if (isPublicPath(path)) {
    const isEntryPage = path === '/' || path === LOGIN;
    if (!token || !isEntryPage) return NextResponse.next();

    const validation = await validateToken(token);
    if (validation.status === 'valid') {
      const destination = sanitizeReturnTo(searchParams.get('returnTo')) ?? HOME;
      return NextResponse.redirect(new URL(destination, request.url));
    }
    if (validation.status === 'invalid') {
      const response = NextResponse.next();
      clearSessionCookies(response.cookies, secure);
      return response;
    }
    return NextResponse.next();
  }

  if (!token) return redirectToLogin(false);

  const validation = await validateToken(token);
  if (validation.status === 'invalid') return redirectToLogin(true);

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next|bff|images|locales|.*\\..*).*)']
};
