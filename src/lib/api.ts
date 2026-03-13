import axios from 'axios';
import {
  LoginDto,
  LoginResultDto,
  AgencyResponse,
  CreateAgencyRequest,
  // user mgmt
  PropertyResponse,
  CreatePropertyRequest,
  LandlordDto,
  TenancyDto,
  TenantDto,
  InspectionResponse,
  CreateInspectionRequest,
  StateDto,
  PropertyTypeDto,
  InspectionTypeDto,
  InspectionStatusDto,
  PropertyLayoutResponse,
  LayoutAreaResponse,
  LayoutItemResponse,
  ApiResponse,
} from '@/types/api';

import api from './api/http';

// Authentication API
export const authApi = {
  login: async (credentials: LoginDto): Promise<import('@/types/api').LoginResponseDto> => {
    const response = await api.post('/auth/login', credentials);
    return response.data; // Already returns standardized envelope in the DTO
  },
  me: async (): Promise<any> => {
    const response = await api.get('/user/me');
    return response.data?.Data ?? response.data;
  },
};

// Agency API
export const agencyApi = {
  getAll: async (): Promise<AgencyResponse[]> => {
    const response = await api.get('/agency');
    const envelope = response.data;
    const body = envelope?.Data?.Data ?? envelope?.Data ?? envelope;
    return Array.isArray(body) ? body : [];
  },

  getAllForSuperAdmin: async (): Promise<AgencyResponse[]> => {
    const response = await api.get('/agency');
    const envelope = response.data;
    const body = envelope?.Data?.Data ?? envelope?.Data ?? envelope;
    return Array.isArray(body) ? body : [];
  },

  create: async (agency: CreateAgencyRequest): Promise<any> => {
    const response = await api.post('/agency', agency);
    return response.data?.Data ?? response.data;
  },

  delete: async (id: string | number): Promise<void> => {
    await api.delete(`/agency/${id}`);
  },
};

