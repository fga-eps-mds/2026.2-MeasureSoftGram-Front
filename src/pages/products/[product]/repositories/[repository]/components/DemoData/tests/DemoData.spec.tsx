import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import DemoDataBanner, { DEMO_BANNER_TITLE, DEMO_LABEL } from '../DemoDataBanner';
import RepositoryEmptyState, { EMPTY_STATE_TITLE } from '../RepositoryEmptyState';

describe('<RepositoryEmptyState />', () => {
  const renderEmptyState = (props = {}) => {
    const onShowDemo = jest.fn();
    render(
      <RepositoryEmptyState repositoryTerm="repositório" onShowDemo={onShowDemo} isLoadingDemo={false} {...props} />
    );
    return onShowDemo;
  };

  it('avisa que ainda não há dados e oferece a demonstração', () => {
    const onShowDemo = renderEmptyState();

    expect(screen.getByText(EMPTY_STATE_TITLE)).toBeInTheDocument();
    expect(screen.getByText(/São dados fictícios/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Ver dados de demonstração' }));
    expect(onShowDemo).toHaveBeenCalledTimes(1);
  });

  it('desabilita o botão enquanto gera os dados', () => {
    renderEmptyState({ isLoadingDemo: true });

    expect(screen.getByRole('button', { name: 'Gerando dados de demonstração…' })).toBeDisabled();
  });

  it('mostra o motivo quando a demonstração não está disponível', () => {
    renderEmptyState({ demoError: 'Os dados de demonstração estão desativados neste ambiente.' });

    expect(screen.getByRole('alert')).toHaveTextContent('desativados neste ambiente');
  });
});

describe('<DemoDataBanner />', () => {
  it('deixa claro que os dados são fictícios e mostra o TSQMI de demonstração', () => {
    render(<DemoDataBanner notice="Dados fictícios de demonstração" tsqmi={0.724} onExit={jest.fn()} />);

    expect(screen.getByText(DEMO_LABEL)).toBeInTheDocument();
    expect(screen.getByText(DEMO_BANNER_TITLE)).toBeInTheDocument();
    expect(screen.getByText('Dados fictícios de demonstração')).toBeInTheDocument();
    expect(screen.getByTestId('demo-tsqmi')).toHaveTextContent('TSQMI de demonstração: 0,72');
  });

  it('sai da demonstração pelo botão', () => {
    const onExit = jest.fn();
    render(<DemoDataBanner notice="aviso" tsqmi={0.5} onExit={onExit} />);

    fireEvent.click(screen.getByRole('button', { name: 'Sair da demonstração' }));

    expect(onExit).toHaveBeenCalledTimes(1);
  });
});
