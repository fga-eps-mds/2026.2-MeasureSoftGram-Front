import React from 'react';
import { act, fireEvent, render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { downloadCsv } from '@utils/exportCsv';
import { QUALITY_BANDS } from '@utils/qualityBands';
import PulseChart, { getReferenceRelease } from '../PulseChart';
import type { TsqmiReleasePoint } from '@customTypes/product';

const mockUsePulseChartData = jest.fn();
const mockUseProductQualityBands = jest.fn();

jest.mock('@utils/exportCsv', () => ({ downloadCsv: jest.fn(), downloadCsvZip: jest.fn() }));
jest.mock('@hooks/useProductQualityBands', () => ({
  useProductQualityBands: () => mockUseProductQualityBands(),
}));
jest.mock('../usePulseChartData', () => ({
  usePulseChartData: () => mockUsePulseChartData(),
}));

const defaultChartData = () => ({
  allRepositories: [
    { id: 1, name: '2022-1-MeasureSoftGram-CLI' },
    { id: 2, name: '2022-1-MeasureSoftGram-Front' },
  ],
  filteredRepositories: [
    {
      id: 1,
      name: '2022-1-MeasureSoftGram-CLI',
      measurements: [{ created_at: '2026-08-21T12:00:00Z', value: 0.918 }],
      releases: [{ name: 'Release 1', version: 'v2025.3.0', end_at: '2026-08-21T12:00:00Z' }],
    },
  ],
  selectedRepo: 'all',
  setSelectedRepo: jest.fn(),
  startDate: '',
  setStartDate: jest.fn(),
  endDate: '',
  setEndDate: jest.fn(),
  totalMeasurements: 10,
  selectedMeasurements: 10,
  latestDate: '25/09/2026',
  releasesInPeriod: 2,
  isLoading: false,
  error: null,
  retry: jest.fn(),
});

const mockEchartsOption = jest.fn();

jest.mock('next/dynamic', () => () => ({ option, notMerge }: { option: unknown; notMerge?: boolean }) => {
  mockEchartsOption(option, notMerge);
  return <div data-testid="echarts-mock" />;
});

describe('<PulseChart />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePulseChartData.mockReturnValue(defaultChartData());
    mockUseProductQualityBands.mockReturnValue({
      bands: QUALITY_BANDS,
      isError: false,
      isLoading: false,
      retry: jest.fn(),
    });
  });

  // o jsdom não tem a API de fontes; o teste que a simula não pode deixá-la para os seguintes
  afterEach(() => {
    delete (document as unknown as { fonts?: unknown }).fonts;
  });

  it('mostra o aviso quando o carregamento das faixas do produto falha e segue renderizando o gráfico com o padrão', () => {
    const retryBands = jest.fn();
    mockUseProductQualityBands.mockReturnValue({
      bands: QUALITY_BANDS,
      isError: true,
      isLoading: false,
      retry: retryBands,
    });

    const { getByText, getByTestId, getByRole } = render(<PulseChart organizationId="1" productId="1" />);

    expect(getByText('Não foi possível carregar as faixas do produto')).toBeInTheDocument();
    expect(getByTestId('echarts-mock')).toBeInTheDocument();
    expect(getByText('A · Ótimo (0,80 a 1,00)')).toBeInTheDocument();

    fireEvent.click(getByRole('button', { name: 'Tentar novamente' }));
    expect(retryBands).toHaveBeenCalledTimes(1);
  });

  it('o tooltip de release usa as faixas do produto: com A a partir de 0,85, 0,82 é B', () => {
    const limits: Record<string, object> = { B: { max: 0.85 }, A: { min: 0.85 } };
    const productBands = QUALITY_BANDS.map((band) => ({ ...band, ...limits[band.grade] }));
    mockUseProductQualityBands.mockReturnValue({ bands: productBands, isError: false, isLoading: false, retry: jest.fn() });
    render(<PulseChart organizationId="1" productId="1" />);

    const { formatter } = mockEchartsOption.mock.calls[mockEchartsOption.mock.calls.length - 1][0].tooltip;
    const release = { name: 'Release 1', version: 'v2025.3.0', end_at: '2026-08-21T12:00:00Z' };
    const tooltip = formatter([{ seriesName: 'CLI', seriesIndex: 1, dataIndex: 0, data: { release, value: [0, 0.82] } }]);

    expect(tooltip).toContain('Muito bom');
    expect(tooltip).not.toContain('Ótimo');
  });

  it('refaz o gráfico a cada atualização, sem mesclar com as faixas do filtro anterior', () => {
    render(<PulseChart organizationId="1" productId="1" />);

    const [, notMerge] = mockEchartsOption.mock.calls[mockEchartsOption.mock.calls.length - 1];
    expect(notMerge).toBe(true);
  });

  // o canvas não troca a fonte quando ela chega: desenhando antes, os eixos e as etiquetas ficam na fonte reserva
  it('só desenha o pulso depois de a fonte do canvas carregar', async () => {
    let fontArrived: () => void = () => undefined;
    const load = jest.fn(
      () =>
        new Promise<void>((resolve) => {
          fontArrived = resolve;
        })
    );
    Object.defineProperty(document, 'fonts', { configurable: true, value: { load } });
    const lastOption = () => mockEchartsOption.mock.calls[mockEchartsOption.mock.calls.length - 1][0];

    render(<PulseChart organizationId="1" productId="1" />);

    expect(load).toHaveBeenCalledWith('11px Roboto');
    expect(lastOption()).toEqual({});

    await act(async () => fontArrived());

    expect(lastOption().series).toHaveLength(1);
  });

  it('desenha o pulso sem linhas horizontais e sem a etiqueta de início das releases', () => {
    mockUsePulseChartData.mockReturnValue({
      ...defaultChartData(),
      filteredRepositories: [
        {
          ...defaultChartData().filteredRepositories[0],
          releases: [
            { name: 'Release 1', version: 'Release 1', start_at: '2026-08-01T12:00:00Z', end_at: '2026-08-21T12:00:00Z' },
          ],
        },
      ],
    });

    render(<PulseChart organizationId="1" productId="1" />);

    const option = mockEchartsOption.mock.calls[mockEchartsOption.mock.calls.length - 1][0];
    expect(option.yAxis[0].splitLine.show).toBe(false);
    expect(option.series[0].markLine.data.map((line: any) => [line.name, line.label.show])).toEqual([
      ['Início Release 1', false],
      ['Release 1', true],
    ]);
  });

  it('mostra o carregamento enquanto busca os dados', () => {
    mockUsePulseChartData.mockReturnValue({ ...defaultChartData(), isLoading: true });

    const { getByRole } = render(<PulseChart organizationId="1" productId="1" />);

    expect(getByRole('progressbar')).toBeInTheDocument();
  });

  it('mostra um alerta quando a busca falha', () => {
    mockUsePulseChartData.mockReturnValue({ ...defaultChartData(), error: new Error('falhou') });

    const { getByText } = render(<PulseChart organizationId="1" productId="1" />);

    expect(getByText('Não foi possível carregar os dados do gráfico de pulso.')).toBeInTheDocument();
  });

  // CA4 da US07.01: o erro precisa de "Tentar novamente", e o estado sem dados, de uma mensagem que diga o que fazer.
  // A tela dava sempre "ajuste as datas", mesmo quando o filtro não era a causa (ressalva do PO em 03/11/2026).
  it('refaz a busca pelo "Tentar novamente" do alerta de erro', () => {
    const chartData = { ...defaultChartData(), error: new Error('falhou') };
    mockUsePulseChartData.mockReturnValue(chartData);

    const { getByRole } = render(<PulseChart organizationId="1" productId="1" />);
    fireEvent.click(getByRole('button', { name: 'Tentar novamente' }));

    expect(chartData.retry).toHaveBeenCalledTimes(1);
  });

  it('manda importar um repositório quando o produto não tem nenhum', () => {
    mockUsePulseChartData.mockReturnValue({
      ...defaultChartData(),
      allRepositories: [],
      filteredRepositories: [],
      totalMeasurements: 0,
      selectedMeasurements: 0,
    });

    const { getByText, queryByText } = render(<PulseChart organizationId="1" productId="1" />);

    expect(getByText('Este produto ainda não tem repositórios')).toBeInTheDocument();
    expect(getByText(/Importe um repositório ao produto/)).toBeInTheDocument();
    expect(queryByText(/Ajuste as datas/)).not.toBeInTheDocument();
  });

  it('manda rodar a coleta quando o produto tem repositório mas nenhuma medição', () => {
    mockUsePulseChartData.mockReturnValue({
      ...defaultChartData(),
      filteredRepositories: [{ id: 1, name: '2022-1-MeasureSoftGram-CLI', measurements: [], releases: [] }],
      totalMeasurements: 0,
      selectedMeasurements: 0,
    });

    const { getByText, queryByText } = render(<PulseChart organizationId="1" productId="1" />);

    expect(getByText('Ainda não há medições neste produto')).toBeInTheDocument();
    expect(getByText(/Action do MeasureSoftGram analisa os repositórios/)).toBeInTheDocument();
    expect(queryByText(/Ajuste as datas/)).not.toBeInTheDocument();
  });

  it('manda ajustar o período só quando há medições fora da janela escolhida', () => {
    mockUsePulseChartData.mockReturnValue({
      ...defaultChartData(),
      filteredRepositories: [{ id: 1, name: '2022-1-MeasureSoftGram-CLI', measurements: [], releases: [] }],
      totalMeasurements: 10,
      selectedMeasurements: 0,
    });

    const { getByText } = render(<PulseChart organizationId="1" productId="1" />);

    expect(getByText('Nenhuma medição no período selecionado')).toBeInTheDocument();
    expect(getByText(/Ajuste as datas De\/Até/)).toBeInTheDocument();
  });

  it('exporta os repositórios filtrados em CSV pelo botão padrão dos dashboards', () => {
    const { getByRole } = render(<PulseChart organizationId="1" productId="1" />);
    fireEvent.click(getByRole('button', { name: 'Exportar .csv' }));

    expect(downloadCsv).toHaveBeenCalledTimes(1);
    const [dashboard, chart] = (downloadCsv as jest.Mock).mock.calls[0];
    expect(dashboard).toBe('produto');
    expect(chart.name).toBe('pulso');
    expect(chart.rows).toEqual([
      { repository: '2022-1-MeasureSoftGram-CLI', date: '2026-08-21T12:00:00Z', value: 0.918, grade: 'A' },
    ]);
  });

  it('deixa o botão de exportar desabilitado quando não há repositórios filtrados', () => {
    mockUsePulseChartData.mockReturnValue({ ...defaultChartData(), filteredRepositories: [] });

    const { getByRole } = render(<PulseChart organizationId="1" productId="1" />);

    expect(getByRole('button', { name: 'Exportar .csv' })).toBeDisabled();
  });

  it('renders pulse chart header, legend and summary correctly', () => {
    const { getByText, queryByText } = render(<PulseChart organizationId="1" productId="1" />);

    expect(getByText('Gráfico MSG — Evolução de Qualidade por Release')).toBeInTheDocument();
    expect(getByText(/ponto = indicador consolidado no encerramento da Release/)).toBeInTheDocument();
    expect(getByText('A · Ótimo (0,80 a 1,00)')).toBeInTheDocument();
    expect(getByText('B · Muito bom (0,60 a 0,79)')).toBeInTheDocument();
    expect(getByText('C · Bom (0,40 a 0,59)')).toBeInTheDocument();
    expect(getByText('D · Ruim (0,20 a 0,39)')).toBeInTheDocument();
    expect(getByText('E · Muito ruim (0,00 a 0,19)')).toBeInTheDocument();
    expect(getByText('2022-1-MeasureSoftGram-CLI')).toBeInTheDocument();
    expect(getByText('0.918')).toBeInTheDocument();
    expect(
      getByText(/1 repositório • 10 medições no período selecionado • 2 Releases no período • última medição: 25\/09\/2026/)
    ).toBeInTheDocument();
    expect(queryByText('Renderizado com Apache ECharts')).not.toBeInTheDocument();
  });

  it('mostra a legenda da pior para a melhor faixa', () => {
    const { getAllByText } = render(<PulseChart organizationId="1" productId="1" />);

    expect(getAllByText(/^[A-E] · /).map((el) => el.textContent?.[0])).toEqual(['E', 'D', 'C', 'B', 'A']);
  });

  it('põe o botão de exportar logo depois do filtro de período', () => {
    const { getByRole, getByLabelText } = render(<PulseChart organizationId="1" productId="1" />);

    const endDate = getByLabelText('Até');
    const exportButton = getByRole('button', { name: 'Exportar .csv' });
    expect(endDate.compareDocumentPosition(exportButton) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  // pedido do PO em 08/10 (US06.01): o filtro fica abaixo do gráfico
  it('põe o filtro de período depois do gráfico', () => {
    const { getByTestId, getByLabelText } = render(<PulseChart organizationId="1" productId="1" />);

    const chart = getByTestId('echarts-mock');
    expect(chart.compareDocumentPosition(getByLabelText('De')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('mostra na barra lateral a variação em relação à última release com indicador', () => {
    mockUsePulseChartData.mockReturnValue({
      ...defaultChartData(),
      filteredRepositories: [
        {
          ...defaultChartData().filteredRepositories[0],
          releases: [
            { id: 1, name: 'v2025.4.0 Release 2', version: 'v2025.4.0 Release 2', end_at: '2026-08-20T12:00:00Z', tsqmi: { value: 0.95 } },
            { id: 2, name: 'Release 3', version: 'Release 3', end_at: '2026-08-21T12:00:00Z', tsqmi: { value: null } },
          ],
        },
      ],
    });

    const { getByText } = render(<PulseChart organizationId="1" productId="1" />);

    // 0,918 contra 0,95: −3,37%; a Release 3 não tem indicador
    expect(getByText('▼ 3,37% vs. v2025.4.0 Release 2')).toBeInTheDocument();
    expect(getByText('último indicador TSQMI · ótimo')).toBeInTheDocument();
  });

  it('a variação da barra lateral não usa a release cuja janela inclui a última medição', () => {
    // só o valor importa aqui; os outros campos do ponto não entram na conta
    const tsqmi = (value: number) => ({ value }) as TsqmiReleasePoint;
    const releases = [
      { id: 1, name: 'Release 1', version: 'Release 1', end_at: '2026-08-10T12:00:00Z', tsqmi: tsqmi(0.9) },
      // encerra depois da última medição (21/08): o indicador dela é essa mesma medição
      { id: 2, name: 'Release 2', version: 'Release 2', end_at: '2026-09-30T12:00:00Z', tsqmi: tsqmi(0.918) },
    ];

    expect(getReferenceRelease(releases, [{ created_at: '2026-08-21T12:00:00Z', value: 0.918 }])).toEqual({
      name: 'Release 1',
      value: 0.9,
    });
    expect(getReferenceRelease(releases.slice(1), [{ created_at: '2026-08-21T12:00:00Z', value: 0.918 }])).toBeUndefined();
  });

  it('mostra a etiqueta das releases em todas as faixas', () => {
    const repo = {
      ...defaultChartData().filteredRepositories[0],
      releases: [{ id: 1, name: 'Release 1', version: 'Release 1', end_at: '2026-08-21T12:00:00Z' }],
    };
    mockUsePulseChartData.mockReturnValue({ ...defaultChartData(), filteredRepositories: [repo, { ...repo, id: 2 }] });

    render(<PulseChart organizationId="1" productId="1" />);

    const option = mockEchartsOption.mock.calls[mockEchartsOption.mock.calls.length - 1][0];
    expect(option.series.map((series: any) => series.markLine.data[0].label.show)).toEqual([true, true]);
  });
});
