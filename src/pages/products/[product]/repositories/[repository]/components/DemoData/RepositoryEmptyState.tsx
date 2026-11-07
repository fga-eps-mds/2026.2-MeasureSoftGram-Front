import React from 'react';
import { Box, Button, Typography } from '@mui/material';
import MSGAlert from '../../../../../../../components/idv/feedback';

export const EMPTY_STATE_TITLE = 'Ainda não há dados disponíveis para este repositório';

interface Props {
  /** "repositório" ou "projeto", conforme o provedor. */
  repositoryTerm: string;
  onShowDemo: () => void;
  isLoadingDemo: boolean;
  demoError?: string;
}

/**
 * Estado vazio do repositório sem coleta real (#150, BUG05.06). Os dados de demonstração são opcionais: só aparecem
 * se a pessoa pedir, e a tela deixa claro que não são do repositório.
 */
export default function RepositoryEmptyState({
  repositoryTerm,
  onShowDemo,
  isLoadingDemo,
  demoError
}: Readonly<Props>) {
  return (
    <Box component="section" data-testid="repository-empty-state" display="flex" flexDirection="column" gap="12px">
      <MSGAlert severity="warning" title={EMPTY_STATE_TITLE}>
        {`Os indicadores aparecem depois que a Action do MeasureSoftGram analisa o ${repositoryTerm}.`}
      </MSGAlert>

      <Box display="flex" alignItems="center" flexWrap="wrap" gap="12px">
        <Button variant="outlined" onClick={onShowDemo} disabled={isLoadingDemo}>
          {isLoadingDemo ? 'Gerando dados de demonstração…' : 'Ver dados de demonstração'}
        </Button>
        <Typography variant="body2" color="text.secondary">
          {`São dados fictícios, só para conhecer a tela: não vêm do ${repositoryTerm} e não são gravados.`}
        </Typography>
      </Box>

      {demoError && <MSGAlert severity="error">{demoError}</MSGAlert>}
    </Box>
  );
}
