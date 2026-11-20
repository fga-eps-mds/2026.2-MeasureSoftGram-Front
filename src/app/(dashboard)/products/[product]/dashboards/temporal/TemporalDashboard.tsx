'use client';

import React, { useMemo } from 'react';
import { useRouter } from '@hooks/useRouter';
import { Box, Container, SxProps, Theme, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';

import DashboardCard, { SkeletonBlock } from '@components/DashboardCard';
import ReactEcharts, { usePreloadECharts } from '@components/ECharts';
import ExportCsvButton, { ExportAllCsvButton } from '@components/ExportCsvButton';
import { useProviderTerms } from '@hooks/useProviderTerms';
import { DASHBOARD_COLORS } from '@utils/dashboardColors';
import { TEMPORAL_CSV, TemporalCsvRow, formatTemporalCsv } from '@utils/formatTemporalCsv';
import { formatTimeEvolutionOptions } from '@utils/formatTimeEvolutionChart';
import { CsvChart } from '@utils/exportCsv';
import { TimeGranularity } from '@utils/historicalValues';
import { getPathId } from '@utils/pathDestructer';
import { useTranslation } from 'react-i18next';
import MSGAlert from '../../../../../../components/idv/feedback';

import { MultiSelectFilter, SingleSelectFilter } from './TemporalFilters';
import { EvolutionChartData, EvolutionLevel, useTemporalEvolution } from './useTemporalEvolution';

const CHART_HEIGHT = 300;
const TOGGLE_SX: SxProps<Theme> = {
  textTransform: 'none',
  fontWeight: 'bold',
  paddingX: '16px',
  color: DASHBOARD_COLORS.text,
  '&.Mui-selected, &.Mui-selected:hover': { backgroundColor: DASHBOARD_COLORS.primary, color: '#FFFFFF' }
};

const CHARTS: { level: EvolutionLevel; normalized: boolean }[] = [
  { level: 'characteristics', normalized: true },
  { level: 'subcharacteristics', normalized: true },
  { level: 'measures', normalized: true },
  { level: 'metrics', normalized: false }
];

function getStatus(data: EvolutionChartData): 'loading' | 'error' | 'empty' | 'ready' {
  if (data.hasError) return 'error';
  if (data.isLoading) return 'loading';
  return data.series.length === 0 ? 'empty' : 'ready';
}

interface EvolutionChartCardProps {
  chart: (typeof CHARTS)[number];
  data: EvolutionChartData;
  granularity: TimeGranularity;
  csv: CsvChart<TemporalCsvRow>;
  emptyTitle: string;
  emptyDescription: string;
  repositoryTerm: string;
}

function EvolutionChartCard({
  chart,
  data,
  granularity,
  csv,
  emptyTitle,
  emptyDescription,
  repositoryTerm
}: EvolutionChartCardProps) {
  const { t } = useTranslation('dashboards');
  const title = t(`temporal.chart.${chart.level}`);
  const options = useMemo(
    () => formatTimeEvolutionOptions(data.series, granularity, chart.normalized),
    [data.series, granularity, chart.normalized]
  );
  const exportButton = <ExportCsvButton dashboard={TEMPORAL_CSV.dashboard} chart={csv} />;

  return (
    <DashboardCard
      title={title}
      status={getStatus(data)}
      headerAction={exportButton}
      emptyHeaderAction={exportButton}
      loadingContent={<SkeletonBlock width="100%" height={CHART_HEIGHT} />}
      loadingMessage={t(`temporal.loading.${chart.level}`)}
      emptyTitle={emptyTitle}
      emptyDescription={emptyDescription}
      errorTitle={t(`temporal.error.${chart.level}`)}
      onRetry={data.retry}
    >
      {/* a entidade sem medição não vira linha: sem o aviso, ela some do gráfico sem explicação (CA5 da US01.02) */}
      {data.missing.length > 0 && (
        <MSGAlert
          severity="warning"
          title={t('temporal.missing.title', {
            chart: title,
            repository: repositoryTerm,
            names: data.missing.join(', ')
          })}
        >
          {t('temporal.missing.description', { description: emptyDescription })}
        </MSGAlert>
      )}
      <ReactEcharts option={options} notMerge style={{ height: CHART_HEIGHT, width: '100%' }} />
    </DashboardCard>
  );
}

const TemporalDashboard: React.FC = () => {
  const { terms } = useProviderTerms();
  const { t } = useTranslation('dashboards');
  usePreloadECharts();

  const { query } = useRouter();
  const [organizationId, productId] = getPathId(query?.product as string);
  const evolution = useTemporalEvolution(organizationId, productId);
  const { repositories, isLoadingRepositories, hasRepositoriesError, granularity, measures } = evolution;

  // os CSVs levam o que os gráficos mostram: o gráfico carregando, com erro ou sem dados não exporta nada
  const repositoryName = repositories.find((repository) => repository.id === evolution.repositoryId)?.name ?? '';
  const csvs = Object.fromEntries(
    CHARTS.map(({ level }) => {
      const data = evolution.charts[level];
      const series = getStatus(data) === 'ready' ? data.series : [];
      return [level, formatTemporalCsv(level, repositoryName, series, granularity)];
    })
  ) as Record<EvolutionLevel, CsvChart<TemporalCsvRow>>;

  const emptyMessages: Record<EvolutionLevel, { title: string; description: string }> = {
    characteristics: {
      title: t('temporal.empty.characteristics', { repository: terms.repository }),
      description: t('temporal.empty.after-action', { repository: terms.repository })
    },
    subcharacteristics: {
      title: t('temporal.empty.subcharacteristics', { repository: terms.repository }),
      description: t('temporal.empty.after-action', { repository: terms.repository })
    },
    measures: {
      title: t('temporal.empty.measures', { repository: terms.repository }),
      description: t('temporal.empty.after-action', { repository: terms.repository })
    },
    // o gráfico busca só as métricas com qualifier TRK, então medida cujas métricas são medidas por arquivo fica
    // vazia aqui mesmo com a coleta em dia: o texto explica isso em vez de acusar falta de dado (ressalva do PO
    // em 03/11/2026, que citava a Distribuição Estatística, onde esses valores também não aparecem)
    metrics: {
      title: t(measures === 'all' ? 'temporal.empty.metrics-all' : 'temporal.empty.metrics-chosen', {
        repository: terms.repository
      }),
      description: t('temporal.empty.metrics-description', { repository: terms.repository })
    }
  };

  const renderContent = () => {
    // a falha ao buscar a lista precisa vir antes do estado vazio: sem ela, a lista chega vazia e a tela acusava
    // produto sem repositório, escondendo o erro e o "Tentar novamente" que o CA4 exige
    if (hasRepositoriesError) {
      return (
        <DashboardCard
          title={t('temporal.card-title')}
          status="error"
          errorTitle={t('temporal.repositories-error', { repositories: terms.repositories })}
          onRetry={evolution.retryRepositories}
        />
      );
    }
    if (!isLoadingRepositories && repositories.length === 0) {
      return (
        <DashboardCard
          title={t('temporal.card-title')}
          status="empty"
          emptyTitle={t('temporal.no-repositories.title', { repositories: terms.repositories })}
          emptyDescription={t('temporal.no-repositories.description', { repository: terms.repository })}
        />
      );
    }
    return CHARTS.map((chart) => (
      <EvolutionChartCard
        key={chart.level}
        chart={chart}
        data={evolution.charts[chart.level]}
        granularity={granularity}
        csv={csvs[chart.level]}
        emptyTitle={emptyMessages[chart.level].title}
        emptyDescription={emptyMessages[chart.level].description}
        repositoryTerm={terms.repository}
      />
    ));
  };

  return (
    <>
      <title>{t('temporal.title')}</title>

      <Container maxWidth="xl">
        <Box display="flex" flexDirection="column" gap="28px" marginTop="40px" marginBottom="40px">
          {/* em tela estreita, o botão de exportar desce para baixo do título em vez de alargar a página */}
          <Box display="flex" alignItems="flex-start" justifyContent="space-between" flexWrap="wrap" gap="16px">
            <Box>
              <Typography component="h1" fontWeight="bold" fontSize="30px" color={DASHBOARD_COLORS.primary}>
                {t('temporal.title')}
              </Typography>
              <Typography fontSize="13px" color={DASHBOARD_COLORS.mutedText}>
                {t('temporal.subtitle')}
              </Typography>
            </Box>
            <ExportAllCsvButton dashboard={TEMPORAL_CSV.dashboard} charts={Object.values(csvs)} />
          </Box>

          <Box display="flex" alignItems="center" flexWrap="wrap" gap="16px">
            <SingleSelectFilter
              label={terms.Repository}
              value={evolution.repositoryId}
              options={repositories.map((repository) => ({ key: repository.id, name: repository.name }))}
              onChange={(value) => evolution.setRepositoryId(Number(value))}
            />
            <SingleSelectFilter
              label={t('temporal.filter.characteristic')}
              value={evolution.characteristic}
              options={evolution.characteristicOptions}
              onChange={evolution.setCharacteristic}
            />
            <MultiSelectFilter
              label={t('temporal.filter.subcharacteristic')}
              value={evolution.subcharacteristics}
              options={evolution.subcharacteristicOptions}
              onChange={evolution.setSubcharacteristics}
            />
            <MultiSelectFilter
              label={t('temporal.filter.measure')}
              value={evolution.measures}
              options={evolution.measureOptions}
              onChange={evolution.setMeasures}
            />
            <MultiSelectFilter
              label={t('temporal.filter.metric')}
              value={evolution.metrics}
              options={evolution.metricOptions}
              onChange={evolution.setMetrics}
            />

            <ToggleButtonGroup
              exclusive
              size="small"
              value={granularity}
              onChange={(_event, value: TimeGranularity | null) => {
                if (value) evolution.setGranularity(value);
              }}
              aria-label={t('temporal.time-axis')}
              sx={{ marginLeft: { md: 'auto' }, backgroundColor: '#FFFFFF' }}
            >
              <ToggleButton value="day" sx={TOGGLE_SX}>
                {t('temporal.days')}
              </ToggleButton>
              <ToggleButton value="month" sx={TOGGLE_SX}>
                {t('temporal.months')}
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>

          {renderContent()}
        </Box>
      </Container>
    </>
  );
};


export default TemporalDashboard;
