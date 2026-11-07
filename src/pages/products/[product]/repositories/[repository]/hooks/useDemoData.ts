import { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';

import { DemoData } from '@customTypes/demoData';
import { repository } from '@services/repository';

export const DEMO_ERRORS = {
  disabled: 'Os dados de demonstração estão desativados neste ambiente.',
  hasRealData: 'Este repositório já tem dados coletados, então a demonstração não está disponível.',
  generic: 'Não foi possível gerar os dados de demonstração. Tente de novo.'
} as const;

function errorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (error.response?.status === 404) return DEMO_ERRORS.disabled;
    if (error.response?.status === 409) return DEMO_ERRORS.hasRealData;
  }
  return DEMO_ERRORS.generic;
}

/**
 * Modo demonstração da tela do repositório. Só liga quando a pessoa pede (activate), pelo estado vazio de um
 * repositório sem coleta real, e desliga ao sair (deactivate) ou ao trocar de repositório. A escolha não é guardada:
 * cada visita começa com os dados reais. Uma resposta sem `is_demo` é descartada, para nunca mostrar dados
 * fictícios sem o aviso.
 */
export function useDemoData(organizationId: string, productId: string, repositoryId?: string) {
  const [data, setData] = useState<DemoData>();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>();
  // descarta a resposta de um pedido feito para outro repositório
  const requestKey = useRef('');

  useEffect(() => {
    requestKey.current = `${organizationId}-${productId}-${repositoryId}`;
    setData(undefined);
    setError(undefined);
    setIsLoading(false);
  }, [organizationId, productId, repositoryId]);

  const activate = useCallback(async () => {
    if (!repositoryId) return;
    const key = `${organizationId}-${productId}-${repositoryId}`;
    setIsLoading(true);
    setError(undefined);

    const result = await repository.getDemoData(organizationId, productId, repositoryId);
    if (requestKey.current !== key) return;

    if (result.type === 'success' && result.value?.is_demo === true) {
      setData(result.value);
    } else {
      setError(result.type === 'error' ? errorMessage(result.error) : DEMO_ERRORS.generic);
    }
    setIsLoading(false);
  }, [organizationId, productId, repositoryId]);

  const deactivate = useCallback(() => {
    setData(undefined);
    setError(undefined);
  }, []);

  return { data, isActive: data !== undefined, isLoading, error, activate, deactivate };
}
