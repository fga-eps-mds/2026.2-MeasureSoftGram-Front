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
    expect(screen.getByText('Painel 1')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('tab-icon'));
    expect(screen.getByText('Painel 2')).toBeInTheDocument();

    rerender(
      <CustomTabs
        tabId="repo-tab"
        orientation="horizontal"
        tabHeaderItems={['Aba Unica']}
        tabPanelItems={[<div key="p1">Painel 1</div>]}
      />
    );

    expect(screen.getByText('Aba Unica')).toBeInTheDocument();
  });
});
