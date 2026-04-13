import api from './http';
import {
  PropertyResponse,
  CreatePropertyRequest,
  UpdatePropertyRequest,
  LandlordDto,
  TenancyDto,
  TenantDto,
  ApiResponse,
  PagedResult,
  InspectionFrequencyType,
  PropertyImageUploadResponse,
} from '@/types/api';
import { unwrapApiResponse } from './helpers';
import { serializePropertyImages } from '@/lib/propertyImages';

const EMPTY_GUID = '00000000-0000-0000-0000-000000000000';

function toUpdateRequest(p: PropertyResponse): UpdatePropertyRequest {
  return {
    id: p.id,
    agencyId: p.agencyId ?? null,
    name: p.name,
    type: p.type,
    propertyManagerId: p.propertyManagerId,
    address1: p.address1,
    address2: p.address2 ?? null,
    cityOrSuburb: p.cityOrSuburb,
    stateLookupId: p.stateLookupId,
    postcode: p.postcode,
    inspectionFrequencyType: p.inspectionFrequencyType,
    inspectionFrequencyNumber: p.inspectionFrequencyNumber,
    keyNo: p.keyNo ?? null,
    alarmCode: p.alarmCode ?? null,
    propertyNotes: p.propertyNotes ?? null,
    propertyImages: p.propertyImages ?? null,
    propertyLayoutId: p.propertyLayoutId,
    latitude: p.latitude ?? null,
    longitude: p.longitude ?? null,
    landlords: (p.landlords ?? []).map((l) => ({
      ...l,
      id: l.id || EMPTY_GUID,
      propertyId: l.propertyId || p.id,
    })),
    tenancies: (p.tenancies ?? []).map((t) => ({
      ...t,
      id: t.id || EMPTY_GUID,
      propertyId: t.propertyId || p.id,
      tenants: (t.tenants ?? []).map((te) => ({
        ...te,
        id: te.id || EMPTY_GUID,
        tenancyId: te.tenancyId || t.id,
      })),
    })),
  };
}

