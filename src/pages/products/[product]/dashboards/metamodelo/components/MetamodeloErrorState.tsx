import React from 'react';
import { Box, Button, Chip, Typography, Paper } from '@mui/material';
import PriorityHighIcon from '@mui/icons-material/PriorityHigh';

interface Props {
  onRetry: () => void;
}

export const MetamodeloErrorState: React.FC<Props> = ({ onRetry }) => (
  <Paper
    elevation={0}
    sx={{
      width: '100%',
      border: '1px solid #E2E8F0',
      borderRadius: '12px',
      padding: '24px',
      backgroundColor: '#FFFFFF',
    }}
  >
    {/* Header com título e chip de Erro */}
    <Box
      display="flex"
      justifyContent="space-between"
      alignItems="center"
      marginBottom="32px"
    >
      <Typography variant="h6" fontWeight="bold" color="#1E293B">
        Modelo de qualidade da release
      </Typography>

      <Chip
        label="Erro"
        size="small"
        sx={{
          backgroundColor: '#FEE2E2',
          color: '#DC2626',
          fontWeight: 600,
          fontSize: '12px',
          borderRadius: '16px',
        }}
      />
    </Box>

    {/* Conteúdo central de erro amigável (CA7) */}
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      textAlign="center"
      minHeight="380px"
      padding="40px 20px"
    >
      <Box
        sx={{
          width: 56,
          height: 56,
          borderRadius: '50%',
          backgroundColor: '#FEE2E2',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '20px',
        }}
      >
        <PriorityHighIcon sx={{ fontSize: 32, color: '#DC2626' }} />
      </Box>

      <Typography variant="h6" fontWeight="bold" color="#1E293B" marginBottom="8px">
        Não foi possível carregar o metamodelo
      </Typography>

      <Typography
        variant="body2"
        color="text.secondary"
        maxWidth="520px"
        lineHeight={1.5}
        marginBottom="24px"
      >
        Tente de novo em alguns instantes. Se o problema continuar, avise o administrador do
        produto.
      </Typography>

      <Button
        variant="outlined"
        onClick={onRetry}
        sx={{
          borderColor: '#2B4D6F',
          color: '#2B4D6F',
          textTransform: 'none',
          fontWeight: 600,
          padding: '8px 24px',
          borderRadius: '6px',
          '&:hover': {
            borderColor: '#1E3752',
            backgroundColor: '#F8FAFC',
          },
        }}
      >
        Tentar novamente
      </Button>
    </Box>
  </Paper>
);

export default MetamodeloErrorState;
