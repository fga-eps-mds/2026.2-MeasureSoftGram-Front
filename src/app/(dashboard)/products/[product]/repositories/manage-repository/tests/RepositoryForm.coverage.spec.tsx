import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AxiosError } from 'axios';
import { toast } from 'react-toastify';
import { useOrganizationContext } from '@contexts/OrganizationProvider';
import { useProductContext } from '@contexts/ProductProvider';
import { repository } from '@services/repository';
import RepositoryForm from '../RepositoryForm';

const mockPush = jest.fn();
const mockHandleRepositoryAction = jest.fn();
let mockQuery: Record<string, unknown> = {};

jest.mock('@hooks/useRouter', () => ({
  useRouter: () => ({
    push: mockPush,
    query: mockQuery
  })
}));

jest.mock('@hooks/useQuery', () => ({
  useQuery: () => ({ handleRepositoryAction: mockHandleRepositoryAction })
}));

jest.mock('react-toastify', () => ({
  toast: { success: jest.fn(), error: jest.fn() }
}));

jest.mock('@services/repository', () => ({
  repository: {
    getRepository: jest.fn()
  }
}));

jest.mock('@contexts/ProductProvider', () => ({
  useProductContext: jest.fn()
}));

jest.mock('@contexts/OrganizationProvider', () => ({
  useOrganizationContext: jest.fn()
}));

jest.mock('@contexts/RepositoryProvider', () => ({
  useRepositoryContext: () => ({})
}));

const organization = { id: '1' };
const product = { id: '1', name: 'MeasureSoftGram' };

const setupContexts = (
  orgOverride: Record<string, unknown> = {},
  prodOverride: Record<string, unknown> = {}
) => {
  (useOrganizationContext as jest.Mock).mockReturnValue({
    currentOrganization: organization,
    organizationList: [organization],
    hasFetched: true,
    ...orgOverride
  });
  (useProductContext as jest.Mock).mockReturnValue({
    currentProduct: product,
    productsList: [product],
    hasLoadedProducts: true,
    ...prodOverride
  });
};

describe('RepositoryForm coverage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
    mockQuery = {};
    setupContexts();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('preenche os campos e cria um novo repositório com sucesso', async () => {
    mockHandleRepositoryAction.mockResolvedValue({ type: 'success' });

    const { container } = render(<RepositoryForm />);

    const nameInput = screen.getByTestId('repo-name-input').querySelector('input') as HTMLInputElement;
    const descInput = screen.getByTestId('repo-description-input').querySelector('textarea') as HTMLTextAreaElement;
    const urlInput = screen.getByTestId('repo-url-input').querySelector('input') as HTMLInputElement;
    const platformInput = screen.getByTestId('repo-platform-input').querySelector('input') as HTMLInputElement;

    fireEvent.change(nameInput, { target: { value: 'Novo Repo' } });
    fireEvent.change(descInput, { target: { value: 'Descrição do repo' } });
    fireEvent.change(urlInput, { target: { value: 'https://github.com/org/repo' } });
    fireEvent.change(platformInput, { target: { value: 'github' } });

    fireEvent.mouseDown(screen.getByRole('combobox'));

    fireEvent.submit(container.querySelector('form') as HTMLFormElement);

    await waitFor(() => {
      expect(mockHandleRepositoryAction).toHaveBeenCalledWith('create', '1', '1', undefined, {
        name: 'Novo Repo',
        description: 'Descrição do repo',
        url: 'https://github.com/org/repo',
        platform: 'github',
        imported: false
      });
    });

    expect(toast.success).toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith('/products/1-1/repositories');
  });

  it('exibe erro quando getRepository retorna sem dados na edição', async () => {
    mockQuery = { id: '99' };
    (repository.getRepository as jest.Mock).mockResolvedValue({ data: null });

    render(<RepositoryForm />);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalled();
    });
  });

  it('redireciona para /home ao submeter sem organização ou produto', async () => {
    setupContexts(
      { currentOrganization: null, organizationList: [], hasFetched: false },
      { currentProduct: null, productsList: [], hasLoadedProducts: false }
    );

    const { container } = render(<RepositoryForm />);
    fireEvent.submit(container.querySelector('form') as HTMLFormElement);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/home');
    });
  });

  it.each([
    [
      { non_field_errors: ['Repository with this name already exists.'] },
      'Já existe um repositório com este nome.'
    ],
    [
      { url: ['The URL must start with http or https.'] },
      'A URL deve começar com http ou https.'
    ],
    [
      { url: ["The repository's URL is not accessible."] },
      'A URL do repositório não é acessível.'
    ],
    [
      { url: ["Unable to verify the repository's URL."] },
      'Não foi possível verificar a URL do repositório.'
    ]
  ])('trata erros de validação 400 no resultado (%#)', async (errorData, expectedMsg) => {
    mockHandleRepositoryAction.mockResolvedValue({
      type: 'error',
      error: {
        response: {
          status: 400,
          data: errorData
        }
      }
    });

    const { container } = render(<RepositoryForm />);
    fireEvent.submit(container.querySelector('form') as HTMLFormElement);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(expectedMsg);
    });
  });

  it('trata exceção AxiosError e erro genérico no catch do submit', async () => {
    const axiosErr = new AxiosError('Bad Request', '400', undefined, undefined, {
      status: 400,
      statusText: 'Bad Request',
      headers: {},
      config: {} as any,
      data: { non_field_errors: ['Erro vindo da API'] }
    });
    mockHandleRepositoryAction.mockRejectedValueOnce(axiosErr);

    const { container } = render(<RepositoryForm />);
    fireEvent.submit(container.querySelector('form') as HTMLFormElement);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Erro vindo da API');
    });

    mockHandleRepositoryAction.mockRejectedValueOnce(new Error('Falha inesperada'));
    fireEvent.submit(container.querySelector('form') as HTMLFormElement);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Erro desconhecido ao criar repositório.');
    });
  });
});
