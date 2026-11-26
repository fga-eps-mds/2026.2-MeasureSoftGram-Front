import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import ReleaseValuesDisplay from '../ReleaseValuesDisplay';

describe('ReleaseValuesDisplay', () => {
  const planned = [
    { id: 1, key: 'reliability', name: 'Reliability', value: 0.75, diff: 0 },
    { id: 2, key: 'security', name: 'Security', value: 0.5, diff: 0 },
    { id: 3, key: 'maintainability', name: 'Maintainability', value: 0.8, diff: 0 }
  ];

  const accomplished = [
    { id: 1, key: 'reliability', name: 'Reliability', value: 0.85, diff: 0.1 },
    { id: 2, key: 'security', name: 'Security', value: 0.4, diff: -0.1 }
  ];

  it('renderiza valores planejados, realizados, diferenças e normDiff quando informado', () => {
    render(
      <ReleaseValuesDisplay
        planned={planned as any}
        accomplised={accomplished as any}
        normDiff={0.25}
      />
    );

    expect(screen.getByText('Planejado')).toBeInTheDocument();
    expect(screen.getByText('Realizado')).toBeInTheDocument();
    expect(screen.getByText('Diferença')).toBeInTheDocument();
    expect(screen.getByText('Diferença normalizada')).toBeInTheDocument();

    expect(screen.getByText('0.75')).toBeInTheDocument();
    expect(screen.getByText('0.85')).toBeInTheDocument();
    expect(screen.getByText('0.10')).toBeInTheDocument();
    expect(screen.getByText('-0.10')).toBeInTheDocument();
    expect(screen.getByText('0.25')).toBeInTheDocument();
  });

  it('não renderiza a seção de normDiff quando normDiff não é passado', () => {
    render(
      <ReleaseValuesDisplay
        planned={planned as any}
        accomplised={accomplished as any}
      />
    );

    expect(screen.queryByText('Diferença normalizada')).not.toBeInTheDocument();
  });
});
