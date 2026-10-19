import React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen, within } from '@testing-library/react';
import PlannedVsAccomplishedEqualizer, {
  TRACK_HEIGHT,
  buildCurvePath,
  getColumnWidth,
} from '../PlannedVsAccomplishedEqualizer';

const planned = [
  { name: 'reliability', value: 0.7, diff: 0 },
  { name: 'maintainability', value: 0.5, diff: 0 },
  { name: 'security', value: 0.4, diff: 0 },
];

const accomplished = [
  { name: 'reliability', value: 0.7, diff: 0 },
  { name: 'maintainability', value: 0.3, diff: 0.2 },
  { name: 'security', value: 0.6, diff: 0 },
];

describe('PlannedVsAccomplishedEqualizer', () => {
  it('renderiza um trilho por característica planejada, com o cursor no Rp', () => {
    render(<PlannedVsAccomplishedEqualizer planned={planned} accomplished={accomplished} normDiff={0.21} />);

    planned.forEach((characteristic) => {
      const slider = within(screen.getByTestId(`equalizer-slider-${characteristic.name}`)).getByRole('slider');
      expect(slider).toHaveAttribute('aria-valuenow', String(characteristic.value));
      expect(slider).toHaveAttribute('aria-orientation', 'vertical');
    });
  });

  it('projeta as curvas do planejado e do realizado e exibe a legenda', () => {
    render(<PlannedVsAccomplishedEqualizer planned={planned} accomplished={accomplished} />);

    expect(screen.getByTestId('equalizer-curve-planned')).toBeInTheDocument();
    expect(screen.getByTestId('equalizer-curve-accomplished')).toBeInTheDocument();

    const legend = screen.getByTestId('equalizer-legend');
    expect(legend).toHaveTextContent('equalizer.legend.planned');
    expect(legend).toHaveTextContent('equalizer.legend.accomplished');
    expect(legend).toHaveTextContent('equalizer.legend.cursor');
  });

  it('não exibe a escala vertical de 0 a 1', () => {
    const { container } = render(<PlannedVsAccomplishedEqualizer planned={planned} accomplished={accomplished} />);

    expect(container.querySelector('.MuiChartsAxis-root')).toBeNull();
    expect(container.querySelector('.MuiSlider-mark')).toBeNull();
  });

  it('exibe os vetores Rp, Rd, Rc e Rp − Rd na ordem das características', () => {
    render(<PlannedVsAccomplishedEqualizer planned={planned} accomplished={accomplished} normDiff={0.21} />);

    expect(screen.getByTestId('vector-rp')).toHaveTextContent('Rp0.700.500.40');
    expect(screen.getByTestId('vector-rd')).toHaveTextContent('Rd0.700.300.60');
    expect(screen.getByTestId('vector-rc')).toHaveTextContent('Rc = max(0, Rp − Rd)0.000.200.00');
    expect(screen.getByTestId('vector-delta')).toHaveTextContent('Rp − Rd0.000.20-0.20');
    expect(screen.getByTestId('equalizer-norm-diff')).toHaveTextContent('0.21');
  });

  it('indica a situação com símbolo e texto, e não apenas por cor', () => {
    render(<PlannedVsAccomplishedEqualizer planned={planned} accomplished={accomplished} />);

    const status = screen.getByTestId('vector-status');
    expect(status).toHaveTextContent('= equalizer.status.equal');
    expect(status).toHaveTextContent('▼ equalizer.status.below');
    expect(status).toHaveTextContent('▲ equalizer.status.above');
  });

  it('mostra planejado, realizado, diferença e situação ao passar o mouse', async () => {
    render(<PlannedVsAccomplishedEqualizer planned={planned} accomplished={accomplished} />);

    fireEvent.mouseOver(screen.getByTestId('equalizer-track-maintainability'));

    const tooltip = await screen.findByTestId('equalizer-tooltip-maintainability');
    expect(tooltip).toHaveTextContent('(Rp): 0.50');
    expect(tooltip).toHaveTextContent('(Rd): 0.30');
    expect(tooltip).toHaveTextContent('(Rp − Rd): 0.20');
    expect(tooltip).toHaveTextContent('equalizer.status.below');
  });

  it('sinaliza característica sem valor realizado como sem dado, sem exibir zero', () => {
    render(
      <PlannedVsAccomplishedEqualizer
        planned={planned}
        accomplished={[accomplished[0], accomplished[2]]}
      />,
    );

    expect(screen.getByTestId('vector-rd')).toHaveTextContent('Rd0.70equalizer.noData0.60');
    expect(screen.getByTestId('vector-status')).toHaveTextContent('equalizer.status.no-data');
    expect(screen.queryByTestId('equalizer-marker-accomplished-maintainability')).not.toBeInTheDocument();
    expect(screen.getByTestId('equalizer-marker-accomplished-security')).toBeInTheDocument();
  });

  it('exibe apenas o planejado e avisa quando a release ainda não tem análise', () => {
    render(<PlannedVsAccomplishedEqualizer planned={planned} />);

    expect(screen.getByTestId('equalizer-no-accomplished')).toBeInTheDocument();
    expect(screen.getByTestId('equalizer-curve-planned')).toBeInTheDocument();
    expect(screen.queryByTestId('equalizer-curve-accomplished')).not.toBeInTheDocument();
    expect(screen.queryByTestId('vector-status')).not.toBeInTheDocument();
  });

  it('não exibe o equalizador quando a release não tem planejamento', () => {
    render(<PlannedVsAccomplishedEqualizer planned={[]} accomplished={accomplished} />);

    expect(screen.getByTestId('equalizer-no-planning')).toHaveTextContent('equalizer.noPlanning');
    expect(screen.queryByTestId('planned-vs-accomplished-equalizer')).not.toBeInTheDocument();
  });
});

describe('helpers do equalizador', () => {
  it('mantém colunas de largura fixa para poucas características', () => {
    expect(getColumnWidth(2)).toBe(120);
    expect(getColumnWidth(6)).toBe(120);
    expect(getColumnWidth(8)).toBe(100);
  });

  it('interrompe a curva onde não há valor', () => {
    const path = buildCurvePath([1, null, 0], 100);

    expect(path).toBe(`M50 0 M250 ${TRACK_HEIGHT}`);
    expect(buildCurvePath([0.5, 0.5], 100)).toBe(`M50 ${TRACK_HEIGHT / 2} L150 ${TRACK_HEIGHT / 2}`);
  });
});
