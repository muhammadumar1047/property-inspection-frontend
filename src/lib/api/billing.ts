import api from './http';
import type { ApiResponse, PagedResult, BillingPlan, CreateBillingPlanRequest, UpdateBillingPlanRequest, BillingPlanFilter } from '@/types/api';
import { unwrapApiResponse, unwrapPaged } from './helpers';

export const billingApi = {
  getPaged: async (
    page: number = 1,
    pageSize: number = 10,
    filters: BillingPlanFilter = {},
  ): Promise<{ data: BillingPlan[]; totalCount: number; totalPages: number }> => {
    const response = await api.get<ApiResponse<PagedResult<BillingPlan>>>('/billing', {
      params: {
        page,
        pageSize,
        ...(filters.search ? { search: filters.search } : {}),
        ...(filters.status && filters.status !== 'all' ? { status: filters.status } : {}),
        ...(filters.minPrice != null ? { minPrice: filters.minPrice } : {}),
        ...(filters.maxPrice != null ? { maxPrice: filters.maxPrice } : {}),
        ...(filters.fromDate ? { fromDate: filters.fromDate } : {}),
        ...(filters.toDate ? { toDate: filters.toDate } : {}),
      },
    });
    const paged = unwrapPaged<BillingPlan>(response.data);
    return {
      data: paged.data ?? [],
      totalCount: paged.totalCount ?? 0,
      totalPages: paged.totalPages ?? 1,
    };
  },

  getById: async (id: string): Promise<BillingPlan> => {
    const response = await api.get<ApiResponse<BillingPlan>>(`/billing/${id}`);
    return unwrapApiResponse<BillingPlan>(response.data);
  },

  create: async (payload: CreateBillingPlanRequest): Promise<BillingPlan> => {
    const response = await api.post<ApiResponse<BillingPlan>>('/billing', payload);
    return unwrapApiResponse<BillingPlan>(response.data);
  },

  update: async (id: string, payload: UpdateBillingPlanRequest): Promise<BillingPlan> => {
    const response = await api.put<ApiResponse<BillingPlan>>(`/billing/${id}`, payload);
    return unwrapApiResponse<BillingPlan>(response.data);
  },

  delete: async (id: string): Promise<boolean> => {
    const response = await api.delete<ApiResponse<boolean>>(`/billing/${id}`);
    return unwrapApiResponse<boolean>(response.data);
  },

  activate: async (id: string): Promise<boolean> => {
    const response = await api.patch<ApiResponse<boolean>>(`/billing/${id}/activate`);
    return unwrapApiResponse<boolean>(response.data);
  },

  deactivate: async (id: string): Promise<boolean> => {
    const response = await api.patch<ApiResponse<boolean>>(`/billing/${id}/deactivate`);
    return unwrapApiResponse<boolean>(response.data);
  },
};

export default billingApi;
