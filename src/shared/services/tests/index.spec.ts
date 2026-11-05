import api from '..';
import * as services from '../Auth/index';

jest.mock('@services/api');

describe('Auth Services', () => {
  it('should getUserInfo with the right URL', async () => {
    await services.getUserInfo();
    expect(api.get).toHaveBeenCalledWith('/v1/accounts/');
  });

  it('should getAccessToken with the right URL', async () => {
    await services.getAccessToken();
    expect(api.get).toHaveBeenCalledWith('/v1/accounts/access-token');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });
});