export const propertyApi = {
  getAll: async (): Promise<PropertyResponse[]> => {
    const response = await api.get<ApiResponse<PagedResult<PropertyResponse>>>('/property', {
      params: { pageNumber: 1, pageSize: 100 },
    });
    const paged = unwrapApiResponse<PagedResult<PropertyResponse>>(response.data);
    return paged.data ?? [];
  },

  getAllFiltered: async (
    pageNumber: number = 1,
    pageSize: number = 10,
    filters: {
      propertyType?: number;
      propertyManagerId?: string;
      tenant?: string;
      owner?: string;
      suburb?: string;
      isActive?: boolean;
    } = {},
  ): Promise<{ data: PropertyResponse[]; totalCount: number }> => {
    const params: Record<string, any> = {
      pageNumber,
      pageSize,
    };

    if (filters.propertyType != null) params.propertyType = filters.propertyType;
    if (filters.propertyManagerId) params.propertyManagerId = filters.propertyManagerId;
    if (filters.tenant) params.tenant = filters.tenant;
    if (filters.owner) params.owner = filters.owner;
    if (filters.suburb) params.suburb = filters.suburb;
    if (filters.isActive !== undefined) params.isActive = filters.isActive;

    const response = await api.get<ApiResponse<PagedResult<PropertyResponse>>>('/property', { params });
    const paged = unwrapApiResponse<PagedResult<PropertyResponse>>(response.data);

    return {
      data: paged.data ?? [],
      totalCount: paged.totalCount ?? (paged.data?.length ?? 0),
    };
  },

  getById: async (id: string): Promise<PropertyResponse> => {
    const response = await api.get<ApiResponse<PropertyResponse>>(`/property/${id}`);
    return unwrapApiResponse<PropertyResponse>(response.data);
  },

  create: async (property: CreatePropertyRequest): Promise<PropertyResponse> => {
    // Send JSON matching CreatePropertyRequest / PropertyRequestBase directly.
    // ASP.NET Core's System.Text.Json is case-insensitive, so camelCase matches C# PascalCase.
    // Also normalise InspectionFrequencyType to a valid numeric enum value.
    let freq = (property as any).inspectionFrequencyType;
    let numericFreq: number;
    if (typeof freq === 'string') {
      const map: Record<string, number> = {
        Day: InspectionFrequencyType.Day,
        Week: InspectionFrequencyType.Week,
        Month: InspectionFrequencyType.Month,
        Year: InspectionFrequencyType.Year,
        day: InspectionFrequencyType.Day,
        week: InspectionFrequencyType.Week,
        month: InspectionFrequencyType.Month,
        year: InspectionFrequencyType.Year,
      };
      const parsed = Number(freq);
      numericFreq = !Number.isNaN(parsed) && parsed > 0 ? parsed : (map[freq] ?? InspectionFrequencyType.Month);
    } else {
      const parsed = Number(freq);
      numericFreq = !Number.isNaN(parsed) && parsed > 0 ? parsed : InspectionFrequencyType.Month;
    }

    const safePayload: CreatePropertyRequest = {
      ...property,
      inspectionFrequencyType: numericFreq as any,
      inspectionFrequencyNumber: Number(property.inspectionFrequencyNumber) || 1,
    };
    (safePayload as any).propertyImages = serializePropertyImages((safePayload as any).propertyImages);
    const response = await api.post<ApiResponse<PropertyResponse>>('/property', safePayload);
    return unwrapApiResponse<PropertyResponse>(response.data);
  },

  update: async (id: string, property: Partial<CreatePropertyRequest>): Promise<boolean> => {
    // Backend UpdateAsync requires body.Id to match route propertyId and enums as numbers
    const body: any = {
      ...property,
      id, // ensure Id matches route
    };
    if (body.propertyImages !== undefined) {
      body.propertyImages = serializePropertyImages(body.propertyImages);
    }
    if (body.inspectionFrequencyType != null) {
      const parsed = Number(body.inspectionFrequencyType);
      body.inspectionFrequencyType = !Number.isNaN(parsed) && parsed > 0 ? parsed : body.inspectionFrequencyType;
    }
    const response = await api.put<ApiResponse<boolean>>(`/property/${id}`, body);
    return unwrapApiResponse<boolean>(response.data);
  },

  delete: async (id: string): Promise<boolean> => {
    const response = await api.delete<ApiResponse<boolean>>(`/property/${id}`);
    return unwrapApiResponse<boolean>(response.data);
  },

  uploadImages: async (
    propertyId: string,
    files: File[],
    agencyId?: string | null,
  ): Promise<PropertyImageUploadResponse[]> => {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
    });

    const response = await api.post<ApiResponse<PropertyImageUploadResponse[]>>(
      `/property/${propertyId}/images`,
      formData,
      {
        params: agencyId ? { agencyId } : undefined,
        headers: { 'Content-Type': 'multipart/form-data' },
      },
    );

    return unwrapApiResponse<PropertyImageUploadResponse[]>(response.data);
  },

  // -----------------------------------------------------------------------
  // Convenience helpers (implemented via backend /property/{id} PUT)
  // These keep the UI working without relying on non-existent nested endpoints.
  // -----------------------------------------------------------------------

  getLandlords: async (propertyId: string): Promise<LandlordDto[]> => {
    const p = await propertyApi.getById(propertyId);
    return p.landlords ?? [];
  },

  createLandlord: async (payload: { propertyId: string; name: string; email: string; phone?: string | null }): Promise<boolean> => {
    const p = await propertyApi.getById(payload.propertyId);
    const req = toUpdateRequest(p);
    req.landlords = [
      ...(req.landlords ?? []),
      {
        id: EMPTY_GUID,
        createdAt: new Date().toISOString(),
        createdBy: EMPTY_GUID,
        updatedAt: null,
        updatedBy: null,
        isDeleted: false,
        deletedBy: null,
        deletedAt: null,
        isActive: true,
        propertyId: p.id,
        name: payload.name,
        email: payload.email,
        phone: payload.phone ?? null,
      } as any,
    ];
    return await propertyApi.update(p.id, req);
  },

  updateLandlord: async (landlordId: string, payload: { propertyId: string; name?: string; email?: string; phone?: string | null }): Promise<boolean> => {
    const p = await propertyApi.getById(payload.propertyId);
    const req = toUpdateRequest(p);
    req.landlords = (req.landlords ?? []).map((l: any) =>
      l.id === landlordId
        ? { ...l, name: payload.name ?? l.name, email: payload.email ?? l.email, phone: payload.phone ?? l.phone }
        : l
    );
    return await propertyApi.update(p.id, req);
  },

  deleteLandlord: async (landlordId: string, payload?: { propertyId: string }): Promise<boolean> => {
    if (!payload?.propertyId) throw new Error('propertyId is required');
    const p = await propertyApi.getById(payload.propertyId);
    const req = toUpdateRequest(p);
    req.landlords = (req.landlords ?? []).filter((l: any) => l.id !== landlordId);
    return await propertyApi.update(p.id, req);
  },

  getTenancies: async (propertyId: string): Promise<TenancyDto[]> => {
    const p = await propertyApi.getById(propertyId);
    return p.tenancies ?? [];
  },

  createTenancy: async (payload: Partial<TenancyDto> & { propertyId: string }): Promise<boolean> => {
    const p = await propertyApi.getById(payload.propertyId);
    const req = toUpdateRequest(p);
    req.tenancies = [
      ...(req.tenancies ?? []),
      {
        id: EMPTY_GUID,
        createdAt: new Date().toISOString(),
        createdBy: EMPTY_GUID,
        updatedAt: null,
        updatedBy: null,
        isDeleted: false,
        deletedBy: null,
        deletedAt: null,
        isActive: true,
        propertyId: p.id,
        fullName: payload.fullName ?? '',
        email: payload.email ?? '',
        mobile: payload.mobile ?? null,
        leaseStartDate: payload.leaseStartDate ?? new Date().toISOString(),
        leaseEndDate: payload.leaseEndDate ?? new Date().toISOString(),
        currentRentAmount: payload.currentRentAmount ?? 0,
        rentFrequency: payload.rentFrequency ?? 4,
        originalLeaseDate: payload.originalLeaseDate ?? null,
        tenantVacateDate: payload.tenantVacateDate ?? null,
        newInspectionDate: payload.newInspectionDate ?? null,
        tenants: payload.tenants ?? [],
      } as any,
    ];
    return await propertyApi.update(p.id, req);
  },

  updateTenancy: async (tenancyId: string, payload: Partial<TenancyDto> & { propertyId: string }): Promise<boolean> => {
    const p = await propertyApi.getById(payload.propertyId);
    const req = toUpdateRequest(p);
    req.tenancies = (req.tenancies ?? []).map((t: any) => (t.id === tenancyId ? { ...t, ...payload } : t));
    return await propertyApi.update(p.id, req);
  },

  deleteTenancy: async (tenancyId: string, payload?: { propertyId: string }): Promise<boolean> => {
    if (!payload?.propertyId) throw new Error('propertyId is required');
    const p = await propertyApi.getById(payload.propertyId);
    const req = toUpdateRequest(p);
    req.tenancies = (req.tenancies ?? []).filter((t: any) => t.id !== tenancyId);
    return await propertyApi.update(p.id, req);
  },

  getTenants: async (propertyId: string, tenancyId: string): Promise<TenantDto[]> => {
    const p = await propertyApi.getById(propertyId);
    const t = (p.tenancies ?? []).find((x) => x.id === tenancyId);
    return t?.tenants ?? [];
  },

  createTenant: async (payload: Partial<TenantDto> & { propertyId: string; tenancyId: string }): Promise<boolean> => {
    const p = await propertyApi.getById(payload.propertyId);
    const req = toUpdateRequest(p);
    req.tenancies = (req.tenancies ?? []).map((t: any) => {
      if (t.id !== payload.tenancyId) return t;
      return {
        ...t,
        tenants: [
          ...(t.tenants ?? []),
          {
            id: EMPTY_GUID,
            createdAt: new Date().toISOString(),
            createdBy: EMPTY_GUID,
            updatedAt: null,
            updatedBy: null,
            isDeleted: false,
            deletedBy: null,
            deletedAt: null,
            isActive: true,
            tenancyId: t.id,
            firstName: payload.firstName ?? '',
            lastName: payload.lastName ?? '',
            phone: payload.phone ?? null,
            email: payload.email ?? null,
            rentReviewDate: payload.rentReviewDate ?? null,
            rentReviewNotes: payload.rentReviewNotes ?? null,
          } as any,
        ],
      };
    });
    return await propertyApi.update(p.id, req);
  },

  updateTenant: async (tenantId: string, payload: Partial<TenantDto> & { propertyId: string; tenancyId: string }): Promise<boolean> => {
    const p = await propertyApi.getById(payload.propertyId);
    const req = toUpdateRequest(p);
    req.tenancies = (req.tenancies ?? []).map((t: any) => {
      if (t.id !== payload.tenancyId) return t;
      return {
        ...t,
        tenants: (t.tenants ?? []).map((te: any) => (te.id === tenantId ? { ...te, ...payload } : te)),
      };
    });
    return await propertyApi.update(p.id, req);
  },

  deleteTenant: async (tenantId: string, payload?: { propertyId: string; tenancyId: string }): Promise<boolean> => {
    if (!payload?.propertyId || !payload?.tenancyId) throw new Error('propertyId and tenancyId are required');
    const p = await propertyApi.getById(payload.propertyId);
    const req = toUpdateRequest(p);
    req.tenancies = (req.tenancies ?? []).map((t: any) => {
      if (t.id !== payload.tenancyId) return t;
      return { ...t, tenants: (t.tenants ?? []).filter((te: any) => te.id !== tenantId) };
    });
    return await propertyApi.update(p.id, req);
  },
};

export default propertyApi;






