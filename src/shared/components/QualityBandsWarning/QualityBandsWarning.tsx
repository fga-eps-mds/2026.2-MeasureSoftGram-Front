import React from 'react';

import MSGAlert from '../../../components/idv/feedback';

export const QUALITY_BANDS_WARNING_TITLE = 'Não foi possível carregar as faixas do produto';
export const QUALITY_BANDS_WARNING_DESCRIPTION = 'Os gráficos estão usando as faixas padrão.';

export interface QualityBandsWarningProps {
  /** Mostra "Tentar novamente" ao lado do aviso; sem isso, o aviso só informa. */
  onRetry?: () => void;
}

/**
 * Aviso discreto de que a régua do produto não pôde ser lida e os gráficos estão nos padrões (CA4 da US30.02).
 *
 * É um aviso do guia de IDV, não um erro: os dados continuam na tela e podem ser lidos. Por ser `role="status"`, o
 * leitor de tela anuncia sem interromper o que o usuário está fazendo.
 */
export const QualityBandsWarning: React.FC<QualityBandsWarningProps> = ({ onRetry }) => (
  <MSGAlert
    severity="warning"
    title={QUALITY_BANDS_WARNING_TITLE}
    actionLabel={onRetry ? 'Tentar novamente' : undefined}
    onAction={onRetry}
  >
    {QUALITY_BANDS_WARNING_DESCRIPTION}
  </MSGAlert>
);

export default QualityBandsWarning;
