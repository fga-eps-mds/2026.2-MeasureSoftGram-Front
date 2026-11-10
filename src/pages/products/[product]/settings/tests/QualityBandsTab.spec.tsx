import React from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';

import QualityBandsTab from '../components/QualityBandsTab';
import { useQualityBands } from '../hooks/useQualityBands';

jest.mock('../hooks/useQualityBands', () => ({ useQualityBands: jest.fn() }));

const DEFAULT_BANDS = [
  { key: 'E', min: 0, max: 0.2 },
  { key: 'D', min: 0.2, max: 0.4 },
  { key: 'C', min: 0.4, max: 0.6 },
  { key: 'B', min: 0.6, max: 0.8 },
  { key: 'A', min: 0.8, max: 1 }
];

const save = jest.fn();
const restore = jest.fn();
const retry = jest.fn();

function mockHook({ status = 'ready', isDefault = true, canEdit = true, bands = DEFAULT_BANDS } = {}) {
  (useQualityBands as jest.Mock).mockReturnValue({
    qualityBands: status === 'ready' ? { is_default: isDefault, can_edit: canEdit, bands } : undefined,
    status,
    save,
    restore,
    retry
  });
}

const field = (label: string) => screen.getByLabelText(`Até da faixa ${label}`) as HTMLInputElement;
const saveButton = () => screen.getByRole('button', { name: 'Salvar' });
const restoreButton = () => screen.getByRole('button', { name: 'Restaurar padrão' });
const segmentWidth = (grade: string) => screen.getByTestId(`ruler-segment-${grade}`).style.width;

