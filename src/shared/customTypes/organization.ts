export interface Organization {
  id: string;
  url: string;
  name: string;
  key: string;
  description: string;
  products: string[];
  github_org_name?: string;
  gitlab_group_id?: number | null;
  gitlab_user_id?: number | null;
  avatar_url?: string;
}
