import { AxiosResponse } from 'axios';
import api from '@services/api';
import {
  getUserInfo,
  getAccessToken,
  getGitlabAuthUrl
} from '../index';


// Mock manual do módulo 'api'
jest.mock('@services/api', () => ({
  post: jest.fn(),
  get: jest.fn(),
  delete: jest.fn()
}));

describe('Auth Service', () => {
  // Testes para getUserInfo
  it('successfully gets user info', async () => {
    const mockData = { user: 'userInfo' };

    (api.get as jest.Mock).mockImplementation(() => Promise.resolve({ data: mockData } as AxiosResponse));

    const result = await getUserInfo();

    expect(result).toEqual({ type: 'success', value: mockData });
  });

  it('handles get user info error', async () => {
    const error = new Error('Network Error');

    (api.get as jest.Mock).mockImplementation(() => Promise.reject(error));

    const result = await getUserInfo();

    expect(result).toEqual({ type: 'error', error });
  });

  // Testes para getAccessToken
  it('successfully gets access token', async () => {
    const mockData = { token: 'accessToken' };

    (api.get as jest.Mock).mockImplementation(() => Promise.resolve({ data: mockData } as AxiosResponse));

    const result = await getAccessToken();

    expect(result).toEqual({ type: 'success', value: mockData });
  });

  it('handles get access token error', async () => {
    const error = new Error('Network Error');

    (api.get as jest.Mock).mockImplementation(() => Promise.reject(error));

    const result = await getAccessToken();

    expect(result).toEqual({ type: 'error', error });
  });

  // Testes para getGithubAuthUrl
  describe('getGithubAuthUrl', () => {
    it('should return a GitHub OAuth URL with client_id, redirect_uri and scope', () => {
      process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID = 'client id';
      process.env.NEXT_PUBLIC_LOGIN_REDIRECT_URL = 'http://localhost:3000/auth/callback';
      const { getGithubAuthUrl } = require('../index');
      const url = getGithubAuthUrl('nonce-123');

      expect(url).toContain('https://github.com/login/oauth/authorize');
      expect(url).toContain('client_id=client+id');
      expect(url).toContain('redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fauth%2Fcallback');
      expect(url).toContain('scope=repo+read%3Aorg+user');
    });

    it('should send the OAuth state without forcing the account picker', () => {
      const { getGithubAuthUrl } = require('../index');
      const url = new URL(getGithubAuthUrl('nonce-123'));

      expect(url.searchParams.get('state')).toBe('nonce-123');
      expect(url.searchParams.has('prompt')).toBe(false);
    });
  });

  // Testes para getGithubReauthorizeUrl
  describe('getGithubReauthorizeUrl', () => {
    it('should keep the login scopes and redirect_uri, send the state and ask for the account', () => {
      process.env.NEXT_PUBLIC_LOGIN_REDIRECT_URL = 'http://localhost:3000';
      const { getGithubReauthorizeUrl } = require('../index');
      const url = new URL(getGithubReauthorizeUrl('nonce-456'));

      expect(url.origin + url.pathname).toBe('https://github.com/login/oauth/authorize');
      expect(url.searchParams.get('redirect_uri')).toBe('http://localhost:3000');
      expect(url.searchParams.get('scope')).toBe('repo read:org user');
      expect(url.searchParams.get('state')).toBe('nonce-456');
      expect(url.searchParams.get('prompt')).toBe('select_account');
    });
  });

  // Testes para getGitlabAuthUrl
  describe('getGitlabAuthUrl', () => {
    it('should return a GitLab OAuth URL with client_id, redirect_uri and scope', () => {
      const url = getGitlabAuthUrl('nonce-789');

      expect(url).toContain('https://gitlab.com/oauth/authorize');
      expect(url).toContain('client_id=');
      expect(url).toContain('redirect_uri=');
      expect(url).toContain('response_type=code');
      expect(url).toContain('scope=read_user+openid+profile+email+read_api');
    });

    it('should use the public login redirect URL as redirect_uri', () => {
      process.env.NEXT_PUBLIC_LOGIN_REDIRECT_URL = 'https://front.example';

      expect(new URL(getGitlabAuthUrl('nonce-789')).searchParams.get('redirect_uri')).toBe('https://front.example');
    });

    it('should send the OAuth state', () => {
      expect(new URL(getGitlabAuthUrl('nonce-789')).searchParams.get('state')).toBe('nonce-789');
    });

    it('should send an empty redirect_uri and client_id when they are not configured', () => {
      delete process.env.NEXT_PUBLIC_LOGIN_REDIRECT_URL;
      delete process.env.GITLAB_CLIENT_ID;
      const url = new URL(getGitlabAuthUrl('nonce-789'));

      expect(url.searchParams.get('redirect_uri')).toBe('');
      expect(url.searchParams.get('client_id')).toBe('');
    });
  });

  // ... Fim dos testes

  // Testes de versionamento de rotas (/v1)
  describe('versiona rotas com /v1', () => {
    afterEach(() => {
      jest.clearAllMocks();
    });

    it('getUserInfo calls api.get with /v1/accounts/', async () => {
      (api.get as jest.Mock).mockImplementation(() => Promise.resolve({ data: {} } as AxiosResponse));

      await getUserInfo();

      expect(api.get).toHaveBeenCalledWith('/v1/accounts/');
    });

    it('getAccessToken calls api.get with /v1/accounts/access-token', async () => {
      (api.get as jest.Mock).mockImplementation(() => Promise.resolve({ data: {} } as AxiosResponse));

      await getAccessToken();

      expect(api.get).toHaveBeenCalledWith('/v1/accounts/access-token');
    });
  });
});
