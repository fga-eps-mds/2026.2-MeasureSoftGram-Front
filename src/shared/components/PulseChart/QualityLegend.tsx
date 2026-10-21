import React from 'react';
import { Box, Typography } from '@mui/material';
import { QUALITY_RANGES } from '@utils/formatPulseChart';

/** Legenda das faixas de cor do indicador, a mesma em todos os gráficos de pulso. */
export function QualityLegend() {
  return (
    <Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
      {QUALITY_RANGES.map((range) => (
        <Box key={range.key} display="flex" alignItems="center" gap={0.5}>
          <Box sx={{ width: 10, height: 10, borderRadius: '2px', backgroundColor: range.color }} />
          <Typography variant="caption" color="text.secondary">
            {range.legend}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}

export default QualityLegend;
