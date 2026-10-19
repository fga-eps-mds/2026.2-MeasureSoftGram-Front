import { Slider } from '@mui/material';
import { styled } from '@mui/material/styles';

/**
 * Estilo do trilho do equalizador (planejamento da release e Planejado × Realizado).
 *
 * Usa o `styled` do MUI (emotion) e não o do styled-components: no build de produção
 * o CSS do styled-components é injetado antes do CSS do MUI, e o padrão do Slider
 * vertical (4px) sobrescrevia este estilo, deixando o trilho fino.
 */
export const equalizerSliderStyles = {
  color: '#2B4D6F',
  width: 30,
  '& .MuiSlider-track': {
    border: 'none',
    transition: `left 1s ease-in`,
    backgroundImage: 'linear-gradient(#2DA1C8, #2B4D6F)'
  },
  '& .MuiSlider-thumb': {
    color: '#2B4D6F',
    backgroundColor: '#fff',
    height: 20,
    width: 35,
    borderRadius: '8px',
    border: '3px solid currentColor',
    '&:focus, &:hover, &.Mui-active, &.Mui-focusVisible': {
      boxShadow: 'inherit'
    },
    '&::before': {
      display: 'none'
    }
  },
  '& .MuiSlider-valueLabel': {
    backgroundColor: '#2B4D6F'
  }
};

export const StyledSlider = styled(Slider)(equalizerSliderStyles);
