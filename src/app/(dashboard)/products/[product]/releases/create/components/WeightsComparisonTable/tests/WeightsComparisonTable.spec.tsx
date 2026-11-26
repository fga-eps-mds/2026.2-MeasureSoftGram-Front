import React from 'react';
import { render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import WeightsComparisonTable from '../WeightsComparisonTable';
import { WeightComparisonRow } from '../../../utils/weightsComparison';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const rows: WeightComparisonRow[] = [
  { level: 'characteristic', key: 'reliability', last: 43, default: 34, differs: true },
  { level: 'subcharacteristic', key: 'maturity', last: null, default: 50, differs: true },
  { level: 'measure', key: 'test_builds', last: 33, default: 33, differs: false },
];

const weightCells = (key: string) => within(screen.getByTestId(`comparison-row-${key}`)).getAllByRole('cell');

describe('WeightsComparisonTable', () => {
  it('mostra as entidades traduzidas por nível e os dois pesos', () => {
    render(<WeightsComparisonTable rows={rows} highlight={null} lastColumnLabel="Última (R1)" />);

    expect(screen.getByText('Última (R1)')).toBeInTheDocument();
    expect(screen.getByText('characteristics.reliability')).toBeInTheDocument();
    expect(screen.getByText('subCharacteristics.maturity')).toBeInTheDocument();
    expect(screen.getByText('measures.test_builds')).toBeInTheDocument();

    const [, last, def] = weightCells('maturity');
    expect(last).toHaveTextContent('—');
    expect(def).toHaveTextContent('50');
  });

  it('marca só as linhas que diferem', () => {
    render(<WeightsComparisonTable rows={rows} highlight={null} lastColumnLabel="Última" />);

    expect(within(screen.getByTestId('comparison-row-reliability')).getByRole('img', { name: 'differsColumn' })).toBeInTheDocument();
    expect(within(screen.getByTestId('comparison-row-test_builds')).queryByRole('img')).not.toBeInTheDocument();
  });

  it('destaca a coluna do ponto de partida escolhido', () => {
    const { rerender } = render(<WeightsComparisonTable rows={rows} highlight="last" lastColumnLabel="Última" />);

    let [, last, def] = weightCells('reliability');
    expect(last).toHaveStyle({ fontWeight: 700 });
    expect(def).toHaveStyle({ fontWeight: 400 });

    rerender(<WeightsComparisonTable rows={rows} highlight="default" lastColumnLabel="Última" />);
    [, last, def] = weightCells('reliability');
    expect(last).toHaveStyle({ fontWeight: 400 });
    expect(def).toHaveStyle({ fontWeight: 700 });
  });
});
