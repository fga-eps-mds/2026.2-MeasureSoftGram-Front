import { isInternalPath, isPublicPath, normalizePath, sanitizeReturnTo } from '../routes';
import { isSameOrigin } from '../origin';
import { isSecureRequest, cookieOptions } from '../cookies';

describe('routes', () => {
  describe('normalizePath', () => {
    it.each([
      ['/home/', '/home'],
      ['/home///', '/home'],
      ['/', '/'],
      ['/products/1-2-x', '/products/1-2-x']
    ])('%s -> %s', (input, expected) => {
      expect(normalizePath(input)).toBe(expected);
    });
  });

  describe('isPublicPath', () => {
    it.each(['/', '/landing', '/landing/', '/auth', '/auth/', '/auth/error', '/auth/callback/', '/auth/oauth/github'])(
      '%s é pública',
      (path) => {
        expect(isPublicPath(path)).toBe(true);
      }
    );

    it.each(['/home', '/products', '/products/1-2-x/', '/config', '/about', '/organizations', '/authors', '/authx/y', '/landing/x'])(
      '%s é privada',
      (path) => {
        expect(isPublicPath(path)).toBe(false);
      }
    );
  });

  describe('isInternalPath', () => {
    it.each(['/home', '/products?x=1'])('aceita %s', (path) => expect(isInternalPath(path)).toBe(true));
    it.each(['//evil.com', '/\\evil.com', 'https://evil.com', 'home', '', null, undefined, 3])('recusa %s', (path) =>
      expect(isInternalPath(path)).toBe(false)
    );
  });

  describe('sanitizeReturnTo', () => {
    it('mantém rota privada com query', () => {
      expect(sanitizeReturnTo('/products/1-2-x?tab=1')).toBe('/products/1-2-x?tab=1');
    });

    it.each(['/', '/auth', '/auth/', '/auth/error', '/auth?returnTo=%2Fhome', '/landing', '//evil.com', 'javascript:alert(1)', null])(
      'descarta %s',
      (path) => {
        expect(sanitizeReturnTo(path)).toBeNull();
      }
    );
  });
});

describe('isSameOrigin', () => {
  const check = (headers: Record<string, string>) => isSameOrigin(new Headers(headers), 'http://localhost:3000/bff/v1/x/');

  it('aceita Origin igual ao host', () => {
    expect(check({ origin: 'http://localhost:3000', host: 'localhost:3000' })).toBe(true);
  });

  it('usa o host repassado pelo proxy reverso', () => {
    expect(check({ origin: 'https://app.exemplo.com', host: 'interno:3000', 'x-forwarded-host': 'app.exemplo.com' })).toBe(true);
  });

  it('recusa Origin de outro site', () => {
    expect(check({ origin: 'https://evil.com', host: 'localhost:3000' })).toBe(false);
  });

  it('recusa Origin malformado', () => {
    expect(check({ origin: 'nao-e-url', host: 'localhost:3000' })).toBe(false);
  });

  it('sem Origin aceita só quem não é cross-site', () => {
    expect(check({ host: 'localhost:3000' })).toBe(true);
    expect(check({ host: 'localhost:3000', 'sec-fetch-site': 'same-origin' })).toBe(true);
    expect(check({ host: 'localhost:3000', 'sec-fetch-site': 'cross-site' })).toBe(false);
    expect(check({ host: 'localhost:3000', 'sec-fetch-site': 'same-site' })).toBe(false);
  });
});

describe('cookies', () => {
  it('Secure só em HTTPS, inclusive atrás de proxy reverso', () => {
    expect(isSecureRequest('http://localhost:3000/', new Headers())).toBe(false);
    expect(isSecureRequest('https://app.exemplo.com/', new Headers())).toBe(true);
    expect(isSecureRequest('http://interno:3000/', new Headers({ 'x-forwarded-proto': 'https' }))).toBe(true);
    expect(isSecureRequest('http://interno:3000/', new Headers({ 'x-forwarded-proto': 'http' }))).toBe(false);
  });

  it('as opções são HttpOnly e SameSite=Lax', () => {
    expect(cookieOptions(true, 60)).toEqual({ httpOnly: true, sameSite: 'lax', secure: true, path: '/', maxAge: 60 });
  });
});
