import React, { useCallback, useMemo, useRef, useState } from 'react';
import ReactEcharts from '@components/ECharts';
import { Box } from '@mui/material';

interface DistributionChartProps {
  /** Options do ECharts; memoize no componente pai, senão cada render vira um desenho novo. */
  option: object;
  /** Altura do gráfico; com fill, a altura mínima. */
  height: number;
  /** Ocupa a altura que sobrar no cartão, que precisa ser flex em coluna. */
  fill?: boolean;
}

/**
 * Gráfico do dashboard que mede o tempo de desenho (diretriz de desempenho do épico #92): da option nova até o
 * ECharts terminar de desenhar, em data-render-ms. Com animation: false o primeiro desenho termina dentro do
 * setOption, antes de o echarts-for-react ligar os eventos, por isso ele vem do onChartReady; os seguintes vêm do
 * evento 'finished'.
 */
export default function DistributionChart({ option, height, fill }: DistributionChartProps) {
  // o relógio começa quando a option nova chega, ainda no render, antes de o ECharts desenhar
  const optionCreatedAt = useMemo(() => performance.now(), [option]);
  const latestCreatedAt = useRef(optionCreatedAt);
  latestCreatedAt.current = optionCreatedAt;
  const measuredAt = useRef<number | null>(null);
  const [renderMs, setRenderMs] = useState<number>();

  // handler estável: o echarts-for-react guarda o onChartReady e o onEvents antes de terminar o init
  const handleDrawn = useCallback(() => {
    const createdAt = latestCreatedAt.current;
    // o 'finished' volta a disparar a cada hover: só o primeiro desenho de cada option conta
    if (measuredAt.current === createdAt) return;
    measuredAt.current = createdAt;
    setRenderMs(Math.round(performance.now() - createdAt));
  }, []);

  const onEvents = useMemo(() => ({ finished: handleDrawn }), [handleDrawn]);

  return (
    <Box
      data-testid="distribution-chart"
      data-render-ms={renderMs}
      width="100%"
      sx={fill ? { flex: 1, minHeight: height, position: 'relative' } : undefined}
    >
      <ReactEcharts
        option={option}
        notMerge
        onChartReady={handleDrawn}
        onEvents={onEvents}
        // absoluto: a altura em % não resolve num item flex, e o canvas não impede o cartão de encolher
        style={fill ? { position: 'absolute', height: '100%', width: '100%' } : { height, width: '100%' }}
      />
    </Box>
  );
}
