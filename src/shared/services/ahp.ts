import { AHPCalculateRequest, AHPCalculateResponse, AHPScale } from '@customTypes/ahp';
import api from './api';

const productUrl = (organizationId: string, productId: string) =>
  `/v1/organizations/${organizationId}/products/${productId}`;

/** Pesos por comparação (US13.01). O cálculo é do Core, chamado pelo Service. */
class AHPService {
  getScale(organizationId: string, productId: string) {
    return api.get<AHPScale>(`${productUrl(organizationId, productId)}/ahp/scale/`);
  }

  calculateGroup(organizationId: string, productId: string, body: AHPCalculateRequest) {
    return api.post<AHPCalculateResponse>(`${productUrl(organizationId, productId)}/ahp/calculate/`, body);
  }
}

export const ahpService = new AHPService();
Object.freeze(ahpService);
