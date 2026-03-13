import api from './http';
import { LoginDto, LoginResponseDto, LoginResultDto } from '@/types/api';
import { unwrapApiResponse } from './helpers';

export const authApi = {
  login: async (credentials: LoginDto): Promise<LoginResultDto> => {
    const response = await api.post<LoginResponseDto>('/auth/login', credentials);
    return unwrapApiResponse<LoginResultDto>(response.data);
  },
};

export default authApi;




