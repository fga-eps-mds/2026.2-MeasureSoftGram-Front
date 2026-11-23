import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import StyledComponentsRegistry from '../StyledComponentsRegistry';

let capturedCallback: (() => React.ReactNode) | null = null;
const mockUseServerInsertedHTML = jest.fn((callback: () => React.ReactNode) => {
  capturedCallback = callback;
  return callback();
});

jest.mock('next/navigation', () => ({
  useServerInsertedHTML: (cb: () => React.ReactNode) => mockUseServerInsertedHTML(cb)
}));

describe('StyledComponentsRegistry', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    capturedCallback = null;
  });

  it('renderiza os filhos e registra o callback de estilos do servidor', () => {
    render(
      <StyledComponentsRegistry>
        <div data-testid="child-element">Conteúdo</div>
      </StyledComponentsRegistry>
    );

    expect(screen.getByTestId('child-element')).toHaveTextContent('Conteúdo');
    expect(mockUseServerInsertedHTML).toHaveBeenCalledTimes(1);

    expect(capturedCallback).toBeDefined();
    const result = capturedCallback!();
    expect(React.isValidElement(result)).toBe(true);
    const fragment = result as React.ReactElement<{ children?: React.ReactNode }>;
    expect(fragment.type).toBe(React.Fragment);
    expect(fragment.props.children).toEqual([]);
  });
});
