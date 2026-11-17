import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import StyledComponentsRegistry from '../StyledComponentsRegistry';

const mockUseServerInsertedHTML = jest.fn((callback: () => React.ReactNode) => {
  callback();
});

jest.mock('next/navigation', () => ({
  useServerInsertedHTML: (cb: () => React.ReactNode) => mockUseServerInsertedHTML(cb)
}));

describe('StyledComponentsRegistry', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renderiza os filhos e registra o callback de estilos do servidor', () => {
    render(
      <StyledComponentsRegistry>
        <div data-testid="child-element">Conteúdo</div>
      </StyledComponentsRegistry>
    );

    expect(screen.getByTestId('child-element')).toHaveTextContent('Conteúdo');
    expect(mockUseServerInsertedHTML).toHaveBeenCalledTimes(1);
  });
});
