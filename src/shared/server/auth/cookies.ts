export const TOKEN_COOKIE = 'msgram_token';
export const PROVIDER_COOKIE = 'msgram_provider';
export const LOGIN_AT_COOKIE = 'msgram_login_at';
export const OAUTH_STATE_COOKIE = 'msgram_oauth_state';
/** Avisa o cliente de que acabou de entrar e deve mostrar as boas-vindas. Sem HttpOnly de propósito: o cliente o apaga. */
export const WELCOME_COOKIE = 'msgram_welcome';
export const WELCOME_MAX_AGE_SECONDS = 60;

export const SESSION_COOKIES = [TOKEN_COOKIE, PROVIDER_COOKIE, LOGIN_AT_COOKIE];

export const SESSION_MAX_AGE_SECONDS = 2 * 60 * 60;
export const OAUTH_STATE_MAX_AGE_SECONDS = 10 * 60;

export interface CookieOptions {
  httpOnly: true;
  sameSite: 'lax';
  secure: boolean;
  path: '/';
  maxAge: number;
}

interface CookieWriter {
  set(name: string, value: string, options: Omit<CookieOptions, 'httpOnly'> & { httpOnly: boolean }): unknown;
}

/** `Secure` só em HTTPS (inclusive atrás de proxy reverso), senão o navegador descarta o cookie em http://localhost. */
export const isSecureRequest = (url: string, headers: Headers): boolean => {
  const forwarded = headers.get('x-forwarded-proto')?.split(',')[0]?.trim();
  return (forwarded || new URL(url).protocol.replace(':', '')) === 'https';
};

export const cookieOptions = (secure: boolean, maxAge: number): CookieOptions => ({
  httpOnly: true,
  sameSite: 'lax',
  secure,
  path: '/',
  maxAge
});

export const welcomeCookieOptions = (secure: boolean) => ({
  httpOnly: false,
  sameSite: 'lax' as const,
  secure,
  path: '/',
  maxAge: WELCOME_MAX_AGE_SECONDS
});

export const clearCookies = (cookies: CookieWriter, names: string[], secure: boolean) => {
  names.forEach((name) => cookies.set(name, '', cookieOptions(secure, 0)));
};

export const clearSessionCookies = (cookies: CookieWriter, secure: boolean) =>
  clearCookies(cookies, SESSION_COOKIES, secure);
