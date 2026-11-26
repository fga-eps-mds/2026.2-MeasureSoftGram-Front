import React from 'react';
import { render, fireEvent, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PreConfigData } from '@customTypes/preConfig';
import ModelConfigForm from '../ModelConfigForm';

// Mock para o hook useTranslation
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

// Mock dos dados de configuração
const mockConfigPageData: PreConfigData = {
  characteristics: [
    {
      key: 'characteristic1',
      weight: 100,
      active: true,
      subcharacteristics: [
        {
          key: 'subCharacteristic1',
          weight: 100,
          active: true,
          measures: [
            {
              key: 'measure1',
              weight: 100,
              active: true,
              metrics: []
            },
          ],
        },
      ],
      goal: 0
    },
  ],
};

describe('ModelConfigForm', () => {
  let mockSetConfigPageData: jest.Mock;

  beforeEach(() => {
    mockSetConfigPageData = jest.fn();
  });

  test('renders the component', () => {
    render(
      <ModelConfigForm
        configPageData={mockConfigPageData}
        setConfigPageData={mockSetConfigPageData}
      />
    );

    // Verifica se as seções e os acordeões são renderizados
    expect(screen.getAllByText('defineCharacteristics')[0]).toBeInTheDocument();
    expect(screen.getAllByText('defineSubCharacteristics')[0]).toBeInTheDocument();
    expect(screen.getAllByText('defineMeasures')[0]).toBeInTheDocument();

    // Verifica se os elementos específicos da característica, subcaracterística e medida são renderizados
    expect(screen.getAllByText('characteristics.characteristic1')[0]).toBeInTheDocument();
    expect(screen.getAllByText('subCharacteristics.subCharacteristic1')[0]).toBeInTheDocument();
    expect(screen.getAllByText('measures.measure1')[0]).toBeInTheDocument();
  });

  test('calls setConfigPageData when characteristic changes', () => {
    render(
      <ModelConfigForm
        configPageData={mockConfigPageData}
        setConfigPageData={mockSetConfigPageData}
      />
    );

    const characteristic1Slider = screen.getByTestId('slider-characteristic1').querySelector("input") as HTMLInputElement;

    // Simula a mudança de peso da característica
    fireEvent.change(characteristic1Slider, { target: { value: 70 } });

    expect(mockSetConfigPageData).toHaveBeenCalled();
  });

  test('calls setConfigPageData when subcharacteristic changes', () => {
    render(
      <ModelConfigForm
        configPageData={mockConfigPageData}
        setConfigPageData={mockSetConfigPageData}
      />
    );

    const subCharacteristic1Slider = screen.getByTestId('slider-subCharacteristic1').querySelector("input") as HTMLInputElement;

    // Simula a mudança de peso da subcaracterística
    fireEvent.change(subCharacteristic1Slider, { target: { value: 30 } });

    expect(mockSetConfigPageData).toHaveBeenCalled();
  });

  test('calls setConfigPageData when measure changes', () => {
    render(
      <ModelConfigForm
        configPageData={mockConfigPageData}
        setConfigPageData={mockSetConfigPageData}
      />
    );

    const measure1Slider = screen.getByTestId('slider-measure1').querySelector("input") as HTMLInputElement;

    // Simula a mudança de peso da medida
    fireEvent.change(measure1Slider, { target: { value: 20 } });

    expect(mockSetConfigPageData).toHaveBeenCalled();
  });

  test('não mostra checkbox: a seleção fica em Definir entidades', () => {
    render(<ModelConfigForm configPageData={mockConfigPageData} setConfigPageData={mockSetConfigPageData} />);
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  });

  test('mostra o erro de soma no grupo e informa quantos pontos sobram', () => {
    const acimaDe100: PreConfigData = {
      characteristics: [
        { ...mockConfigPageData.characteristics[0], weight: 60 },
        { ...mockConfigPageData.characteristics[0], key: 'characteristic2', weight: 50 },
      ],
    };
    render(<ModelConfigForm configPageData={acimaDe100} setConfigPageData={mockSetConfigPageData} />);

    const alerta = within(screen.getByTestId('sum-error-characteristics'));
    expect(alerta.getByText('sumErrorCharacteristics')).toBeInTheDocument();
    expect(alerta.getByText('sumErrorOver')).toBeInTheDocument();
  });

  test('mostra o erro de soma no grupo de medidas quando faltam pontos', () => {
    const abaixoDe100: PreConfigData = {
      characteristics: [{
        ...mockConfigPageData.characteristics[0],
        subcharacteristics: [{
          ...mockConfigPageData.characteristics[0].subcharacteristics[0],
          measures: [{ key: 'measure1', weight: 70, active: true, metrics: [] }],
        }],
      }],
    };
    render(<ModelConfigForm configPageData={abaixoDe100} setConfigPageData={mockSetConfigPageData} />);

    expect(screen.queryByTestId('sum-error-characteristics')).not.toBeInTheDocument();
    const alerta = within(screen.getByTestId('sum-error-characteristic1/subCharacteristic1/measures'));
    expect(alerta.getByText('sumErrorUnder')).toBeInTheDocument();
  });
});
