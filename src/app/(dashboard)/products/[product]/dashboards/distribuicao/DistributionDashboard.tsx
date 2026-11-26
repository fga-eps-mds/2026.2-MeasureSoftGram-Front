'use client';

import React, { ReactNode, useMemo } from 'react';
import { useRouter } from '@hooks/useRouter';
import { Box, Button, Container, Typography } from '@mui/material';

import DashboardCard from '@components/DashboardCard';
import { ExportAllCsvButton } from '@components/ExportCsvButton';
import QualityBandsUnavailableAlert from '@components/QualityBandsUnavailableAlert';
import { usePreloadECharts } from '@components/ECharts';
import { useProductQualityBands } from '@hooks/useProductQualityBands';
import { useProviderTerms } from '@hooks/useProviderTerms';
import { DASHBOARD_COLORS } from '@utils/dashboardColors';
import { DISTRIBUTION_LEVEL_LABELS } from '@utils/distributionCascade';
import { formatAnalysisCount, formatPeriod } from '@utils/distributionSummary';
import { DISTRIBUTION_CSV, formatDistributionCsvs } from '@utils/formatDistributionCsv';
import { getPathId } from '@utils/pathDestructer';
import { toLocalDay } from '@utils/releaseSelection';

import DistributionBoxplot, { boxplotTitle } from './DistributionBoxplot';
import DistributionDensity, { densityTitle } from './DistributionDensity';
import DistributionFilters from './DistributionFilters';
import DistributionHistogram, { histogramTitle } from './DistributionHistogram';
import DistributionScatter, { scatterTitle } from './DistributionScatter';
import DistributionSummary, { summaryTitle } from './DistributionSummary';
import { ChartSkeleton, CollectionGuideLink, DistributionErrorCard, SummarySkeleton } from './DistributionStates';
import { useDistributionDashboard } from './useDistributionDashboard';
import { Trans, useTranslation } from 'react-i18next';
import i18n from '../../../../../../shared/i18n/i18n';

/** "17/08" de uma data da release, para a orientação do estado sem análise. */
function formatReleaseDay(date: Date | string): string {
  const [, month, day] = toLocalDay(date).split('-');
  return i18n.t('dashboards:entity.day-format', { day, month });
}

/** Cada célula também é grade, para o cartão esticar até a altura da linha sem alargar a coluna. */
const GRID_CELL = { display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', minWidth: 0 };

/**
 * Grade da referência (CA4 a CA8): histograma e densidade lado a lado, boxplot na largura toda, dispersão e resumo
 * lado a lado, com os cartões de cada linha na mesma altura. Em tela estreita, uma coluna na ordem dos quadros, sem as
 * áreas vazias.
 */
function DistributionGrid({
  histogram,
  density,
  boxplot,
  scatter,
  summary,
  busy
}: {
  histogram: ReactNode;
  density: ReactNode;
  boxplot: ReactNode;
  scatter: ReactNode;
  summary: ReactNode;
  busy?: boolean;
}) {
  return (
    <Box
      data-testid="distribution-grid"
      aria-busy={busy}
      display="grid"
      gap="24px"
      alignItems="stretch"
      sx={{
        gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: 'repeat(2, minmax(0, 1fr))' },
        gridTemplateAreas: { lg: '"hist dens" "box box" "disp summary"' },
        opacity: busy ? 0.6 : 1,
        transition: 'opacity 150ms'
      }}
    >
      <Box sx={{ ...GRID_CELL, gridArea: { lg: 'hist' } }}>{histogram}</Box>
      <Box sx={{ ...GRID_CELL, gridArea: { lg: 'dens' } }}>{density}</Box>
      <Box sx={{ ...GRID_CELL, gridArea: { lg: 'box' } }}>{boxplot}</Box>
      <Box sx={{ ...GRID_CELL, gridArea: { lg: 'disp' } }}>{scatter}</Box>
      <Box sx={{ ...GRID_CELL, gridArea: { lg: 'summary' } }}>{summary}</Box>
    </Box>
  );
}

