import React from 'react';
import { Box, Button, Paper, Typography } from '@mui/material';
import type { ProviderTerms } from '@utils/providerTerminology';
import { useTranslation } from 'react-i18next';

interface ReauthorizePanelProps {
  terms: ProviderTerms;
  isGitlab: boolean;
  onReauthorize: () => void;
  // dentro do cartão da lista (sem moldura própria) ou como cartão avulso
  embedded?: boolean;
}

const ReauthorizePanel = ({ terms, isGitlab, onReauthorize, embedded = false }: ReauthorizePanelProps) => {
  const { t } = useTranslation('product');
  const content = (
    <>
      <Typography variant="h6" color="error" gutterBottom>
        {t('import.token-expired-title', { provider: terms.providerName })}
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        {t('import.reauthorize-description', { repositories: terms.repositories })}
      </Typography>
      <Button
        variant="contained"
        onClick={onReauthorize}
        sx={isGitlab ? { backgroundColor: '#fc6d26', '&:hover': { backgroundColor: '#e24329' } } : undefined}
        color={isGitlab ? undefined : 'primary'}
      >
        {t('import.authorize', { provider: terms.providerName })}
      </Button>
    </>
  );

  if (embedded) {
    return <Box padding="4rem" textAlign="center">{content}</Box>;
  }
  return (
    <Paper variant="outlined" sx={{ padding: '4rem', textAlign: 'center', borderRadius: '12px' }}>
      {content}
    </Paper>
  );
};

export default ReauthorizePanel;
