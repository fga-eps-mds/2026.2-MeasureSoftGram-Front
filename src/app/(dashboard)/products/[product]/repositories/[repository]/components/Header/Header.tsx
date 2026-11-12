'use client';

import React, { useMemo } from 'react';
import NextLink from 'next/link';
import { useRouter } from '@hooks/useRouter';
import { Box, Link as MuiLink, Typography } from '@mui/material';

import ReactEcharts from '@components/ECharts';
import { useRepositoryContext } from '@contexts/RepositoryProvider';
import { useProductQualityBands } from '@hooks/useProductQualityBands';
import { useProviderTranslation as useTranslation } from '@hooks/useProviderTranslation';
import { formatDecimal } from '@utils/formatNumber';
import { getPathId } from '@utils/pathDestructer';
import { getQualityBandClamped } from '@utils/qualityBands';
import CopyBadgeModal from '../CopyBadgeModal';

function Header() {
  const { currentRepository, latestTSQMI } = useRepositoryContext();
  const { query } = useRouter();
  const { t } = useTranslation('header');

  const productSlug = (query?.product as string) ?? '';
  const [organizationId, productId] = getPathId(productSlug);
  const { bands } = useProductQualityBands(organizationId, productId);

  const tsqmiValue = latestTSQMI?.value;
  const hasTsqmi = tsqmiValue !== undefined && tsqmiValue !== null;

  const option = useMemo(() => {
    if (!hasTsqmi) return null;
    const currentBand = getQualityBandClamped(tsqmiValue, bands);

    return {
      series: {
        type: 'gauge',
        startAngle: 180,
        endAngle: 360,
        min: 0,
        max: 1,
        axisLine: {
          lineStyle: {
            width: 50,
            color: bands.map((band) => [band.max, band.color] as [number, string])
          }
        },
        pointer: {
          show: true
        },
        axisTick: {
          length: 0
        },
        splitLine: {
          length: 0
        },
        axisLabel: {
          show: false
        },
        detail: {
          offsetCenter: [0, '20%'],
          fontSize: 16,
          formatter: `${formatDecimal(tsqmiValue)} (${currentBand.grade})`
        },
        data: [{ value: tsqmiValue }]
      }
    };
  }, [bands, hasTsqmi, tsqmiValue]);

  const settingsHref = `/products/${productSlug}/settings`;

  return (
    <Box display="flex" flexDirection="column">
      <Box display="flex" flexDirection="row" justifyContent="space-between">
        <Box display="flex" flexDirection="column">
          <Box display="flex">
            <Typography variant="h4" marginRight="10px">
              {t('repository')}
            </Typography>
            <Typography variant="h4" fontWeight="500" color="#33568E">
              {currentRepository?.name}
            </Typography>
          </Box>
          <Typography variant="caption" color="gray">
            {currentRepository?.description}
          </Typography>
        </Box>
        <Box>
          <CopyBadgeModal />
        </Box>
      </Box>

      <Box display="flex" flexDirection="column" alignItems="center" mt={1}>
        {option && (
          <Box sx={{ width: '100%', maxWidth: 360, height: 180 }}>
            <ReactEcharts option={option} style={{ height: '100%', width: '100%' }} />
          </Box>
        )}
        <MuiLink component={NextLink} href={settingsHref} variant="body2" underline="hover">
          {t('adjust_bands')}
        </MuiLink>
      </Box>
    </Box>
  );
}

export default Header;
