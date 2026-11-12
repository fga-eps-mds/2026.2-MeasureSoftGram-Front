import React from 'react';
import { render, screen, act, waitFor, fireEvent } from '@testing-library/react';
import { organizationQuery } from '@services/organization';
import { productQuery } from '@services/product';
import { repository } from '@services/repository';
import { useOrganizationContext } from '@contexts/OrganizationProvider';
import { useProductContext } from '@contexts/ProductProvider';
import { useAuth } from '@contexts/Auth';
import { useRouter } from '@hooks/useRouter';
import { toast } from 'react-toastify';
import { SWRConfig } from 'swr';
import Products from '../Products';
import { normalizeRepoUrl } from '../hooks/useImportRepos';

jest.mock('@services/organization');
jest.mock('@services/product');
jest.mock('@services/repository');
jest.mock('@contexts/OrganizationProvider');
jest.mock('@contexts/ProductProvider');
jest.mock('@contexts/Auth');
jest.mock('@hooks/useRouter', () => ({
  useRouter: jest.fn()
}));
jest.mock('react-toastify', () => ({
  toast: { error: jest.fn(), success: jest.fn() }
}));

// cada teste com um cache do SWR novo, para uma resposta não vazar para o seguinte
const withSWR = (ui: React.ReactElement) => (
  <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0, shouldRetryOnError: false }}>{ui}</SWRConfig>
);
const renderProducts = () => render(withSWR(<Products />));

const mockFetchOrgs = jest.fn();
const mockSetCurrentOrgs = jest.fn();
const mockUpdateProductList = jest.fn();
const mockSetCurrentProduct = jest.fn();
const mockPush = jest.fn();
const mockReplace = jest.fn();

