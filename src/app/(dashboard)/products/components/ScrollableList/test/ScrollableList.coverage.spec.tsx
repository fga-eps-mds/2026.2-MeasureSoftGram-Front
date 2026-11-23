import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import ScrollableList from '../ScrollableList';

describe('ScrollableList interactions coverage', () => {
  const originalScrollBy = HTMLElement.prototype.scrollBy;

  afterEach(() => {
    if (originalScrollBy) {
      HTMLElement.prototype.scrollBy = originalScrollBy;
    } else {
      delete (HTMLElement.prototype as { scrollBy?: unknown }).scrollBy;
    }
  });

  const organizations = [
    { id: '1', name: 'Org Alpha', description: 'Desc 1', url: 'http://a.com', key: 'alpha', products: [] },
    { id: '2', name: 'Org Beta', description: 'Desc 2', url: 'http://b.com', key: 'beta', products: [] }
  ];

  it('rola a lista para cima e para baixo e seleciona uma organização ao clicar', () => {
    const scrollByMock = jest.fn();
    Object.defineProperty(HTMLElement.prototype, 'scrollBy', {
      configurable: true,
      writable: true,
      value: scrollByMock
    });

    const onSelect = jest.fn();
    render(<ScrollableList organizationList={organizations} onSelect={onSelect} />);

    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[0]);
    expect(scrollByMock).toHaveBeenCalledWith({ top: -50, behavior: 'smooth' });

    fireEvent.click(buttons[1]);
    expect(scrollByMock).toHaveBeenCalledWith({ top: 50, behavior: 'smooth' });

    fireEvent.click(screen.getByText('Org Beta'));
    expect(onSelect).toHaveBeenCalledWith(organizations[1]);
  });
});
