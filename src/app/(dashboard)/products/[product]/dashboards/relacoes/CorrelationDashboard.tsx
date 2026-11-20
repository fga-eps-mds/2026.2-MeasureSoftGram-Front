'use client';

import React, { ReactNode, useState } from 'react';
import { useRouter } from '@hooks/useRouter';
import { Box, Button, Container, Typography } from '@mui/material';

import DashboardCard, { SkeletonBlock } from '@components/DashboardCard';
import { ExportAllCsvButton } from '@components/ExportCsvButton';
import { usePreloadECharts } from '@components/ECharts';
import { useProviderTerms } from '@hooks/useProviderTerms';
import { DASHBOARD_COLORS } from '@utils/dashboardColors';
import {
  CORRELATION_CSV,
  CORRELATION_LEVEL_PLURALS,
  formatCorrelationCsv,
  formatCorrelationInfo,
  formatCorrelationReleasesCsv
} from '@utils/formatCorrelationCharts';
import { getPathId } from '@utils/pathDestructer';

import { CollectionGuideLink } from '../distribuicao/DistributionStates';
import CorrelationBubbles, { bubblesTitle } from './CorrelationBubbles';
import CorrelationFilters from './CorrelationFilters';
import CorrelationMatrix, { matrixTitle } from './CorrelationMatrix';
import CorrelationReleasesDialog from './CorrelationReleasesDialog';
import { MIN_RELEASES, useCorrelationDashboard } from './useCorrelationDashboard';
import { useTranslation } from 'react-i18next';

const SKELETON_ROWS = 4;

/** Esqueleto do triângulo de baixo enquanto as correlações carregam. */
function MatrixSkeleton() {
  return (
    <Box display="flex" flexDirection="column" gap="4px">
      {Array.from({ length: SKELETON_ROWS }, (_, row) => (
        <Box key={row} display="flex" gap="4px">
          {Array.from({ length: row + 1 }, (__, column) => (
            <SkeletonBlock key={column} width={56} height={56} />
          ))}
        </Box>
      ))}
    </Box>
  );
}

/**
 * As duas matrizes lado a lado, com a altura do cartão maior; em tela estreita, uma abaixo da outra. Cada célula é um
 * grid para o cartão esticar até o fim dela.
 */
function CorrelationGrid({ matrix, bubbles, busy }: { matrix: ReactNode; bubbles: ReactNode; busy?: boolean }) {
  return (
    <Box
      data-testid="correlation-grid"
      aria-busy={busy}
      display="grid"
      gap="24px"
      sx={{
        gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: 'repeat(2, minmax(0, 1fr))' },
        opacity: busy ? 0.6 : 1,
        transition: 'opacity 150ms'
      }}
    >
      <Box display="grid" minWidth={0}>
        {matrix}
      </Box>
      <Box display="grid" minWidth={0}>
        {bubbles}
      </Box>
    </Box>
  );
}

