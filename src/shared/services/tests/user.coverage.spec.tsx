import api from '../api';
import * as userService from '../user';

jest.mock('../api');

describe('User Service error and repository search coverage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('retorna erro quando getAllUsers falha', async () => {
    const axiosError = new Error('Falha ao buscar usuários');
    (api.get as jest.Mock).mockRejectedValue(axiosError);

    const result = await userService.getAllUsers();

    expect(result).toEqual({ type: 'error', error: axiosError });
  });

  it('retorna erro quando getUserRepos falha', async () => {
    const axiosError = new Error('Falha ao buscar repos');
    (api.get as jest.Mock).mockRejectedValue(axiosError);

    const result = await userService.getUserRepos('invalid-code');

    expect(result).toEqual({ type: 'error', error: axiosError });
  });

  it('retorna erro quando getGithubUser falha', async () => {
    const axiosError = new Error('Token inválido');
    (api.get as jest.Mock).mockRejectedValue(axiosError);

    const result = await userService.getGithubUser('bad-token');

    expect(result).toEqual({ type: 'error', error: axiosError });
  });

  it('busca repositórios públicos do usuário no GitHub com sucesso (getUserRepositories)', async () => {
    const mockRepos = { data: { total_count: 1, items: [{ id: 10, name: 'msg-front' }] } };
    (api.get as jest.Mock).mockResolvedValue(mockRepos);

    const result = await userService.getUserRepositories('octocat');

    expect(api.get).toHaveBeenCalledWith('https://api.github.com/search/repositories?q=user:octocat');
    expect(result).toEqual(mockRepos);
  });

  it('retorna erro quando getUserRepositories falha', async () => {
    const axiosError = new Error('GitHub indisponível');
    (api.get as jest.Mock).mockRejectedValue(axiosError);

    const result = await userService.getUserRepositories('octocat');

    expect(result).toEqual({ type: 'error', error: axiosError });
  });
});
