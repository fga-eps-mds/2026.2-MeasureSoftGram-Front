import React, { useRef } from 'react';
import ReactEcharts from '@components/ECharts';
import { Box, Button, Paper, Typography, CircularProgress, Alert } from '@mui/material';
import ExportCsvButton from '@components/ExportCsvButton';
import QualityBandsUnavailableAlert from '@components/QualityBandsUnavailableAlert';
import {
  PULSE_CANVAS_FONT,
  PULSE_GRID,
  PulseMeasurement,
  PulseRelease,
  formatPulseChartOptions,
} from '@utils/formatPulseChart';
import { PULSE_CSV, formatProductPulseCsv } from '@utils/formatPulseCsv';
import { formatPulseReleaseTooltip } from '@utils/formatPulseReleaseTooltip';
import { useProductQualityBands } from '@hooks/useProductQualityBands';
import { usePulseChartData } from './usePulseChartData';
import { PulseChartFilters } from './PulseChartFilters';
import { PulseChartRepoSidebar } from './PulseChartRepoSidebar';
import { QualityLegend } from './QualityLegend';
import { useFontLoaded } from '@hooks/useFontLoaded';
import { useProviderTerms } from '@hooks/useProviderTerms';
import { ProviderTerms } from '@utils/providerTerminology';

// Protótipo aprovado pelo PO (US06.01): sem linhas horizontais, a etiqueta da release em cada faixa (sem a de início)
// e os detalhes da release no ponto do indicador.
const PULSE_OPTIONS = {
  releaseLabels: 'every-row',
  releaseStartLabels: false,
  horizontalLines: false,
  releaseTooltip: formatPulseReleaseTooltip,
} as const;

/**
 * Base da variação na barra lateral: a release com indicador encerrada mais recentemente antes da última medição.
 * Uma release cuja janela inclui a última medição tem como indicador essa mesma medição, e a variação daria sempre 0.
 */
export function getReferenceRelease(releases: PulseRelease[], measurements: PulseMeasurement[]) {
  const latestMs = Math.max(...measurements.map((m) => new Date(m.created_at).getTime()));
  const release = releases
    .filter((rel) => typeof rel.tsqmi?.value === 'number' && new Date(rel.end_at).getTime() < latestMs)
    .sort((a, b) => new Date(a.end_at).getTime() - new Date(b.end_at).getTime())
    .pop();
  return release ? { name: release.name, value: release.tsqmi?.value as number } : undefined;
}

/**
 * Mensagem do estado sem dados, escolhida pela causa, da mais específica para a mais geral: sem repositório, sem
 * nenhuma medição ou sem medição na janela De/Até. Só a última se resolve mexendo no filtro.
 */
export function getEmptyMessage(repositoriesCount: number, totalMeasurements: number, terms: ProviderTerms) {
  if (repositoriesCount === 0) {
    return {
      title: `Este produto ainda não tem ${terms.repositories}`,
      description: `Importe um ${terms.repository} ao produto para o MeasureSoftGram começar a medir a qualidade.`,
    };
  }

  if (totalMeasurements === 0) {
    return {
      title: 'Ainda não há medições neste produto',
      description: `Os valores aparecem depois que a Action do MeasureSoftGram analisa os ${terms.repositories} do produto.`,
    };
  }

  return {
    title: 'Nenhuma medição no período selecionado',
    description: 'Ajuste as datas De/Até para incluir um intervalo com medições.',
  };
}

interface Props {
  organizationId?: string;
  productId?: string;
}

