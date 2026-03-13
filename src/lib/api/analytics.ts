import api from './http';
import type { ApiResponse, AnalyticsDto } from '@/types/api';
import { unwrapApiResponse } from './helpers';

export const analyticsApi = {
  get: async (): Promise<AnalyticsDto> => {
    const response = await api.get<ApiResponse<AnalyticsDto>>('/analytics');
    return unwrapApiResponse<AnalyticsDto>(response.data);
  },
};

export default analyticsApi;

