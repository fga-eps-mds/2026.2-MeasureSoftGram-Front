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
});
