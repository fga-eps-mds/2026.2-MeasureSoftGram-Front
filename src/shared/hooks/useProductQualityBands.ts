import { useCallback, useMemo } from 'react';

import type { ProductQualityBands } from '@customTypes/qualityBands';
import { useRequest } from '@hooks/useRequest';
import { productQuery } from '@services/product';
import { QUALITY_BANDS, QualityBand } from '@utils/qualityBands';

/**
 * Converte a régua do produto vinda do Service nas 5 faixas de cor e rótulo do guia de IDV, ordenadas de E para A.
 * Se a resposta ainda não chegou ou não trouxer as 5 faixas completas, devolve a régua padrão.
 */
export function toQualityBands(productBands?: ProductQualityBands): QualityBand[] {
  if (productBands?.bands?.length !== QUALITY_BANDS.length) {
    return QUALITY_BANDS;
  }

  const byKey = new Map(productBands.bands.map((band) => [band.key, band]));
  if (
    QUALITY_BANDS.some((defaultBand) => {
      const band = byKey.get(defaultBand.grade);
      return !band || typeof band.min !== 'number' || typeof band.max !== 'number';
    })
  ) {
    return QUALITY_BANDS;
  }

  return QUALITY_BANDS.map((defaultBand) => {
    const band = byKey.get(defaultBand.grade)!;
    return {
      ...defaultBand,
      min: band.min,
      max: band.max
    };
  });
}

/**
 * Lê as faixas de qualidade do produto (US30.02) com a mesma chave do SWR da aba de configurações. Enquanto carrega
 * ou se a busca falhar sem dados em cache, devolve as faixas padrão para não bloquear os gráficos.
 */
export function useProductQualityBands(organizationId?: string, productId?: string) {
  const { data, error, isLoading, mutate } = useRequest<ProductQualityBands>(
    productQuery.getQualityBandsConfig(organizationId ?? '', productId ?? ''),
    { revalidateOnFocus: false }
  );

  const bands = useMemo(() => toQualityBands(data), [data]);

  const retry = useCallback(() => {
    void mutate();
  }, [mutate]);

  return {
    bands,
    isError: Boolean(error && !data),
    isLoading,
    retry
  };
}
