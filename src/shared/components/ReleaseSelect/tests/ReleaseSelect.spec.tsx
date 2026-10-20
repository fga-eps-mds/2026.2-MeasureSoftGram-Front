import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import ReleaseSelect, { ReleaseSelect as NamedReleaseSelect } from '../ReleaseSelect';
import { resolveCurrentRelease, ReleaseItem } from '../resolveCurrentRelease';

describe('resolveCurrentRelease', () => {
  it('deve retornar null para lista vazia ou nula', () => {
    expect(resolveCurrentRelease([])).toBeNull();
    expect(resolveCurrentRelease(null as any)).toBeNull();
  });

  it('deve retornar a release cujo intervalo [start_at, end_at] contempla a data de referência', () => {
    const releases: ReleaseItem[] = [
      { id: 1, release_name: 'R1', start_at: '2026-01-01', end_at: '2026-02-01' },
      { id: 2, release_name: 'R2', start_at: '2026-02-02', end_at: '2026-03-30' },
      { id: 3, release_name: 'R3', start_at: '2026-04-01', end_at: '2026-05-01' },
    ];
    const today = new Date('2026-02-15');
    const current = resolveCurrentRelease(releases, today);
    expect(current?.id).toBe(2);
    expect(current?.release_name).toBe('R2');
  });

  it('deve adotar a release mais recente como fallback se nenhuma estiver ativa hoje', () => {
    const releases: ReleaseItem[] = [
      { id: 1, release_name: 'R1', start_at: '2025-01-01', end_at: '2025-02-01' },
      { id: 2, release_name: 'R2', start_at: '2025-03-01', end_at: '2025-04-01' },
    ];
    const today = new Date('2026-10-19');
    const current = resolveCurrentRelease(releases, today);
    expect(current?.id).toBe(2);
  });
});

describe('ReleaseSelect Component', () => {
  const mockReleases: ReleaseItem[] = [
    { id: 10, release_name: '2026.2 R1', start_at: '2026-01-01', end_at: '2026-02-01' },
    { id: 20, release_name: '2026.2 R2', start_at: '2026-02-02', end_at: '2026-12-31' },
  ];

  it('deve renderizar o select com a release selecionada e indicar (atual)', () => {
    const onChange = jest.fn();
    render(
      <NamedReleaseSelect
        releases={mockReleases}
        selectedReleaseId={20}
        onReleaseChange={onChange}
      />
    );

    expect(screen.getByText(/2026\.2 R2 \(atual\)/)).toBeInTheDocument();
  });

  it('deve disparar onReleaseChange ao selecionar outra release', () => {
    const onChange = jest.fn();
    render(
      <NamedReleaseSelect
        releases={mockReleases}
        selectedReleaseId={20}
        onReleaseChange={onChange}
      />
    );

    const select = screen.getByRole('combobox');
    fireEvent.mouseDown(select);

    const option1 = screen.getByText('2026.2 R1');
    fireEvent.click(option1);

    expect(onChange).toHaveBeenCalledWith(10);
  });

  it('lista da release mais nova para a mais antiga e aceita props value/onChange/currentReleaseId', () => {
    const onChange = jest.fn();
    render(
      <ReleaseSelect
        releases={mockReleases}
        value={20}
        currentReleaseId={20}
        onChange={onChange}
      />
    );

    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Release' }));
    const options = within(screen.getByRole('listbox')).getAllByRole('option');
    expect(options.map((option) => option.textContent)).toEqual(['2026.2 R2 (atual)', '2026.2 R1']);

    fireEvent.click(screen.getByRole('option', { name: '2026.2 R1' }));
    expect(onChange).toHaveBeenCalledWith(10);
  });

  it('deve exibir "Nenhuma release" desabilitado quando a lista for vazia', () => {
    const onChange = jest.fn();
    render(
      <NamedReleaseSelect
        releases={[]}
        selectedReleaseId={null}
        onReleaseChange={onChange}
      />
    );

    expect(screen.getByText('Nenhuma release')).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toHaveAttribute('aria-disabled', 'true');
  });
});
