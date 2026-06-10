import api from './http';
import { LoginDto, LoginResultDto } from '@/types/api';

export const authApi = {
  /** Returns the raw API envelope — AuthContext reads .success and .data */
  login: async (credentials: LoginDto): Promise<any> => {
    const response = await api.post('/auth/login', credentials);
    return response.data;
  },
};

export default authApi;
