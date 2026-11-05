import api from '@services/api';
import { AxiosError } from 'axios';

export const getUserInfo = async (): Promise<Result<User>> => {
  try {
    const response = await api.get('/v1/accounts/');

    return { type: 'success', value: response?.data };
  } catch (err) {
    const error = err as AxiosError;
    return { type: 'error', error };
  }
};

export const getAccessToken = async (): Promise<Result<User>> => {
  try {
    const response = await api.get('/v1/accounts/access-token');

    return { type: 'success', value: response?.data };
  } catch (err) {
    const error = err as AxiosError;
    return { type: 'error', error };
  }
};

export * from './oauthUrls';
