import { useCallback } from 'react';

import { useRequest } from '@hooks/useRequest';
import { productQuery } from '@services/product';
import type { ProductQualityBands } from '@customTypes/qualityBands';
import { bandsFromLimits } from '@utils/qualityBandsForm';

export type QualityBandsStatus = 'loading' | 'error' | 'ready';

/**
 * Faixas de qualidade do produto (US30.01): lê a régua e grava ou restaura os padrões. Depois de gravar, o cache do
 * SWR recebe a resposta do Service, sem nova requisição; numa falha, o erro sobe para a tela, que mantém o que foi
 * digitado (CA6).
 */
export function useQualityBands(organizationId: string, productId: string) {
  const { data, error, response, mutate } = useRequest<ProductQualityBands>(
    productQuery.getQualityBandsConfig(organizationId, productId),
    { revalidateOnFocus: false }
  );

  let status: QualityBandsStatus = 'ready';
  if (error) status = 'error';
  else if (!data) status = 'loading';

  const store = useCallback(
    async (qualityBands: ProductQualityBands) => {
      await mutate(response ? { ...response, data: qualityBands } : undefined, { revalidate: !response });
    },
    [mutate, response]
  );

  const save = useCallback(
    async (limits: number[]) => {
      await store(await productQuery.updateQualityBands(organizationId, productId, bandsFromLimits(limits)));
    },
    [organizationId, productId, store]
  );

  const restore = useCallback(async () => {
    await store(await productQuery.restoreQualityBands(organizationId, productId));
  }, [organizationId, productId, store]);

  const retry = useCallback(() => {
    void mutate();
  }, [mutate]);

  return { qualityBands: data, status, save, restore, retry };
}
