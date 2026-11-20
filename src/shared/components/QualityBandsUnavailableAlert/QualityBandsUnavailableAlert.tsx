import React from 'react';
import { useTranslation } from 'react-i18next';
import MSGAlert from '../../../components/idv/feedback';

export interface QualityBandsUnavailableAlertProps {
  onRetry?: () => void;
}

/** Aviso discreto quando as faixas de qualidade do produto não puderam ser carregadas; os gráficos usam o padrão. */
export default function QualityBandsUnavailableAlert({ onRetry }: Readonly<QualityBandsUnavailableAlertProps>) {
  const { t } = useTranslation('dashboards');
  return (
    <MSGAlert
      severity="warning"
      title={t('bands-unavailable.title')}
      actionLabel={onRetry ? t('card.retry') : undefined}
      onAction={onRetry}
    >
      {t('bands-unavailable.description')}
    </MSGAlert>
  );
}
