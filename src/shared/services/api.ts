import axios from 'axios';
import { setFlashMessage } from '../utils/flashMessage';

// Todas as chamadas passam pelo /bff do próprio Next, que lê o token do cookie HttpOnly e o repassa ao Service.
// O navegador nunca vê o token.
export const API_BASE_URL = '/bff';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      const { pathname, search } = window.location;

      // o /bff já apagou os cookies; falta voltar ao login guardando a rota atual
      if (!pathname.startsWith('/auth')) {
        setFlashMessage({ type: 'warning', text: 'Sua sessão expirou. Entre novamente.' });
        const returnTo = encodeURIComponent(pathname + search);
        window.location.href = `/auth?returnTo=${returnTo}`;
      }
    }
    return Promise.reject(error);
  }
);

export default api;