export const PulseChart: React.FC<Props> = ({ organizationId, productId }) => {
  const { terms } = useProviderTerms();
  const echartsRef = useRef<any>(null);
  const fontLoaded = useFontLoaded(PULSE_CANVAS_FONT);

  const { bands, isError: isQualityBandsError, retry: retryQualityBands } = useProductQualityBands(organizationId, productId);

  const {
    allRepositories,
    filteredRepositories,
    selectedRepo,
    setSelectedRepo,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    totalMeasurements,
    selectedMeasurements,
    latestDate,
    releasesInPeriod,
    isLoading,
    error,
    retry,
  } = usePulseChartData(organizationId, productId);

  const chartOptions = formatPulseChartOptions(
    filteredRepositories,
    {
      ...PULSE_OPTIONS,
      releaseTooltip: (points) => formatPulseReleaseTooltip(points, bands),
    },
    bands
  );

  // Sem medição no período não há pulso para desenhar, mas a causa muda a instrução: o produto pode não ter
  // nenhum repositório, nunca ter sido analisado, ou só não ter medição na janela De/Até. Antes a tela dava
  // sempre "ajuste as datas", que manda mexer num filtro que não é o motivo, e com repositórios sem nenhuma
  // medição ela desenhava faixas vazias sem mensagem (ressalva do PO no CA4, em 03/11/2026).
  const emptyMessage = getEmptyMessage(allRepositories.length, totalMeasurements, terms);

  if (isLoading) {
    return (
      <Paper elevation={0} sx={{ padding: '24px', borderRadius: '12px', border: '1px solid #E0E0E0' }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="300px">
          <CircularProgress />
        </Box>
      </Paper>
    );
  }

  if (error) {
    return (
      <Paper elevation={0} sx={{ padding: '24px', borderRadius: '12px', border: '1px solid #E0E0E0' }}>
        {/* o CA4 pede "Tentar novamente" no erro: sem ele a única saída era recarregar a página */}
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={retry}>
              Tentar novamente
            </Button>
          }
        >
          Não foi possível carregar os dados do gráfico de pulso.
        </Alert>
      </Paper>
    );
  }

  return (
    <Paper
      elevation={0}
      sx={{
        width: '100%',
        padding: '24px',
        borderRadius: '12px',
        border: '1px solid #E0E0E0',
        backgroundColor: '#FFFFFF',
      }}
    >
      {/* Card do gráfico: título, subtítulo e legenda logo abaixo, à esquerda (protótipo) */}
      <Box sx={{ border: '1px solid #E0E0E0', borderRadius: '8px', padding: '24px' }}>
        {isQualityBandsError && (
          <Box marginBottom="16px">
            <QualityBandsUnavailableAlert onRetry={retryQualityBands} />
          </Box>
        )}
        <Box display="flex" flexDirection="column" gap="4px" marginBottom="16px">
          <Typography variant="h6" fontWeight="bold" color="#1F2937">
            Gráfico MSG — Evolução de Qualidade por Release
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '12px' }}>
            Gráfico de pulso por {terms.repository} (indicador TSQMI) • pico = variação entre medições • marcador = Release
            • ponto = indicador consolidado no encerramento da Release • cor = faixa de qualidade
          </Typography>
          <QualityLegend bands={bands} />
        </Box>

        {/* Main ECharts + Sidebar Area */}
        {selectedMeasurements === 0 ? (
          <Box
            display="flex"
            flexDirection="column"
            alignItems="center"
            justifyContent="center"
            gap="4px"
            minHeight="200px"
            padding="24px"
            sx={{ border: '1px dashed #D0D7DE', borderRadius: '8px' }}
          >
            <Typography color="text.primary" variant="body2" fontWeight="bold" textAlign="center">
              {emptyMessage.title}
            </Typography>
            <Typography color="text.secondary" variant="body2" textAlign="center">
              {emptyMessage.description}
            </Typography>
          </Box>
        ) : (
          <Box sx={{ position: 'relative', width: '100%' }}>
            {/* Left repo overlays */}
            {filteredRepositories.map((repo, index) => (
              <PulseChartRepoSidebar
                key={repo.id}
                name={repo.name}
                measurements={repo.measurements}
                topOffset={PULSE_GRID.topOffset + index * (PULSE_GRID.height + PULSE_GRID.gap)}
                valueLabel="último indicador TSQMI"
                showIcon={false}
                reference={getReferenceRelease(repo.releases, repo.measurements)}
                bands={bands}
              />
            ))}

            {/* Apache ECharts dynamic component */}
            {/* notMerge: a cada filtro, o gráfico é refeito; mesclando, ficariam as faixas e séries anteriores */}
            <ReactEcharts
              ref={echartsRef}
              option={fontLoaded ? chartOptions : {}}
              notMerge
              style={{
                height: `${chartOptions.height || 400}px`,
                width: '100%',
              }}
            />
          </Box>
        )}
      </Box>

      {/* Filtros abaixo do gráfico, a pedido do PO (US06.01, 08/10) */}
      <Box marginTop="16px">
        <PulseChartFilters
          repositories={allRepositories}
          selectedRepo={selectedRepo}
          onRepoChange={setSelectedRepo}
          startDate={startDate}
          onStartDateChange={setStartDate}
          endDate={endDate}
          onEndDateChange={setEndDate}
          exportAction={
            <ExportCsvButton dashboard={PULSE_CSV.product} chart={formatProductPulseCsv(filteredRepositories, bands)} />
          }
        />
      </Box>

      {/* Footer summary */}
      <Box marginTop="16px">
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '11px' }}>
          {filteredRepositories.length} {terms.repository}
          {filteredRepositories.length === 1 ? '' : 's'} • {selectedMeasurements}{' '}
          {selectedMeasurements === 1 ? 'medição' : 'medições'} no período selecionado • {releasesInPeriod}{' '}
          {releasesInPeriod === 1 ? 'Release' : 'Releases'} no período • última medição: {latestDate || 'N/A'}
        </Typography>
      </Box>
    </Paper>
  );
};

export default PulseChart;
