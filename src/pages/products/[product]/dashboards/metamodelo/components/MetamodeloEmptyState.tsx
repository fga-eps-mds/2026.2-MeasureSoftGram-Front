import React from 'react';
import { useRouter } from 'next/router';
import { Box, Button, Chip, Typography, Paper } from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { ReleaseSelect } from '@components/ReleaseSelect';

interface Props {
  productPath?: string;
}

export const MetamodeloEmptyState: React.FC<Props> = ({ productPath }) => {
  const router = useRouter();

  const handleGoToPlanRelease = () => {
    const targetProduct = productPath || (router.query.product as string);
    if (targetProduct) {
      void router.push(`/products/${targetProduct}/releases/create`);
    }
  };

  return (
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
      {/* Header com título, chip "Sem release" e seletor desabilitado */}
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        flexWrap="wrap"
        gap={2}
        marginBottom="32px"
      >
        <Typography variant="h6" fontWeight="bold" color="#1E293B">
          Modelo de qualidade da release
        </Typography>

        <Box display="flex" alignItems="center" gap={2}>
          <Chip
            label="Sem release"
            size="small"
            sx={{
              backgroundColor: '#F1F5F9',
              color: '#64748B',
              fontWeight: 500,
              fontSize: '12px',
              borderRadius: '16px',
            }}
          />
          <ReleaseSelect
            releases={[]}
            selectedReleaseId={null}
            onReleaseChange={() => {}}
            disabled
          />
        </Box>
      </Box>

      {/* Conteúdo central de orientação */}
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
            backgroundColor: '#E0F2FE',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '20px',
          }}
        >
          <InfoOutlinedIcon sx={{ fontSize: 32, color: '#0284C7' }} />
        </Box>

        <Typography variant="h6" fontWeight="bold" color="#1E293B" marginBottom="8px">
          Este produto ainda não tem uma release configurada
        </Typography>

        <Typography
          variant="body2"
          color="text.secondary"
          maxWidth="560px"
          lineHeight={1.5}
          marginBottom="24px"
        >
          O metamodelo mostra as características, subcaracterísticas, medidas e métricas
          configuradas para uma release, com os pesos e os valores de referência. Planeje a
          primeira release para vê-lo aqui.
        </Typography>

        <Button
          variant="contained"
          onClick={handleGoToPlanRelease}
          sx={{
            backgroundColor: '#2B4D6F',
            color: '#FFFFFF',
            textTransform: 'none',
            fontWeight: 600,
            padding: '8px 24px',
            borderRadius: '6px',
            '&:hover': {
              backgroundColor: '#1E3752',
            },
          }}
        >
          Planejar release
        </Button>
      </Box>
    </Paper>
  );
};

export default MetamodeloEmptyState;
