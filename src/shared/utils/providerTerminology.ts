import i18n from '../i18n/i18n';

export type TerminologyProvider = 'github' | 'gitlab' | 'credentials';

export interface ProviderTerms {
  providerName: string;
  repository: string;
  repositories: string;
  Repository: string;
  Repositories: string;
  organization: string;
  organizations: string;
  Organization: string;
  Organizations: string;
  theOrganization: string;
  yourOrganization: string;
  thisOrganization: string;
  anOrganization: string;
  pullRequest: string;
  pullRequestShort: string;
}

const TRANSLATED_TERMS = [
  'repository',
  'repositories',
  'Repository',
  'Repositories',
  'organization',
  'organizations',
  'Organization',
  'Organizations',
  'theOrganization',
  'yourOrganization',
  'thisOrganization',
  'anOrganization'
] as const;

function buildTerms(
  context: 'gitlab' | undefined,
  fixed: Pick<ProviderTerms, 'providerName' | 'pullRequest' | 'pullRequestShort'>
): ProviderTerms {
  const terms = { ...fixed } as ProviderTerms;
  TRANSLATED_TERMS.forEach((term) => {
    Object.defineProperty(terms, term, { enumerable: true, get: () => i18n.t(`terms.${term}`, { context }) });
  });
  return terms;
}

const GITHUB_TERMS = buildTerms(undefined, {
  providerName: 'GitHub',
  pullRequest: 'Pull Request',
  pullRequestShort: 'PR'
});

const GITLAB_TERMS = buildTerms('gitlab', {
  providerName: 'GitLab',
  pullRequest: 'Merge Request',
  pullRequestShort: 'MR'
});

const NEUTRAL_TERMS: ProviderTerms = GITHUB_TERMS;

export function getProviderTerms(provider?: string | null): ProviderTerms {
  if (provider === 'gitlab') return GITLAB_TERMS;
  if (provider === 'github') return GITHUB_TERMS;
  return NEUTRAL_TERMS;
}

/** Valor de `context` do i18next: chaves `<key>_gitlab` sobrescrevem a chave base. */
export function getI18nContext(provider?: string | null): string | undefined {
  return provider === 'gitlab' ? 'gitlab' : undefined;
}
