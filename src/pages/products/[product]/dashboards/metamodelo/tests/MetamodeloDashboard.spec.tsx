import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

import MetamodeloDashboard from '../MetamodeloDashboard';
import { productQuery } from '@services/product';

const mockPush = jest.fn();

jest.mock('next/router', () => ({
  useRouter: () => ({
    query: { product: '1-5-MeasureSoftGram' },
    push: mockPush,
    pathname: '/products/[product]/dashboards/metamodelo',
  }),
}));

jest.mock('@hooks/useRequireAuth', () => () => ({}));

const mockUseRequest = jest.fn();
jest.mock('@hooks/useRequest', () => ({
  useRequest: (req: any) => mockUseRequest(req),
}));

jest.mock('@services/product', () => ({
  productQuery: {
    getReleaseList: jest.fn(),
    getQualityModelTree: jest.fn(),
  },
}));

jest.mock('@components/MetamodelTreeChart', () => ({
  MetamodelTreeChart: ({ treeData }: any) => (
    <div data-testid="metamodel-tree-chart">
      <span>{treeData?.name}</span>
    </div>
  ),
}));

describe('<MetamodeloDashboard />', () => {
  const mockReleases = [
    { id: 10, release_name: 'Release 1', start_at: '2026-01-01', end_at: '2026-02-01' },
    { id: 20, release_name: 'Release 2', start_at: '2026-02-02', end_at: '2026-12-31' },
  ];

  const mockTreeResponse = [
    {
      id: null,
      type: 'tsqmi',
      key: 'tsqmi',
      name: 'TSQMI',
      description: 'Nota final',
      weight: 100,
      children: [],
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('exibe indicador de carregamento enquanto as releases estão carregando', () => {
    mockUseRequest.mockReturnValue({ data: null, isLoading: true });

    render(<MetamodeloDashboard />);

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('exibe estado vazio quando o produto não possui releases cadastradas (CA7)', () => {
    mockUseRequest.mockReturnValue({ data: [], isLoading: false });

    render(<MetamodeloDashboard />);

    expect(
      screen.getByText('Este produto ainda não tem uma release configurada')
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Planejar release' })).toBeInTheDocument();
  });

  it('redireciona para /create ao clicar em "Planejar release" no estado vazio', () => {
    mockUseRequest.mockReturnValue({ data: [], isLoading: false });

    render(<MetamodeloDashboard />);

    const planButton = screen.getByRole('button', { name: 'Planejar release' });
    fireEvent.click(planButton);

    expect(mockPush).toHaveBeenCalledWith('/products/1-5-MeasureSoftGram/releases/create');
  });

  it('carrega a árvore da release atual por padrão e exibe o gráfico (CA2)', async () => {
    mockUseRequest.mockReturnValue({ data: mockReleases, isLoading: false });
    (productQuery.getQualityModelTree as jest.Mock).mockResolvedValue({
      data: mockTreeResponse,
    });

    render(<MetamodeloDashboard />);

    await waitFor(() => {
      expect(screen.getByTestId('metamodel-tree-chart')).toBeInTheDocument();
      expect(productQuery.getQualityModelTree).toHaveBeenCalledWith('1', '5', 20);
    });

    expect(screen.getByText('TSQMI')).toBeInTheDocument();
  });

  it('permite trocar a release e busca a nova árvore sem recarregar a página (CA5)', async () => {
    mockUseRequest.mockReturnValue({ data: mockReleases, isLoading: false });
    (productQuery.getQualityModelTree as jest.Mock).mockResolvedValue({
      data: mockTreeResponse,
    });

    render(<MetamodeloDashboard />);

    await waitFor(() => {
      expect(screen.getByTestId('metamodel-tree-chart')).toBeInTheDocument();
    });

    const select = screen.getByRole('combobox');
    fireEvent.mouseDown(select);

    const option1 = screen.getByText('Release 1');
    fireEvent.click(option1);

    await waitFor(() => {
      expect(productQuery.getQualityModelTree).toHaveBeenCalledWith('1', '5', 10);
      expect(screen.getByTestId('metamodel-tree-chart')).toBeInTheDocument();
    });
  });

  it('exibe estado de erro com botão "Tentar novamente" quando a API falha (CA7)', async () => {
    mockUseRequest.mockReturnValue({ data: mockReleases, isLoading: false });
    (productQuery.getQualityModelTree as jest.Mock).mockRejectedValue(new Error('Erro de rede'));

    render(<MetamodeloDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Não foi possível carregar o metamodelo')).toBeInTheDocument();
    });

    const retryButton = screen.getByRole('button', { name: 'Tentar novamente' });
    expect(retryButton).toBeInTheDocument();

    (productQuery.getQualityModelTree as jest.Mock).mockResolvedValueOnce({
      data: mockTreeResponse,
    });
    fireEvent.click(retryButton);

    await waitFor(() => {
      expect(screen.getByTestId('metamodel-tree-chart')).toBeInTheDocument();
    });
  });
});
