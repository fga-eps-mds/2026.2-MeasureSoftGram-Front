/**
 * Rotas que abrem sem sessão. Toda rota que não está aqui exige login: uma rota nova nasce protegida.
 */
export const PUBLIC_ROUTES = ['/', '/landing', '/auth'];
export const PUBLIC_PREFIXES = ['/auth/'];

/** Tira a barra final (o `trailingSlash` do Next a acrescenta), mantendo a raiz. */
export const normalizePath = (pathname: string): string =>
  pathname.length > 1 ? pathname.replace(/\/+$/, '') || '/' : pathname;

export const isPublicPath = (pathname: string): boolean => {
  const path = normalizePath(pathname);
  if (PUBLIC_ROUTES.includes(path)) return true;

  return PUBLIC_PREFIXES.some((prefix) => `${path}/`.startsWith(prefix));
};

/** '//host' e '/\host' o navegador trata como outro domínio. */
export const isInternalPath = (path: unknown): path is string =>
  typeof path === 'string' && path.startsWith('/') && !path.startsWith('//') && !path.startsWith('/\\');

/** Rotas de autenticação não servem de destino depois do login (levariam de volta ao login). */
export const sanitizeReturnTo = (path: unknown): string | null => {
  if (!isInternalPath(path)) return null;

  const pathname = path.split(/[?#]/)[0];
  if (pathname === '/' || isPublicPath(pathname)) return null;

  return path;
};