const DistributionDashboard: React.FC = () => {
  usePreloadECharts();
  const { terms } = useProviderTerms();
  const { t } = useTranslation('dashboards');
  const cardTitle = t('distribution.card-title');
  const router = useRouter();
  const [organizationId, productId] = getPathId(router.query?.product as string);

  // a régua do produto pinta o histograma e a curva (US30.02); sem ela, os gráficos seguem na régua padrão
  const {
    bands,
    isError: isQualityBandsError,
    retry: retryQualityBands
  } = useProductQualityBands(organizationId, productId);

  const dashboard = useDistributionDashboard(organizationId, productId);
  const { release, level, selectedEntity, distribution, entity, children, period, status, isUpdating, retry } =
    dashboard;

  const entityName = level === 'tsqmi' ? DISTRIBUTION_LEVEL_LABELS.tsqmi : selectedEntity?.name;
  // os CSVs levam o que os quadros mostram: enquanto a seleção nova carrega, a resposta anterior, como eles
  const csv = useMemo(
    () => (status === 'ready' && distribution ? formatDistributionCsvs(distribution) : undefined),
    [status, distribution]
  );
  const csvCharts = csv ? [csv.histogram, csv.density, csv.boxplot, csv.scatter, csv.summary] : [];

  const renderContent = () => {
    if (status === 'error') return <DistributionErrorCard onRetry={retry} />;

    if (status === 'noRelease') {
      return (
        <DashboardCard
          title={t('distribution.no-release.title')}
          status="empty"
          badgeLabel={t('distribution.no-release.badge')}
          emptyTitle={t('distribution.no-release.empty-title')}
          emptyDescription={t('distribution.no-release.description')}
          emptyAction={
            <Button
              variant="contained"
              disableElevation
              onClick={() => router.push(`/products/${router.query.product}/releases/create`)}
              sx={{ backgroundColor: DASHBOARD_COLORS.primary, fontWeight: 'bold', textTransform: 'none' }}
            >
              {t('distribution.plan-release')}
            </Button>
          }
        />
      );
    }

    if (status === 'noRepository') {
      return (
        <DashboardCard
          title={cardTitle}
          status="empty"
          emptyTitle={t('distribution.no-repository.title', { repositories: terms.repositories })}
          emptyDescription={t('distribution.no-repository.description', { repository: terms.repository })}
        />
      );
    }

    if (status === 'noEntities') {
      const label = DISTRIBUTION_LEVEL_LABELS[level].toLowerCase();
      return (
        <DashboardCard
          title={cardTitle}
          status="empty"
          emptyTitle={
            level === 'metric'
              ? t('distribution.no-entities.metric-title', { release: release?.release_name })
              : t('distribution.no-entities.title', { release: release?.release_name, label })
          }
          emptyDescription={
            level === 'metric'
              ? t('distribution.no-entities.metric-description')
              : t('distribution.no-entities.description')
          }
        />
      );
    }

    if (status === 'noAnalyses' && distribution) {
      const { release: analyzed, repository: analyzedRepository, entity: emptyEntity } = distribution;
      return (
        <DashboardCard
          title={cardTitle}
          status="empty"
          badgeLabel={t('distribution.no-analyses.badge')}
          emptyTitle={t('distribution.no-analyses.title', {
            repository: terms.repository,
            name: analyzedRepository.name,
            entity: emptyEntity.name,
            release: analyzed.release_name
          })}
          emptyDescription={t('distribution.no-analyses.description', {
            repository: terms.repository,
            start: formatReleaseDay(analyzed.start_at),
            end: formatReleaseDay(analyzed.end_at)
          })}
          emptyAction={<CollectionGuideLink />}
        />
      );
    }

    if (status === 'ready' && entity) {
      return (
        <DistributionGrid
          busy={isUpdating}
          histogram={<DistributionHistogram entity={entity} csv={csv?.histogram} bands={bands} />}
          density={<DistributionDensity entity={entity} csv={csv?.density} bands={bands} />}
          boxplot={<DistributionBoxplot entity={entity} childEntities={children ?? []} csv={csv?.boxplot} />}
          scatter={<DistributionScatter entity={entity} csv={csv?.scatter} />}
          summary={<DistributionSummary summary={entity.summary} csv={csv?.summary} />}
        />
      );
    }

    return (
      <DistributionGrid
        histogram={<DashboardCard title={histogramTitle()} status="loading" loadingContent={<ChartSkeleton />} />}
        density={<DashboardCard title={densityTitle()} status="loading" loadingContent={<ChartSkeleton />} />}
        boxplot={<DashboardCard title={boxplotTitle()} status="loading" loadingContent={<ChartSkeleton />} />}
        scatter={<DashboardCard title={scatterTitle()} status="loading" loadingContent={<ChartSkeleton />} />}
        summary={<DashboardCard title={summaryTitle()} status="loading" loadingContent={<SummarySkeleton />} />}
      />
    );
  };

  return (
    <>
      <title>{t('distribution.title')}</title>

      <Container maxWidth="xl">
        <Box display="flex" flexDirection="column" gap="24px" marginTop="40px" marginBottom="40px">
          {/* em tela estreita, o botão de exportar desce para baixo do título em vez de alargar a página */}
          <Box display="flex" alignItems="flex-start" justifyContent="space-between" flexWrap="wrap" gap="16px">
            <Box>
              <Typography component="h1" fontWeight="bold" fontSize="30px" color={DASHBOARD_COLORS.primary}>
                {t('distribution.title')}
              </Typography>
              <Typography color={DASHBOARD_COLORS.mutedText} data-testid="distribution-subtitle">
                <Trans
                  t={t}
                  i18n={i18n}
                  i18nKey="distribution.subtitle.text"
                  values={{ name: entityName ?? t('distribution.subtitle.fallback') }}
                  components={{ em: <em /> }}
                />
              </Typography>
            </Box>
            <ExportAllCsvButton dashboard={DISTRIBUTION_CSV.dashboard} charts={csvCharts} />
          </Box>

          <DistributionFilters {...dashboard} />

          {/* a régua do produto não veio: os gráficos continuam na tela com a régua padrão (CA4) */}
          {isQualityBandsError && <QualityBandsUnavailableAlert onRetry={retryQualityBands} />}

          {status === 'ready' && distribution && period?.first && period.last && (
            <Typography fontSize="14px" color={DASHBOARD_COLORS.text} data-testid="distribution-period">
              Release <strong>{distribution.release.release_name}</strong> · {terms.repository}{' '}
              <strong>{distribution.repository.name}</strong> ·{' '}
              {t('distribution.period-line.in-period', {
                amount: formatAnalysisCount(period.count),
                period: formatPeriod(period.first, period.last)
              })}
            </Typography>
          )}

          {renderContent()}
        </Box>
      </Container>
    </>
  );
};


export default DistributionDashboard;
