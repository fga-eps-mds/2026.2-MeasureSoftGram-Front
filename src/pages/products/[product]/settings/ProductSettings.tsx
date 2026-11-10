import React, { useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { Box, Container, Tab, Tabs, Typography } from '@mui/material';

import { NextPageWithLayout } from '@pages/_app.next';
import getLayout from '@components/Layout';
import useRequireAuth from '@hooks/useRequireAuth';
import { useProductContext } from '@contexts/ProductProvider';
import { DASHBOARD_COLORS } from '@utils/dashboardColors';
import { getPathId } from '@utils/pathDestructer';
import QualityBandsTab from './components/QualityBandsTab';

const TABS = [{ value: 'quality-bands', label: 'Faixas de qualidade' }] as const;

type SettingsTab = (typeof TABS)[number]['value'];

/** Configurações do produto (US30.01). Por enquanto só a aba "Faixas de qualidade". */
const ProductSettings: NextPageWithLayout = () => {
  useRequireAuth();
  const router = useRouter();
  const { currentProduct } = useProductContext();
  const [organizationId, productId] = getPathId(router.query?.product as string);
  const [tab, setTab] = useState<SettingsTab>('quality-bands');

  return (
    <>
      <Head>
        <title>Configurações{currentProduct?.name ? ` · ${currentProduct.name}` : ''}</title>
      </Head>

      <Container sx={{ paddingY: '40px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <Box display="flex" alignItems="baseline" flexWrap="wrap" gap="10px">
          <Typography variant="h4">Configurações</Typography>
          {currentProduct?.name && (
            <Typography variant="h4" fontWeight="500" color="#33568E">
              {currentProduct.name}
            </Typography>
          )}
        </Box>

        <Tabs
          value={tab}
          onChange={(_event, value: SettingsTab) => setTab(value)}
          aria-label="Configurações do produto"
          sx={{
            borderBottom: `1px solid ${DASHBOARD_COLORS.gridLine}`,
            '& .MuiTab-root': { textTransform: 'none', fontWeight: 'bold' },
            '& .Mui-selected': { color: `${DASHBOARD_COLORS.primary} !important` },
            '& .MuiTabs-indicator': { backgroundColor: DASHBOARD_COLORS.primary }
          }}
        >
          {TABS.map((item) => (
            <Tab key={item.value} value={item.value} label={item.label} id={`tab-${item.value}`} />
          ))}
        </Tabs>

        <Box role="tabpanel" aria-labelledby={`tab-${tab}`}>
          {tab === 'quality-bands' && organizationId && productId && (
            <QualityBandsTab organizationId={organizationId} productId={productId} />
          )}
        </Box>
      </Container>
    </>
  );
};

ProductSettings.getLayout = getLayout;

export default ProductSettings;
