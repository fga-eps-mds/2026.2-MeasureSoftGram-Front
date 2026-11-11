import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useRouter } from 'next/router';
import { useRepositoryContext } from '@contexts/RepositoryProvider';
import { useProductQualityBands } from '@hooks/useProductQualityBands';
import { QUALITY_BANDS, QualityBand } from '@utils/qualityBands';
import Header from '../Header';

type GaugeSeriesOption = {
  type: string;
  startAngle: number;
  endAngle: number;
  min: number;
  max: number;
  axisLine: { lineStyle: { color: [number, string][] } };
  pointer: { show: boolean };
  detail?: { formatter?: string };
  data: { value: number }[];
};

type GaugeOption = {
  series: GaugeSeriesOption;
};

const mockECharts = jest.fn(({ option }: { option: GaugeOption }) => (
  <div data-testid="gauge" data-value={option.series.data[0]?.value} />
));

jest.mock('@components/ECharts', () => ({
  __esModule: true,
  default: (props: { option: GaugeOption }) => mockECharts(props)
}));

jest.mock('next/router', () => ({
  useRouter: jest.fn()
}));

jest.mock('@contexts/RepositoryProvider', () => ({
  useRepositoryContext: jest.fn()
}));

jest.mock('@hooks/useProductQualityBands', () => ({
  useProductQualityBands: jest.fn()
}));

jest.mock('../../CopyBadgeModal', () => ({
  __esModule: true,
  default: () => <div data-testid="copy-badge-modal" />
}));

const CUSTOM_BANDS: QualityBand[] = [
  { ...QUALITY_BANDS[0], min: 0, max: 0.2 },
  { ...QUALITY_BANDS[1], min: 0.2, max: 0.4 },
  { ...QUALITY_BANDS[2], min: 0.4, max: 0.6 },
  { ...QUALITY_BANDS[3], min: 0.6, max: 0.85 },
  { ...QUALITY_BANDS[4], min: 0.85, max: 1 }
];

describe('Header', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({
      query: { product: '1-5-MeasureSoftGram' }
    });
    (useRepositoryContext as jest.Mock).mockReturnValue({
      currentRepository: {
        name: '2026.2-MeasureSoftGram-Front',
        description: 'Frontend do MeasureSoftGram'
      },
      latestTSQMI: {
        id: 1,
        value: 0.82,
        created_at: '2026-03-01T10:00:00Z'
      }
    });
    (useProductQualityBands as jest.Mock).mockReturnValue({
      bands: CUSTOM_BANDS,
      isError: false,
      isLoading: false,
      retry: jest.fn()
    });
  });

  it('renderiza o velocímetro com as 5 faixas do produto e o ponteiro no TSQMI atual', () => {
    render(<Header />);

    expect(useProductQualityBands).toHaveBeenCalledWith('1', '5');
    expect(screen.getByTestId('gauge')).toBeInTheDocument();
    expect(mockECharts).toHaveBeenCalledTimes(1);

    const { option } = mockECharts.mock.calls[0][0] as { option: GaugeOption };
    expect(option.series.type).toBe('gauge');
    expect(option.series.startAngle).toBe(180);
    expect(option.series.endAngle).toBe(360);
    expect(option.series.min).toBe(0);
    expect(option.series.max).toBe(1);
    expect(option.series.axisLine.lineStyle.color).toEqual([
      [0.2, '#BE2E0E'],
      [0.4, '#F16141'],
      [0.6, '#EBA133'],
      [0.85, '#0DC889'],
      [1, '#04724D']
    ]);
    expect(option.series.pointer).toEqual({ show: true });
    expect(option.series.data).toEqual([{ value: 0.82 }]);
    expect(option.series.detail?.formatter).toBe('0,82 (B)');
  });

  it('não renderiza o velocímetro quando latestTSQMI não está disponível', () => {
    (useRepositoryContext as jest.Mock).mockReturnValue({
      currentRepository: {
        name: '2026.2-MeasureSoftGram-Front',
        description: 'Frontend do MeasureSoftGram'
      },
      latestTSQMI: undefined
    });

    render(<Header />);

    expect(screen.queryByTestId('gauge')).toBeNull();
    expect(mockECharts).not.toHaveBeenCalled();
  });

  it('exibe o link adjust_bands apontando para as configurações do produto', () => {
    render(<Header />);

    const adjustLink = screen.getByRole('link', { name: 'adjust_bands' });
    expect(adjustLink).toHaveAttribute('href', '/products/1-5-MeasureSoftGram/settings');
  });

  it('não exibe mais o botão de engrenagem nem o modal antigo de intervalos', () => {
    render(<Header />);

    expect(screen.queryByTestId('SettingsIcon')).toBeNull();
    expect(screen.queryByText('edit_intervals')).toBeNull();
  });

  it('exibe o título com o nome e a descrição do repositório', () => {
    render(<Header />);

    expect(screen.getByText('repository')).toBeInTheDocument();
    expect(screen.getByText('2026.2-MeasureSoftGram-Front')).toBeInTheDocument();
    expect(screen.getByText('Frontend do MeasureSoftGram')).toBeInTheDocument();
    expect(screen.getByTestId('copy-badge-modal')).toBeInTheDocument();
  });
});
