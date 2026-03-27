import api from './http';
import type {
  ApiResponse,
  PagedResult,
  InspectionResponse,
  CreateInspectionRequest,
  UpdateInspectionRequest,
  LookupDto,
  SearchPropertyDto,
  SearchResultGroupedDto,
  UserResponse,
} from '@/types/api';
import { unwrapApiResponse } from './helpers';

function normalizeGroupedSearch(raw: any): SearchResultGroupedDto {
  const properties = raw?.properties ?? raw?.Properties ?? [];
  const inspections = raw?.inspections ?? raw?.Inspections ?? [];
  return {
    properties: Array.isArray(properties) ? properties : [],
    inspections: Array.isArray(inspections) ? inspections : [],
  } as SearchResultGroupedDto;
}

export const inspectionApi = {
  getPaged: async (
    pageNumber: number = 1,
    pageSize: number = 10,
    filters: {
      inspectionId?: string;
      inspectionType?: number;
      inspectionStatus?: number;
      inspectorId?: string;
      suburb?: string;
      inspectionDate?: string;
      startDate?: string;
      endDate?: string;
      searchProperty?: string;
    } = {},
  ): Promise<{ data: InspectionResponse[]; totalCount: number }> => {
    const response = await api.get<ApiResponse<PagedResult<InspectionResponse>>>('/inspection', {
      params: {
        pageNumber,
        pageSize,
        ...(filters.inspectionId ? { inspectionId: filters.inspectionId } : {}),
        ...(filters.inspectionType != null ? { inspectionType: filters.inspectionType } : {}),
        ...(filters.inspectionStatus != null ? { inspectionStatus: filters.inspectionStatus } : {}),
        ...(filters.inspectorId ? { inspectorId: filters.inspectorId } : {}),
        ...(filters.suburb ? { suburb: filters.suburb } : {}),
        ...(filters.inspectionDate ? { inspectionDate: filters.inspectionDate } : {}),
        ...(filters.startDate ? { startDate: filters.startDate } : {}),
        ...(filters.endDate ? { endDate: filters.endDate } : {}),
        ...(filters.searchProperty ? { searchProperty: filters.searchProperty } : {}),
      },
    });
    const paged = unwrapApiResponse<PagedResult<InspectionResponse>>(response.data);
    return {
      data: paged.data ?? [],
      totalCount: paged.totalCount ?? (paged.data?.length ?? 0),
    };
  },

  getById: async (id: string): Promise<InspectionResponse> => {
    const response = await api.get<ApiResponse<InspectionResponse>>(`/inspection/${id}`);
    return unwrapApiResponse<InspectionResponse>(response.data);
  },

  getByProperty: async (propertyId: string): Promise<InspectionResponse[]> => {
    const response = await api.get<ApiResponse<InspectionResponse[]>>(`/inspection/property/${propertyId}`);
    return unwrapApiResponse<InspectionResponse[]>(response.data);
  },

  create: async (payload: CreateInspectionRequest): Promise<InspectionResponse> => {
    debugger
    const response = await api.post<ApiResponse<InspectionResponse>>('/inspection', payload);
    return unwrapApiResponse<InspectionResponse>(response.data);
  },

  update: async (id: string, payload: UpdateInspectionRequest): Promise<boolean> => {
    debugger;
    const response = await api.put<ApiResponse<boolean>>(`/inspection/${id}`, payload);
    return unwrapApiResponse<boolean>(response.data);
  },

  delete: async (id: string): Promise<boolean> => {
    const response = await api.delete<ApiResponse<boolean>>(`/inspection/${id}`);
    return unwrapApiResponse<boolean>(response.data);
  },

  deleteLandlordSnapshot: async (snapshotId: string): Promise<boolean> => {
    const response = await api.delete<ApiResponse<boolean>>(`/inspection/landlord-snapshot/${snapshotId}`);
    return unwrapApiResponse<boolean>(response.data);
  },

  deleteTenancySnapshot: async (snapshotId: string): Promise<boolean> => {
    const response = await api.delete<ApiResponse<boolean>>(`/inspection/tenancy-snapshot/${snapshotId}`);
    return unwrapApiResponse<boolean>(response.data);
  },

  getInspectionTypes: async (): Promise<LookupDto[]> => {
    const response = await api.get<ApiResponse<LookupDto[]>>('/lookup/inspection/types');
    return unwrapApiResponse<LookupDto[]>(response.data);
  },

  getInspectionStatuses: async (): Promise<LookupDto[]> => {
    const response = await api.get<ApiResponse<LookupDto[]>>('/lookup/inspection/statuses');
    return unwrapApiResponse<LookupDto[]>(response.data);
  },

  getAvailableInspectors: async (): Promise<UserResponse[]> => {
    const response = await api.get<ApiResponse<PagedResult<UserResponse>>>('/user', { params: { pageNumber: 1, pageSize: 200 } });
    const paged = unwrapApiResponse<PagedResult<UserResponse>>(response.data);
    return paged.data ?? [];
  },

  searchProperties: async (query: string, agencyId?: string): Promise<SearchPropertyDto[]> => {
    if (!query.trim()) return [];
    try {
      // Use grouped search endpoint and project down to simple property results.
      const params: any = { query };
      if (agencyId) params.agencyId = agencyId;
      const response = await api.get<ApiResponse<SearchResultGroupedDto>>('/search', { params });
      const groupedRaw = unwrapApiResponse<any>(response.data);
      const grouped = normalizeGroupedSearch(groupedRaw);
      const props = grouped.properties ?? [];
      return props.map((p: any) => {
        const id = p.id ?? p.propertyId ?? p.PropertyId;
        const address1 = p.address1 ?? p.Address1 ?? '';
        const address2 = p.address2 ?? p.Address2 ?? '';
        const suburb = p.subhurb ?? p.suburb ?? p.cityOrSuburb ?? p.CityOrSuburb ?? '';
        const parts = [address1, address2, suburb].map((x) => (x || '').toString().trim()).filter(Boolean);
        return {
          id: String(id),
          address: parts.join(', ') || String(id),
          suburb: (suburb || '').toString().trim(),
        } as SearchPropertyDto;
      });
    } catch (error: any) {
      console.error('inspectionApi.searchProperties failed', error?.response?.data ?? error);
      return [];
    }
  },

  search: async (query: string, agencyId?: string): Promise<SearchResultGroupedDto> => {
    const params: any = { query };
    if (agencyId) params.agencyId = agencyId;
    const response = await api.get<ApiResponse<SearchResultGroupedDto>>('/search', { params });
    const groupedRaw = unwrapApiResponse<any>(response.data);
    return normalizeGroupedSearch(groupedRaw);
  },
};

export default inspectionApi;
