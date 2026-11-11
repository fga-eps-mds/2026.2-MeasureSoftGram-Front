import '@testing-library/jest-dom';
import React from 'react';
import { render, fireEvent, waitFor, screen } from '@testing-library/react';

import { useOrganizationContext } from '@contexts/OrganizationProvider';
import { useProductContext } from '@contexts/ProductProvider';
import { repository } from '@services/repository';
import RepositoryForm from '../RepositoryForm';

const mockPush = jest.fn();
const mockHandleRepositoryAction = jest.fn();

jest.mock('next/router', () => ({
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
  useProductContext: jest.fn(() => ({
    currentProduct: {
      id: '1',
      name: 'MeasureSoftGram'
    }
  }))
}));

jest.mock('@contexts/OrganizationProvider', () => ({
  useOrganizationContext: jest.fn(() => ({
    currentOrganization: {
      id: '1'
    }
  }))
}));


jest.mock('@contexts/RepositoryProvider', () => ({
  useRepositoryContext: () => ({}),
}));

describe('RepositoryForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useOrganizationContext as jest.Mock).mockReturnValue({ currentOrganization: { id: '1' } });
    (useProductContext as jest.Mock).mockReturnValue({ currentProduct: { id: '1', name: 'MeasureSoftGram' } });
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
    (useOrganizationContext as jest.Mock).mockReturnValue({
      currentOrganization: null,
      organizationList: [],
      hasFetched: true,
      isLoading: false
    });

    render(<RepositoryForm />);

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/home'));
  });

  it('Deve voltar para a home quando a organização não tem produto', async () => {
    (useProductContext as jest.Mock).mockReturnValue({ currentProduct: null, productsList: [], hasFetchedProducts: true });

    render(<RepositoryForm />);

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/home'));
  });

  it('Na carga direta, espera a organização e o produto chegarem e então busca o repositório', async () => {
    (useOrganizationContext as jest.Mock).mockReturnValue({
      currentOrganization: null,
      organizationList: [],
      hasFetched: false,
      isLoading: true
    });
    (useProductContext as jest.Mock).mockReturnValue({ currentProduct: null, productsList: [], hasFetchedProducts: false });
    const { rerender } = render(<RepositoryForm />);

    // a lista de organizações chegou, mas a atual só é escolhida no render seguinte
    (useOrganizationContext as jest.Mock).mockReturnValue({
      currentOrganization: null,
      organizationList: [{ id: '1' }],
      hasFetched: true,
      isLoading: false
    });
    rerender(<RepositoryForm />);
    (useOrganizationContext as jest.Mock).mockReturnValue({
      currentOrganization: { id: '1' },
      organizationList: [{ id: '1' }],
      hasFetched: true,
      isLoading: false
    });
    rerender(<RepositoryForm />);
    // a lista de produtos chegou, o atual ainda não foi escolhido
    (useProductContext as jest.Mock).mockReturnValue({
      currentProduct: null,
      productsList: [{ id: '1', name: 'MeasureSoftGram' }],
      hasFetchedProducts: true
    });
    rerender(<RepositoryForm />);
    expect(screen.getByText('edit.title')).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
    expect(repository.getRepository).not.toHaveBeenCalled();

    (useProductContext as jest.Mock).mockReturnValue({
      currentProduct: { id: '1', name: 'MeasureSoftGram' },
      productsList: [{ id: '1', name: 'MeasureSoftGram' }],
      hasFetchedProducts: true
    });
    rerender(<RepositoryForm />);

    await waitFor(() => expect(screen.getByTestId('repo-name-input').querySelector('input')).toHaveValue('Test Repo'));
    expect(repository.getRepository).toHaveBeenCalledWith('1', '1', '1');
    expect(mockPush).not.toHaveBeenCalled();
  });
});
