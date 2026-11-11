import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { SWRConfig, useSWRConfig } from 'swr';

import type { ProductQualityBands } from '@customTypes/qualityBands';
import api from '@services/api';
import { productQuery } from '@services/product';
import { QUALITY_BANDS } from '@utils/qualityBands';
import { toQualityBands, useProductQualityBands } from '../useProductQualityBands';

jest.mock('@services/api', () => ({
  __esModule: true,
  default: {
    request: jest.fn()
  }
}));

const mockedApiRequest = api.request as jest.Mock;

const CUSTOM_PRODUCT_BANDS: ProductQualityBands = {
  is_default: false,
  can_edit: true,
  bands: [
    { key: 'E', min: 0, max: 0.25 },
    { key: 'D', min: 0.25, max: 0.45 },
    { key: 'C', min: 0.45, max: 0.65 },
    { key: 'B', min: 0.65, max: 0.85 },
    { key: 'A', min: 0.85, max: 1 }
  ]
};

function createWrapper() {
  const cache = new Map();
  return ({ children }: { children: React.ReactNode }) => (
    <SWRConfig value={{ provider: () => cache, dedupingInterval: 0 }}>{children}</SWRConfig>
  );
}

describe('toQualityBands', () => {
  it('mapeia as faixas do produto mantendo cores e rótulos padrão na ordem E→A', () => {
    const unordered: ProductQualityBands = {
      ...CUSTOM_PRODUCT_BANDS,
      bands: [...CUSTOM_PRODUCT_BANDS.bands].reverse()
    };

    expect(toQualityBands(unordered)).toEqual([
      { grade: 'E', min: 0, max: 0.25, color: '#BE2E0E', label: 'Muito ruim' },
      { grade: 'D', min: 0.25, max: 0.45, color: '#F16141', label: 'Ruim' },
      { grade: 'C', min: 0.45, max: 0.65, color: '#EBA133', label: 'Bom' },
      { grade: 'B', min: 0.65, max: 0.85, color: '#0DC889', label: 'Muito bom' },
      { grade: 'A', min: 0.85, max: 1, color: '#04724D', label: 'Ótimo' }
    ]);
  });

  it('devolve as faixas padrão quando a resposta é ausente ou inválida', () => {
    expect(toQualityBands(undefined)).toEqual(QUALITY_BANDS);
    expect(
      toQualityBands({
        is_default: false,
        can_edit: false,
        bands: [{ key: 'A', min: 0.8, max: 1 }]
      })
    ).toEqual(QUALITY_BANDS);
  });
});

describe('useProductQualityBands', () => {
  beforeEach(() => {
    mockedApiRequest.mockReset();
  });

  it('mapeia as faixas configuradas no produto com cor e rótulo do guia de IDV', async () => {
    mockedApiRequest.mockResolvedValue({ data: CUSTOM_PRODUCT_BANDS, status: 200 });

    const { result } = renderHook(() => useProductQualityBands('1', '5'), {
      wrapper: createWrapper()
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockedApiRequest).toHaveBeenCalledWith({
      url: '/v1/organizations/1/products/5/quality-bands/',
      method: 'get'
    });
    expect(result.current.isError).toBe(false);
    expect(result.current.bands).toEqual(toQualityBands(CUSTOM_PRODUCT_BANDS));
  });

  it('devolve as faixas padrão e sinaliza isError quando a requisição falha sem dados', async () => {
    mockedApiRequest.mockRejectedValue(new Error('500'));

    const { result } = renderHook(() => useProductQualityBands('1', '5'), {
      wrapper: createWrapper()
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.bands).toEqual(QUALITY_BANDS);
    expect(result.current.isLoading).toBe(false);
  });

  it('atualiza as faixas quando um mutate do SWR invalida a mesma chave da aba de configurações', async () => {
    const initialBands: ProductQualityBands = {
      is_default: true,
      can_edit: true,
      bands: QUALITY_BANDS.map(({ grade, min, max }) => ({ key: grade, min, max }))
    };
    mockedApiRequest.mockResolvedValue({ data: initialBands, status: 200 });

    const { result } = renderHook(
      () => ({
        qualityBands: useProductQualityBands('1', '5'),
        swr: useSWRConfig()
      }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.qualityBands.isLoading).toBe(false));
    expect(result.current.qualityBands.bands).toEqual(QUALITY_BANDS);

    const key = JSON.stringify(productQuery.getQualityBandsConfig('1', '5'));
    await act(async () => {
      await result.current.swr.mutate(
        key,
        { data: CUSTOM_PRODUCT_BANDS, status: 200 },
        { revalidate: false }
      );
    });

    expect(result.current.qualityBands.bands).toEqual(toQualityBands(CUSTOM_PRODUCT_BANDS));
  });
});
