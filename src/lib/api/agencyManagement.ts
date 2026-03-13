import api from './http';

export const agencyManagementApi = {
  addUser: async (payload: { username: string; email: string; password: string; role: string; firstName?: string; lastName?: string }): Promise<{ Message: string; UserId: number }> => {
    const response = await api.post('/AgencyManagement/adduser', {
      Username: payload.username,
      Email: payload.email,
      Password: payload.password,
      Role: payload.role,
      FirstName: payload.firstName,
      LastName: payload.lastName,
    });
    return response.data;
  },
  getUsers: async (): Promise<any[]> => {
    const endpoints = [
      '/AgencyManagement/getusers',
      '/AgencyManagement/GetUsers',
      '/agencymanagement/getusers',
      '/agencymanagement/GetUsers',
    ];

    const extractList = (body: any): any[] | null => {
      if (!body) return null;
      if (Array.isArray(body)) return body;
      const keys = ['data', 'Data', 'users', 'Users', 'items', 'Items', 'result', 'Result'];
      for (const k of keys) {
        const v = body[k as keyof typeof body];
        if (Array.isArray(v)) return v as any[];
      }
      return null;
    };

    for (const ep of endpoints) {
      try {
        const res = await api.get(ep);
        const list = extractList(res.data);
        if (list && list.length >= 0) {
          // Normalize common casing so downstream can rely on userId/agencyId/username/email/role
          return list.map((u: any) => ({
            ...u,
            userId: u.userId ?? u.UserId ?? u.domainUserId ?? u.id ?? u.Id,
            agencyId: u.agencyId ?? u.AgencyId,
            username: u.username ?? u.Username ?? null,
            email: u.email ?? u.Email ?? null,
            role: u.role ?? u.Role ?? null,
          }));
        }
      } catch {
        // try next
      }
    }
    return [] as any[];
  },
  getUsersByAgency: async (agencyId: string | number): Promise<any[]> => {
    const response = await api.get(`/AgencyManagement/getusers`, { params: { agencyId } });
    return response.data?.data ?? response.data;
  },
  updateRole: async (userId: number, newRole: string): Promise<{ Message: string }> => {
    const response = await api.put(`/agencymanagement/UpdateRole/${userId}`, { newRole });
    return response.data?.data ?? response.data;
  },

  updateUser: async (
    userId: number,
    payload: {
      username?: string;
      email?: string;
      role?: string;
      firstName?: string;
      lastName?: string;
      isActive?: boolean;
      password?: string;
      profileImage?: string | null;
    }
  ): Promise<{ Message: string }> => {
    const body: any = {
      UserId: userId,
      Username: payload.username,
      Email: payload.email,
      PasswordHash: undefined,
      ProfileImage: payload.profileImage ?? null,
      FirstName: payload.firstName,
      LastName: payload.lastName,
      Role: payload.role,
    };
    if (payload.password && payload.password.trim() !== '') {
      body.PasswordHash = payload.password;
    } else {
      delete body.PasswordHash;
    }
    const response = await api.put(`/Management/UpdateRole/${userId}`, body);
    return response.data;
  },
  deleteUser: async (userId: number): Promise<{ Message: string }> => {
    const response = await api.delete(`/AgencyManagement/DeleteUser/${userId}`);
    return response.data;
  },
};

export default agencyManagementApi;