// Property API
export const propertyApi = {
  getAll: async (): Promise<PropertyResponse[]> => {
    const response = await api.get('/property');
    const envelope = response.data;
    const body = envelope?.Data?.Data ?? envelope?.Data ?? envelope;
    return Array.isArray(body) ? body : [];
  },

  getAllPaged: async (
    pageNumber: number = 1,
    pageSize: number = 10,
    filters?: {
      isActive?: boolean;
      propertyTypeId?: number;
      propertyManagerId?: number;
      tenant?: string;
      owner?: string;
      suburb?: string;
    }
  ): Promise<{ totalCount: number; data: PropertyResponse[] }> => {
    const params = new URLSearchParams();
    params.set('pageNumber', String(pageNumber));
    params.set('pageSize', String(pageSize));
    if (filters) {
      if (typeof filters.isActive === 'boolean') params.set('isActive', String(filters.isActive));
      if (typeof filters.propertyTypeId === 'number') params.set('propertyTypeId', String(filters.propertyTypeId));
      if (typeof filters.propertyManagerId === 'number') params.set('propertyManagerId', String(filters.propertyManagerId));
      if (filters.tenant) params.set('tenant', filters.tenant);
      if (filters.owner) params.set('owner', filters.owner);
      if (filters.suburb) params.set('suburb', filters.suburb);
    }
    const response = await api.get(`/property?${params.toString()}`);
    const envelope = response.data;
    const pagedResult = envelope?.Data;
    
    if (pagedResult && typeof pagedResult === 'object' && ('Data' in pagedResult || 'data' in pagedResult)) {
      const data = (pagedResult.Data ?? pagedResult.data) as PropertyResponse[];
      const totalCount = (pagedResult.TotalCount ?? pagedResult.totalCount ?? data?.length ?? 0) as number;
      return { data, totalCount };
    }
    
    if (Array.isArray(pagedResult)) {
      return { data: pagedResult as PropertyResponse[], totalCount: pagedResult.length };
    }
    
    return { data: [], totalCount: 0 };
  },

  getById: async (id: number | string): Promise<PropertyResponse> => {
    const response = await api.get(`/property/${id}`);
    return response.data?.Data ?? response.data;
  },

  getWithLayout: async (id: number | string): Promise<PropertyResponse> => {
    const response = await api.get(`/property/${id}/with-layout`);
    return response.data?.Data ?? response.data;
  },

  create: async (property: CreatePropertyRequest): Promise<PropertyResponse> => {
    const response = await api.post('/property', property);
    return response.data?.Data ?? response.data;
  },

  update: async (id: number | string, property: Partial<CreatePropertyRequest>): Promise<PropertyResponse> => {
    const response = await api.put(`/property/${id}`, property);
    return response.data?.Data ?? response.data;
  },

  delete: async (id: number | string): Promise<void> => {
    await api.delete(`/property/${id}`);
  },

  // Landlord endpoints
  getLandlords: async (propertyId: number | string): Promise<LandlordDto[]> => {
    const response = await api.get(`/property/${propertyId}/landlords`);
    return response.data?.Data ?? response.data;
  },

  createLandlord: async (landlord: any): Promise<LandlordDto> => {
    const response = await api.post('/property/landlords', landlord);
    return response.data?.Data ?? response.data;
  },

  updateLandlord: async (landlordId: number | string, landlord: any): Promise<LandlordDto> => {
    const response = await api.put(`/property/landlords/${landlordId}`, landlord);
    return response.data?.Data ?? response.data;
  },

  deleteLandlord: async (landlordId: number | string): Promise<void> => {
    await api.delete(`/property/landlords/${landlordId}`);
  },

  // Tenancy endpoints
  getTenancies: async (propertyId: number | string): Promise<TenancyDto[]> => {
    const response = await api.get(`/property/${propertyId}/tenancies`);
    return response.data?.Data ?? response.data;
  },

  getActiveTenancy: async (propertyId: number | string): Promise<TenancyDto> => {
    const response = await api.get(`/property/${propertyId}/active-tenancy`);
    return response.data?.Data ?? response.data;
  },

  createTenancy: async (tenancy: any): Promise<TenancyDto> => {
    const response = await api.post('/property/tenancies', tenancy);
    return response.data?.Data ?? response.data;
  },

  updateTenancy: async (tenancyId: number | string, tenancy: any): Promise<TenancyDto> => {
    const response = await api.put(`/property/tenancies/${tenancyId}`, tenancy);
    return response.data?.Data ?? response.data;
  },

  deleteTenancy: async (tenancyId: number | string): Promise<void> => {
    await api.delete(`/property/tenancies/${tenancyId}`);
  },

  // Tenant endpoints
  getTenants: async (tenancyId: number | string): Promise<TenantDto[]> => {
    const response = await api.get(`/property/tenancies/${tenancyId}/tenants`);
    return response.data?.Data ?? response.data;
  },

  createTenant: async (tenant: any): Promise<TenantDto> => {
    const response = await api.post('/property/tenants', tenant);
    return response.data?.Data ?? response.data;
  },

  updateTenant: async (tenantId: number | string, tenant: any): Promise<TenantDto> => {
    const response = await api.put(`/property/tenants/${tenantId}`, tenant);
    return response.data?.Data ?? response.data;
  },

  deleteTenant: async (tenantId: number | string): Promise<void> => {
    await api.delete(`/property/tenants/${tenantId}`);
  },
};

