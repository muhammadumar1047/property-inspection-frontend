import type { ApiResponse, PagedResult } from '@/types/api';

export const unwrapApiResponse = <T>(data: ApiResponse<T>): T => {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid API response');
  }
  if (data.success === false) {
    throw new Error(data.message || 'Request failed');
  }
  return data.data;
};

export const unwrapPaged = <T>(data: ApiResponse<PagedResult<T>>) => {
  const paged = unwrapApiResponse<PagedResult<T>>(data);
  return {
    data: paged.data || [],
    page: paged.page || 1,
    pageSize: paged.pageSize || 0,
    totalCount: paged.totalCount || 0,
    totalPages: paged.totalPages || 1,
  };
};
