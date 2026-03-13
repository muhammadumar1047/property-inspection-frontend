import api from './http';

export type SendNotificationPayload = {
  title: string;
  message: string;
  userIds: (string | number)[];
};

export const notificationApi = {
  getRecipients: async (): Promise<Array<{ agencyId: string | number; agencyName: string; users: Array<{ userId: string | number; fullname: string }> }>> => {
    const response = await api.get('/notification/recipients');
    return response.data?.data ?? response.data;
  },
  getForUser: async (userId: string | number): Promise<any[]> => {
    const response = await api.get(`/notification/${userId}`);
    return response.data?.data ?? response.data;
  },
  markAsRead: async (notificationRecipientId: string | number): Promise<void> => {
    await api.post(`/notification/markAsRead/${notificationRecipientId}`);
  },
  markAllAsRead: async (userId: string | number): Promise<void> => {
    await api.post(`/notification/markAllAsRead/${userId}`);
  },
  send: async (payload: SendNotificationPayload): Promise<{ message?: string } | any> => {
    const response = await api.post('/notification/send', payload);
    return response.data;
  },
};

export default notificationApi;