const CorrelationDashboard: React.FC = () => {
  usePreloadECharts();
  const { terms } = useProviderTerms();
  const { t } = useTranslation('dashboards');
  const cardTitle = t('correlation.card-title');
  const router = useRouter();
  const [organizationId, productId] = getPathId(router.query?.product as string);

  const dashboard = useCorrelationDashboard(organizationId, productId);
  const { repository, level, correlation, status, isUpdating, retry } = dashboard;
  const [releasesOpen, setReleasesOpen] = useState(false);
  const noun = CORRELATION_LEVEL_PLURALS[level];
  // a exportação geral leva as duas matrizes da tela e os dados de RD, com os filtros aplicados
  const csvCharts =
    status === 'ready' && correlation
      ? [
          ...[CORRELATION_CSV.matrix, CORRELATION_CSV.bubbles].map((name) => formatCorrelationCsv(correlation, name)),
          formatCorrelationReleasesCsv(correlation)
        ]
      : [];

  const renderContent = () => {
    if (status === 'error') {
      return (
        <DashboardCard
          title={t('correlation.error-card')}
          status="error"
          errorTitle={t('correlation.error-title')}
          onRetry={retry}
        />
      );
    }

    if (status === 'noRepository') {
      return (
        <DashboardCard
          title={cardTitle}
          status="empty"
          emptyTitle={t('correlation.no-repository.title', { repositories: terms.repositories })}
          emptyDescription={t('correlation.no-repository.description', { repository: terms.repository })}
        />
      );
    }

    if (status === 'noRelease') {
      return (
        <DashboardCard
          title={t('correlation.no-release.title')}
          status="empty"
          badgeLabel={t('correlation.no-release.badge')}
          emptyTitle={t('correlation.no-release.empty-title')}
          emptyDescription={t('correlation.no-release.description', { noun })}
          emptyAction={
            <Button
              variant="contained"
              disableElevation
              onClick={() => router.push(`/products/${router.query.product}/releases/create`)}
              sx={{ backgroundColor: DASHBOARD_COLORS.primary, fontWeight: 'bold', textTransform: 'none' }}
            >
              {t('correlation.plan-release')}
            </Button>
          }
        />
      );
    }

    if (status === 'noEntities') {
      return (
        <DashboardCard
          title={cardTitle}
          status="empty"
          emptyTitle={t('correlation.no-entities.title', { noun })}
          emptyDescription={t('correlation.no-entities.description')}
        />
      );
    }

    if (status === 'noAnalyses' && correlation) {
      return (
        <DashboardCard
          title={cardTitle}
          status="empty"
          badgeLabel={t('correlation.no-analyses.badge')}
          emptyTitle={t('correlation.no-analyses.title', {
            repository: terms.repository,
            name: correlation.repository.name
          })}
          emptyDescription={t('correlation.no-analyses.description', { noun, repository: terms.repository })}
          emptyAction={<CollectionGuideLink />}
        />
      );
    }

    if (status === 'fewReleases' && correlation) {
      const releasesCount = t('correlation.release-count', { count: correlation.releases.length });
      return (
        <DashboardCard
          title={cardTitle}
          status="empty"
          badgeLabel={t('correlation.few-releases.badge')}
          emptyTitle={t('correlation.few-releases.title')}
          emptyDescription={t('correlation.few-releases.description', {
            min: MIN_RELEASES,
            noun,
            repository: terms.repository,
            name: correlation.repository.name,
            releases: releasesCount
          })}
        />
      );
    }

    if (status === 'ready' && correlation) {
      return (
        <CorrelationGrid
          busy={isUpdating}
          matrix={<CorrelationMatrix correlation={correlation} />}
          bubbles={<CorrelationBubbles correlation={correlation} />}
        />
      );
    }

    return (
      <CorrelationGrid
        matrix={<DashboardCard title={matrixTitle({ level })} status="loading" loadingContent={<MatrixSkeleton />} />}
        bubbles={<DashboardCard title={bubblesTitle()} status="loading" loadingContent={<MatrixSkeleton />} />}
      />
    );
  };

  return (
    <>
      <title>{t('correlation.title')}</title>

      <Container maxWidth="xl">
        <Box display="flex" flexDirection="column" gap="24px" marginTop="40px" marginBottom="40px">
          <Box display="flex" alignItems="flex-start" justifyContent="space-between" flexWrap="wrap" gap="16px">
            <Box>
              <Typography component="h1" fontWeight="bold" fontSize="30px" color={DASHBOARD_COLORS.primary}>
                {t('correlation.title')}
              </Typography>
              <Typography color={DASHBOARD_COLORS.mutedText} data-testid="correlation-subtitle">
                {t('correlation.subtitle.before', { noun })}{' '}
                <em>{repository?.name ?? t('correlation.subtitle.fallback', { repository: terms.repository })}</em>{' '}
                {t('correlation.subtitle.after')}
              </Typography>
            </Box>
            <ExportAllCsvButton dashboard={CORRELATION_CSV.dashboard} charts={csvCharts} />
          </Box>

          <CorrelationFilters {...dashboard} />

          {status === 'ready' && correlation && (
            <Box display="flex" alignItems="baseline" flexWrap="wrap" columnGap="12px">
              <Typography fontSize="14px" color={DASHBOARD_COLORS.text} data-testid="correlation-info">
                {formatCorrelationInfo(correlation)}
              </Typography>
              <Button
                size="small"
                onClick={() => setReleasesOpen(true)}
                sx={{ color: DASHBOARD_COLORS.primary, fontWeight: 'bold', textTransform: 'none' }}
              >
                {t('correlation.see-releases')}
              </Button>
              <CorrelationReleasesDialog
                correlation={correlation}
                open={releasesOpen}
                onClose={() => setReleasesOpen(false)}
              />
            </Box>
          )}

          {renderContent()}
        </Box>
      </Container>
    </>
  );
};


export default CorrelationDashboard;
