import React, { useMemo } from 'react';
import { Box, Typography } from '@mui/material';
import DashboardCard from '@components/DashboardCard';
import ExportCsvButton from '@components/ExportCsvButton';
import { DistributionEntity } from '@customTypes/product';
import { DASHBOARD_COLORS } from '@utils/dashboardColors';
import { buildHistogram, formatAxisValue } from '@utils/distributionHistogram';
import { CsvChart } from '@utils/exportCsv';
import { formatHistogramOptions, HISTOGRAM_CHART_HEIGHT, HISTOGRAM_GRID_SIDES } from '@utils/formatDistributionCharts';
import { DISTRIBUTION_CSV, HistogramCsvRow } from '@utils/formatDistributionCsv';
import { QUALITY_BANDS, QualityBand } from '@utils/qualityBands';
import DistributionChart from './DistributionChart';

export const HISTOGRAM_TITLE = 'Histograma';

// some da tela, mas continua para os leitores de tela
export const VISUALLY_HIDDEN = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap'
};

/**
 * Tamanho da fonte do rótulo de uma faixa da régua conforme a largura dela. O rótulo mais largo, "B · Muito bom",
 * mede 69 px em 11 px (o tamanho normal), 63 px em 10 px e 56 px em 9 px: cada degrau é o maior tamanho que ainda
 * cabe na faixa. Em 1314 px de tela, por exemplo, a faixa tem 64 px e o rótulo sai em 9 px.
 */
export const BAND_LABEL_STEPS = [
  { maxWidth: 72, fontSize: '10px' },
  { maxWidth: 65, fontSize: '9px' }
];

/**
 * Abaixo disso o rótulo não cabe nem em 9 px (em 360 px de tela, a faixa tem 25 px): só a letra aparece, de volta
 * ao tamanho normal, porque sozinha ela cabe.
 */
export const BAND_LETTER_ONLY_MAX_WIDTH = 58;

const BAND_FONT_SIZE = '11px';

/**
 * Regras do rótulo de uma faixa, por largura da própria faixa (cada li é um container): a fonte diminui em degraus
 * e, quando nem assim cabe, só a letra fica na tela; o rótulo continua no title e no texto para leitores de tela.
 */
export function bandLabelRules() {
  return {
    ...Object.fromEntries(
      BAND_LABEL_STEPS.map((step) => [`@container (max-width: ${step.maxWidth}px)`, { fontSize: step.fontSize }])
    ),
    [`@container (max-width: ${BAND_LETTER_ONLY_MAX_WIDTH}px)`]: {
      fontSize: BAND_FONT_SIZE,
      '& .quality-band-label': VISUALLY_HIDDEN
    }
  };
}

/** Maior divisor comum, para a proporção das colunas sair na forma mais simples (ver bandColumns). */
function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

/**
 * Colunas da régua: cada faixa ocupa no eixo a sua própria largura, então a coluna mede o tanto que ela vale de 0 a 1.
 * Com a régua padrão isso dá cinco colunas iguais; com a régua do produto (US30.02), não — uma faixa A a partir de
 * 0,85 vale 0,15 do eixo, e uma coluna de 0,2 deixaria a cor fora de lugar em relação às barras. O `minmax(0, …)`
 * deixa a faixa encolher abaixo do rótulo, que é o que permite a régua caber em telas estreitas.
 *
 * A proporção sai na forma mais simples (as faixas iguais da régua padrão viram `1fr`, e não `20fr`): números
 * grandes mudam o arredondamento do navegador em uma fração de pixel, e com isso a cor da última faixa deslizava
 * para fora da última barra.
 */
export function bandColumns(bands: QualityBand[]): string {
  // décimos de milésimo do eixo, para a conta ser entre inteiros mesmo com limites quebrados como 0,125
  const widths = bands.map((band) => Math.round((band.max - band.min) * 10000));
  // a régua cobre o eixo inteiro, então o divisor nunca é zero
  const divisor = widths.reduce(gcd, 0);
  return widths.map((width) => `minmax(0, ${width / divisor}fr)`).join(' ');
}

/**
 * Régua das faixas A a E abaixo do eixo de 0 a 1, nas margens do grid do histograma: cada coluna acompanha a largura
 * da faixa no eixo, e assim fica alinhada às barras (ver bandColumns). Fica fora do ECharts para seguir a largura do
 * cartão. Cada faixa decide pela própria largura se mostra a letra e o rótulo, com a fonte menor se precisar, ou só a
 * letra (ver bandLabelRules): no desktop o rótulo aparece; em telas estreitas, como 360 px, só a letra.
 */
export function QualityBandRuler({ bands = QUALITY_BANDS }: { bands?: QualityBand[] }) {
  return (
    <Box
      component="ul"
      aria-label="Faixas de qualidade de A a E"
      display="grid"
      gridTemplateColumns={bandColumns(bands)}
      gap="2px"
      margin={0}
      padding={0}
      sx={{
        listStyle: 'none',
        marginLeft: `${HISTOGRAM_GRID_SIDES.left}px`,
        marginRight: `${HISTOGRAM_GRID_SIDES.right}px`
      }}
    >
      {bands.map((band) => (
        <Box
          component="li"
          key={band.grade}
          data-testid="quality-band"
          title={`${band.grade} · ${band.label}`}
          textAlign="center"
          minWidth={0}
          sx={{ containerType: 'inline-size' }}
        >
          <Box sx={{ height: '10px', borderRadius: '2px', backgroundColor: band.color }} />
          <Typography
            color={DASHBOARD_COLORS.text}
            marginTop="4px"
            lineHeight={1.3}
            whiteSpace="nowrap"
            sx={{ fontSize: BAND_FONT_SIZE, ...bandLabelRules() }}
          >
            <strong>{band.grade}</strong>
            <span className="quality-band-label"> · {band.label}</span>
          </Typography>
        </Box>
      ))}
    </Box>
  );
}

/** Quantas análises caem em cada faixa de valor (CA4); nos valores de 0 a 1, com a régua A a E. */
export default function DistributionHistogram({
  entity,
  csv,
  bands
}: {
  entity: DistributionEntity;
  /** O CSV do quadro, montado pela página; com ele, o cabeçalho ganha o botão "Exportar .csv". */
  csv?: CsvChart<HistogramCsvRow>;
  /** Régua do produto (US30.02); sem ela, a régua padrão. */
  bands?: QualityBand[];
}) {
  const histogram = useMemo(
    () =>
      buildHistogram(
        entity.analyses.map((analysis) => analysis.value),
        entity.level,
        entity.metric_type
      ),
    [entity]
  );
  const option = useMemo(() => formatHistogramOptions(histogram, entity), [histogram, entity]);
  const caption = histogram.unit
    ? 'Quantas análises caem em cada faixa de 0,10. A régua mostra as faixas A a E do Indicador Total da Qualidade.'
    : `Quantas análises caem em cada faixa de ${formatAxisValue(histogram.width)} de ${
        entity.name
      }, na escala da métrica.`;

  return (
    <DashboardCard
      title={HISTOGRAM_TITLE}
      status="ready"
      headerAction={csv && <ExportCsvButton dashboard={DISTRIBUTION_CSV.dashboard} chart={csv} />}
    >
      <Box>
        <DistributionChart option={option} height={HISTOGRAM_CHART_HEIGHT} />
        {histogram.unit && <QualityBandRuler bands={bands} />}
      </Box>
      <Typography fontSize="12px" color={DASHBOARD_COLORS.mutedText}>
        {caption}
      </Typography>
    </DashboardCard>
  );
}
