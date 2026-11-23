import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import CustomTabs from '../CustomTabs';

describe('CustomTabs', () => {
  it('renderiza abas de texto, ícone e item vazio, permitindo alternar entre painéis', () => {
    const { rerender } = render(
      <CustomTabs
        tabId="repo-tab"
        orientation="vertical"
        tabHeaderItems={['Aba Texto', <span key="icon" data-testid="tab-icon">Icone</span>, null]}
        tabPanelItems={[
          <div key="p1">Painel 1</div>,
          <div key="p2">Painel 2</div>,
          <div key="p3">Painel 3</div>
        ]}
      />
    );

    expect(screen.getByText('Aba Texto')).toBeInTheDocument();
    expect(screen.getByTestId('tab-icon')).toBeInTheDocument();

    expect(screen.getByRole('tab', { name: 'Aba Texto' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('Painel 1')).toBeVisible();
    expect(screen.getByText('Painel 2')).not.toBeVisible();
    expect(screen.getByText('Painel 3')).not.toBeVisible();

    fireEvent.click(screen.getByTestId('tab-icon'));

    expect(screen.getByRole('tab', { name: 'Aba Texto' })).toHaveAttribute('aria-selected', 'false');
    expect(screen.getAllByRole('tab')[1]).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('Painel 1')).not.toBeVisible();
    expect(screen.getByText('Painel 2')).toBeVisible();
    expect(screen.getByText('Painel 3')).not.toBeVisible();

    rerender(
      <CustomTabs
        tabId="repo-tab"
        orientation="horizontal"
        tabHeaderItems={['Aba Unica']}
        tabPanelItems={[<div key="p1">Painel 1</div>]}
      />
    );

    expect(screen.getByText('Aba Unica')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Aba Unica' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('Painel 1')).toBeVisible();
  });
});
