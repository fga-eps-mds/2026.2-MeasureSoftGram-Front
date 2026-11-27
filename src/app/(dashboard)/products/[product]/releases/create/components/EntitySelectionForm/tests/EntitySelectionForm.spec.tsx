import React, { useEffect, useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PreConfigData } from '@customTypes/preConfig';
import EntitySelectionForm from '../EntitySelectionForm';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const initial: PreConfigData = {
  characteristics: [
    {
      key: 'reliability',
      weight: 50,
      active: true,
      goal: 50,
      subcharacteristics: [
        { key: 'maturity', weight: 100, active: true, measures: [{ key: 'ci_feedback_time', weight: 100, active: true, metrics: [] }] },
      ],
    },
    {
      key: 'maintainability',
      weight: 50,
      active: true,
      goal: 50,
      subcharacteristics: [
        { key: 'modifiability', weight: 100, active: true, measures: [{ key: 'technical_debt_ratio', weight: 100, active: true, metrics: [] }] },
      ],
    },
  ],
};

const onConfigChange = jest.fn();
const setChangeRefValue = jest.fn();
const latestConfig = (): PreConfigData => onConfigChange.mock.calls[onConfigChange.mock.calls.length - 1][0];

function Harness() {
  const [config, setConfig] = useState<PreConfigData | undefined>(initial);
  useEffect(() => onConfigChange(config), [config]);
  return (
    <EntitySelectionForm
      configPageData={config!}
      setConfigPageData={setConfig}
      changeRefValue={false}
      setChangeRefValue={setChangeRefValue}
    />
  );
}

describe('EntitySelectionForm', () => {
  it('mostra só a seleção, sem pesos', () => {
    render(<Harness />);

    expect(screen.getByText('defineUsedCharacteristics')).toBeInTheDocument();
    expect(screen.getByLabelText('characteristics.reliability')).toBeChecked();
    expect(screen.queryByRole('slider')).not.toBeInTheDocument();
    expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument();
  });

  it('desmarcar uma característica tira as subcaracterísticas dela da tela', () => {
    render(<Harness />);

    expect(screen.getByLabelText('subCharacteristics.modifiability')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('characteristics.maintainability'));

    expect(latestConfig().characteristics[1].active).toBe(false);
    expect(screen.queryByLabelText('subCharacteristics.modifiability')).not.toBeInTheDocument();
  });

  it('marca e desmarca subcaracterísticas e medidas', () => {
    render(<Harness />);

    fireEvent.click(screen.getByLabelText('subCharacteristics.maturity'));
    expect(latestConfig().characteristics[0].subcharacteristics[0].active).toBe(false);

    fireEvent.click(screen.getByLabelText('measures.technical_debt_ratio'));
    expect(latestConfig().characteristics[1].subcharacteristics[0].measures[0].active).toBe(false);
  });

  it('liga os valores de referência pela chave', () => {
    render(<Harness />);

    fireEvent.click(screen.getByLabelText('changeRefValues'));
    expect(setChangeRefValue).toHaveBeenCalledWith(true);
  });
});
