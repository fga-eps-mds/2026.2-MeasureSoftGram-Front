import '@testing-library/jest-dom';
import React from 'react';
import { act, render, fireEvent, waitFor, screen } from '@testing-library/react';

import { useOrganizationContext } from '@contexts/OrganizationProvider';
import { useProductContext } from '@contexts/ProductProvider';
import { repository } from '@services/repository';
import RepositoryForm from '../RepositoryForm';

const mockPush = jest.fn();
const mockHandleRepositoryAction = jest.fn();

jest.mock('@hooks/useRouter', () => ({
  useRouter: () => ({
    push: mockPush,
    query: { id: '1' }
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
    getRepository: jest.fn().mockResolvedValue({
      data: {
        id: 1,
        name: 'Test Repo',
        description: 'Test Description',
        url: 'http://test.com',
        platform: 'github'
      }
    })
  }
}));

jest.mock('@contexts/ProductProvider', () => ({
  useProductContext: jest.fn()
}));

jest.mock('@contexts/OrganizationProvider', () => ({
  useOrganizationContext: jest.fn()
}));


jest.mock('@contexts/RepositoryProvider', () => ({
  useRepositoryContext: () => ({}),
}));

const organization = { id: '1' };
const product = { id: '1', name: 'MeasureSoftGram' };

// contextos carregados, com organização e produto escolhidos; cada teste troca só o que precisa
const mockContexts = (
  organizationContext: Record<string, unknown> = {},
  productContext: Record<string, unknown> = {}
) => {
  (useOrganizationContext as jest.Mock).mockReturnValue({
    currentOrganization: organization,
    organizationList: [organization],
    hasFetched: true,
    ...organizationContext
  });
  (useProductContext as jest.Mock).mockReturnValue({
    currentProduct: product,
    productsList: [product],
    hasLoadedProducts: true,
    ...productContext
  });
};

describe('RepositoryForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockContexts();
  });

  it('Renders correctly and allows input', async () => {
    const { getByLabelText, getByText } = render(
      <RepositoryForm />
    );

    expect(screen.getByTestId('repo-name-input')).toBeInTheDocument();

    await waitFor(() => {
      // expect(a).toHaveValue('Test Repo');
    });

    const t = jest.fn();
    t.mockReturnValue("bar");

    // const nameInput = getByLabelText(/Nome do Repositório/i);
    // fireEvent.change(nameInput, { target: { value: 'New Repo Name' } });
    // expect(nameInput).toHaveValue('New Repo Name');

    // expect(getByText(/Editar Repositório/i)).toBeInTheDocument();
  });

  it('Deve salvar a edição e voltar para a lista de repositórios', async () => {
    mockHandleRepositoryAction.mockResolvedValue({ type: 'success' });
    const { container } = render(<RepositoryForm />);

    fireEvent.submit(container.querySelector('form') as HTMLFormElement);

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/products/1-1/repositories'));
    expect(mockHandleRepositoryAction).toHaveBeenCalledWith('update', '1', '1', '1', expect.any(Object));
  });

  it('Deve voltar para a home sem organização selecionada', async () => {
    mockContexts({ currentOrganization: null, organizationList: [] });

    render(<RepositoryForm />);

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/home'));
  });

  it('Deve voltar para a home quando a organização não tem produtos', async () => {
    mockContexts({}, { currentProduct: null, productsList: [] });

    render(<RepositoryForm />);

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/home'));
  });

  describe('aberto direto pela URL (manage-repository/?id=)', () => {
    it('Não deve ir para a home nem buscar o repositório enquanto a organização carrega', async () => {
      mockContexts({ currentOrganization: null, organizationList: [], hasFetched: false });

      render(<RepositoryForm />);
      await act(async () => {});

      expect(mockPush).not.toHaveBeenCalled();
      expect(repository.getRepository).not.toHaveBeenCalled();
    });

    it('Não deve ir para a home enquanto a lista de produtos carrega', async () => {
      mockContexts({}, { currentProduct: null, productsList: [], hasLoadedProducts: false });

      render(<RepositoryForm />);
      await act(async () => {});

      expect(mockPush).not.toHaveBeenCalled();
    });

    it('Não deve ir para a home enquanto o produto atual ainda não foi escolhido na lista', async () => {
      mockContexts({}, { currentProduct: null, productsList: [product], hasLoadedProducts: true });

      render(<RepositoryForm />);
      await act(async () => {});

      expect(mockPush).not.toHaveBeenCalled();
    });

    it('Deve buscar o repositório da URL assim que os contextos terminam de carregar', async () => {
      mockContexts({ currentOrganization: null, organizationList: [], hasFetched: false });
      const { rerender } = render(<RepositoryForm />);
      expect(repository.getRepository).not.toHaveBeenCalled();

      mockContexts();
      rerender(<RepositoryForm />);

      await waitFor(() => expect(repository.getRepository).toHaveBeenCalledWith('1', '1', '1'));
      expect(mockPush).not.toHaveBeenCalled();
    });
  });
});
