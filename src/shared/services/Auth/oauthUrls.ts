const buildGithubAuthUrl = (state: string, prompt?: string) => {
  const params = new URLSearchParams({
    client_id: process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID || '',
    redirect_uri: process.env.NEXT_PUBLIC_LOGIN_REDIRECT_URL || '',
    scope: 'repo read:org user',
    state
  });

  if (prompt) params.set('prompt', prompt);

  return `https://github.com/login/oauth/authorize?${params.toString()}`;
};

export const getGithubAuthUrl = (state: string) => buildGithubAuthUrl(state);

export const getGithubReauthorizeUrl = (state: string) => buildGithubAuthUrl(state, 'select_account');

export const getLoginOrigin = (): string | null => {
  try {
    return new URL(process.env.NEXT_PUBLIC_LOGIN_REDIRECT_URL || '').origin;
  } catch {
    return null;
  }
};

export const getGitlabAuthUrl = (state: string) => {
  const params = new URLSearchParams({
    client_id: process.env.GITLAB_CLIENT_ID || '',
    redirect_uri: process.env.NEXT_PUBLIC_LOGIN_REDIRECT_URL || '',
    response_type: 'code',
    scope: 'read_user openid profile email read_api',
    state
  });

  return `https://gitlab.com/oauth/authorize?${params.toString()}`;
};