// Inspection API
export const inspectionApi = {
  getAll: async (
    pageNumber: number = 1,
    pageSize: number = 10,
    filters?: {
      inspectionId?: number;
      inspectionTypeId?: number;
      inspectionStatusId?: number;
      inspectorId?: number;
      suburb?: string;
      inspectionDate?: string; // yyyy-mm-dd
      startDate?: string; // yyyy-mm-dd
      endDate?: string;   // yyyy-mm-dd
      searchProperty?: string; // property address search
    }
  ): Promise<{ totalCount: number; data: InspectionResponse[] }> => {
    const params = new URLSearchParams();
    params.set('pageNumber', String(pageNumber));
    params.set('pageSize', String(pageSize));
    if (filters) {
      if (filters.inspectionId !== undefined && filters.inspectionId !== null) params.set('inspectionId', String(filters.inspectionId));
      if (filters.inspectionTypeId !== undefined && filters.inspectionTypeId !== null) params.set('inspectionTypeId', String(filters.inspectionTypeId));
      if (filters.inspectionStatusId !== undefined && filters.inspectionStatusId !== null) params.set('inspectionStatusId', String(filters.inspectionStatusId));
      if (filters.inspectorId !== undefined && filters.inspectorId !== null) params.set('inspectorId', String(filters.inspectorId));
      if (filters.suburb !== undefined && filters.suburb !== null && filters.suburb !== '') params.set('suburb', filters.suburb);
      if (filters.inspectionDate !== undefined && filters.inspectionDate !== null && filters.inspectionDate !== '') params.set('inspectionDate', filters.inspectionDate);
      if (filters.startDate !== undefined && filters.startDate !== null && filters.startDate !== '') params.set('startDate', filters.startDate);
      if (filters.endDate !== undefined && filters.endDate !== null && filters.endDate !== '') params.set('endDate', filters.endDate);
      if (filters.searchProperty !== undefined && filters.searchProperty !== null && filters.searchProperty !== '') {
        params.set('searchProperty', filters.searchProperty);
      }
    }
    const response = await api.get(`/inspection?${params.toString()}`);
    const envelope = response.data;
    const pagedResult = envelope?.Data;
    
    if (pagedResult && typeof pagedResult === 'object' && ('Data' in pagedResult || 'data' in pagedResult)) {
        return {
            data: pagedResult.Data ?? pagedResult.data,
            totalCount: pagedResult.TotalCount ?? pagedResult.totalCount ?? pagedResult.Data?.length ?? 0
        };
    }
    
    if (Array.isArray(pagedResult)) {
      return { data: pagedResult as InspectionResponse[], totalCount: pagedResult.length };
    }
    
    // Fallback for previous structures or direct arrays
    return Array.isArray(envelope) ? { data: envelope, totalCount: envelope.length } : { data: [], totalCount: 0 };
  },

  getById: async (id: string): Promise<InspectionResponse> => {
    const response = await api.get(`/inspection/${id}`);
    return response.data?.Data ?? response.data;
  },

  getByProperty: async (propertyId: number | string): Promise<InspectionResponse[]> => {
    // Backend: ApiResponse<IReadOnlyList<InspectionResponse>> from GetByProperty
    const response = await api.get<ApiResponse<InspectionResponse[]>>(`/inspection/property/${propertyId}`);
    const envelope = response.data;
    if (envelope && typeof envelope === 'object' && Array.isArray(envelope.data)) {
      return envelope.data;
    }
    const inner = (envelope as any)?.Data ?? (envelope as any)?.data ?? envelope;
    return Array.isArray(inner) ? (inner as InspectionResponse[]) : [];
  },

  getByInspector: async (inspectorId: number | string): Promise<InspectionResponse[]> => {
    const response = await api.get(`/inspection/inspector/${inspectorId}`);
    return response.data?.Data ?? response.data;
  },

  getByStatus: async (statusId: number | string): Promise<InspectionResponse[]> => {
    const response = await api.get(`/inspection/status/${statusId}`);
    return response.data?.Data ?? response.data;
  },

  getByDateRange: async (startDate: string, endDate: string): Promise<InspectionResponse[]> => {
    const response = await api.get(`/inspection/date-range?startDate=${startDate}&endDate=${endDate}`);
    return response.data?.Data ?? response.data;
  },

  create: async (inspection: CreateInspectionRequest): Promise<InspectionResponse> => {
    const response = await api.post('/inspection', inspection);
    return response.data?.Data ?? response.data;
  },

  update: async (id: string, inspection: Partial<CreateInspectionRequest>): Promise<InspectionResponse> => {
    const response = await api.put(`/inspection/${id}`, inspection);
    return response.data?.Data ?? response.data;
  },

  updateInspection: async (id: string, inspection: any): Promise<InspectionResponse> => {
    const response = await api.put(`/inspection/${id}`, inspection);
    return response.data?.Data ?? response.data;
  },

  updateStatus: async (id: string, statusId: number, notes?: string): Promise<InspectionResponse> => {
    const response = await api.patch(`/inspection/${id}/status`, { statusId, notes });
    return response.data?.Data ?? response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/inspection/${id}`);
  },

  // Lookup data
  getInspectionTypes: async (): Promise<InspectionTypeDto[]> => {
    const response = await api.get('/lookup/inspection/types');
    const body = response.data?.data ?? response.data;
    return Array.isArray(body) ? body : [];
  },

  getInspectionStatuses: async (): Promise<InspectionStatusDto[]> => {
    const response = await api.get('/lookup/inspection/statuses');
    const body = response.data?.data ?? response.data;
    return Array.isArray(body) ? body : [];
  },

  getAvailableInspectors: async (): Promise<any[]> => {
    const response = await api.get('/user');
    const body = response.data?.data?.data ?? response.data?.data ?? response.data;
    return Array.isArray(body) ? body : [];
  },

  searchProperties: async (searchTerm?: string): Promise<any[]> => {
    const response = await api.get(`/search/properties?query=${searchTerm || ''}`);
    return response.data?.Data ?? response.data;
  },

  search: async (query: string): Promise<{ properties: any[]; inspections: any[] }> => {
    debugger;
    const response = await api.get(`/search?query=${query}`);
    return response.data?.Data ?? response.data;
  },

  getPropertyById: async (id: number | string): Promise<any> => {
    const response = await api.get(`/Property/${id}`);
    return response.data?.Data ?? response.data;
  },

  getInspectionById: async (id: string): Promise<any> => {
    const response = await api.get(`/inspection/${id}`);
    return response.data?.Data ?? response.data;
  },
};

// Reference Data API
export const referenceApi = {
  getStates: async (): Promise<StateDto[]> => {
    const response = await api.get('/lookup/states');
    const body = response.data?.data ?? response.data;
    const raw = Array.isArray(body) ? body : [];
    return raw.map((s) => {
      const id = s.id ?? s.stateId ?? s.StateId;
      const name = s.name ?? s.stateName ?? s.StateName;
      const countryId = s.countryId ?? s.CountryId;
      const country = s.country ?? s.Country;
      return { id, name, countryId, country } as StateDto;
    });
  },

  getPropertyTypes: async (): Promise<PropertyTypeDto[]> => {
    const response = await api.get('/lookup/propertytypes');
    const body = response.data?.Data ?? response.data;
    const raw = Array.isArray(body) ? body : [];
    return (raw as any[]).map((p) => {
      const propertyTypeId = p.propertyTypeId ?? p.PropertyTypeId ?? p.id;
      const name = p.name ?? p.typeName ?? p.TypeName;
      const description = p.description ?? p.Description;
      return { propertyTypeId, name, description } as PropertyTypeDto;
    });
  },

  getInspectionTypes: async (): Promise<InspectionTypeDto[]> => {
    const response = await api.get('/lookup/inspection/types');
    const body = response.data?.data ?? response.data;
    return (Array.isArray(body) ? body : []).map((t: any) => ({
      id: t.id ?? t.inspectionTypeId ?? t.InspectionTypeId,
      inspectionTypeId: t.id ?? t.inspectionTypeId ?? t.InspectionTypeId,
      name: t.name ?? t.inspectionTypeName ?? t.typeName ?? t.TypeName,
    }));
  },

  getInspectionStatuses: async (): Promise<InspectionStatusDto[]> => {
    const response = await api.get('/lookup/inspection/statuses');
    const body = response.data?.data ?? response.data;
    return (Array.isArray(body) ? body : []).map((s: any) => ({
      id: s.id ?? s.inspectionStatusId ?? s.InspectionStatusId,
      inspectionStatusId: s.id ?? s.inspectionStatusId ?? s.InspectionStatusId,
      name: s.name ?? s.inspectionStatusName ?? s.statusName ?? s.StatusName,
    }));
  },
};

// Property Layout API
export const layoutApi = {
  getAll: async (): Promise<PropertyLayoutResponse[]> => {
    const response = await api.get('/propertylayout');
    return response.data?.Data ?? response.data;
  },

  getById: async (id: number | string): Promise<PropertyLayoutResponse> => {
    const response = await api.get(`/propertylayout/${id}`);
    return response.data?.Data ?? response.data;
  },

  getWithAreas: async (id: number | string): Promise<PropertyLayoutResponse> => {
    const response = await api.get(`/propertylayout/${id}/with-areas`);
    return response.data?.Data ?? response.data;
  },

  create: async (layout: any): Promise<PropertyLayoutResponse> => {
    const response = await api.post('/propertylayout', layout);
    return response.data?.Data ?? response.data;
  },

  update: async (id: number | string, layout: any): Promise<PropertyLayoutResponse> => {
    const response = await api.put(`/propertylayout/${id}`, layout);
    return response.data?.Data ?? response.data;
  },

  delete: async (id: number | string): Promise<void> => {
    await api.delete(`/propertylayout/${id}`);
  },

  // Area endpoints
  getAreas: async (layoutId: number | string): Promise<LayoutAreaResponse[]> => {
    const response = await api.get(`/propertylayout/${layoutId}/areas`);
    return response.data?.Data ?? response.data;
  },

  createArea: async (area: any): Promise<LayoutAreaResponse> => {
    const response = await api.post('/propertylayout/areas', area);
    return response.data?.Data ?? response.data;
  },

  updateArea: async (areaId: number | string, area: any): Promise<LayoutAreaResponse> => {
    const response = await api.put(`/propertylayout/areas/${areaId}`, area);
    return response.data?.Data ?? response.data;
  },

  deleteArea: async (areaId: number): Promise<void> => {
    await api.delete(`/propertylayout/areas/${areaId}`);
  },

  // Item endpoints
  getItems: async (areaId: number): Promise<LayoutItemResponse[]> => {
    const response = await api.get(`/propertylayout/areas/${areaId}/items`);
    return response.data;
  },

  createItem: async (item: any): Promise<LayoutItemResponse> => {
    const response = await api.post('/propertylayout/items', item);
    return response.data?.Data ?? response.data;
  },

  updateItem: async (itemId: number | string, item: any): Promise<LayoutItemResponse> => {
    const response = await api.put(`/propertylayout/items/${itemId}`, item);
    return response.data?.Data ?? response.data;
  },

  deleteItem: async (itemId: number | string): Promise<void> => {
    await api.delete(`/propertylayout/items/${itemId}`);
  },
};

// Report API
export const reportApi = {
  getInspectionReport: async (inspectionId: string): Promise<import('@/types/api').ReportDto> => {
    const response = await api.get(`/report/inspection/${inspectionId}`);
    return response.data?.Data ?? response.data;
  },
  updateInspectionReport: async (
    inspectionId: string,
    payload: Partial<{ notes: string; reportAreas: any }>
  ): Promise<import('@/types/api').ReportDto> => {
    const response = await api.put(`/report/inspection/${inspectionId}`, payload);
    return response.data?.Data ?? response.data;
  },
};

// Agency Management (Users in an agency)
export const agencyManagementApi = {
  addUser: async (payload: { username: string; email: string; password: string; role: string }): Promise<any> => {
    const response = await api.post('/agencymanagement/AddUser', {
      Username: payload.username,
      Email: payload.email,
      Password: payload.password,
      Role: payload.role,
    });
    return response.data?.Data ?? response.data;
  },

  getUsers: async (): Promise<any[]> => {
    const response = await api.get('/agencymanagement/GetUsers');
    const envelope = response.data;
    return envelope?.Data?.Data ?? envelope?.Data ?? envelope;
  },

  updateRole: async (userId: number | string, newRole: string): Promise<any> => {
    const response = await api.put(`/agencymanagement/UpdateRole/${userId}`, { newRole });
    return response.data?.Data ?? response.data;
  },

  deleteUser: async (userId: number | string): Promise<any> => {
    const response = await api.delete(`/agencymanagement/DeleteUser/${userId}`);
    return response.data?.Data ?? response.data;
  },
};

export default api;


