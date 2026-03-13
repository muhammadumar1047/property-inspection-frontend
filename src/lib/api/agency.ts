import api from './http';
import {
  AgencyResponse,
  CreateAgencyRequest,
  UpdateAgencyRequest,
  AgencyWhitelabelResponse,
  WhitelabelBrandingDto,
  DefaultWhitelabelDto,
  WhitelabelReportSettingsDto,
} from '@/types/api';
import { unwrapApiResponse, unwrapPaged } from './helpers';

export const agencyApi = {
  getPaged: async (
    pageNumber: number,
    pageSize: number,
    filters: { countryId?: string; stateId?: string; name?: string; suburb?: string }
  ): Promise<{ data: AgencyResponse[]; page: number; pageSize: number; totalCount: number; totalPages: number }> => {
    const response = await api.get('/agency', {
      params: {
        pageNumber,
        pageSize,
        ...(filters.countryId ? { countryId: filters.countryId } : {}),
        ...(filters.stateId ? { stateId: filters.stateId } : {}),
        ...(filters.name ? { name: filters.name } : {}),
        ...(filters.suburb ? { suburb: filters.suburb } : {}),
      },
    });
    return unwrapPaged<AgencyResponse>(response.data);
  },
  getAll: async (): Promise<AgencyResponse[]> => {
    const response = await api.get('/agency', { params: { pageNumber: 1, pageSize: 1000 } });
    return unwrapPaged<AgencyResponse>(response.data).data;
  },
  getById: async (id: string): Promise<AgencyResponse> => {
    const response = await api.get(`/agency/${id}`);
    return unwrapApiResponse<AgencyResponse>(response.data);
  },
  create: async (agency: CreateAgencyRequest): Promise<AgencyResponse> => {
    const response = await api.post('/agency', agency);
    return unwrapApiResponse<AgencyResponse>(response.data);
  },
  update: async (id: string, agency: UpdateAgencyRequest): Promise<AgencyResponse> => {
    const response = await api.put(`/agency/${id}`, agency);
    return unwrapApiResponse<AgencyResponse>(response.data);
  },
  delete: async (id: string): Promise<boolean> => {
    const response = await api.delete(`/agency/${id}`);
    return unwrapApiResponse<boolean>(response.data);
  },
  getWhitelabel: async (agencyId?: string | null): Promise<AgencyWhitelabelResponse> => {
    const response = await api.get('/agencywhitelabel', { params: agencyId ? { agencyId } : undefined });
    return unwrapApiResponse<AgencyWhitelabelResponse>(response.data);
  },
  updateWhitelabel: async (whitelabelId: string, payload: Partial<AgencyWhitelabelResponse>) => {
    const response = await api.put(`/agencywhitelabel/${whitelabelId}`, payload);
    return unwrapApiResponse<AgencyWhitelabelResponse>(response.data);
  },
  getBranding: async (agencyId?: string | null): Promise<WhitelabelBrandingDto> => {
    const response = await api.get('/agencywhitelabel/branding', { params: agencyId ? { agencyId } : undefined });
    return unwrapApiResponse<WhitelabelBrandingDto>(response.data);
  },
  getReportSettings: async (agencyId?: string | null): Promise<WhitelabelReportSettingsDto> => {
    const response = await api.get('/agencywhitelabel/report-settings', { params: agencyId ? { agencyId } : undefined });
    return unwrapApiResponse<WhitelabelReportSettingsDto>(response.data);
  },
  getDefaultBranding: async (): Promise<DefaultWhitelabelDto> => {
    const response = await api.get('/agencywhitelabel/default');
    return unwrapApiResponse<DefaultWhitelabelDto>(response.data);
  },
};

export default agencyApi;








