import React from 'react';
import { render, screen, act, waitFor, fireEvent } from '@testing-library/react';
import { organizationQuery } from '@services/organization';
import { productQuery } from '@services/product';
import { repository } from '@services/repository';
import { useOrganizationContext } from '@contexts/OrganizationProvider';
import { useProductContext } from '@contexts/ProductProvider';
import { useAuth } from '@contexts/Auth';
import { useRouter } from 'next/router';
import { toast } from 'react-toastify';
import { OAUTH_STATE_KEY } from '@services/Auth/oauthState';
import Products from '../Products';

jest.mock('@services/organization');
jest.mock('@services/product');
jest.mock('@services/repository');
jest.mock('@contexts/OrganizationProvider');
jest.mock('@contexts/ProductProvider');
jest.mock('@contexts/Auth');
jest.mock('next/router', () => ({
  useRouter: jest.fn()
}));
jest.mock('react-toastify', () => ({
  toast: { error: jest.fn(), success: jest.fn() }
}));

const mockFetchOrgs = jest.fn();
const mockSetCurrentOrgs = jest.fn();
const mockUpdateProductList = jest.fn();
const mockSetCurrentProduct = jest.fn();
const mockSignInWithGithub = jest.fn();
const mockPush = jest.fn();
const mockReplace = jest.fn();

