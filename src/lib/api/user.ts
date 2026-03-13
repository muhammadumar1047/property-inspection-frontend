import api from './http';
import type { UserResponse, CreateUserRequest, UpdateUserRequest } from '@/types/api';
import { unwrapApiResponse, unwrapPaged } from './helpers';

export interface UserListParams {
  agencyId?: string | null;
  page?: number;
  pageSize?: number;
  search?: string;
  roleId?: string | null;
  isActive?: boolean | null;
}

export const userApi = {
  list: async (params: UserListParams = {}) => {
    const { agencyId, page = 1, pageSize = 10, search, roleId, isActive } = params;

    const response = await api.get('/user', {
      params: {
        agencyId: agencyId ?? undefined,
        page,
        pageSize,
        ...(search ? { 'filter.Search': search } : {}),
        ...(roleId ? { 'filter.RoleId': roleId } : {}),
        ...(typeof isActive === 'boolean' ? { 'filter.IsActive': isActive } : {}),
      },
    });

    return unwrapPaged<UserResponse>(response.data);
  },

  getByRole: async (
    agencyId: string,
    roleId: string,
    page: number = 1,
    pageSize: number = 100
  ): Promise<{ data: UserResponse[]; totalCount: number }> => {
    const result = await userApi.list({ agencyId, roleId, page, pageSize });
    return {
      data: result.data,
      totalCount: result.totalCount,
    };
  },

  getById: async (id: string): Promise<UserResponse> => {
    const response = await api.get(`/user/${id}`);
    return unwrapApiResponse<UserResponse>(response.data);
  },

  create: async (payload: CreateUserRequest): Promise<UserResponse> => {
    const response = await api.post('/user', payload);
    return unwrapApiResponse<UserResponse>(response.data);
  },

  update: async (id: string, payload: UpdateUserRequest): Promise<boolean> => {
    const response = await api.put(`/user/${id}`, payload);
    return unwrapApiResponse<boolean>(response.data);
  },

  delete: async (id: string): Promise<boolean> => {
    const response = await api.delete(`/user/${id}`);
    return unwrapApiResponse<boolean>(response.data);
  },
};

export default userApi;

