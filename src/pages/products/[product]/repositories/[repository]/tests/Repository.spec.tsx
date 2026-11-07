import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { downloadCsvZip } from '@utils/exportCsv';
import { useRepositoryPulse } from '../hooks/useRepositoryPulse';
import { useQuery } from '../hooks/useQuery';
import { useDemoData } from '../hooks/useDemoData';
import Repository from '../Repository';

let mockLatestTSQMI: { id: number; value: number } | undefined;

jest.mock('next/router', () => ({ useRouter: () => ({ query: { product: '1-2-Produto', repository: '7-api' } }) }));
jest.mock('@hooks/useRequireAuth', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('@hooks/useProviderTerms', () => ({
  useProviderTerms: () => ({ terms: { Repository: 'Repositório', repository: 'repositório', providerName: 'GitHub' } }),
}));
jest.mock('@contexts/RepositoryProvider', () => ({
  useRepositoryContext: () => ({
    currentRepository: { id: 7, name: 'api' },
    latestTSQMI: mockLatestTSQMI,
    latestTSQMIBadgeUrl: 'badge-url',
  }),
}));
jest.mock('@utils/exportCsv', () => ({ downloadCsv: jest.fn(), downloadCsvZip: jest.fn() }));
jest.mock('../hooks/useRepositoryPulse', () => ({ useRepositoryPulse: jest.fn() }));
jest.mock('@components/ECharts', () => ({ __esModule: true, default: () => null, usePreloadECharts: jest.fn() }));
jest.mock('../hooks/useQuery', () => ({ useQuery: jest.fn() }));
jest.mock('../hooks/useDemoData', () => ({ useDemoData: jest.fn() }));
jest.mock('../components/Header', () => () => <div data-testid="repository-header" />);
jest.mock('../components/TsqmiBadge', () => ({ latestTSQMIBadgeUrl }: { latestTSQMIBadgeUrl: string }) => (
  <div data-testid="tsqmi-badge">{latestTSQMIBadgeUrl}</div>
));
jest.mock(
  '../components/RepositoryPulseChart',
  () =>
    ({ csv, isDemo }: { csv: { name: string; rows: unknown[] }; isDemo?: boolean }) =>
      (
        <div data-testid="repository-pulse" data-demo={String(!!isDemo)}>
          {`${csv.name}:${csv.rows.length}`}
        </div>
      )
);

const measurement = (value: number) => ({ created_at: '2026-03-01T10:00:00Z', value });
const pulseState = (overrides = {}) => ({
  rows: [{ id: 'reliability', name: 'Reliability', measurements: [measurement(0.5)], releases: [] }],
  hasMeasurements: true,
  isLoading: false,
  hasError: false,
  ...overrides,
});
const exportAllButton = () => screen.getByRole('button', { name: 'Exportar todos (.zip)' });
const demoHistory = {
  count: 1,
  results: [{ id: 1, key: 'reliability', name: 'Reliability', history: [measurement(0.4)] }]
};
const demoState = (overrides = {}) => ({
  data: undefined,
  isActive: false,
  isLoading: false,
  error: undefined,
  activate: jest.fn(),
  deactivate: jest.fn(),
  ...overrides
});
const activeDemoState = () =>
  demoState({
    isActive: true,
    data: {
      is_demo: true,
      notice: 'Dados fictícios de demonstração: não foram coletados deste repositório.',
      generated_at: '2026-11-06T12:00:00Z',
      latest_tsqmi: { id: null, value: 0.68, created_at: '2026-11-06T12:00:00Z' },
      tsqmi_history: [],
      historical_characteristics: demoHistory
    }
  });

describe('<Repository />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLatestTSQMI = { id: 1, value: 0.75 };
    (useDemoData as jest.Mock).mockReturnValue(demoState());
    (useRepositoryPulse as jest.Mock).mockReturnValue(pulseState());
    (useQuery as jest.Mock).mockReturnValue({ repositoryNotFound: false });
  });

  it('avisa que o usuário não tem acesso ao repositório no provedor quando o servidor responde 404', () => {
    (useQuery as jest.Mock).mockReturnValue({ repositoryNotFound: true });

    render(<Repository />);

    expect(screen.getByText('Você não tem acesso a este repositório no GitHub.')).toBeTruthy();
    expect(screen.queryByTestId('repository-header')).toBeNull();
  });

  it('monta a tela com cabeçalho, TSQMI, pulso das características e espaço para as medidas', () => {
    render(<Repository />);

    expect(screen.getByTestId('repository-header')).toBeTruthy();
    expect(screen.getByTestId('tsqmi-badge').textContent).toBe('badge-url');
    expect(screen.getByTestId('repository-measures-section')).toBeTruthy();
    expect(document.querySelector('iframe')).toBeNull();
  });

  it('desenha o pulso do repositório da rota', () => {
    render(<Repository />);

    expect(useRepositoryPulse).toHaveBeenCalledWith('1', '2', 7, undefined);
    expect(screen.getByTestId('repository-pulse').textContent).toBe('pulso:1');
  });

  it('exporta o pulso num .zip pelo botão do topo, com o nome do repositório', async () => {
    render(<Repository />);

    fireEvent.click(exportAllButton());
    await waitFor(() => expect(exportAllButton()).toBeEnabled());

    const [dashboard, charts] = (downloadCsvZip as jest.Mock).mock.calls[0];
    expect(dashboard).toBe('repositorio');
    expect(charts).toHaveLength(1);
    expect(charts[0].name).toBe('pulso');
    expect(charts[0].rows).toEqual([
      { repository: 'api', characteristic: 'Reliability', date: '2026-03-01T10:00:00Z', value: 0.5, grade: 'C' },
    ]);
  });

  it.each([
    ['sem medições no período', { rows: [] }],
    ['carregando', { isLoading: true }],
    ['com erro', { hasError: true }],
  ])('deixa o .zip desabilitado %s', (_label, overrides) => {
    (useRepositoryPulse as jest.Mock).mockReturnValue(pulseState(overrides));

    render(<Repository />);

    expect(exportAllButton()).toBeDisabled();
  });

  describe('repositório sem coleta real (#150)', () => {
    beforeEach(() => {
      mockLatestTSQMI = undefined;
      (useRepositoryPulse as jest.Mock).mockReturnValue(pulseState({ rows: [], hasMeasurements: false }));
    });

    it('mostra o estado vazio, sem badge nem pulso', () => {
      render(<Repository />);

      expect(screen.getByText('Ainda não há dados disponíveis para este repositório')).toBeInTheDocument();
      expect(screen.queryByTestId('tsqmi-badge')).toBeNull();
      expect(screen.queryByTestId('repository-pulse')).toBeNull();
      expect(screen.queryByTestId('demo-data-banner')).toBeNull();
    });

    it('não mostra o estado vazio enquanto o pulso carrega', () => {
      (useRepositoryPulse as jest.Mock).mockReturnValue(
        pulseState({ rows: [], hasMeasurements: false, isLoading: true })
      );

      render(<Repository />);

      expect(screen.queryByTestId('repository-empty-state')).toBeNull();
    });

    it('só pede os dados de demonstração quando a pessoa clica', () => {
      const demo = demoState();
      (useDemoData as jest.Mock).mockReturnValue(demo);

      render(<Repository />);
      expect(demo.activate).not.toHaveBeenCalled();

      fireEvent.click(screen.getByRole('button', { name: 'Ver dados de demonstração' }));
      expect(demo.activate).toHaveBeenCalledTimes(1);
    });

    it('no modo demonstração, mostra a faixa de aviso, o pulso fictício e não exporta nada', () => {
      const demo = activeDemoState();
      (useDemoData as jest.Mock).mockReturnValue(demo);
      (useRepositoryPulse as jest.Mock).mockReturnValue(pulseState());

      render(<Repository />);

      expect(useRepositoryPulse).toHaveBeenCalledWith('1', '2', 7, demoHistory);
      expect(screen.getByTestId('demo-data-banner')).toBeInTheDocument();
      expect(screen.getByText('Modo demonstração: dados fictícios')).toBeInTheDocument();
      expect(screen.getByTestId('demo-tsqmi')).toHaveTextContent('0,68');
      expect(screen.queryByTestId('tsqmi-badge')).toBeNull();
      expect(screen.getByTestId('repository-pulse')).toHaveAttribute('data-demo', 'true');
      expect(screen.getByTestId('repository-pulse').textContent).toBe('pulso:0');
      expect(exportAllButton()).toBeDisabled();
      expect(screen.queryByTestId('repository-empty-state')).toBeNull();

      fireEvent.click(screen.getByRole('button', { name: 'Sair da demonstração' }));
      expect(demo.deactivate).toHaveBeenCalledTimes(1);
    });
  });
});
