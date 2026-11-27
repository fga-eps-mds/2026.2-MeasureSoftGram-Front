import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PreConfigData, PreConfigMeta } from '@customTypes/preConfig';
import StartingPointSelector from '../StartingPointSelector';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, string>) => (options ? `${key} ${JSON.stringify(options)}` : key),
  }),
}));

const config = (reliability: number, maintainability: number): PreConfigData => ({
  characteristics: [
    {
      key: 'reliability',
      weight: reliability,
      active: true,
      goal: 50,
      subcharacteristics: [
        { key: 'maturity', weight: 100, active: true, measures: [{ key: 'ci_feedback_time', weight: 100, active: true, metrics: [] }] },
      ],
    },
    {
      key: 'maintainability',
      weight: maintainability,
      active: true,
      goal: 50,
      subcharacteristics: [
        { key: 'modifiability', weight: 100, active: true, measures: [{ key: 'technical_debt_ratio', weight: 100, active: true, metrics: [] }] },
      ],
    },
  ],
});

const padrao = config(50, 50);
const ultima = config(70, 30);

const metaCompleta: PreConfigMeta = {
  id: 7,
  name: 'produto',
  created_at: new Date('2026-11-30T12:00:00'),
  created_by: 'MilenaFRocha',
  has_ahp: true,
  release: { release_name: 'Release 2026.2 — Sprint 4', start_at: '2026-11-16T12:00:00', end_at: '2026-11-30T12:00:00' },
};

const metaAntiga: PreConfigMeta = { id: 3, name: 'produto', created_at: new Date('2026-05-10T12:00:00') };

describe('StartingPointSelector', () => {
  it('mostra os três pontos de partida e marca o escolhido', () => {
    render(
      <StartingPointSelector value="new" onChange={jest.fn()} lastConfigMeta={metaCompleta} lastConfigData={ultima} defaultConfigData={padrao} />
    );

    expect(screen.getByLabelText('startingPointLast')).not.toBeChecked();
    expect(screen.getByLabelText('startingPointDefault')).not.toBeChecked();
    expect(screen.getByLabelText('startingPointNew')).toBeChecked();
  });

  it('avisa a escolha de outro ponto de partida', () => {
    const onChange = jest.fn();
    render(
      <StartingPointSelector value="new" onChange={onChange} lastConfigMeta={metaCompleta} lastConfigData={ultima} defaultConfigData={padrao} />
    );

    fireEvent.click(screen.getByLabelText('startingPointLast'));
    expect(onChange).toHaveBeenCalledWith('last');

    fireEvent.click(screen.getByLabelText('startingPointDefault'));
    expect(onChange).toHaveBeenCalledWith('default');
  });

  it('descreve a última configuração com release, autor e selo AHP', () => {
    render(
      <StartingPointSelector value="last" onChange={jest.fn()} lastConfigMeta={metaCompleta} lastConfigData={ultima} defaultConfigData={padrao} />
    );
    const card = within(screen.getByTestId('starting-point-last'));

    expect(card.getByText('Release 2026.2 — Sprint 4')).toBeInTheDocument();
    expect(card.getByText(/"start":"16\/11","end":"30\/11\/2026"/)).toBeInTheDocument();
    expect(card.getByText(/lastConfigSavedBy .*"author":"MilenaFRocha","date":"30\/11\/2026"/)).toBeInTheDocument();
    expect(card.getByText('badgeQualitative')).toBeInTheDocument();
    expect(card.getByText(/characteristics.reliability 70 · characteristics.maintainability 30/)).toBeInTheDocument();
  });

  it('trata configuração antiga como pesos definidos manualmente', () => {
    render(
      <StartingPointSelector value="last" onChange={jest.fn()} lastConfigMeta={metaAntiga} lastConfigData={ultima} defaultConfigData={padrao} />
    );
    const card = within(screen.getByTestId('starting-point-last'));

    expect(card.getByText('lastConfigFallbackTitle')).toBeInTheDocument();
    expect(card.getByText(/lastConfigSavedAt .*"date":"10\/05\/2026"/)).toBeInTheDocument();
    expect(card.getByText('badgeManual')).toBeInTheDocument();
  });

  it('esconde a última configuração e a tabela quando o produto não tem configuração', () => {
    render(<StartingPointSelector value="new" onChange={jest.fn()} defaultConfigData={padrao} />);

    expect(screen.queryByTestId('starting-point-last')).not.toBeInTheDocument();
    expect(screen.queryByText('showWeightsComparison')).not.toBeInTheDocument();
  });

  it('abre e fecha a tabela de pesos da última configuração e do padrão', () => {
    render(
      <StartingPointSelector value="default" onChange={jest.fn()} lastConfigMeta={metaCompleta} lastConfigData={ultima} defaultConfigData={padrao} />
    );

    expect(screen.queryByTestId('weights-comparison-table')).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('showWeightsComparison'));
    expect(screen.getByTestId('weights-comparison-table')).toBeInTheDocument();
    expect(screen.getByText(/lastColumn .*Release 2026.2 — Sprint 4/)).toBeInTheDocument();

    fireEvent.click(screen.getByText('hideWeightsComparison'));
    expect(screen.queryByTestId('weights-comparison-table')).not.toBeInTheDocument();
  });
});
