import useSWR, { mutate as globalMutate } from 'swr';
import type { AxiosError } from 'axios';
import { organizationQuery } from '@services/organization';
import { productQuery } from '@services/product';

export interface UnifiedRepoItem {
  github_repo_id?: number;
  gitlab_project_id?: number;
  github_full_name?: string;
  gitlab_path_with_namespace?: string;
  name: string;
  description?: string;
  url: string;
}

interface ProductRepository {
  id: number;
  name: string;
  url?: string | null;
  description?: string | null;
  gitlab_project_id?: number | null;
  gitlab_path_with_namespace?: string | null;
}

interface ProviderReposPage {
  repos: UnifiedRepoItem[];
  totalPages: number;
}

interface ProviderReposParams {
  provider: 'github' | 'gitlab';
  orgDbId: string;
  namespace?: { id: number | string; kind?: string };
  page: number;
  search: string;
  // aba "A Importar": o servidor tira os repositórios deste produto e devolve páginas sempre cheias
  excludeProductId?: string;
  enabled: boolean;
}

const PROVIDER_REPOS_KEY = 'provider-repos';
const PRODUCT_REPOS_KEY = 'product-import-repos';

// A lista do provedor muda pouco: ao voltar para uma página ou aba, mostra a guardada e não busca de novo.
const PROVIDER_REPOS_CONFIG = { keepPreviousData: true, revalidateOnFocus: false, dedupingInterval: 30000 };

export const normalizeRepoUrl = (url?: string | null) => (url ?? '').trim().replace(/\/+$/, '').toLowerCase();

const githubFullNameFromUrl = (url?: string | null) => {
  const match = /github\.com\/([^/]+\/[^/]+)/i.exec(url ?? '');
  return match ? match[1] : undefined;
};

const totalPagesOf = (page: number, total: number | null, nextPage: number | null) =>
  Math.max(total ?? 0, nextPage ?? 0, page);

type ProviderReposKey = [string, string, string, number | string | null, string | null, number, string, string | null];

async function fetchProviderRepos([, provider, orgDbId, namespaceId, kind, page, search, excludeProductId]:
  ProviderReposKey): Promise<ProviderReposPage> {
  if (provider === 'gitlab') {
    const res = excludeProductId
      ? await organizationQuery.getGitLabProjects(orgDbId, namespaceId ?? undefined, kind ?? undefined, page, search,
        excludeProductId)
      : await organizationQuery.getGitLabProjects(orgDbId, namespaceId ?? undefined, kind ?? undefined, page, search);
    if (res.type !== 'success') throw res.error;
    const { projects, totalPages, nextPage } = res.value;
    return {
      repos: projects.map(p => ({ ...p, github_repo_id: p.gitlab_project_id, github_full_name: p.gitlab_path_with_namespace })),
      totalPages: totalPagesOf(page, totalPages, nextPage)
    };
  }

  const res = excludeProductId
    ? await organizationQuery.getGithubRepos(orgDbId, page, search, excludeProductId)
    : await organizationQuery.getGithubRepos(orgDbId, page, search);
  if (res.type !== 'success') throw res.error;
  const { repos, totalPages, nextPage } = res.value;
  return { repos, totalPages: totalPagesOf(page, totalPages, nextPage) };
}

/** Uma página dos repositórios do provedor (GitHub ou GitLab) da organização, guardada no cache do SWR. */
export function useProviderRepos({ provider, orgDbId, namespace, page, search, excludeProductId, enabled }:
  ProviderReposParams) {
  const key: ProviderReposKey | null = enabled
    ? [PROVIDER_REPOS_KEY, provider, orgDbId, namespace?.id ?? null, namespace?.kind ?? null, page, search,
      excludeProductId ?? null]
    : null;
  const { data, error, isLoading, isValidating, mutate } = useSWR<ProviderReposPage, AxiosError>(
    key,
    fetchProviderRepos,
    PROVIDER_REPOS_CONFIG
  );

  return {
    repos: data?.repos ?? [],
    totalPages: data?.totalPages ?? 1,
    error,
    isLoading,
    isValidating,
    mutate
  };
}

/** Busca de novo todas as páginas e abas do provedor guardadas (depois de importar um repositório). */
export function refreshProviderRepos() {
  return globalMutate(key => Array.isArray(key) && key[0] === PROVIDER_REPOS_KEY);
}

/** Repositórios já importados no produto, no formato da lista da tela de importação. */
export function useProductImportedRepos(orgDbId: string, productId: string) {
  const { data, error, isLoading, mutate } = useSWR<UnifiedRepoItem[], AxiosError>(
    orgDbId && productId ? [PRODUCT_REPOS_KEY, orgDbId, productId] : null,
    async ([, organizationId, id]: [string, string, string]) => {
      const res = await productQuery.getAllRepositories(organizationId, id);
      const list = (res?.data?.results || res?.data || []) as ProductRepository[];
      return list.map(repo => ({
        github_repo_id: repo.id,
        gitlab_project_id: repo.gitlab_project_id ?? undefined,
        gitlab_path_with_namespace: repo.gitlab_path_with_namespace || undefined,
        github_full_name: githubFullNameFromUrl(repo.url),
        name: repo.name,
        description: repo.description ?? '',
        url: repo.url ?? ''
      }));
    },
    { revalidateOnFocus: false, dedupingInterval: 2000 }
  );

  return { repos: data, error, isLoading, mutate };
}
