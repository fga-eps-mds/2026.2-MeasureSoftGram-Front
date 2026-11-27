import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PreConfigData } from '@customTypes/preConfig';
import WeightsSummary from '../WeightsSummary';
import WeightMethodSelector from '../../WeightMethodSelector/WeightMethodSelector';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { name?: string }) => (options?.name ? `${key}(${options.name})` : key),
  }),
}));

const config: PreConfigData = {
  characteristics: [
    {
      key: 'reliability',
      weight: 40,
      active: true,
      goal: 50,
      subcharacteristics: [
        { key: 'testing_status', weight: 50, active: true, measures: [{ key: 'passed_tests', weight: 100, active: true, metrics: [] }] },
        { key: 'maturity', weight: 50, active: true, measures: [{ key: 'ci_feedback_time', weight: 100, active: true, metrics: [] }] },
      ],
    },
    {
      key: 'maintainability',
      weight: 60,
      active: true,
      goal: 50,
      subcharacteristics: [
        { key: 'modifiability', weight: 100, active: true, measures: [{ key: 'technical_debt_ratio', weight: 100, active: true, metrics: [] }] },
      ],
    },
  ],
};

describe('WeightsSummary', () => {
  it('lista os grupos numerados, com os pesos e como cada um foi definido', () => {
    render(<WeightsSummary configPageData={config} method="typed" onEdit={jest.fn()} />);

    const caracteristicas = within(screen.getByTestId('summary-group-characteristics'));
    expect(caracteristicas.getByText(/1\. groupCharacteristics/)).toBeInTheDocument();
    expect(caracteristicas.getByText('badgeQuantitative')).toBeInTheDocument();
    expect(caracteristicas.getByText('characteristics.reliability 40 · characteristics.maintainability 60')).toBeInTheDocument();

    const subManutenibilidade = within(screen.getByTestId('summary-group-maintainability/subcharacteristics'));
    expect(subManutenibilidade.getByText(/groupSub\(characteristics.maintainability\)/)).toBeInTheDocument();
    expect(subManutenibilidade.getByText('badgeSingleWeight')).toBeInTheDocument();
  });

  it('EDITAR avisa qual grupo será editado', () => {
    const onEdit = jest.fn();
    render(<WeightsSummary configPageData={config} method="typed" onEdit={onEdit} />);

    fireEvent.click(within(screen.getByTestId('summary-group-reliability/testing_status/measures')).getByText('edit'));
    expect(onEdit).toHaveBeenCalledWith(expect.objectContaining({ path: 'reliability/testing_status/measures' }));
  });
});

describe('WeightMethodSelector', () => {
  it('avisa a forma escolhida', () => {
    const onChange = jest.fn();
    render(<WeightMethodSelector value="ahp" onChange={onChange} />);

    expect(screen.getByLabelText('methodQualitative')).toBeChecked();
    fireEvent.click(screen.getByLabelText('methodQuantitative'));
    expect(onChange).toHaveBeenCalledWith('typed');
  });

  it('desabilita a qualitativa enquanto ela não está disponível', () => {
    render(<WeightMethodSelector value="typed" onChange={jest.fn()} qualitativeEnabled={false} />);
    expect(screen.getByLabelText('methodQualitative')).toBeDisabled();
  });
});
