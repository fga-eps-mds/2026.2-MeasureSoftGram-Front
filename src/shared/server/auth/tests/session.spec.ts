/** @jest-environment node */
import { cookies } from 'next/headers';
import { getSession } from '../session';
import { validateToken } from '../validateToken';

jest.mock('next/headers', () => ({ cookies: jest.fn() }));
jest.mock('../validateToken', () => ({ validateToken: jest.fn() }));
// cache() do React vale por requisição; no teste cada chamada precisa rodar de novo
jest.mock('react', () => ({ ...jest.requireActual('react'), cache: (fn: unknown) => fn }));

const withCookies = (values: Record<string, string>) =>
  (cookies as jest.Mock).mockResolvedValue({
    get: (name: string) => (name in values ? { name, value: values[name] } : undefined)
  });

describe('getSession', () => {
  const originalMocking = process.env.NEXT_PUBLIC_API_MOCKING;

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.NEXT_PUBLIC_API_MOCKING;
  });

  afterAll(() => {
    process.env.NEXT_PUBLIC_API_MOCKING = originalMocking;
  });

  it('sem cookie devolve null sem chamar o Service', async () => {
    withCookies({});

    expect(await getSession()).toBeNull();
    expect(validateToken).not.toHaveBeenCalled();
  });

  it('com token válido devolve usuário, provedor e horário do login', async () => {
    withCookies({ msgram_token: 'tok', msgram_provider: 'gitlab', msgram_login_at: '1700000000000' });
    (validateToken as jest.Mock).mockResolvedValue({ status: 'valid', user: { username: 'alice' } });

    expect(await getSession()).toEqual({ user: { username: 'alice' }, provider: 'gitlab', loginAt: 1700000000000 });
    expect(validateToken).toHaveBeenCalledWith('tok');
  });

  it('com token rejeitado devolve null', async () => {
    withCookies({ msgram_token: 'revogado' });
    (validateToken as jest.Mock).mockResolvedValue({ status: 'invalid' });

    expect(await getSession()).toBeNull();
  });

  it('com o Service fora do ar mantém a sessão, sem usuário (o cliente o busca depois)', async () => {
    withCookies({ msgram_token: 'tok', msgram_provider: 'github' });
    (validateToken as jest.Mock).mockResolvedValue({ status: 'unavailable' });

    expect(await getSession()).toEqual({ user: null, provider: 'github', loginAt: null });
  });

  it.each([undefined, 'bitbucket', ''])('provedor %p cai em credentials', async (provider) => {
    withCookies({ msgram_token: 'tok', ...(provider === undefined ? {} : { msgram_provider: provider }) });
    (validateToken as jest.Mock).mockResolvedValue({ status: 'valid', user: { username: 'a' } });

    expect((await getSession())?.provider).toBe('credentials');
  });

  it.each(['abc', '0', '-5', ''])('horário de login inválido (%p) vira null', async (loginAt) => {
    withCookies({ msgram_token: 'tok', msgram_login_at: loginAt });
    (validateToken as jest.Mock).mockResolvedValue({ status: 'valid', user: { username: 'a' } });

    expect((await getSession())?.loginAt).toBeNull();
  });

  it('no modo mock devolve o usuário da fixture sem ler cookie nem chamar o Service', async () => {
    process.env.NEXT_PUBLIC_API_MOCKING = 'enabled';

    const session = await getSession();

    expect(session?.user).toMatchObject({ username: expect.any(String) });
    expect(session?.provider).toBe('credentials');
    expect(session?.loginAt).toBeNull();
    expect(cookies).not.toHaveBeenCalled();
    expect(validateToken).not.toHaveBeenCalled();
  });
});
