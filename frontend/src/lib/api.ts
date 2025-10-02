import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const API_V1 = `${API_URL}/api/v1`;

export const api = axios.create({
  baseURL: API_V1,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Service Accounts
export const serviceAccountsApi = {
  list: () => api.get('/accounts'),
  get: (id: number) => api.get(`/accounts/${id}`),
  create: (data: { name: string; json_content: string }) => api.post('/accounts', data),
  delete: (id: number) => api.delete(`/accounts/${id}`),
  sync: (id: number, adminEmail: string) => api.post(`/accounts/${id}/sync`, null, { params: { admin_email: adminEmail } }),
};

// Workspace Users
export const usersApi = {
  list: (serviceAccountId?: number) => api.get('/users', { params: { service_account_id: serviceAccountId } }),
  get: (id: number) => api.get(`/users/${id}`),
  update: (id: number, data: any) => api.patch(`/users/${id}`, data),
};

// Campaigns
export const campaignsApi = {
  list: (status?: string) => api.get('/campaigns', { params: { status } }),
  get: (id: number) => api.get(`/campaigns/${id}`),
  create: (data: any) => api.post('/campaigns', data),
  update: (id: number, data: any) => api.patch(`/campaigns/${id}`, data),
  delete: (id: number) => api.delete(`/campaigns/${id}`),
  control: (id: number, action: string) => api.post(`/campaigns/${id}/control`, { action }),
  duplicate: (id: number) => api.post(`/campaigns/${id}/duplicate`),
  logs: (id: number, status?: string) => api.get(`/campaigns/${id}/logs`, { params: { status } }),
};

// Dashboard
export const dashboardApi = {
  stats: () => api.get('/dashboard/stats'),
  recentActivity: (limit?: number) => api.get('/dashboard/recent-activity', { params: { limit } }),
};

