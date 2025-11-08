const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface ApiResponse<T = any> {
  data?: T;
  message?: string;
  error?: string;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return { data };
    } catch (error) {
      console.error('API request failed:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Account management
  async getAccounts() {
    return this.request('/api/accounts/');
  }

  async createAccount(accountData: any) {
    return this.request('/api/accounts/', {
      method: 'POST',
      body: JSON.stringify(accountData),
    });
  }

  async updateAccount(id: string, accountData: any) {
    return this.request(`/api/accounts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(accountData),
    });
  }

  async deleteAccount(id: string) {
    return this.request(`/api/accounts/${id}`, {
      method: 'DELETE',
    });
  }

  // Campaign management
  async getCampaigns() {
    return this.request('/api/campaigns/');
  }

  async createCampaign(campaignData: any) {
    return this.request('/api/campaigns/', {
      method: 'POST',
      body: JSON.stringify(campaignData),
    });
  }

  // Draft management
  async getDrafts() {
    return this.request('/api/drafts/');
  }

  async createDraft(draftData: any) {
    return this.request('/api/drafts/', {
      method: 'POST',
      body: JSON.stringify(draftData),
    });
  }

  // Contact management
  async getContacts() {
    return this.request('/api/contacts/');
  }

  async uploadContacts(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    
    return this.request('/api/contacts/upload', {
      method: 'POST',
      body: formData,
      headers: {}, // Let browser set Content-Type for FormData
    });
  }

  // Dashboard stats
  async getDashboardStats() {
    return this.request('/api/dashboard/stats');
  }
}

export const apiClient = new ApiClient();
export default apiClient;