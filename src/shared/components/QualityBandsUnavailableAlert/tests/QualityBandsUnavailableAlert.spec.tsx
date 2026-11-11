import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import QualityBandsUnavailableAlert from '../QualityBandsUnavailableAlert';

describe('<QualityBandsUnavailableAlert />', () => {
  it('mostra o aviso discreto de que não foi possível carregar as faixas do produto', () => {
    render(<QualityBandsUnavailableAlert />);

    const alert = screen.getByRole('status');
    expect(alert).toHaveAttribute('data-severity', 'warning');
    expect(screen.getByText('Não foi possível carregar as faixas do produto')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Tentar novamente' })).not.toBeInTheDocument();
  });

  it('aciona onRetry ao clicar em "Tentar novamente"', () => {
    const onRetry = jest.fn();
    render(<QualityBandsUnavailableAlert onRetry={onRetry} />);

    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
