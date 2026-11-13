import React, { useState } from 'react';
import { Button } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import { toast } from 'react-toastify';
import { DASHBOARD_COLORS } from '@utils/dashboardColors';
import { useProviderTerms } from '@hooks/useProviderTerms';
import { withRepositoryTerm } from '@utils/csvRepositoryTerm';
import { AnyCsvChart, downloadCsv, downloadCsvZip } from '@utils/exportCsv';

const BUTTON_SX = {
  borderColor: DASHBOARD_COLORS.cardBorder,
  color: DASHBOARD_COLORS.primary,
  textTransform: 'none',
  fontSize: '12px',
  fontWeight: 'bold',
  whiteSpace: 'nowrap',
  '&:hover': { borderColor: DASHBOARD_COLORS.primary }
};

/**
 * "Exportar .csv" de um gráfico, com os dados que ele mostra; desabilitado sem dados. Quando um card tem mais de um
 * gráfico, `ariaLabel` diferencia o botão de cada um (e deve começar com o texto visível).
 */
export default function ExportCsvButton({
  dashboard,
  chart,
  ariaLabel
}: Readonly<{ dashboard: string; chart: AnyCsvChart; ariaLabel?: string }>) {
  const { terms } = useProviderTerms();

  return (
    <Button
      variant="outlined"
      size="small"
      aria-label={ariaLabel}
      startIcon={<DownloadIcon fontSize="small" />}
      disabled={chart.rows.length === 0}
      onClick={() => downloadCsv(dashboard, withRepositoryTerm(chart, terms.Repository))}
      sx={BUTTON_SX}
    >
      Exportar .csv
    </Button>
  );
}

/** Exportação geral do topo da página: um `.zip` com um CSV por gráfico com dados; desabilitado se nenhum tiver. */
export function ExportAllCsvButton({
  dashboard,
  charts
}: Readonly<{ dashboard: string; charts: ReadonlyArray<AnyCsvChart> }>) {
  const { terms } = useProviderTerms();
  const [isExporting, setIsExporting] = useState(false);
  const withRows = charts.filter((chart) => chart.rows.length > 0);

  const handleClick = async () => {
    setIsExporting(true);
    try {
      await downloadCsvZip(
        dashboard,
        withRows.map((chart) => withRepositoryTerm(chart, terms.Repository))
      );
    } catch {
      toast.error('Não foi possível gerar o .zip. Tente de novo.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button
      variant="outlined"
      size="small"
      startIcon={<DownloadIcon fontSize="small" />}
      disabled={withRows.length === 0 || isExporting}
      onClick={() => void handleClick()}
      sx={BUTTON_SX}
    >
      {isExporting ? 'Exportando…' : 'Exportar todos (.zip)'}
    </Button>
  );
}
