import axios from 'axios';

/**
 * Get the backend API URL dynamically
 * This runs in the browser and detects the correct backend URL
 */
function getApiUrl(): string {
  // Server-side rendering: use environment variable or localhost
  if (typeof window === 'undefined') {
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  }
  
  // Client-side: detect from browser location
  const hostname = window.location.hostname;
  const protocol = window.location.protocol;
  
  // If accessing via IP or domain, use that IP/domain with port 8000
  const apiUrl = `${protocol}//${hostname}:8000`;
  
  console.log('🌐 API URL Detection:', {
    hostname,
    protocol,
    detectedApiUrl: apiUrl,
    windowOrigin: window.location.origin
  });
  
  return apiUrl;
}

const API_URL = getApiUrl();
const API_V1 = `${API_URL}/api/v1`;

console.log('✅ API Configuration:', { API_URL, API_V1 });

export const api = axios.create({
  baseURL: API_V1,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 second timeout
  validateStatus: (status) => status < 500, // Don't reject on 4xx errors
});

// Add request interceptor for debugging
api.interceptors.request.use(
  (config) => {
    console.log('API Request:', config.method?.toUpperCase(), config.url);
    return config;
  },
  (error) => {
    console.error('Request Error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor for better error handling
api.interceptors.response.use(
  response => {
    console.log('API Response:', response.status, response.config.url);
    return response;
  },
  error => {
    console.error('API Error Details:', {
      message: error.message,
      code: error.code,
      response: error.response?.data,
      status: error.response?.status,
      url: error.config?.url,
    });
    
    if (error.response) {
      // Server responded with error
      const message = error.response.data?.detail || error.response.data?.message || 'Server error';
      return Promise.reject(new Error(message));
    } else if (error.request) {
      // Request made but no response
      return Promise.reject(new Error('Cannot connect to server. Please check if backend is running.'));
    } else {
      return Promise.reject(new Error(error.message || 'Unknown error'));
    }
  }
);

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

// Health Check
export const healthCheck = async (): Promise<boolean> => {
  try {
    const response = await axios.get(`${API_URL}/health`, { timeout: 5000 });
    console.log('✅ Backend health check passed:', response.data);
    return response.status === 200;
  } catch (error) {
    console.error('❌ Backend health check failed:', error);
    return false;
  }
};

// Export API_URL for debugging
export { API_URL, API_V1 };

