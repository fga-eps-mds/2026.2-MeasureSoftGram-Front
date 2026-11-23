import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { SWRConfig } from 'swr';
import api from '@services/api';
import { productQuery } from '@services/product';
import { useOrganizationContext } from '@contexts/OrganizationProvider';
import { useProductContext } from '@contexts/ProductProvider';
import { useRepositoryContext } from '@contexts/RepositoryProvider';
import { useRequestValues } from '@hooks/useRequestValues';

jest.mock('@contexts/OrganizationProvider', () => ({
  useOrganizationContext: jest.fn()
}));

jest.mock('@contexts/ProductProvider', () => ({
  useProductContext: jest.fn()
}));

jest.mock('@contexts/RepositoryProvider', () => ({
  useRepositoryContext: jest.fn()
}));

jest.mock('@services/product', () => ({
  productQuery: {
    getCurrentReleaseGoal: jest.fn()
  }
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <SWRConfig value={{ provider: () => new Map() }}>{children}</SWRConfig>
);

describe('useRequestValues coverage', () => {
  let getSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    getSpy = jest.spyOn(api, 'get');
    (useOrganizationContext as jest.Mock).mockReturnValue({
      currentOrganization: { id: 'org-1', name: 'Org 1' }
    });
    (useProductContext as jest.Mock).mockReturnValue({
      currentProduct: { id: 'prod-1', name: 'Prod 1' }
    });
    (useRepositoryContext as jest.Mock).mockReturnValue({
      currentRepository: { id: 'repo-1', name: 'Repo 1' },
      historicalTSQMI: { id: 99, key: 'TSQMI', name: 'TSQMI', history: [] }
    });
  });

  afterEach(() => {
    getSpy.mockRestore();
  });

  it('não faz requisição quando falta contexto de organização, produto ou repositório', () => {
    (useOrganizationContext as jest.Mock).mockReturnValue({ currentOrganization: null });

    const { result } = renderHook(
      () => useRequestValues({ type: 'latest-values', value: 'characteristics' }),
      { wrapper }
    );

    expect(getSpy).not.toHaveBeenCalled();
    expect(result.current.data).toEqual([]);
  });

  it('adiciona metas da release atual (addCurrentGoal) e histórico TSQMI (addHistoricalTSQMI)', async () => {
    getSpy.mockResolvedValue({
      data: {
        results: [{ id: 1, key: 'reliability', name: 'Reliability', history: [] }]
      }
    } as any);

    (productQuery.getCurrentReleaseGoal as jest.Mock).mockResolvedValue({
      data: { data: { reliability: 0.85 } }
    });

    const { result } = renderHook(
      () =>
        useRequestValues({
          type: 'historical-values',
          value: 'characteristics',
          addCurrentGoal: true,
          addHistoricalTSQMI: true
        }),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.data).toHaveLength(2);
    });

    expect(productQuery.getCurrentReleaseGoal).toHaveBeenCalledWith('org-1', 'prod-1');
    expect(result.current.data[0].goal).toBe(0.85);
    expect(result.current.data[1].key).toBe('TSQMI');
  });

  it('define goal como undefined quando getCurrentReleaseGoal falha', async () => {
    getSpy.mockResolvedValue({
      data: {
        results: [{ id: 1, key: 'security', name: 'Security', history: [] }]
      }
    } as any);

    (productQuery.getCurrentReleaseGoal as jest.Mock).mockRejectedValue(new Error('Sem release'));

    const { result } = renderHook(
      () =>
        useRequestValues({
          type: 'latest-values',
          value: 'characteristics',
          addCurrentGoal: true
        }),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.data).toHaveLength(1);
    });

    expect(result.current.data[0].goal).toBeUndefined();
  });

  it('filtra métricas pela fonte de coleta github e sonarqube', async () => {
    const metricsPayload = {
      data: {
        results: [
          { id: 1, key: 'total_builds', name: 'Total Builds' },
          { id: 2, key: 'complexity', name: 'Complexity' }
        ]
      }
    };
    getSpy.mockResolvedValue(metricsPayload as any);

    const { result: githubResult } = renderHook(
      () =>
        useRequestValues({
          type: 'latest-values',
          value: 'metrics',
          collectionSource: 'github'
        }),
      { wrapper }
    );

    await waitFor(() => {
      expect(githubResult.current.data).toHaveLength(1);
    });
    expect(githubResult.current.data[0].key).toBe('total_builds');

    const { result: sonarResult } = renderHook(
      () =>
        useRequestValues({
          type: 'historical-values',
          value: 'metrics',
          collectionSource: 'sonarqube'
        }),
      { wrapper }
    );

    await waitFor(() => {
      expect(sonarResult.current.data).toHaveLength(1);
    });
    expect(sonarResult.current.data[0].key).toBe('complexity');
  });
});