describe('QualityBandsTab', () => {
  beforeEach(() => {
    save.mockReset().mockResolvedValue(undefined);
    restore.mockReset().mockResolvedValue(undefined);
    retry.mockReset();
    mockHook();
  });

  describe('CA1: as 5 faixas com cor, nome, limites e a régua', () => {
    it('mostra os valores padrão, da pior para a melhor, com Salvar e Restaurar padrão desabilitados', () => {
      render(<QualityBandsTab organizationId="1" productId="5" />);

      const rows = screen.getAllByRole('listitem');
      expect(rows.map((row) => row.dataset.testid)).toEqual([
        'quality-band-E',
        'quality-band-D',
        'quality-band-C',
        'quality-band-B',
        'quality-band-A'
      ]);
      expect(within(rows[0]).getByText('E · Muito ruim')).toBeInTheDocument();
      expect(within(rows[4]).getByText('A · Ótimo')).toBeInTheDocument();

      expect(screen.getByTestId('band-start-E')).toHaveTextContent('0,00');
      expect(field('E · Muito ruim').value).toBe('0,20');
      expect(field('D · Ruim').value).toBe('0,40');
      expect(field('C · Bom').value).toBe('0,60');
      expect(field('B · Muito bom').value).toBe('0,80');
      expect(screen.getByTestId('band-start-A')).toHaveTextContent('0,80');
      expect(screen.getByTestId('band-end-A')).toHaveTextContent('1,00');

      expect(segmentWidth('E')).toBe('20%');
      expect(segmentWidth('A')).toBe('20%');
      expect(saveButton()).toBeDisabled();
      expect(restoreButton()).toBeDisabled();
    });
  });

  describe('CA2: alterar um limite e salvar', () => {
    it('leva o fim de uma faixa ao início da seguinte e redesenha a régua enquanto digita', () => {
      render(<QualityBandsTab organizationId="1" productId="5" />);

      fireEvent.change(field('C · Bom'), { target: { value: '0,70' } });

      expect(screen.getByTestId('band-start-B')).toHaveTextContent('0,70');
      expect(segmentWidth('C')).toBe('30%');
      expect(segmentWidth('B')).toBe('10%');
      expect(saveButton()).toBeEnabled();
      expect(restoreButton()).toBeEnabled();
    });

    it('salva os limites e mostra "Faixas salvas"', async () => {
      render(<QualityBandsTab organizationId="1" productId="5" />);

      fireEvent.change(field('C · Bom'), { target: { value: '0,7' } });
      await act(async () => {
        fireEvent.click(saveButton());
      });

      expect(save).toHaveBeenCalledWith([0.2, 0.4, 0.7, 0.8]);
      expect(screen.getByText('Faixas salvas')).toBeInTheDocument();
    });

    it('começa dos limites salvos do produto', () => {
      mockHook({
        isDefault: false,
        bands: [
          { key: 'E', min: 0, max: 0.1 },
          { key: 'D', min: 0.1, max: 0.3 },
          { key: 'C', min: 0.3, max: 0.5 },
          { key: 'B', min: 0.5, max: 0.9 },
          { key: 'A', min: 0.9, max: 1 }
        ]
      });
      render(<QualityBandsTab organizationId="1" productId="5" />);

      expect(field('E · Muito ruim').value).toBe('0,10');
      expect(field('B · Muito bom').value).toBe('0,90');
      expect(saveButton()).toBeDisabled();
      // fora do padrão, dá para restaurar mesmo sem mexer nos campos
      expect(restoreButton()).toBeEnabled();
    });

    it('esconde a mensagem de sucesso quando o usuário volta a editar', async () => {
      render(<QualityBandsTab organizationId="1" productId="5" />);

      fireEvent.change(field('C · Bom'), { target: { value: '0,70' } });
      await act(async () => {
        fireEvent.click(saveButton());
      });
      fireEvent.change(field('C · Bom'), { target: { value: '0,75' } });

      expect(screen.queryByText('Faixas salvas')).not.toBeInTheDocument();
    });
  });

  describe('CA3: limite inválido', () => {
    it('mostra a mensagem no campo e desabilita o Salvar', () => {
      render(<QualityBandsTab organizationId="1" productId="5" />);

      fireEvent.change(field('C · Bom'), { target: { value: '0,30' } });
      fireEvent.change(field('B · Muito bom'), { target: { value: '1,2' } });

      expect(screen.getByText('O limite precisa ser maior que 0,40.')).toBeInTheDocument();
      expect(screen.getByText('Use um valor entre 0 e 1.')).toBeInTheDocument();
      expect(field('C · Bom')).toHaveAttribute('aria-invalid', 'true');
      expect(saveButton()).toBeDisabled();
      fireEvent.click(saveButton());
      expect(save).not.toHaveBeenCalled();
    });

    it('mostra um traço no início da faixa seguinte enquanto o limite não é número', () => {
      render(<QualityBandsTab organizationId="1" productId="5" />);

      fireEvent.change(field('D · Ruim'), { target: { value: '' } });

      expect(screen.getByTestId('band-start-C')).toHaveTextContent('—');
      expect(screen.getByText('Use um número entre 0 e 1.')).toBeInTheDocument();
    });
  });

  describe('CA4: restaurar padrão', () => {
    it('pede confirmação, restaura e salva', async () => {
      mockHook({ isDefault: false });
      render(<QualityBandsTab organizationId="1" productId="5" />);

      fireEvent.click(restoreButton());
      const dialog = screen.getByRole('dialog');
      expect(within(dialog).getByText('Restaurar os limites padrão?')).toBeInTheDocument();
      expect(within(dialog).getByText(/0,20, 0,40, 0,60 e 0,80/)).toBeInTheDocument();

      await act(async () => {
        fireEvent.click(within(dialog).getByRole('button', { name: 'Restaurar padrão' }));
      });

      expect(restore).toHaveBeenCalled();
      expect(screen.getByText('Faixas salvas')).toBeInTheDocument();
    });

    it('não restaura ao cancelar', async () => {
      mockHook({ isDefault: false });
      render(<QualityBandsTab organizationId="1" productId="5" />);

      fireEvent.click(restoreButton());
      fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancelar' }));

      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
      expect(restore).not.toHaveBeenCalled();
    });
  });

  describe('CA5: membro que não é administrador', () => {
    it('vê as faixas e os limites sem campos nem botões', () => {
      mockHook({ canEdit: false });
      render(<QualityBandsTab organizationId="1" productId="5" />);

      expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Salvar' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Restaurar padrão' })).not.toBeInTheDocument();
      expect(screen.getByTestId('band-end-C')).toHaveTextContent('0,60');
      expect(screen.getByText(/Só o administrador da organização altera os limites/)).toBeInTheDocument();
    });
  });

  describe('CA6: falha ao salvar', () => {
    it('mostra a mensagem do guia de IDV e mantém os valores digitados', async () => {
      save.mockRejectedValue(new Error('500'));
      render(<QualityBandsTab organizationId="1" productId="5" />);

      fireEvent.change(field('C · Bom'), { target: { value: '0,70' } });
      await act(async () => {
        fireEvent.click(saveButton());
      });

      expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível salvar as faixas. Tente novamente.');
      expect(field('C · Bom').value).toBe('0,70');
      expect(saveButton()).toBeEnabled();
    });

    it('trava os campos e os botões enquanto salva', async () => {
      let finish: () => void = () => undefined;
      save.mockReturnValue(new Promise<void>((resolve) => { finish = resolve; }));
      render(<QualityBandsTab organizationId="1" productId="5" />);

      fireEvent.change(field('C · Bom'), { target: { value: '0,70' } });
      fireEvent.click(saveButton());

      expect(screen.getByRole('button', { name: 'Salvando…' })).toBeDisabled();
      expect(field('C · Bom')).toBeDisabled();
      await act(async () => finish());
    });
  });

  describe('estados de carregamento e de erro', () => {
    it('mostra o carregando', () => {
      mockHook({ status: 'loading' });
      render(<QualityBandsTab organizationId="1" productId="5" />);

      expect(screen.getByText('Carregando as faixas de qualidade…')).toBeInTheDocument();
      expect(screen.queryByRole('listitem')).not.toBeInTheDocument();
    });

    it('mostra o erro com "Tentar novamente"', () => {
      mockHook({ status: 'error' });
      render(<QualityBandsTab organizationId="1" productId="5" />);

      expect(screen.getByText('Não foi possível carregar as faixas de qualidade')).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
      expect(retry).toHaveBeenCalled();
    });
  });
});
