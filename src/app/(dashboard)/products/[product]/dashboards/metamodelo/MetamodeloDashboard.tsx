'use client';

import React, { useMemo } from 'react';
import { useRouter } from '@hooks/useRouter';
import { Box, Button, Container, Typography } from '@mui/material';

import DashboardCard, { SkeletonBlock } from '@components/DashboardCard';
import ExportCsvButton from '@components/ExportCsvButton';
import ReleaseSelect from '@components/ReleaseSelect';
import { MetamodelTreeChart } from '@components/MetamodelTreeChart';
import { usePreloadECharts } from '@components/ECharts';
import { DASHBOARD_COLORS } from '@utils/dashboardColors';
import { METAMODEL_CSV, formatMetamodelCsv } from '@utils/formatMetamodelCsv';
import { getPathId } from '@utils/pathDestructer';
import { useTranslation } from 'react-i18next';
import { useMetamodelo } from './useMetamodelo';

const MetamodeloDashboard: React.FC = () => {
  usePreloadECharts();
  const { t } = useTranslation('dashboards');
  const router = useRouter();
  const [organizationId, productId] = getPathId(router.query?.product as string);

  const { releases, release, currentRelease, setReleaseId, isLoadingReleases, hasReleases, tree, status, retry } =
    useMetamodelo(organizationId, productId);

  // o CSV leva toda a árvore da release escolhida, mesmo com ramos fechados; sem árvore pronta, fica vazio
  const csv = useMemo(
    () => formatMetamodelCsv(release?.release_name ?? '', status === 'ready' ? tree : null),
    [release?.release_name, status, tree]
  );
  const exportButton = <ExportCsvButton dashboard={METAMODEL_CSV.dashboard} chart={csv} />;

  const goToPlanRelease = () => {
    void router.push(`/products/${router.query.product}/releases/create`);
  };

  // Produto sem release orienta a planejar uma; release sem configuração orienta a revisar o planejamento.
  const emptyProps = hasReleases
    ? {
        emptyTitle: t('metamodel.no-model.title'),
        emptyDescription: t('metamodel.no-model.description')
      }
    : {
        emptyTitle: t('metamodel.no-release.title'),
        emptyDescription: t('metamodel.no-release.description'),
        emptyAction: (
          <Button
            variant="contained"
            disableElevation
            onClick={goToPlanRelease}
            sx={{ backgroundColor: DASHBOARD_COLORS.primary, fontWeight: 'bold', textTransform: 'none' }}
          >
            {t('metamodel.plan-release')}
          </Button>
        ),
      };

  return (
    <>
      <title>{t('metamodel.title')}</title>

      <Container maxWidth="xl">
        <Box display="flex" flexDirection="column" gap="28px" marginTop="40px" marginBottom="40px">
          <Box display="flex" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap="16px">
            <Box>
              <Typography component="h1" fontWeight="bold" fontSize="30px" color={DASHBOARD_COLORS.primary}>
                {t('metamodel.title')}
              </Typography>
              <Typography fontSize="13px" color={DASHBOARD_COLORS.mutedText}>
                {t('metamodel.subtitle')}
              </Typography>
            </Box>

            <ReleaseSelect
              releases={releases}
              value={release?.id}
              currentReleaseId={currentRelease?.id}
              onChange={setReleaseId}
              disabled={isLoadingReleases}
            />
          </Box>

          <DashboardCard
            title={t('metamodel.card-title')}
            status={status}
            headerAction={exportButton}
            emptyHeaderAction={exportButton}
            loadingContent={<SkeletonBlock width="100%" height={420} />}
            loadingMessage={t('metamodel.loading')}
            onRetry={retry}
            {...emptyProps}
          >
            <MetamodelTreeChart treeData={tree} />
          </DashboardCard>
        </Box>
      </Container>
    </>
  );
};


export default MetamodeloDashboard;
