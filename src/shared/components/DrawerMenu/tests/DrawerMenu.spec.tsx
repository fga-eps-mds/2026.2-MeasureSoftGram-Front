import { fireEvent, render } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';

import { ButtonType } from '@customTypes/product';

import DrawerMenu from '../DrawerMenu';

const BUTTON_NAME = 'ButtonLabel';

const BUTTONS: Array<ButtonType> = [
  {
    label: BUTTON_NAME,
    onClick: jest.fn(),
    backgroundColor: '#FFF',
    color: '#000',
    variant: 'outlined'
  }
];

describe('<DrawerMenu />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Snapshot', () => {
    it('Deve corresponder ao Snapshot', () => {
      const tree = render(
        <DrawerMenu open handleCloseModal={jest.fn()}>
          <div />
        </DrawerMenu>
      );
      expect(tree).toMatchSnapshot();
    });
    it('Deve corresponder ao Snapshot com botões', () => {
      const tree = render(
        <DrawerMenu open buttons={BUTTONS} handleCloseModal={jest.fn()}>
          <div />
        </DrawerMenu>
      );
      expect(tree).toMatchSnapshot();
    });
    it('Deve corresponder ao Snapshot com componente fechado', () => {
      const tree = render(
        <DrawerMenu open={false} handleCloseModal={jest.fn()}>
          <div />
        </DrawerMenu>
      );
      expect(tree).toMatchSnapshot();
    });
  });
  describe('Comportamento', () => {
    it('Botão dentro do DrawerMenu deve ser clicavel', () => {
      const { getByText } = render(
        <DrawerMenu open buttons={BUTTONS} handleCloseModal={jest.fn()}>
          <div />
        </DrawerMenu>
      );

      const button = getByText(BUTTON_NAME);

      fireEvent.click(button);

      expect(BUTTONS[0].onClick).toBeCalled();
    });
  });
});
