import api from './http';
import type { ApiResponse, PagedResult } from '@/types/api';
import { InspectionType } from '@/types/api';

export interface EmailTemplateResponse {
  id: string;
  agencyId: string;
  name: string;
  subject: string;
  inspectionType: InspectionType;
  isDefault: boolean;
  lastUpdated: string;
  snippet: string;
  body: string;
  fontFamily?: string | null;
  lineSpacing?: string | null;
  primaryColor?: string | null;
  accentColor?: string | null;
  backgroundColor?: string | null;
  status: 'Draft' | 'Published';
}

export interface CreateEmailTemplateRequest {
  name: string;
  subject: string;
  inspectionType: InspectionType;
  isDefault: boolean;
  body: string;
  fontFamily?: string | null;
  lineSpacing?: string | null;
  primaryColor?: string | null;
  accentColor?: string | null;
  backgroundColor?: string | null;
  status: 'Draft' | 'Published';
}

export interface UpdateEmailTemplateRequest {
  name: string;
  subject: string;
  inspectionType: InspectionType;
  isDefault: boolean;
  body: string;
  fontFamily?: string | null;
  lineSpacing?: string | null;
  primaryColor?: string | null;
  accentColor?: string | null;
  backgroundColor?: string | null;
  status: 'Draft' | 'Published';
}

export interface SendTestEmailRequest {
  to: string;
  subject: string;
  body: string;
}

export const emailTemplateApi = {
  getTemplates: async (
    search?: string,
    inspectionType?: InspectionType | string,
    page = 1,
    pageSize = 10
  ): Promise<PagedResult<EmailTemplateResponse>> => {
    // If the caller sends a string filter (like "All", "Entry Inspection"),
    // map it correctly to the enum or pass undefined.
    let mappedType: number | undefined = undefined;
    if (inspectionType === 1 || inspectionType === '1' || inspectionType === 'Entry Inspection' || inspectionType === 'Entry') {
      mappedType = InspectionType.Entry;
    } else if (inspectionType === 2 || inspectionType === '2' || inspectionType === 'Exit Inspection' || inspectionType === 'Exit') {
      mappedType = InspectionType.Exit;
    } else if (inspectionType === 3 || inspectionType === '3' || inspectionType === 'Routine Inspection' || inspectionType === 'Routine') {
      mappedType = InspectionType.Routine;
    }

    const params: any = { page, pageSize };
    if (search) params.search = search;
    if (mappedType !== undefined) params.inspectionType = mappedType;

    const res = await api.get<ApiResponse<PagedResult<EmailTemplateResponse>>>('/EmailTemplates', { params });
    const body = res.data;
    if (!body || typeof body !== 'object') throw new Error('Invalid API response');
    if (body.success === false) {
      throw new Error(body.message || 'Failed to load email templates');
    }
    return body.data;
  },

  getById: async (id: string): Promise<EmailTemplateResponse> => {
    const res = await api.get<ApiResponse<EmailTemplateResponse>>(`/EmailTemplates/${id}`);
    const body = res.data;
    if (!body || typeof body !== 'object') throw new Error('Invalid API response');
    if (body.success === false) {
      throw new Error(body.message || 'Failed to load email template');
    }
    return body.data;
  },

  create: async (request: CreateEmailTemplateRequest): Promise<EmailTemplateResponse> => {
    const res = await api.post<ApiResponse<EmailTemplateResponse>>('/EmailTemplates', request);
    const body = res.data;
    if (!body || typeof body !== 'object') throw new Error('Invalid API response');
    if (body.success === false) {
      throw new Error(body.message || 'Failed to create email template');
    }
    return body.data;
  },

  update: async (id: string, request: UpdateEmailTemplateRequest): Promise<EmailTemplateResponse> => {
    const res = await api.put<ApiResponse<EmailTemplateResponse>>(`/EmailTemplates/${id}`, request);
    const body = res.data;
    if (!body || typeof body !== 'object') throw new Error('Invalid API response');
    if (body.success === false) {
      throw new Error(body.message || 'Failed to update email template');
    }
    return body.data;
  },

  delete: async (id: string): Promise<boolean> => {
    const res = await api.delete<ApiResponse<boolean>>(`/EmailTemplates/${id}`);
    const body = res.data;
    if (!body || typeof body !== 'object') throw new Error('Invalid API response');
    if (body.success === false) {
      throw new Error(body.message || 'Failed to delete email template');
    }
    return body.data;
  },

  makeDefault: async (id: string): Promise<boolean> => {
    const res = await api.post<ApiResponse<boolean>>(`/EmailTemplates/${id}/make-default`);
    const body = res.data;
    if (!body || typeof body !== 'object') throw new Error('Invalid API response');
    if (body.success === false) {
      throw new Error(body.message || 'Failed to designate email template as default');
    }
    return body.data;
  },

  sendTestEmail: async (request: SendTestEmailRequest): Promise<boolean> => {
    const res = await api.post<ApiResponse<boolean>>('/EmailTemplates/send-test', request);
    const body = res.data;
    if (!body || typeof body !== 'object') throw new Error('Invalid API response');
    if (body.success === false) {
      throw new Error(body.message || 'Failed to send test email');
    }
    return body.data;
  },
};

export default emailTemplateApi;
