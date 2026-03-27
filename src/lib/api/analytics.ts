import api from './http';
import type { ApiResponse, AnalyticsSummaryDto, AnalyticsChartDto, AnalyticsFilterDto } from '@/types/api';
import { unwrapApiResponse } from './helpers';

export const analyticsApi = {
  getSummary: async (filters: AnalyticsFilterDto = {}): Promise<AnalyticsSummaryDto> => {
    const response = await api.get<ApiResponse<AnalyticsSummaryDto>>('/analytics/summary', { params: filters });
    return unwrapApiResponse<AnalyticsSummaryDto>(response.data);
  },
  getCharts: async (filters: AnalyticsFilterDto = {}): Promise<AnalyticsChartDto> => {
    const response = await api.get<ApiResponse<AnalyticsChartDto>>('/analytics/charts', { params: filters });
    return unwrapApiResponse<AnalyticsChartDto>(response.data);
  },
};

export default analyticsApi;

