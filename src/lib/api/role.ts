import api from './http';
import type { ApiResponse } from '@/types/api';

export interface RoleDto {
  id: string;
  name: string;
  description?: string | null;
}

export const roleApi = {
  getByAgency: async (agencyId: string): Promise<RoleDto[]> => {
    const res = await api.get<ApiResponse<RoleDto[]>>('/roles', { params: { agencyId } });
    const body = res.data;
    if (!body || typeof body !== 'object') throw new Error('Invalid API response');
    if ((body as any).success === false) {
      throw new Error((body as any).message || 'Failed to load roles');
    }
    return (body as any).data ?? [];
  },
};

export default roleApi;

