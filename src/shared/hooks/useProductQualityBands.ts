import { useCallback, useMemo } from 'react';

import { useRequest } from '@hooks/useRequest';
import { productQuery } from '@services/product';
import type { ProductQualityBands } from '@customTypes/qualityBands';
import { buildQualityBands, QualityBand, QUALITY_BANDS } from '@utils/qualityBands';

export interface ProductQualityBandsState {
  /** A régua que os gráficos devem usar: a do produto, ou os padrões enquanto ela não chega ou se falhar (CA4). */
  bands: QualityBand[];
  /** O produto nunca alterou a régua, ou ela não pôde ser lida e os gráficos estão nos padrões. */
  isDefault: boolean;
  isLoading: boolean;
  /** A régua do produto não pôde ser lida e não há nenhuma em mãos: a tela mostra o aviso discreto do CA4. */
  hasError: boolean;
  retry: () => void;
}

/**
 * Régua de qualidade do produto para os gráficos e as legendas (US30.02). Lê as faixas configuradas na US30.01 e
 * junta a cor e o nome de cada letra, que são do Front.
 *
 * A régua vem sempre preenchida: sem resposta, ou com falha na busca, ficam os padrões, para nenhum gráfico ficar sem
 * cor nem deixar de ser lido (CA4). `hasError` só acende sem faixas em mãos — o SWR revalida ao voltar para a aba e
 * guarda a resposta anterior, e acender o aviso numa falha de segundo plano diria que a régua na tela está errada
 * quando ela é a do produto (mesma armadilha do Front#129).
 *
 * A chave do SWR é a mesma do hook das configurações do produto, então uma régua alterada por lá já chega aos
 * dashboards abertos depois, sem recalcular nenhum indicador (CA2).
 */
export function useProductQualityBands(organizationId: string, productId: string): ProductQualityBandsState {
  const { data, error, isLoading, mutate } = useRequest<ProductQualityBands>(
    productQuery.getQualityBandsConfig(organizationId, productId)
  );

  const bands = useMemo(() => (data ? buildQualityBands(data.bands) : QUALITY_BANDS), [data]);

  const retry = useCallback(() => {
    void mutate();
  }, [mutate]);

  return {
    bands,
    isDefault: data ? data.is_default : true,
    isLoading,
    hasError: !!error && !data,
    retry
  };
}

export default useProductQualityBands;
