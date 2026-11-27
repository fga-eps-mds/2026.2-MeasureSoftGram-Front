import { ahpService } from '../ahp';
import api from '../api';

jest.mock('../api');

describe('ahpService', () => {
  it('busca a escala de Saaty do produto', async () => {
    await ahpService.getScale('1', '2');
    expect(api.get).toHaveBeenCalledWith('/v1/organizations/1/products/2/ahp/scale/');
  });

  it('pede a prévia de um grupo sem gravar', async () => {
    const body = {
      entities: ['reliability', 'maintainability'],
      answers: [{ a: 'reliability', b: 'maintainability', preferred: null, intensity: 'igual' as const }],
    };
    await ahpService.calculateGroup('1', '2', body);
    expect(api.post).toHaveBeenCalledWith('/v1/organizations/1/products/2/ahp/calculate/', body);
  });
});
