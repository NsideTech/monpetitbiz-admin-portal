import axios, { AxiosInstance, AxiosError } from 'axios';
import Cookies from 'js-cookie';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9000';

export interface ApiError {
  message: string;
  statusCode?: number;
}

export interface AuthResponse {
  success: boolean;
  data?: {
    user: {
      id: string;
      username: string;
      role: string;
      businessId?: string;
    };
  };
  message?: string;
}

export interface DashboardData {
  summary: {
    dailyTotal: number;
    weeklyTotal: number;
    monthlyTotal: number;
    totalTransactions: number;
  };
  recentTransactions: Array<{
    id: string;
    type: string;
    amount: number;
    description: string;
    createdAt: string;
  }>;
  chartData: Array<{
    date: string;
    sales: number;
    expenses: number;
  }>;
  stockWarnings: Array<{
    id: string;
    productName: string;
    quantity: number;
    threshold: number;
  }>;
  stockLevels: Array<{
    id: string;
    productName: string;
    quantity: number;
    unit?: string;
  }>;
}

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_URL,
      headers: {
        'Content-Type': 'application/json',
      },
      withCredentials: true, // Include cookies in requests
    });

    // Add request interceptor to include auth token (for external API calls)
    this.client.interceptors.request.use(
      (config) => {
        const token = this.getToken();
        if (token && config.url?.startsWith(API_URL)) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Add response interceptor to handle errors
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          // Token expired or invalid, clear it
          this.clearToken();
          // Redirect to login if not already there
          if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
            window.location.href = '/login';
          }
        }
        return Promise.reject(this.handleError(error));
      }
    );
  }

  private handleError(error: AxiosError): ApiError {
    if (error.response) {
      const data = error.response.data as any;
      return {
        message: data?.message || error.message || 'An error occurred',
        statusCode: error.response.status,
      };
    }
    return {
      message: error.message || 'Network error occurred',
    };
  }

  getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return Cookies.get('session_token') || null;
  }

  setToken(token: string): void {
    if (typeof window === 'undefined') return;
    Cookies.set('session_token', token, { expires: 7, secure: true, sameSite: 'strict' });
  }

  clearToken(): void {
    if (typeof window === 'undefined') return;
    Cookies.remove('session_token');
  }

  // Authentication methods
  async login(username: string, password: string): Promise<AuthResponse> {
    const response = await axios.post<AuthResponse>('/api/auth/login', {
      username,
      password,
    }, {
      withCredentials: true, // Include cookies in request
    });
    
    return response.data;
  }

  async getCurrentUser(): Promise<AuthResponse> {
    const response = await axios.get<AuthResponse>('/api/auth/me', {
      withCredentials: true, // Include cookies in request
    });
    return response.data;
  }

  // Dashboard methods - Use proxy routes to backend
  async getDashboardData(businessId: string): Promise<DashboardData> {
    const response = await axios.get<DashboardData>(`/api/backend/dashboard/${businessId}`, {
      withCredentials: true,
    });
    return response.data;
  }

  async getDashboardSummary(
    businessId: string,
    period: 'day' | 'week' | 'month' = 'day'
  ): Promise<any> {
    const response = await axios.get(`/api/backend/dashboard/${businessId}/summary`, {
      params: { period },
      withCredentials: true,
    });
    return response.data;
  }

  async getDashboardMetrics(
    businessId: string,
    period: 'day' | 'week' | 'month' = 'day'
  ): Promise<any> {
    const response = await axios.get(`/api/backend/dashboard/${businessId}/metrics`, {
      params: { period },
      withCredentials: true,
    });
    return response.data;
  }

  async exportTransactions(
    businessId: string,
    format: 'csv' | 'json' = 'csv',
    startDate?: string,
    endDate?: string
  ): Promise<Blob> {
    const response = await axios.get(`/api/backend/dashboard/${businessId}/export`, {
      params: { format, startDate, endDate },
      responseType: format === 'csv' ? 'blob' : 'json',
      withCredentials: true,
    });
    return response.data;
  }
}

export const apiClient = new ApiClient();

