import React, { useState } from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import { PreConfigData } from '@customTypes/preConfig';
import ReferenceValuesForm from '../ReferenceValuesForm';

const initialConfigData: PreConfigData = {
  characteristics: [
    {
      key: 'characteristic_1',
      active: true,
      weight: 50,
      goal: 0,
      subcharacteristics: [
        {
          key: 'subcharacteristic_1',
          active: true,
          weight: 50,
          measures: [
            {
              key: 'measure_1',
              active: true,
              min_threshold: 0,
              max_threshold: 100,
              weight: 50,
              metrics: []
            },
            {
              key: 'measure_2',
              active: true,
              min_threshold: 5,
              max_threshold: 80,
              weight: 50,
              metrics: []
            }
          ]
        },
        {
          key: 'subcharacteristic_2',
          active: true,
          weight: 50,
          measures: []
        }
      ]
    },
    {
      key: 'characteristic_2',
      active: true,
      weight: 50,
      goal: 0,
      subcharacteristics: []
    }
  ]
};

describe('ReferenceValuesForm state update coverage', () => {
  it('atualiza os valores mínimo e máximo da medida preservando as demais características e medidas', () => {
    let latestData: PreConfigData = initialConfigData;

    function Wrapper() {
      const [configData, setConfigData] = useState<PreConfigData>(initialConfigData);
      latestData = configData;
      return (
        <ReferenceValuesForm
          configPageData={configData}
          defaultPageData={initialConfigData}
          setConfigPageData={setConfigData}
        />
      );
    }

    render(<Wrapper />);

    const minInput = screen.getByTestId('min-measures.measure_1').querySelector('input') as HTMLInputElement;
    const maxInput = screen.getByTestId('max-measures.measure_1').querySelector('input') as HTMLInputElement;

    fireEvent.change(minInput, { target: { value: '15' } });
    fireEvent.change(maxInput, { target: { value: '85' } });

    const updatedMeasure1 =
      latestData.characteristics[0].subcharacteristics[0].measures[0];
    const untouchedMeasure2 =
      latestData.characteristics[0].subcharacteristics[0].measures[1];

    expect(updatedMeasure1.min_threshold).toBe(15);
    expect(updatedMeasure1.max_threshold).toBe(85);
    expect(untouchedMeasure2.min_threshold).toBe(5);
    expect(untouchedMeasure2.max_threshold).toBe(80);
    expect(latestData.characteristics[1].key).toBe('characteristic_2');
  });
});
