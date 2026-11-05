import axios from 'axios';
import { setFlashMessage } from '../utils/flashMessage';

// O /bff lê o token do cookie HttpOnly e o repassa ao Service: o navegador nunca vê o token.
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
