/**
 * Proteção contra CSRF nos métodos de escrita. Com a sessão em cookie o navegador anexa a credencial sozinho,
 * então só aceitamos escrita vinda da própria origem.
 */
export const isSameOrigin = (headers: Headers, url: string): boolean => {
  const host = (headers.get('x-forwarded-host') ?? headers.get('host') ?? new URL(url).host).split(',')[0].trim();
  const origin = headers.get('origin');

  if (!origin) {
    const site = headers.get('sec-fetch-site');
    return site === null || site === 'same-origin' || site === 'none';
  }

  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
};
