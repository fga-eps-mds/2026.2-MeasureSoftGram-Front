import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import { DEFAULT_LIMITS, getRulerSegments } from '@utils/qualityBandsForm';
import QualityBandsRuler, { visibleLimits } from '../components/QualityBandsRuler';

describe('QualityBandsRuler', () => {
  it('desenha um trecho por faixa e descreve a régua para leitores de tela', () => {
    render(<QualityBandsRuler segments={getRulerSegments(['0,20', '0,40', '0,70', '0,80'], DEFAULT_LIMITS)} />);

    expect(screen.getByTestId('ruler-segment-C').style.width).toBe('30%');
    expect(screen.getByRole('img')).toHaveAccessibleName(
      'Régua das faixas: E de 0,00 a 0,20, D de 0,20 a 0,40, C de 0,40 a 0,70, B de 0,70 a 0,80, A de 0,80 a 1,00'
    );
    ['0,00', '0,20', '0,40', '0,70', '0,80', '1,00'].forEach((label) => expect(screen.getByText(label)).toBeInTheDocument());
  });

  it('não sobrepõe as etiquetas de limites colados', () => {
    expect(visibleLimits([0, 0.2, 0.4, 0.6, 0.8, 1])).toEqual([0, 0.2, 0.4, 0.6, 0.8, 1]);
    // limites iguais (régua sendo corrigida) ou colados no anterior ficam sem etiqueta
    expect(visibleLimits([0, 0.2, 0.22, 0.6, 0.8, 1])).toEqual([0, 0.2, 0.6, 0.8, 1]);
    // o 1 sempre aparece; sai o limite do meio colado nele
    expect(visibleLimits([0, 0.2, 0.4, 0.6, 1, 1])).toEqual([0, 0.2, 0.4, 0.6, 1]);
    expect(visibleLimits([0, 0.02, 0.4, 0.6, 0.8, 1])).toEqual([0, 0.4, 0.6, 0.8, 1]);
  });
});