describe('Products Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    
    (useRouter as jest.Mock).mockReturnValue({ query: {}, push: mockPush, replace: mockReplace });
    (useAuth as jest.Mock).mockReturnValue({ signInWithGithub: mockSignInWithGithub });
    
    (useOrganizationContext as jest.Mock).mockReturnValue({
      organizationList: [{ id: 'org-1', name: 'Org 1', key: 'org-1' }],
      currentOrganization: { id: 'org-1', name: 'Org 1', key: 'org-1' },
      setCurrentOrganizations: mockSetCurrentOrgs,
      fetchOrganizations: mockFetchOrgs
    });
    
    (useProductContext as jest.Mock).mockReturnValue({
      currentProduct: { id: 'prod-1', name: 'Prod 1' },
      updateProductList: mockUpdateProductList,
      setCurrentProduct: mockSetCurrentProduct
    });

    (organizationQuery.getGithubOrganizations as jest.Mock).mockResolvedValue({
      type: 'success',
      value: [{ github_org_id: 1, github_org_name: 'Org 1', description: 'Desc' }]
    });

    (organizationQuery.getAllOrganization as jest.Mock).mockResolvedValue({
      type: 'success',
      value: [{ id: 'org-1', name: 'Org 1', key: 'org-1' }]
    });

    (productQuery.getAllProducts as jest.Mock).mockResolvedValue({
      data: { results: [{ id: 'prod-1', name: 'Prod 1' }] }
    });

    (organizationQuery.getGithubRepos as jest.Mock).mockResolvedValue({
      type: 'success',
      value: [{ github_repo_id: 1, name: 'Repo 1', url: 'http://repo1', description: '' }]
    });

    (productQuery.getAllRepositories as jest.Mock).mockResolvedValue({
      data: { results: [] }
    });
  });

  it('renders and loads initial data', async () => {
    render(<Products />);
    
    await waitFor(() => {
      expect(organizationQuery.getGithubOrganizations).toHaveBeenCalled();
    });
    
    expect(await screen.findByText('Org 1')).toBeInTheDocument();
  });

  it('does not exchange a code received in the URL', async () => {
    (useRouter as jest.Mock).mockReturnValue({ query: { code: '123' }, push: mockPush, replace: mockReplace });

    render(<Products />);

    await waitFor(() => {
      expect(organizationQuery.getGithubOrganizations).toHaveBeenCalled();
    });
    expect(mockSignInWithGithub).not.toHaveBeenCalled();
  });

  it('handles github org selection, imports and lists repos', async () => {
    (organizationQuery.getAllOrganization as jest.Mock).mockResolvedValueOnce({
      type: 'success',
      value: [] // Simulate not in backend
    }).mockResolvedValueOnce({
      type: 'success',
      value: [{ id: 'org-1', name: 'Org 1' }] // After import
    });

    (organizationQuery.importOrganization as jest.Mock).mockResolvedValueOnce({
      type: 'success',
      value: { id: 'org-1' }
    });

    render(<Products />);

    await waitFor(() => {
      expect(organizationQuery.importOrganization).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(screen.getByText('Repo 1')).toBeInTheDocument();
    });
  });

  it('handles importing a repo successfully', async () => {
    (repository.createRepository as jest.Mock).mockResolvedValueOnce({ type: 'success' });
    
    render(<Products />);

    await waitFor(() => {
      expect(screen.getByText('Repo 1')).toBeInTheDocument();
    });

    const importBtn = screen.getByText('Importar');
    await act(async () => { fireEvent.click(importBtn); });

    await waitFor(() => {
      expect(repository.createRepository).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith('Repositório Repo 1 importado com sucesso!');
    });
  });
  
  it('handles importing a repo with error', async () => {
    (repository.createRepository as jest.Mock).mockResolvedValueOnce({ type: 'error', error: { message: 'Erro teste' } });
    
    render(<Products />);

    await waitFor(() => {
      expect(screen.getByText('Repo 1')).toBeInTheDocument();
    });

    const importBtn = screen.getByText('Importar');
    await act(async () => { fireEvent.click(importBtn); });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Erro ao importar repositório: Erro teste');
    });
  });

  it('can change tabs, search and pagination', async () => {
    (organizationQuery.getGithubRepos as jest.Mock).mockResolvedValue({
      type: 'success',
      value: Array.from({ length: 15 }).map((_, i) => ({ github_repo_id: i, name: `Repo ${i}`, url: `http://repo${i}`, description: '' }))
    });

    render(<Products />);

    await waitFor(() => {
      expect(screen.getByText('Repo 0')).toBeInTheDocument();
    });

    const todosTab = screen.getByText('Todos');
    await act(async () => { fireEvent.click(todosTab); });
    
    const aImportarTab = screen.getByText('A Importar');
    await act(async () => { fireEvent.click(aImportarTab); });

    const importadosTab = screen.getByText('Importados');
    await act(async () => { fireEvent.click(importadosTab); });
    
    const searchInput = screen.getByPlaceholderText('Buscar repositórios do produto...');
    await act(async () => { fireEvent.change(searchInput, { target: { value: 'Repo 10' } }); });

    await waitFor(() => {
      expect(screen.queryByText('Repo 0')).not.toBeInTheDocument();
    });
    
    await act(async () => { fireEvent.change(searchInput, { target: { value: '' } }); });
    await act(async () => { fireEvent.click(todosTab); });
    
    // pagination - clicking page 2
    let page2Button;
    await waitFor(() => {
      page2Button = screen.getByText('2');
      expect(page2Button).toBeInTheDocument();
    });
    await act(async () => { fireEvent.click(page2Button); });
    
    await waitFor(() => {
      expect(screen.getByText('Repo 12')).toBeInTheDocument();
    });
  });

  it('handles empty products list', async () => {
    (productQuery.getAllProducts as jest.Mock).mockResolvedValue({
      data: { results: [] }
    });

    render(<Products />);

    await waitFor(() => {
      expect(screen.getByText('Esta organização ainda não possui nenhum produto cadastrado.')).toBeInTheDocument();
    });
    
    const createBtn = screen.getByText('Cadastrar Primeiro Produto');
    await act(async () => { fireEvent.click(createBtn); });
    expect(mockPush).toHaveBeenCalledWith('/products/create?id_organization=org-1');
  });

  it('handles getGithubOrganizations error', async () => {
    (organizationQuery.getGithubOrganizations as jest.Mock).mockResolvedValue({
      type: 'error'
    });

    render(<Products />);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Erro ao buscar organizações do GitHub.');
    });
  });

  it('handles loadGitHubOrgs exception', async () => {
    (organizationQuery.getGithubOrganizations as jest.Mock).mockRejectedValue(new Error('Network error'));

    render(<Products />);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Erro ao carregar organizações.');
    });
  });
  
  it('loads org from local storage if current is undefined', async () => {
    (useOrganizationContext as jest.Mock).mockReturnValue({
      organizationList: [{ id: 'org-2', name: 'Org 2', key: 'org-2' }],
      currentOrganization: undefined,
      setCurrentOrganizations: mockSetCurrentOrgs,
      fetchOrganizations: mockFetchOrgs
    });
    
    localStorage.setItem('selectedOrgId', '"org-2"');
    
    (organizationQuery.getGithubOrganizations as jest.Mock).mockResolvedValue({
      type: 'success',
      value: [{ github_org_id: 2, github_org_name: 'Org 2', description: 'Desc' }]
    });

    render(<Products />);

    await waitFor(() => {
      expect(organizationQuery.getGithubOrganizations).toHaveBeenCalled();
    });
    expect(await screen.findByText('Org 2')).toBeInTheDocument();
  });
  
  it('fetches org if local storage id not in list', async () => {
    (useOrganizationContext as jest.Mock).mockReturnValue({
      organizationList: [],
      currentOrganization: undefined,
      setCurrentOrganizations: mockSetCurrentOrgs,
      fetchOrganizations: mockFetchOrgs
    });
    
    localStorage.setItem('selectedOrgId', '"org-3"');
    
    (organizationQuery.getOrganizationById as jest.Mock).mockResolvedValue({
      type: 'success',
      value: { id: 'org-3', name: 'Org 3', key: 'org-3' }
    });
    
    (organizationQuery.getGithubOrganizations as jest.Mock).mockResolvedValue({
      type: 'success',
      value: [{ github_org_id: 3, github_org_name: 'Org 3', description: 'Desc' }]
    });

    render(<Products />);

    await waitFor(() => {
      expect(organizationQuery.getOrganizationById).toHaveBeenCalledWith('org-3');
    });
    expect(await screen.findByText('Org 3')).toBeInTheDocument();
  });

  it('handles github repos fetch 409 error correctly', async () => {
    (organizationQuery.getAllOrganization as jest.Mock).mockResolvedValueOnce({
      type: 'success',
      value: [{ id: 'org-1', name: 'Org 1', key: 'org-1', github_org_name: 'org-1' }]
    });

    (organizationQuery.getGithubRepos as jest.Mock).mockResolvedValueOnce({
      type: 'error',
      error: { response: { status: 409 } }
    });

    render(<Products />);

    await waitFor(() => {
      expect(screen.getByText('Token do GitHub expirado ou inválido')).toBeInTheDocument();
      expect(screen.getByText('Autorizar GitHub')).toBeInTheDocument();
    });
  });

  describe('reautorização do GitHub', () => {
    const originalLocation = window.location;

    beforeEach(() => {
      sessionStorage.clear();
      delete (window as any).location;
      window.location = { ...originalLocation, assign: jest.fn() } as any;
    });

    afterEach(() => {
      window.location = originalLocation;
      jest.restoreAllMocks();
    });

    it('volta para Produtos pelo fluxo com state e com os escopos do login', async () => {
      (organizationQuery.getAllOrganization as jest.Mock).mockResolvedValueOnce({
        type: 'success',
        value: [{ id: 'org-1', name: 'Org 1', key: 'org-1', github_org_name: 'org-1' }]
      });
      (organizationQuery.getGithubRepos as jest.Mock).mockResolvedValueOnce({
        type: 'error',
        error: { response: { status: 409 } }
      });

      render(<Products />);
      fireEvent.click(await screen.findByText('Autorizar GitHub'));

      const stored = JSON.parse(sessionStorage.getItem(OAUTH_STATE_KEY) as string);
      const url = new URL((window.location.assign as jest.Mock).mock.calls[0][0]);
      expect(stored).toMatchObject({ provider: 'github', returnTo: '/products' });
      expect(url.origin + url.pathname).toBe('https://github.com/login/oauth/authorize');
      expect(url.searchParams.get('state')).toBe(stored.nonce);
      expect(url.searchParams.get('scope')).toBe('repo read:org user');
      expect(url.searchParams.has('redirect_uri')).toBe(true);
    });

    it('avisa e não sai do site quando não consegue guardar o state', async () => {
      (organizationQuery.getAllOrganization as jest.Mock).mockResolvedValueOnce({
        type: 'success',
        value: [{ id: 'org-1', name: 'Org 1', key: 'org-1', github_org_name: 'org-1' }]
      });
      (organizationQuery.getGithubRepos as jest.Mock).mockResolvedValueOnce({
        type: 'error',
        error: { response: { status: 409 } }
      });
      jest.spyOn(console, 'error').mockImplementation(() => undefined);

      render(<Products />);
      const button = await screen.findByText('Autorizar GitHub');
      jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('blocked');
      });
      fireEvent.click(button);

      expect(window.location.assign).not.toHaveBeenCalled();
      expect(toast.error).toHaveBeenCalledWith('Não foi possível iniciar a autorização do GitHub.');
    });
  });

  it('handles github repos fetch generic error correctly', async () => {
    (organizationQuery.getAllOrganization as jest.Mock).mockResolvedValueOnce({
      type: 'success',
      value: [{ id: 'org-1', name: 'Org 1', key: 'org-1', github_org_name: 'org-1' }]
    });

    (organizationQuery.getGithubRepos as jest.Mock).mockResolvedValueOnce({
      type: 'error',
      error: { response: { status: 500 } }
    });

    render(<Products />);

    await waitFor(() => {
      expect(screen.getByText('Não foi possível carregar os repositórios')).toBeInTheDocument();
      expect(screen.getByText('Tentar Novamente')).toBeInTheDocument();
    });
  });

  it('displays loading indicator while fetching repos', async () => {
    (organizationQuery.getAllOrganization as jest.Mock).mockResolvedValue({
      type: 'success',
      value: [{ id: 'org-1', name: 'Org 1', key: 'org-1', github_org_name: 'org-1' }]
    });

    let resolveRepos: any;
    const reposPromise = new Promise(resolve => { resolveRepos = resolve; });
    (organizationQuery.getGithubRepos as jest.Mock).mockReturnValue(reposPromise);

    render(<Products />);

    await waitFor(() => {
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    resolveRepos({
      type: 'success',
      value: []
    });

    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });
  });

  it('displays permission link with NEXT_PUBLIC_GITHUB_CLIENT_ID for GitHub', async () => {
    process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID = 'test-github-client-id';

    render(<Products />);

    const link = await screen.findByRole('link', {
      name: 'Conceder acesso ou gerenciar permissões no GitHub'
    });
    expect(link).toHaveAttribute(
      'href',
      'https://github.com/settings/connections/applications/test-github-client-id'
    );
  });

  it('handles github importOrganization error', async () => {
    (organizationQuery.getAllOrganization as jest.Mock).mockResolvedValueOnce({
      type: 'success',
      value: []
    });
    (organizationQuery.importOrganization as jest.Mock).mockResolvedValueOnce({
      type: 'error'
    });

    render(<Products />);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Erro ao importar organização no MeasureSoftGram.');
    });
  });

  it('handles selecting a different organization and product from dropdowns', async () => {
    (organizationQuery.getGithubOrganizations as jest.Mock).mockResolvedValue({
      type: 'success',
      value: [
        { github_org_id: 1, github_org_name: 'Org 1', description: 'Desc 1' },
        { github_org_id: 2, github_org_name: 'Org 2', description: 'Desc 2' }
      ]
    });
    (organizationQuery.getAllOrganization as jest.Mock).mockResolvedValue({
      type: 'success',
      value: [
        { id: 'org-1', name: 'Org 1', key: 'org-1' },
        { id: 'org-2', name: 'Org 2', key: 'org-2' }
      ]
    });
    (productQuery.getAllProducts as jest.Mock).mockResolvedValue({
      data: {
        results: [
          { id: 'prod-1', name: 'Prod 1' },
          { id: 'prod-2', name: 'Prod 2' }
        ]
      }
    });

    render(<Products />);

    await waitFor(() => {
      expect(screen.getByText('Repo 1')).toBeInTheDocument();
    });

    const orgSelect = screen.getByLabelText('Organizações do GitHub');
    fireEvent.mouseDown(orgSelect);
    const org2Option = await screen.findByText('Org 2');
    await act(async () => {
      fireEvent.click(org2Option);
    });

    await waitFor(() => {
      expect(organizationQuery.getGithubRepos).toHaveBeenCalledWith('org-2');
    });

    const prodSelect = screen.getByLabelText('Produtos do MeasureSoftGram');
    fireEvent.mouseDown(prodSelect);
    const prod2Option = await screen.findByText('Prod 2');
    await act(async () => {
      fireEvent.click(prod2Option);
    });

    await waitFor(() => {
      expect(productQuery.getAllRepositories).toHaveBeenCalledWith('org-2', 'prod-2');
    });
  });

  it('clears state when currentOrganization does not match any provider namespace', async () => {
    const { rerender } = render(<Products />);

    await waitFor(() => {
      expect(screen.getByText('Org 1')).toBeInTheDocument();
    });

    (useOrganizationContext as jest.Mock).mockReturnValue({
      organizationList: [{ id: 'org-unknown', name: 'Unknown Org', key: 'org-unknown' }],
      currentOrganization: { id: 'org-unknown', name: 'Unknown Org', key: 'org-unknown' },
      setCurrentOrganizations: mockSetCurrentOrgs,
      fetchOrganizations: mockFetchOrgs
    });

    rerender(<Products />);

    await waitFor(() => {
      expect(screen.queryByText('Repo 1')).not.toBeInTheDocument();
    });
  });

  it('handles unexpected exception when importing repo', async () => {
    (repository.createRepository as jest.Mock).mockRejectedValueOnce(new Error('Crash on import'));

    render(<Products />);

    await waitFor(() => {
      expect(screen.getByText('Repo 1')).toBeInTheDocument();
    });

    const importBtn = screen.getByText('Importar');
    await act(async () => {
      fireEvent.click(importBtn);
    });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Erro ao importar repositório: Crash on import');
    });
  });

  it('handles error in loadProductRepositories silently with console.error', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    (productQuery.getAllRepositories as jest.Mock).mockRejectedValueOnce(new Error('Repo fetch failure'));

    render(<Products />);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Erro ao carregar projetos importados:', expect.any(Error));
    });
  });

  describe('GitLab Provider in Products Component', () => {
    const mockSignInWithGitlab = jest.fn();

    beforeEach(() => {
      (useAuth as jest.Mock).mockReturnValue({
        provider: 'gitlab',
        signInWithGithub: mockSignInWithGithub,
        signInWithGitlab: mockSignInWithGitlab
      });

      (organizationQuery.getGitLabNamespaces as jest.Mock).mockResolvedValue({
        type: 'success',
        value: [
          {
            id: 101,
            name: 'GitLab Group 1',
            full_path: 'gitlab-group-1',
            avatar_url: '',
            description: 'Group 1 Description',
            kind: 'group'
          }
        ]
      });

      (organizationQuery.getAllOrganization as jest.Mock).mockResolvedValue({
        type: 'success',
        value: [{ id: 'org-gl-1', name: 'GitLab Group 1', key: 'gitlab-group-1' }]
      });

      (organizationQuery.getGitLabProjects as jest.Mock).mockResolvedValue({
        type: 'success',
        value: [
          {
            gitlab_project_id: 201,
            gitlab_path_with_namespace: 'gitlab-group-1/project-1',
            name: 'project-1',
            description: 'GitLab Project 1 Description',
            url: 'https://gitlab.com/gitlab-group-1/project-1'
          }
        ]
      });

      (useOrganizationContext as jest.Mock).mockReturnValue({
        organizationList: [{ id: 'org-gl-1', name: 'GitLab Group 1', key: 'gitlab-group-1' }],
        currentOrganization: { id: 'org-gl-1', name: 'GitLab Group 1', key: 'gitlab-group-1' },
        setCurrentOrganizations: mockSetCurrentOrgs,
        fetchOrganizations: mockFetchOrgs
      });

      (productQuery.getAllProducts as jest.Mock).mockResolvedValue({
        data: { results: [{ id: 'prod-gl-1', name: 'Product GitLab' }] }
      });

      (useProductContext as jest.Mock).mockReturnValue({
        currentProduct: { id: 'prod-gl-1', name: 'Product GitLab' },
        updateProductList: mockUpdateProductList,
        setCurrentProduct: mockSetCurrentProduct
      });
    });

    it('loads gitlab namespaces and projects without querying github endpoints', async () => {
      render(<Products />);

      await waitFor(() => {
        expect(organizationQuery.getGitLabNamespaces).toHaveBeenCalled();
        expect(organizationQuery.getGithubOrganizations).not.toHaveBeenCalled();
      });

      expect(await screen.findByText('GitLab Group 1')).toBeInTheDocument();
      expect(screen.getAllByText('Grupos do GitLab').length).toBeGreaterThanOrEqual(1);

      expect(await screen.findByText('gitlab-group-1/project-1')).toBeInTheDocument();

      await waitFor(() => {
        expect(organizationQuery.getGitLabProjects).toHaveBeenCalledWith('org-gl-1', 101, 'group', 1, '');
        expect(organizationQuery.getGithubRepos).not.toHaveBeenCalled();
      });
    });

    it('imports a gitlab project with platform gitlab', async () => {
      (repository.createRepository as jest.Mock).mockResolvedValueOnce({ type: 'success' });

      render(<Products />);

      await waitFor(() => {
        expect(screen.getByText('gitlab-group-1/project-1')).toBeInTheDocument();
      });

      const importBtn = screen.getByText('Importar');
      await act(async () => {
        fireEvent.click(importBtn);
      });

      await waitFor(() => {
        expect(repository.createRepository).toHaveBeenCalledWith('org-gl-1', 'prod-gl-1', {
          name: 'project-1',
          url: 'https://gitlab.com/gitlab-group-1/project-1',
          description: 'GitLab Project 1 Description',
          platform: 'gitlab',
          imported: true
        });
        expect(toast.success).toHaveBeenCalledWith('Projeto project-1 importado com sucesso!');
      });
    });

    it('handles 409 error on gitlab projects with Autorizar GitLab button', async () => {
      (organizationQuery.getGitLabProjects as jest.Mock).mockResolvedValueOnce({
        type: 'error',
        error: { response: { status: 409 } }
      });

      render(<Products />);

      await waitFor(() => {
        expect(screen.getByText('Token do GitLab expirado ou inválido')).toBeInTheDocument();
        expect(screen.getByText('Autorizar GitLab')).toBeInTheDocument();
      });

      const originalLocation = window.location;
      delete (window as any).location;
      window.location = { ...originalLocation, assign: jest.fn() } as any;

      const authBtn = screen.getByText('Autorizar GitLab');
      await act(async () => {
        fireEvent.click(authBtn);
      });

      const stored = JSON.parse(sessionStorage.getItem(OAUTH_STATE_KEY) as string);
      const url = new URL((window.location.assign as jest.Mock).mock.calls[0][0]);
      window.location = originalLocation;

      expect(stored).toMatchObject({ provider: 'gitlab', returnTo: '/products' });
      expect(url.origin + url.pathname).toBe('https://gitlab.com/oauth/authorize');
      expect(url.searchParams.get('state')).toBe(stored.nonce);
      expect(url.searchParams.get('scope')).toBe('read_user openid profile email read_api');
    });

    it('handles search and pagination queries to gitlab backend', async () => {
      render(<Products />);

      await waitFor(() => {
        expect(screen.getByText('gitlab-group-1/project-1')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Buscar projetos do produto...');
      await act(async () => {
        fireEvent.change(searchInput, { target: { value: 'custom-proj' } });
      });

      await waitFor(() => {
        expect(organizationQuery.getGitLabProjects).toHaveBeenCalledWith('org-gl-1', 101, 'group', 1, 'custom-proj');
      }, { timeout: 1000 });
    });

    it('creates organization if gitlab namespace is not yet in backend', async () => {
      (organizationQuery.getAllOrganization as jest.Mock).mockResolvedValueOnce({
        type: 'success',
        value: []
      });
      (organizationQuery.createOrganization as jest.Mock).mockResolvedValueOnce({
        type: 'success',
        value: { id: 'org-gl-new', name: 'GitLab Group 1' }
      });

      render(<Products />);

      await waitFor(() => {
        expect(organizationQuery.createOrganization).toHaveBeenCalledWith({ name: 'GitLab Group 1' });
      });
    });

    it('handles gitlab pagination page click', async () => {
      (organizationQuery.getGitLabProjects as jest.Mock).mockResolvedValue({
        type: 'success',
        value: {
          projects: [
            {
              gitlab_project_id: 201,
              gitlab_path_with_namespace: 'gitlab-group-1/project-1',
              name: 'project-1',
              description: 'GitLab Project 1 Description',
              url: 'https://gitlab.com/gitlab-group-1/project-1'
            }
          ],
          totalPages: 3
        }
      });

      render(<Products />);

      await waitFor(() => {
        expect(screen.getByText('gitlab-group-1/project-1')).toBeInTheDocument();
      });

      const page2Btn = screen.getByText('2');
      await act(async () => {
        fireEvent.click(page2Btn);
      });

      await waitFor(() => {
        expect(organizationQuery.getGitLabProjects).toHaveBeenCalledWith('org-gl-1', 101, 'group', 2, '');
      });
    });

    it('handles gitlab 400 error status with Autorizar GitLab button', async () => {
      (organizationQuery.getGitLabProjects as jest.Mock).mockResolvedValueOnce({
        type: 'error',
        error: { response: { status: 400 } }
      });

      render(<Products />);

      await waitFor(() => {
        expect(screen.getByText('Token do GitLab expirado ou inválido')).toBeInTheDocument();
        expect(screen.getByText('Autorizar GitLab')).toBeInTheDocument();
      });
    });

    it('handles gitlab reauthorization failure when state storage fails', async () => {
      (organizationQuery.getGitLabProjects as jest.Mock).mockResolvedValueOnce({
        type: 'error',
        error: { response: { status: 409 } }
      });
      jest.spyOn(console, 'error').mockImplementation(() => undefined);

      render(<Products />);

      const authBtn = await screen.findByText('Autorizar GitLab');
      jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('storage blocked');
      });

      await act(async () => {
        fireEvent.click(authBtn);
      });

      expect(toast.error).toHaveBeenCalledWith('Não foi possível iniciar a autorização do GitLab.');
    });

    it('handles generic error on gitlab projects and allows retry', async () => {
      (organizationQuery.getGitLabProjects as jest.Mock)
        .mockResolvedValueOnce({
          type: 'error',
          error: { response: { status: 500 } }
        })
        .mockResolvedValueOnce({
          type: 'success',
          value: {
            projects: [
              {
                gitlab_project_id: 201,
                gitlab_path_with_namespace: 'gitlab-group-1/project-1',
                name: 'project-1',
                description: 'GitLab Project 1 Description',
                url: 'https://gitlab.com/gitlab-group-1/project-1'
              }
            ],
            totalPages: 1
          }
        });

      render(<Products />);

      await waitFor(() => {
        expect(screen.getByText('Não foi possível carregar os projetos')).toBeInTheDocument();
      });

      const retryBtn = screen.getByText('Tentar Novamente');
      await act(async () => {
        fireEvent.click(retryBtn);
      });

      await waitFor(() => {
        expect(screen.getByText('gitlab-group-1/project-1')).toBeInTheDocument();
      });
    });

    it('handles exception during gitlab projects fetch', async () => {
      jest.spyOn(console, 'error').mockImplementation(() => undefined);
      (organizationQuery.getGitLabProjects as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      render(<Products />);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Erro ao carregar projetos.');
      });
    });

    it('handles error fetching gitlab namespaces', async () => {
      (organizationQuery.getGitLabNamespaces as jest.Mock).mockResolvedValueOnce({
        type: 'error'
      });

      render(<Products />);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Erro ao buscar grupos do GitLab.');
      });
    });

    it('handles fallback in importOrg when createOrganization fails but getAllOrganization finds the org', async () => {
      (organizationQuery.getAllOrganization as jest.Mock)
        .mockResolvedValueOnce({
          type: 'success',
          value: []
        })
        .mockResolvedValueOnce({
          type: 'success',
          value: [{ id: 'org-gl-fallback', name: 'gitlab group 1' }]
        });
      (organizationQuery.createOrganization as jest.Mock).mockResolvedValueOnce({
        type: 'error'
      });

      render(<Products />);

      await waitFor(() => {
        expect(organizationQuery.createOrganization).toHaveBeenCalledWith({ name: 'GitLab Group 1' });
        expect(screen.getByText('gitlab-group-1/project-1')).toBeInTheDocument();
      });
    });

    it('handles total failure in importOrg when org cannot be created or found', async () => {
      (organizationQuery.getAllOrganization as jest.Mock).mockResolvedValue({
        type: 'success',
        value: []
      });
      (organizationQuery.createOrganization as jest.Mock).mockResolvedValue({
        type: 'error'
      });

      render(<Products />);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Erro ao importar grupo no MeasureSoftGram.');
      });
    });

    it('displays already imported chip and filters by tabs in gitlab', async () => {
      (productQuery.getAllRepositories as jest.Mock).mockResolvedValueOnce({
        data: {
          results: [{ url: 'https://gitlab.com/gitlab-group-1/project-1' }]
        }
      });

      render(<Products />);

      await waitFor(() => {
        expect(screen.getByText('Importado')).toBeInTheDocument();
      });

      const aImportarTab = screen.getByText('A Importar');
      await act(async () => {
        fireEvent.click(aImportarTab);
      });

      await waitFor(() => {
        expect(screen.queryByText('gitlab-group-1/project-1')).not.toBeInTheDocument();
        expect(screen.getByText('Nenhum projeto associado a este produto foi encontrado.')).toBeInTheDocument();
      });

      const importadosTab = screen.getByText('Importados');
      await act(async () => {
        fireEvent.click(importadosTab);
      });

      await waitFor(() => {
        expect(screen.getByText('gitlab-group-1/project-1')).toBeInTheDocument();
      });
    });

    it('navigates to create product page when clicking Criar Produto button in gitlab', async () => {
      render(<Products />);

      await waitFor(() => {
        expect(screen.getByText('gitlab-group-1/project-1')).toBeInTheDocument();
      });

      const createBtn = screen.getByText('Criar Produto');
      await act(async () => {
        fireEvent.click(createBtn);
      });

      expect(mockPush).toHaveBeenCalledWith('/products/create?id_organization=org-gl-1');
    });

    it('displays permission link for GitLab applications', async () => {
      render(<Products />);

      const link = await screen.findByRole('link', {
        name: 'Conceder acesso ou gerenciar permissões no GitLab'
      });
      expect(link).toHaveAttribute('href', 'https://gitlab.com/-/profile/applications');
    });
  });
});

