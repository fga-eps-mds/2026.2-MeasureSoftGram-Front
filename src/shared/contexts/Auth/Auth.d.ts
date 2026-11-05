type authContextType = {
  session: User | null;
  loading: 'loading' | 'loaded';
  logout: () => Promise<void>;
  provider: Providers;
};

interface User {
  [x: string]: any;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  avatar_url: string;
  repos_url: string;
  organizations_url: string;
}

interface Session {
  user: User;
  token: string;
}
type Providers = 'github' | 'credentials' | 'gitlab';
