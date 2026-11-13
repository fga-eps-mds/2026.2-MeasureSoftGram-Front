import React from 'react';
import { render, screen } from '@testing-library/react';
import NotFound from '../not-found';

describe('NotFound', () => {
  it('explica que a página não existe e leva ao início', () => {
    render(<NotFound />);

    expect(screen.getByText('Página não encontrada')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Voltar para o início' })).toHaveAttribute('href', '/');
  });
});
