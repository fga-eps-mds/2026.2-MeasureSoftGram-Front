import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { QualityBandsWarning } from '../QualityBandsWarning';

describe('QualityBandsWarning', () => {
  it('avisa que os gráficos estão nos padrões sem interromper a leitura (CA4)', () => {
    render(<QualityBandsWarning />);

    // aviso, não erro: `role="status"` não interrompe o leitor de tela e os dados continuam na tela
    const warning = screen.getByRole('status');
    expect(warning.dataset.severity).toBe('warning');
    expect(warning.textContent).toContain('Não foi possível carregar as faixas do produto');
    expect(warning.textContent).toContain('Os gráficos estão usando as faixas padrão.');
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Tentar novamente' })).toBeNull();
  });

  it('oferece "Tentar novamente" quando a tela sabe refazer a busca', () => {
    const onRetry = jest.fn();
    render(<QualityBandsWarning onRetry={onRetry} />);

    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