describe('Products Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    
    (useRouter as jest.Mock).mockReturnValue({ query: {}, push: mockPush, replace: mockReplace });
    (useAuth as jest.Mock).mockReturnValue({ provider: 'github' });
    
    (useOrganizationContext as jest.Mock).mockReturnValue({
      organizationList: [{ id: 'org-1', name: 'Org 1', key: 'org-1' }],
      currentOrganization: { id: 'org-1', name: 'Org 1', key: 'org-1' },
      setCurrentOrganizations: mockSetCurrentOrgs,
      fetchOrganizations: mockFetchOrgs,
      hasFetched: true
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
      value: {
        repos: [{ github_repo_id: 1, name: 'Repo 1', url: 'http://repo1', description: '' }],
        totalPages: 1,
        nextPage: null
      }
    });

    (productQuery.getAllRepositories as jest.Mock).mockResolvedValue({
      data: { results: [] }
    });
  });

  it('renders and loads initial data', async () => {
    renderProducts();
    
    await waitFor(() => {
      expect(organizationQuery.getGithubOrganizations).toHaveBeenCalled();
    });
    
    expect(await screen.findByText('Org 1')).toBeInTheDocument();
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

    renderProducts();

    await waitFor(() => {
      expect(organizationQuery.importOrganization).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(screen.getByText('Repo 1')).toBeInTheDocument();
    });
  });

  it('handles importing a repo successfully', async () => {
    (repository.createRepository as jest.Mock).mockResolvedValueOnce({ type: 'success' });
    
    renderProducts();

    await waitFor(() => {
      expect(screen.getByText('Repo 1')).toBeInTheDocument();
    });

    const importBtn = screen.getByText('Importar');
    await act(async () => { fireEvent.click(importBtn); });

    await waitFor(() => {
      expect(repository.createRepository).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith('Repositório Repo 1 importado com sucesso!');
    });
    // o identificador do GitLab só vai com conta do GitLab
    expect((repository.createRepository as jest.Mock).mock.calls[0][2]).not.toHaveProperty('gitlab_project_id');
    expect(toast.error).not.toHaveBeenCalled();
  });
  
  it('handles importing a repo with error', async () => {
    (repository.createRepository as jest.Mock).mockResolvedValueOnce({ type: 'error', error: { message: 'Erro teste' } });
    
    renderProducts();

    await waitFor(() => {
      expect(screen.getByText('Repo 1')).toBeInTheDocument();
    });

    const importBtn = screen.getByText('Importar');
    await act(async () => { fireEvent.click(importBtn); });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Erro ao importar repositório: Erro teste');
    });
  });

  it('can change tabs, search and paginate on the server', async () => {
    const makeRepos = (from: number, to: number) =>
      Array.from({ length: to - from }).map((_, i) => ({
        github_repo_id: from + i,
        name: `Repo ${from + i}`,
        url: `http://repo${from + i}`,
        description: ''
      }));
    (organizationQuery.getGithubRepos as jest.Mock).mockImplementation(async (_org: string, page: number) => ({
      type: 'success',
      value: {
        repos: page === 2 ? makeRepos(10, 15) : makeRepos(0, 10),
        totalPages: 2,
        nextPage: page === 2 ? null : 2
      }
    }));

    renderProducts();

    await waitFor(() => {
      expect(screen.getByText('Repo 0')).toBeInTheDocument();
    });
    expect(screen.queryByText('Repo 10')).not.toBeInTheDocument();

    await act(async () => { fireEvent.click(screen.getByText('Todos')); });

    const page2Button = await screen.findByText('2');
    await act(async () => { fireEvent.click(page2Button); });

    await waitFor(() => {
      expect(organizationQuery.getGithubRepos).toHaveBeenLastCalledWith(expect.anything(), 2, '');
      expect(screen.getByText('Repo 12')).toBeInTheDocument();
    });
    expect(screen.queryByText('Repo 0')).not.toBeInTheDocument();

    const searchInput = screen.getByPlaceholderText('Buscar repositórios do produto...');
    await act(async () => { fireEvent.change(searchInput, { target: { value: 'Repo 10' } }); });

    await waitFor(() => {
      expect(organizationQuery.getGithubRepos).toHaveBeenLastCalledWith(expect.anything(), 1, 'Repo 10');
    });
  });

  describe('abas da importação', () => {
    const productRepos = (count: number) =>
      Array.from({ length: count }).map((_, i) => ({
        id: i + 1,
        name: `Importado ${i + 1}`,
        url: `https://github.com/org-1/importado-${i + 1}`,
        description: ''
      }));

    it('lista os importados do produto, mesmo os que não estão na página do provedor, de 10 em 10', async () => {
      (productQuery.getAllRepositories as jest.Mock).mockResolvedValue({ data: { results: productRepos(12) } });

      renderProducts();

      expect(await screen.findByText('org-1/importado-1')).toBeInTheDocument();
      expect(screen.getByText('org-1/importado-10')).toBeInTheDocument();
      expect(screen.queryByText('org-1/importado-11')).not.toBeInTheDocument();
      // a aba "Importados" não depende da lista do provedor
      expect(organizationQuery.getGithubRepos).not.toHaveBeenCalled();

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Go to page 2' }));
      });

      expect(await screen.findByText('org-1/importado-12')).toBeInTheDocument();
      expect(screen.queryByText('org-1/importado-1')).not.toBeInTheDocument();
    });

    it('pede ao servidor a aba "A Importar" sem os repositórios do produto', async () => {
      (productQuery.getAllRepositories as jest.Mock).mockResolvedValue({ data: { results: productRepos(1) } });

      renderProducts();
      expect(await screen.findByText('org-1/importado-1')).toBeInTheDocument();

      await act(async () => { fireEvent.click(screen.getByText('A Importar')); });

      await waitFor(() => {
        expect(organizationQuery.getGithubRepos).toHaveBeenLastCalledWith('org-1', 1, '', 'prod-1');
      });
      expect(await screen.findByText('Repo 1')).toBeInTheDocument();
    });

    it('mostra o repositório em "Importados" depois de importar', async () => {
      (repository.createRepository as jest.Mock).mockResolvedValueOnce({ type: 'success' });
      (productQuery.getAllRepositories as jest.Mock)
        .mockResolvedValueOnce({ data: { results: [] } })
        .mockResolvedValue({ data: { results: [{ id: 1, name: 'Repo 1', url: 'http://repo1', description: '' }] } });

      renderProducts();

      fireEvent.click(await screen.findByText('Importar'));
      expect(await screen.findByText('Importado')).toBeInTheDocument();

      await act(async () => { fireEvent.click(screen.getByText('Importados')); });

      expect(await screen.findByText('Repo 1')).toBeInTheDocument();
      expect(productQuery.getAllRepositories).toHaveBeenCalledTimes(2);
    });
  });

  describe('troca de produto e de organização', () => {
    const selectOption = async (label: string, option: string) => {
      await act(async () => { fireEvent.mouseDown(screen.getByLabelText(label)); });
      await act(async () => { fireEvent.click(await screen.findByRole('option', { name: new RegExp(option) })); });
    };

    it('não marca como importado no outro produto o repositório importado no anterior', async () => {
      // sem produto no contexto, para a seleção da tela não voltar para o produto antigo
      (useProductContext as jest.Mock).mockReturnValue({
        currentProduct: undefined,
        updateProductList: mockUpdateProductList,
        setCurrentProduct: mockSetCurrentProduct
      });
      (productQuery.getAllProducts as jest.Mock).mockResolvedValue({
        data: { results: [{ id: 'prod-1', name: 'Prod 1' }, { id: 'prod-2', name: 'Prod 2' }] }
      });
      (repository.createRepository as jest.Mock).mockResolvedValueOnce({ type: 'success' });
      (productQuery.getAllRepositories as jest.Mock).mockImplementation(async (_org: string, productId: string) => ({
        data: {
          results: productId === 'prod-1' && (repository.createRepository as jest.Mock).mock.calls.length > 0
            ? [{ id: 1, name: 'Repo 1', url: 'http://repo1', description: '' }]
            : []
        }
      }));

      renderProducts();

      fireEvent.click(await screen.findByText('Importar'));
      expect(await screen.findByText('Importado')).toBeInTheDocument();

      await selectOption('Produtos do MeasureSoftGram', 'Prod 2');

      expect(await screen.findByText('Importar')).toBeInTheDocument();
      expect(screen.queryByText('Importado')).not.toBeInTheDocument();
    });

    it('não mostra nem deixa importar os repositórios da organização anterior enquanto a nova carrega', async () => {
      (organizationQuery.getGithubOrganizations as jest.Mock).mockResolvedValue({
        type: 'success',
        value: [
          { github_org_id: 1, github_org_name: 'Org 1', description: '' },
          { github_org_id: 2, github_org_name: 'Org 2', description: '' }
        ]
      });
      (organizationQuery.getAllOrganization as jest.Mock).mockResolvedValue({
        type: 'success',
        value: [{ id: 'org-1', name: 'Org 1', key: 'org-1' }, { id: 'org-2', name: 'Org 2', key: 'org-2' }]
      });
      (useOrganizationContext as jest.Mock).mockReturnValue({
        organizationList: [{ id: 'org-1', name: 'Org 1', key: 'org-1' }, { id: 'org-2', name: 'Org 2', key: 'org-2' }],
        currentOrganization: undefined,
        setCurrentOrganizations: mockSetCurrentOrgs,
        fetchOrganizations: mockFetchOrgs,
        hasFetched: true
      });
      let releaseOrg2: () => void = () => undefined;
      (organizationQuery.getGithubRepos as jest.Mock).mockImplementation((orgId: string) => {
        if (orgId !== 'org-2') {
          return Promise.resolve({
            type: 'success',
            value: { repos: [{ github_repo_id: 1, name: 'Repo da Org 1', url: 'http://org1/repo', description: '' }], totalPages: 1, nextPage: null }
          });
        }
        return new Promise(resolve => {
          releaseOrg2 = () => {
            resolve({
              type: 'success',
              value: { repos: [{ github_repo_id: 2, name: 'Repo da Org 2', url: 'http://org2/repo', description: '' }], totalPages: 1, nextPage: null }
            });
          };
        });
      });

      renderProducts();
      expect(await screen.findByText('Repo da Org 1')).toBeInTheDocument();

      await selectOption('Organizações do GitHub', 'Org 2');

      await waitFor(() => expect(screen.queryByText('Repo da Org 1')).not.toBeInTheDocument());
      expect(screen.queryByText('Importar')).not.toBeInTheDocument();

      await act(async () => { releaseOrg2(); });
      expect(await screen.findByText('Repo da Org 2')).toBeInTheDocument();
    });
  });

  describe('normalizeRepoUrl', () => {
    it('tira espaços, barras finais e maiúsculas', () => {
      expect(normalizeRepoUrl('  https://GitHub.com/Org/Repo///  ')).toBe('https://github.com/org/repo');
      expect(normalizeRepoUrl('/////')).toBe('');
      expect(normalizeRepoUrl(null)).toBe('');
    });
  });

  it('handles empty products list', async () => {
    (productQuery.getAllProducts as jest.Mock).mockResolvedValue({
      data: { results: [] }
    });

    renderProducts();

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

    renderProducts();

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Erro ao buscar organizações do GitHub.');
    });
  });

  it('handles getGithubOrganizations 409 error displaying reauthorize button without logging out', async () => {
    (organizationQuery.getGithubOrganizations as jest.Mock).mockResolvedValue({
      type: 'error',
      error: { response: { status: 409 } }
    });

    renderProducts();

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Token do GitHub expirado ou inválido.');
    });
    expect(await screen.findByText('Token do GitHub expirado ou inválido')).toBeInTheDocument();
    expect(await screen.findByText('Autorizar GitHub')).toBeInTheDocument();
  });

  it('handles loadGitHubOrgs exception', async () => {
    (organizationQuery.getGithubOrganizations as jest.Mock).mockRejectedValue(new Error('Network error'));

    renderProducts();

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Erro ao carregar organizações.');
    });
  });
  
  it('loads org from local storage if current is undefined', async () => {
    (useOrganizationContext as jest.Mock).mockReturnValue({
      organizationList: [{ id: 'org-2', name: 'Org 2', key: 'org-2' }],
      currentOrganization: undefined,
      setCurrentOrganizations: mockSetCurrentOrgs,
      fetchOrganizations: mockFetchOrgs,
      hasFetched: true
    });
    
    localStorage.setItem('selectedOrgId', '"org-2"');
    
    (organizationQuery.getGithubOrganizations as jest.Mock).mockResolvedValue({
      type: 'success',
      value: [{ github_org_id: 2, github_org_name: 'Org 2', description: 'Desc' }]
    });

    renderProducts();

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
      fetchOrganizations: mockFetchOrgs,
      hasFetched: true
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

    renderProducts();

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

    renderProducts();

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

    it('leva ao servidor, que guarda o state e volta para Produtos, pedindo a escolha da conta', async () => {
      (organizationQuery.getAllOrganization as jest.Mock).mockResolvedValueOnce({
        type: 'success',
        value: [{ id: 'org-1', name: 'Org 1', key: 'org-1', github_org_name: 'org-1' }]
      });
      (organizationQuery.getGithubRepos as jest.Mock).mockResolvedValueOnce({
        type: 'error',
        error: { response: { status: 409 } }
      });

      renderProducts();
      fireEvent.click(await screen.findByText('Autorizar GitHub'));

      expect(window.location.assign).toHaveBeenCalledWith('/auth/oauth/github?returnTo=%2Fproducts&reauthorize=1');
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

    renderProducts();

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

    renderProducts();

    await waitFor(() => {
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    resolveRepos({
      type: 'success',
      value: { repos: [], totalPages: 1, nextPage: null }
    });

    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });
  });

  describe('provider da sessão', () => {
    it('não busca os namespaces enquanto a lista de organizações não chegou e busca uma vez depois', async () => {
      const context = (useOrganizationContext as jest.Mock)();
      (useOrganizationContext as jest.Mock).mockReturnValue({
        ...context,
        organizationList: [],
        currentOrganization: null,
        hasFetched: false
      });

      const { rerender } = renderProducts();
      await act(async () => {});
      expect(organizationQuery.getGithubOrganizations).not.toHaveBeenCalled();
      expect(organizationQuery.importOrganization).not.toHaveBeenCalled();

      (useOrganizationContext as jest.Mock).mockReturnValue(context);
      rerender(withSWR(<Products />));

      await waitFor(() => {
        expect(organizationQuery.getGithubOrganizations).toHaveBeenCalledTimes(1);
      });
    });

    it('usa as organizações do GitHub para quem entrou por credenciais', async () => {
      (useAuth as jest.Mock).mockReturnValue({ provider: 'credentials' });

      renderProducts();

      await waitFor(() => {
        expect(organizationQuery.getGithubOrganizations).toHaveBeenCalledTimes(1);
      });
      expect(organizationQuery.getGitLabNamespaces).not.toHaveBeenCalled();
      expect(await screen.findByText('Org 1')).toBeInTheDocument();
    });

    it('busca as organizações uma vez só e mostra um único toast de token inválido', async () => {
      (organizationQuery.getGithubOrganizations as jest.Mock).mockResolvedValue({
        type: 'error',
        error: { response: { status: 409 } }
      });

      renderProducts();

      expect(await screen.findByText('Autorizar GitHub')).toBeInTheDocument();
      expect(organizationQuery.getGithubOrganizations).toHaveBeenCalledTimes(1);
      expect(toast.error).toHaveBeenCalledTimes(1);
      expect(toast.error).toHaveBeenCalledWith('Token do GitHub expirado ou inválido.');
    });
  });

  describe('GitLab Provider in Products Component', () => {
    beforeEach(() => {
      (useAuth as jest.Mock).mockReturnValue({ provider: 'gitlab' });

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

      (organizationQuery.importGitlabGroup as jest.Mock).mockResolvedValue({
        type: 'success',
        value: { id: 'org-gl-1' }
      });

      (organizationQuery.importGitlabPersonal as jest.Mock).mockResolvedValue({
        type: 'success',
        value: { id: 'org-gl-user-1' }
      });

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
          totalPages: 1,
          nextPage: null
        }
      });

      (useOrganizationContext as jest.Mock).mockReturnValue({
        organizationList: [{ id: 'org-gl-1', name: 'GitLab Group 1', key: 'gitlab-group-1' }],
        currentOrganization: { id: 'org-gl-1', name: 'GitLab Group 1', key: 'gitlab-group-1' },
        setCurrentOrganizations: mockSetCurrentOrgs,
        fetchOrganizations: mockFetchOrgs,
        hasFetched: true
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
      renderProducts();

      await waitFor(() => {
        expect(organizationQuery.getGitLabNamespaces).toHaveBeenCalled();
        expect(organizationQuery.getGithubOrganizations).not.toHaveBeenCalled();
      });

      expect(await screen.findByText('GitLab Group 1')).toBeInTheDocument();
      expect(screen.getAllByText('Grupos do GitLab').length).toBeGreaterThanOrEqual(1);

      expect(await screen.findByText('gitlab-group-1/project-1')).toBeInTheDocument();

      await waitFor(() => {
        expect(organizationQuery.getGitLabProjects).toHaveBeenCalledWith('org-gl-1', 101, 'group', 1, '', 'prod-gl-1');
        expect(organizationQuery.getGithubRepos).not.toHaveBeenCalled();
      });
    });

    it('imports a gitlab group through the shared group endpoint when it is not in MeasureSoftGram yet', async () => {
      (organizationQuery.getAllOrganization as jest.Mock).mockResolvedValue({ type: 'success', value: [] });
      (organizationQuery.importGitlabGroup as jest.Mock).mockResolvedValue({
        type: 'success',
        value: { id: 'org-gl-1' }
      });

      renderProducts();

      await waitFor(() => {
        expect(organizationQuery.importGitlabGroup).toHaveBeenCalledWith(101);
      });
      expect(organizationQuery.createOrganization).not.toHaveBeenCalled();
    });

    it('imports a gitlab project with platform gitlab', async () => {
      (repository.createRepository as jest.Mock).mockResolvedValueOnce({ type: 'success' });

      renderProducts();

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
          imported: true,
          gitlab_project_id: 201
        });
        expect(toast.success).toHaveBeenCalledWith('Projeto project-1 importado com sucesso!');
      });
    });

    it('handles 409 error on gitlab namespaces with Autorizar GitLab button', async () => {
      (organizationQuery.getGitLabNamespaces as jest.Mock).mockResolvedValueOnce({
        type: 'error',
        error: { response: { status: 409 } }
      });

      renderProducts();

      await waitFor(() => {
        expect(screen.getByText('Token do GitLab expirado ou inválido')).toBeInTheDocument();
        expect(screen.getByText('Autorizar GitLab')).toBeInTheDocument();
      });
    });

    it('handles 409 error on gitlab projects with Autorizar GitLab button', async () => {
      (organizationQuery.getGitLabProjects as jest.Mock).mockResolvedValueOnce({
        type: 'error',
        error: { response: { status: 409 } }
      });

      renderProducts();

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

      const assigned = (window.location.assign as jest.Mock).mock.calls[0][0];
      window.location = originalLocation;

      expect(assigned).toBe('/auth/oauth/gitlab?returnTo=%2Fproducts&reauthorize=1');
    });

    it('pagina os projetos do gitlab pelo total de páginas que o service repassa', async () => {
      (organizationQuery.getGitLabProjects as jest.Mock).mockResolvedValue({
        type: 'success',
        value: {
          projects: [
            {
              gitlab_project_id: 201,
              gitlab_path_with_namespace: 'gitlab-group-1/project-1',
              name: 'project-1',
              description: '',
              url: 'https://gitlab.com/gitlab-group-1/project-1'
            }
          ],
          totalPages: 3,
          nextPage: 2
        }
      });

      renderProducts();

      expect(await screen.findByRole('button', { name: 'Go to page 3' })).toBeInTheDocument();
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Go to page 2' }));
      });

      await waitFor(() => {
        expect(organizationQuery.getGitLabProjects).toHaveBeenCalledWith('org-gl-1', 101, 'group', 2, '', 'prod-gl-1');
      });
    });

    it('não mostra uma página seguinte quando o gitlab diz que é a última', async () => {
      renderProducts();

      expect(await screen.findByText('gitlab-group-1/project-1')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Go to page 2' })).not.toBeInTheDocument();
    });

    it('handles search and pagination queries to gitlab backend', async () => {
      renderProducts();

      await waitFor(() => {
        expect(screen.getByText('gitlab-group-1/project-1')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Buscar projetos do produto...');
      await act(async () => {
        fireEvent.change(searchInput, { target: { value: 'custom-proj' } });
      });

      await waitFor(() => {
        expect(organizationQuery.getGitLabProjects).toHaveBeenCalledWith('org-gl-1', 101, 'group', 1, 'custom-proj', 'prod-gl-1');
      }, { timeout: 1000 });
    });

    it('creates organization if the gitlab personal space is not yet in backend', async () => {
      (organizationQuery.getGitLabNamespaces as jest.Mock).mockResolvedValue({
        type: 'success',
        value: [
          { id: 101, name: 'GitLab Group 1', full_path: 'gitlab-group-1', avatar_url: '', description: '', kind: 'user' }
        ]
      });
      (organizationQuery.getAllOrganization as jest.Mock).mockResolvedValueOnce({
        type: 'success',
        value: []
      });
      (organizationQuery.importGitlabPersonal as jest.Mock).mockResolvedValueOnce({
        type: 'success',
        value: { id: 'org-gl-new', name: 'GitLab Group 1', gitlab_user_id: 101 }
      });

      renderProducts();

      await waitFor(() => {
        expect(organizationQuery.importGitlabPersonal).toHaveBeenCalled();
        expect(organizationQuery.getGitLabProjects).toHaveBeenCalledWith('org-gl-new', 101, 'user', 1, '', 'prod-gl-1');
      });
      expect(organizationQuery.createOrganization).not.toHaveBeenCalled();
    });

    it('importa o namespace pessoal pelo id devolvido por importGitlabPersonal mesmo havendo grupo homônimo (Cenário 1)', async () => {
      (organizationQuery.getGitLabNamespaces as jest.Mock).mockResolvedValue({
        type: 'success',
        value: [
          { id: 7, name: 'joao', full_path: 'joao', avatar_url: '', description: '', kind: 'user' },
          { id: 8, name: 'joao', full_path: 'joao', avatar_url: '', description: 'Grupo', kind: 'group' }
        ]
      });
      (organizationQuery.getAllOrganization as jest.Mock).mockResolvedValue({
        type: 'success',
        value: [{ id: 'org-joao', name: 'joao', gitlab_group_id: 8 }]
      });
      (organizationQuery.importGitlabPersonal as jest.Mock).mockResolvedValue({
        type: 'success',
        value: { id: 'org-joao-pessoal', name: 'joao-7', gitlab_user_id: 7 }
      });

      // primeiro acesso: ainda não há organização atual, e o namespace padrão vem da lista do provedor
      (useOrganizationContext as jest.Mock).mockReturnValue({
        organizationList: [],
        currentOrganization: undefined,
        setCurrentOrganizations: mockSetCurrentOrgs,
        fetchOrganizations: mockFetchOrgs,
        hasFetched: true
      });

      renderProducts();

      await waitFor(() => {
        expect(organizationQuery.importGitlabPersonal).toHaveBeenCalled();
        expect(organizationQuery.getGitLabProjects).toHaveBeenCalledWith('org-joao-pessoal', 7, 'user', 1, '', 'prod-gl-1');
      });
      expect(organizationQuery.getGitLabProjects).not.toHaveBeenCalledWith('org-joao', 7, 'user', 1, '', 'prod-gl-1');
      expect(organizationQuery.createOrganization).not.toHaveBeenCalled();
    });

    it('usa a organização própria devolvida por importGitlabPersonal sem buscar por nome quando já existe outra joao (Cenário 2)', async () => {
      (organizationQuery.getGitLabNamespaces as jest.Mock).mockResolvedValue({
        type: 'success',
        value: [
          { id: 7, name: 'joao', full_path: 'joao', avatar_url: '', description: '', kind: 'user' }
        ]
      });
      (organizationQuery.importGitlabPersonal as jest.Mock).mockResolvedValue({
        type: 'success',
        value: { id: 'org-joao-7', name: 'joao-7', gitlab_user_id: 7 }
      });

      // primeiro acesso: ainda não há organização atual, e o namespace padrão vem da lista do provedor
      (useOrganizationContext as jest.Mock).mockReturnValue({
        organizationList: [],
        currentOrganization: undefined,
        setCurrentOrganizations: mockSetCurrentOrgs,
        fetchOrganizations: mockFetchOrgs,
        hasFetched: true
      });

      renderProducts();

      await waitFor(() => {
        expect(organizationQuery.importGitlabPersonal).toHaveBeenCalled();
        expect(organizationQuery.getGitLabProjects).toHaveBeenCalledWith('org-joao-7', 7, 'user', 1, '', 'prod-gl-1');
      });
      expect(organizationQuery.getAllOrganization).not.toHaveBeenCalled();
      expect(organizationQuery.createOrganization).not.toHaveBeenCalled();
    });

    it('mostra erro de importação e não tenta fallback por nome quando importGitlabPersonal falha', async () => {
      (organizationQuery.getGitLabNamespaces as jest.Mock).mockResolvedValue({
        type: 'success',
        value: [
          { id: 7, name: 'joao', full_path: 'joao', avatar_url: '', description: '', kind: 'user' }
        ]
      });
      (organizationQuery.importGitlabPersonal as jest.Mock).mockResolvedValue({
        type: 'error',
        error: new Error('Falha ao importar espaço pessoal')
      });

      renderProducts();

      await waitFor(() => {
        expect(organizationQuery.importGitlabPersonal).toHaveBeenCalled();
        expect(toast.error).toHaveBeenCalledWith('Erro ao importar grupo no MeasureSoftGram.');
      });
      expect(organizationQuery.createOrganization).not.toHaveBeenCalled();
      expect(organizationQuery.getAllOrganization).not.toHaveBeenCalled();
      expect(organizationQuery.getGitLabProjects).not.toHaveBeenCalled();
    });

    it('seleciona o namespace pessoal pelo gitlab_user_id mesmo havendo grupo de mesmo nome', async () => {
      (organizationQuery.getGitLabNamespaces as jest.Mock).mockResolvedValue({
        type: 'success',
        value: [
          { id: 8, name: 'joao', full_path: 'joao', avatar_url: '', description: 'Grupo', kind: 'group' },
          { id: 7, name: 'joao', full_path: 'joao', avatar_url: '', description: '', kind: 'user' }
        ]
      });
      (useOrganizationContext as jest.Mock).mockReturnValue({
        organizationList: [{ id: 'org-joao-pessoal', name: 'joao-7', key: 'joao-7', gitlab_user_id: 7 }],
        currentOrganization: { id: 'org-joao-pessoal', name: 'joao-7', key: 'joao-7', gitlab_user_id: 7 },
        setCurrentOrganizations: mockSetCurrentOrgs,
        fetchOrganizations: mockFetchOrgs,
        hasFetched: true
      });
      (organizationQuery.importGitlabPersonal as jest.Mock).mockResolvedValue({
        type: 'success',
        value: { id: 'org-joao-pessoal', name: 'joao-7', gitlab_user_id: 7 }
      });

      renderProducts();

      await waitFor(() => {
        expect(organizationQuery.importGitlabPersonal).toHaveBeenCalled();
        expect(organizationQuery.getGitLabProjects).toHaveBeenCalledWith('org-joao-pessoal', 7, 'user', 1, '', 'prod-gl-1');
      });
      expect(organizationQuery.importGitlabGroup).not.toHaveBeenCalled();
    });

    it('usa o id do grupo importado mesmo quando já existe organização com o mesmo nome', async () => {
      (organizationQuery.importGitlabGroup as jest.Mock).mockResolvedValue({
        type: 'success',
        value: { id: 'org-gl-import' }
      });

      renderProducts();

      await waitFor(() => {
        expect(organizationQuery.importGitlabGroup).toHaveBeenCalledWith(101);
        expect(organizationQuery.getGitLabProjects).toHaveBeenCalledWith('org-gl-import', 101, 'group', 1, '', 'prod-gl-1');
      });
    });

    it('seleciona o grupo, e não o usuário, quando os dois têm o mesmo nome', async () => {
      (organizationQuery.getGitLabNamespaces as jest.Mock).mockResolvedValue({
        type: 'success',
        value: [
          { id: 7, name: 'joao', full_path: 'joao', avatar_url: '', description: '', kind: 'user' },
          { id: 8, name: 'joao', full_path: 'joao', avatar_url: '', description: 'Grupo', kind: 'group' }
        ]
      });
      (organizationQuery.getAllOrganization as jest.Mock).mockResolvedValue({
        type: 'success',
        value: [{ id: 'org-joao', name: 'joao', key: 'joao' }]
      });
      (organizationQuery.importGitlabGroup as jest.Mock).mockResolvedValue({
        type: 'success',
        value: { id: 'org-grupo' }
      });

      renderProducts();
      await waitFor(() => {
        expect(screen.getByLabelText('Grupos do GitLab')).toBeInTheDocument();
      });
      await act(async () => {
        fireEvent.mouseDown(screen.getByLabelText('Grupos do GitLab'));
      });
      const options = await screen.findAllByRole('option');
      await act(async () => { fireEvent.click(options[1]); });

      await waitFor(() => {
        expect(organizationQuery.importGitlabGroup).toHaveBeenCalledWith(8);
        expect(organizationQuery.getGitLabProjects).toHaveBeenCalledWith('org-grupo', 8, 'group', 1, '', 'prod-gl-1');
      });
    });

    it('mantém o grupo selecionado quando a organização atual é o grupo de mesmo nome do usuário', async () => {
      const grupamentos = [
        { id: 5, name: 'joao', full_path: 'joao', avatar_url: '', description: '', kind: 'user' },
        { id: 8, name: 'joao', full_path: 'joao', avatar_url: '', description: 'Grupo', kind: 'group' }
      ];
      (organizationQuery.getGitLabNamespaces as jest.Mock).mockResolvedValue({ type: 'success', value: grupamentos });
      (useOrganizationContext as jest.Mock).mockReturnValue({
        organizationList: [{ id: 'org-grupo', name: 'joao', key: 'joao', gitlab_group_id: 8 }],
        currentOrganization: { id: 'org-grupo', name: 'joao', key: 'joao', gitlab_group_id: 8 },
        setCurrentOrganizations: mockSetCurrentOrgs,
        fetchOrganizations: mockFetchOrgs,
        hasFetched: true
      });
      (organizationQuery.importGitlabGroup as jest.Mock).mockResolvedValue({ type: 'success', value: { id: 'org-grupo' } });

      renderProducts();

      await waitFor(() => {
        expect(organizationQuery.importGitlabGroup).toHaveBeenCalledWith(8);
        expect(organizationQuery.getGitLabProjects).toHaveBeenCalledWith('org-grupo', 8, 'group', 1, '', 'prod-gl-1');
      });
      expect(organizationQuery.createOrganization).not.toHaveBeenCalled();
    });

    it('seleciona o espaço pessoal quando a organização atual é pessoal e tem o mesmo nome do grupo', async () => {
      (organizationQuery.getGitLabNamespaces as jest.Mock).mockResolvedValue({
        type: 'success',
        value: [
          { id: 5, name: 'joao', full_path: 'joao', avatar_url: '', description: '', kind: 'user' },
          { id: 8, name: 'joao', full_path: 'joao', avatar_url: '', description: 'Grupo', kind: 'group' }
        ]
      });
      (organizationQuery.importGitlabPersonal as jest.Mock).mockResolvedValue({
        type: 'success',
        value: { id: 'org-joao', name: 'joao', gitlab_user_id: 5 }
      });
      (useOrganizationContext as jest.Mock).mockReturnValue({
        organizationList: [{ id: 'org-joao', name: 'joao', key: 'joao', gitlab_group_id: null }],
        currentOrganization: { id: 'org-joao', name: 'joao', key: 'joao', gitlab_group_id: null },
        setCurrentOrganizations: mockSetCurrentOrgs,
        fetchOrganizations: mockFetchOrgs,
        hasFetched: true
      });

      renderProducts();

      await waitFor(() => {
        expect(organizationQuery.importGitlabPersonal).toHaveBeenCalled();
        expect(organizationQuery.getGitLabProjects).toHaveBeenCalledWith('org-joao', 5, 'user', 1, '', 'prod-gl-1');
      });
      expect(organizationQuery.createOrganization).not.toHaveBeenCalled();
      expect(organizationQuery.importGitlabGroup).not.toHaveBeenCalled();
      expect(organizationQuery.getGitLabProjects).not.toHaveBeenCalledWith('org-grupo', 5, 'user', 1, '', 'prod-gl-1');
    });

    it('não cai no grupo pelo nome quando o grupo da organização atual não está mais na lista', async () => {
      (organizationQuery.getGitLabNamespaces as jest.Mock).mockResolvedValue({
        type: 'success',
        value: [
          { id: 5, name: 'joao', full_path: 'joao', avatar_url: '', description: '', kind: 'user' },
          { id: 8, name: 'time', full_path: 'time', avatar_url: '', description: 'Grupo', kind: 'group' }
        ]
      });
      (useOrganizationContext as jest.Mock).mockReturnValue({
        organizationList: [{ id: 'org-time', name: 'time', key: 'time', gitlab_group_id: 99 }],
        currentOrganization: { id: 'org-time', name: 'time', key: 'time', gitlab_group_id: 99 },
        setCurrentOrganizations: mockSetCurrentOrgs,
        fetchOrganizations: mockFetchOrgs,
        hasFetched: true
      });

      renderProducts();

      // sem o grupo 99, cai no primeiro espaço (o pessoal): espera essa importação antes da asserção negativa
      await waitFor(() => expect(organizationQuery.importGitlabPersonal).toHaveBeenCalled());
      // o grupo 99 saiu da lista: casar pelo nome levaria ao grupo 8, que é outro grupo
      expect(organizationQuery.importGitlabGroup).not.toHaveBeenCalledWith(8);
    });
  });

  it('reaproveita a organização do GitHub pelo nome sem chamar a importação', async () => {
    // zera filas de mockResolvedValueOnce de testes anteriores
    (organizationQuery.getAllOrganization as jest.Mock).mockReset().mockResolvedValue({
      type: 'success',
      value: [{ id: 'org-1', name: 'Org 1', key: 'org-1' }]
    });
    renderProducts();

    expect(await screen.findByText('Repo 1')).toBeInTheDocument();
    expect(organizationQuery.importOrganization).not.toHaveBeenCalled();
  });
});

