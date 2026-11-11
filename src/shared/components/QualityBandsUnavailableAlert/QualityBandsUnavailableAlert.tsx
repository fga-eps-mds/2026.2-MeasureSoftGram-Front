import React from 'react';
import MSGAlert from '../../../components/idv/feedback';

export interface QualityBandsUnavailableAlertProps {
  onRetry?: () => void;
}

/** Aviso discreto quando as faixas de qualidade do produto não puderam ser carregadas; os gráficos usam o padrão. */
export function QualityBandsUnavailableAlert({ onRetry }: QualityBandsUnavailableAlertProps) {
  return (
    <MSGAlert
      severity="warning"
      title="Não foi possível carregar as faixas do produto"
      actionLabel={onRetry ? 'Tentar novamente' : undefined}
      onAction={onRetry}
    >
      Os gráficos estão sendo exibidos com as faixas padrão.
    </MSGAlert>
  );
}

export default QualityBandsUnavailableAlert;
