/** @jest-environment node */
import { isOAuthProvider, OAUTH_STATE_TTL_MS, serializeState, verifyState } from '../oauthState';

describe('oauthState (servidor)', () => {
  it('gera um nonce hexadecimal diferente a cada login', () => {
    const first = serializeState({ provider: 'github', returnTo: null });
    const second = serializeState({ provider: 'github', returnTo: null });

    expect(first.nonce).toMatch(/^[0-9a-f]{32}$/);
    expect(first.nonce).not.toBe(second.nonce);
  });

  it('não deixa o destino visível na URL do provedor (só o nonce vai)', () => {
    expect(serializeState({ provider: 'github', returnTo: '/products' }).nonce).not.toContain('products');
  });

  it('devolve o contexto quando o state confere', () => {
    const { nonce, cookieValue } = serializeState({ provider: 'gitlab', returnTo: '/products' });

    expect(verifyState(cookieValue, nonce)).toEqual({ provider: 'gitlab', returnTo: '/products' });
  });

  it('devolve returnTo nulo quando o login não tinha destino', () => {
    const { nonce, cookieValue } = serializeState({ provider: 'github', returnTo: null });

    expect(verifyState(cookieValue, nonce)).toEqual({ provider: 'github', returnTo: null });
  });

  it('rejeita state diferente do guardado', () => {
    const { cookieValue } = serializeState({ provider: 'github', returnTo: null });

    expect(verifyState(cookieValue, 'outro-nonce')).toBeNull();
    expect(verifyState(cookieValue, 'x')).toBeNull();
  });

  it('rejeita quando falta o cookie ou o state recebido', () => {
    const { nonce, cookieValue } = serializeState({ provider: 'github', returnTo: null });

    expect(verifyState(undefined, nonce)).toBeNull();
    expect(verifyState(cookieValue, null)).toBeNull();
    expect(verifyState(cookieValue, '')).toBeNull();
  });

  it('rejeita state expirado', () => {
    const now = 1_000_000;
    const { nonce, cookieValue } = serializeState({ provider: 'github', returnTo: null }, undefined, now);

    expect(verifyState(cookieValue, nonce, now + OAUTH_STATE_TTL_MS)).not.toBeNull();
    expect(verifyState(cookieValue, nonce, now + OAUTH_STATE_TTL_MS + 1)).toBeNull();
  });

  it('rejeita cookie corrompido ou com provedor desconhecido', () => {
    expect(verifyState('isto-nao-e-base64-json', 'abc')).toBeNull();

    const forged = Buffer.from(JSON.stringify({ nonce: 'abc', provider: 'bitbucket', returnTo: null, expiresAt: Date.now() + 1000 })).toString('base64url');
    expect(verifyState(forged, 'abc')).toBeNull();
  });

  it('reconhece só os provedores com OAuth', () => {
    expect(isOAuthProvider('github')).toBe(true);
    expect(isOAuthProvider('gitlab')).toBe(true);
    expect(isOAuthProvider('credentials')).toBe(false);
    expect(isOAuthProvider(undefined)).toBe(false);
  });
});
