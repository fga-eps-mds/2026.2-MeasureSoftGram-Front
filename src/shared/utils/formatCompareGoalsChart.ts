import { IReleases } from '@customTypes/product';
import i18n from '../i18n/i18n';

const formatCompareGoalsChart = (data: IReleases) => ({
  title: {
    text: i18n.t('dashboards:compare-goals.title'),
    subtext: i18n.t('dashboards:compare-goals.created-by', { user: data?.created_by }),
    subtextStyle: {
      color: '#4461A5',
      fontSize: 14
    }
  },
  toolbox: {
    show: true,
    feature: {
      dataZoom: {
        yAxisIndex: 'none'
      },
      magicType: {
        type: ['line', 'bar']
      },
      saveAsImage: {}
    }
  },
  grid: {
    left: '3%',
    right: '4%',
    bottom: '12%',
    top: '20%',
    containLabel: true
  },
  tooltip: {
    trigger: 'item'
  },
  legend: {
    data: [i18n.t('dashboards:compare-goals.accomplished'), i18n.t('dashboards:compare-goals.planned')],
    left: 'center'
  },
  xAxis: {
    type: 'category',
    data: {
      reliability: 0.8,
      maintainability: 0.9
    },
    boundaryGap: true
  },
  yAxis: {
    type: 'value',
    min: 0,
    max: 1,
    boundaryGap: [0, 0.1]
  },
  series: [
    {
      name: i18n.t('dashboards:compare-goals.planned'),
      type: 'line',
      data: 0.7
    },
    {
      name: i18n.t('dashboards:compare-goals.accomplished'),
      type: 'line',
      data: {
        reliability: 1,
        maintainability: 1
      }
    }
  ]
});

export default formatCompareGoalsChart;
