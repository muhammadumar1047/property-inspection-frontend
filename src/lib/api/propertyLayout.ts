import api from './http';
import type {
  ApiResponse,
  PagedResult,
  PropertyLayoutResponse,
  CreatePropertyLayoutRequest,
  UpdatePropertyLayoutRequest,
} from '@/types/api';
import { unwrapApiResponse } from './helpers';

export const layoutApi = {
  getPaged: async (
    pageNumber: number,
    pageSize: number,
    filters?: { search?: string; layoutType?: number }
  ): Promise<{ data: PropertyLayoutResponse[]; page: number; pageSize: number; totalCount: number; totalPages: number }> => {
    const params: Record<string, string | number> = { pageNumber, pageSize };
    if (filters?.search) params.search = filters.search;
    if (filters?.layoutType !== undefined && filters.layoutType !== null) params.layoutType = filters.layoutType;

    const response = await api.get<ApiResponse<PagedResult<PropertyLayoutResponse>>>('/propertylayout', {
      params,
    });
    const paged = unwrapApiResponse<PagedResult<PropertyLayoutResponse>>(response.data);
    return {
      data: paged.data ?? [],
      page: paged.page || pageNumber,
      pageSize: paged.pageSize || pageSize,
      totalCount: paged.totalCount || (paged.data?.length ?? 0),
      totalPages: paged.totalPages || 1,
    };
  },

  // Used by property creation flows – backed by /api/PropertyLayout
  getAll: async (): Promise<PropertyLayoutResponse[]> => {
    const res = await api.get('/PropertyLayout');
    //const body = res.data?.Data ?? res.data?.data ?? res.data;
    const body = res.data?.data?.data ?? res.data?.Data ?? res.data;
    const raw = Array.isArray(body) ? body : [];
    return raw as PropertyLayoutResponse[];
  },

  getById: async (id: string): Promise<PropertyLayoutResponse> => {
    const response = await api.get<ApiResponse<PropertyLayoutResponse>>(`/propertylayout/${id}`);
    return unwrapApiResponse<PropertyLayoutResponse>(response.data);
  },

  create: async (layout: CreatePropertyLayoutRequest): Promise<PropertyLayoutResponse> => {
    const response = await api.post<ApiResponse<PropertyLayoutResponse>>('/propertylayout', layout);
    return unwrapApiResponse<PropertyLayoutResponse>(response.data);
  },

  update: async (id: string, layout: UpdatePropertyLayoutRequest): Promise<boolean> => {
    const response = await api.put<ApiResponse<boolean>>(`/propertylayout/${id}`, layout);
    return unwrapApiResponse<boolean>(response.data);
  },

  delete: async (id: string): Promise<boolean> => {
    const response = await api.delete<ApiResponse<boolean>>(`/propertylayout/${id}`);
    return unwrapApiResponse<boolean>(response.data);
  },
};

export default layoutApi;
