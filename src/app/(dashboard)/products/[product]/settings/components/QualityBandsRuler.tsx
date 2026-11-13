import React from 'react';
import { Box, Typography } from '@mui/material';

import { DASHBOARD_COLORS } from '@utils/dashboardColors';
import { RulerSegment, formatLimit } from '@utils/qualityBandsForm';

// em centésimos, para 0,8 − 0,6 não virar 19.999999999999996%
const percent = (value: number) => Math.round(value * 10000) / 100;

// abaixo disso as etiquetas de dois limites vizinhos se encostam
const MIN_LABEL_GAP = 0.05;

/** Limites que ganham etiqueta: o 0, o 1 e os do meio que não ficam colados no anterior nem no 1. */
export function visibleLimits(limits: number[]): number[] {
  const shown: number[] = [];
  limits.forEach((limit, index) => {
    const isEdge = index === 0 || index === limits.length - 1;
    const previous = shown[shown.length - 1];
    if (isEdge) {
      // o 1 sempre aparece: se o limite anterior estiver colado nele, sai o anterior
      if (index > 0 && limit - previous < MIN_LABEL_GAP && shown.length > 1) shown.pop();
      shown.push(limit);
    } else if (limit - previous >= MIN_LABEL_GAP) {
      shown.push(limit);
    }
  });
  return shown;
}

// o 0 e o 1 ficam dentro da barra; os limites do meio, centralizados na divisa das faixas
function labelShift(index: number, count: number) {
  if (index === 0) return 'none';
  if (index === count - 1) return 'translateX(-100%)';
  return 'translateX(-50%)';
}

/** Barra de 0 a 1 com o trecho de cada faixa, na cor dela, e os limites embaixo (CA1, CA2). */
export default function QualityBandsRuler({ segments }: { segments: RulerSegment[] }) {
  const limits = visibleLimits([0, ...segments.map((segment) => segment.end)]);

  return (
    <Box data-testid="quality-bands-ruler" paddingBottom="22px">
      <Box
        role="img"
        aria-label={`Régua das faixas: ${segments
          .map((segment) => `${segment.band.grade} de ${formatLimit(segment.start)} a ${formatLimit(segment.end)}`)
          .join(', ')}`}
        sx={{ display: 'flex', height: '24px', borderRadius: '4px', overflow: 'hidden' }}
      >
        {segments.map((segment) => (
          <Box
            key={segment.band.grade}
            data-testid={`ruler-segment-${segment.band.grade}`}
            style={{ width: `${percent(segment.end - segment.start)}%` }}
            sx={{
              backgroundColor: segment.band.color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'width 120ms ease-out'
            }}
          >
            {segment.end - segment.start >= 0.06 && (
              <Typography fontSize="12px" fontWeight="bold" color="#FFFFFF">
                {segment.band.grade}
              </Typography>
            )}
          </Box>
        ))}
      </Box>
      <Box position="relative" height="0" aria-hidden>
        {limits.map((limit, index) => (
          <Typography
            key={index}
            fontSize="12px"
            color={DASHBOARD_COLORS.mutedText}
            sx={{
              position: 'absolute',
              top: '4px',
              left: `${percent(limit)}%`,
              transform: labelShift(index, limits.length),
              whiteSpace: 'nowrap'
            }}
          >
            {formatLimit(limit)}
          </Typography>
        ))}
      </Box>
    </Box>
  );
}
