import api from './http';
import { unwrapApiResponse } from './helpers';
import {
  QuickSuggestionType,
  QuickSuggestionResponse,
  CreateQuickSuggestionRequest,
  UpdateQuickSuggestionRequest,
  QuickSuggestionSettingsResponse,
  UpdateQuickSuggestionSettingsRequest,
  ImportPreviewResult,
  CommitImportRequest
} from '@/types/api';

export const quickSuggestionsApi = {
  getSuggestions: async (
    type: QuickSuggestionType,
    search?: string,
    sortBy?: string,
    page = 1,
    pageSize = 100
  ): Promise<{ data: QuickSuggestionResponse[]; totalCount: number }> => {
    const response = await api.get('/quicksuggestions', {
      params: { type, search, sortBy, page, pageSize }
    });
    // The response body contains the data directly under response.data.data
    // Since this endpoint returns a ServiceResponse with PagedResult,
    // let's make sure to unwrap or extract properly.
    const pagedResult = unwrapApiResponse<{ data: QuickSuggestionResponse[]; totalCount: number }>(response.data);
    return pagedResult;
  },

  getById: async (id: string): Promise<QuickSuggestionResponse> => {
    const response = await api.get(`/quicksuggestions/${id}`);
    return unwrapApiResponse<QuickSuggestionResponse>(response.data);
  },

  create: async (request: CreateQuickSuggestionRequest): Promise<QuickSuggestionResponse> => {
    const response = await api.post('/quicksuggestions', request);
    return unwrapApiResponse<QuickSuggestionResponse>(response.data);
  },

  update: async (id: string, request: UpdateQuickSuggestionRequest): Promise<QuickSuggestionResponse> => {
    const response = await api.put(`/quicksuggestions/${id}`, request);
    return unwrapApiResponse<QuickSuggestionResponse>(response.data);
  },

  delete: async (id: string): Promise<boolean> => {
    const response = await api.delete(`/quicksuggestions/${id}`);
    return unwrapApiResponse<boolean>(response.data);
  },

  getSettings: async (): Promise<QuickSuggestionSettingsResponse> => {
    const response = await api.get('/quicksuggestions/settings');
    return unwrapApiResponse<QuickSuggestionSettingsResponse>(response.data);
  },

  updateSettings: async (request: UpdateQuickSuggestionSettingsRequest): Promise<QuickSuggestionSettingsResponse> => {
    const response = await api.put('/quicksuggestions/settings', request);
    return unwrapApiResponse<QuickSuggestionSettingsResponse>(response.data);
  },

  previewImport: async (type: QuickSuggestionType, file: File): Promise<ImportPreviewResult> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post(`/quicksuggestions/import/preview`, formData, {
      params: { type },
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return unwrapApiResponse<ImportPreviewResult>(response.data);
  },

  commitImport: async (request: CommitImportRequest): Promise<number> => {
    const response = await api.post('/quicksuggestions/import/commit', request);
    return unwrapApiResponse<number>(response.data);
  },

  exportCsv: async (type: QuickSuggestionType): Promise<Blob> => {
    const response = await api.get('/quicksuggestions/export', {
      params: { type },
      responseType: 'blob'
    });
    return response.data;
  }
};

export default quickSuggestionsApi;
