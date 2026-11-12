import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { QualityLegend } from '../QualityLegend';

describe('<QualityLegend />', () => {
  it('sem as faixas do produto, mostra a régua padrão', () => {
    const { getByText } = render(<QualityLegend />);

    expect(getByText('E · Muito ruim (0,00 a 0,19)')).toBeInTheDocument();
    expect(getByText('A · Ótimo (0,80 a 1,00)')).toBeInTheDocument();
  });
});
