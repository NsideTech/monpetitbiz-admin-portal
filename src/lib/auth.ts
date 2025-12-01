import { apiClient, AuthResponse } from './api';

export interface User {
  id: string;
  username: string;
  role: string;
  businessId?: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

class AuthService {
  private user: User | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      // Try to restore user from token on initialization
      this.restoreSession();
    }
  }

  private async restoreSession(): Promise<void> {
    const token = apiClient.getToken();
    if (token) {
      try {
        const response = await apiClient.getCurrentUser();
        if (response.success && response.data?.user) {
          this.user = response.data.user;
        } else {
          // Invalid token, clear it
          apiClient.clearToken();
        }
      } catch (error) {
        // Token invalid, clear it
        apiClient.clearToken();
      }
    }
  }

  async login(username: string, password: string): Promise<AuthResponse> {
    const response = await apiClient.login(username, password);
    
    if (response.success && response.data?.user) {
      this.user = response.data.user;
    }
    
    return response;
  }

  logout(): void {
    this.user = null;
    apiClient.clearToken();
  }

  async refreshUser(): Promise<void> {
    try {
      const response = await apiClient.getCurrentUser();
      if (response.success && response.data?.user) {
        this.user = response.data.user;
      } else {
        this.user = null;
        apiClient.clearToken();
      }
    } catch (error) {
      this.user = null;
      apiClient.clearToken();
    }
  }

  getUser(): User | null {
    return this.user;
  }

  isAuthenticated(): boolean {
    // Since the cookie is httpOnly, we can't read it directly
    // But if we have a user object, it means we're authenticated
    // The cookie is automatically sent by the browser in all requests
    return this.user !== null;
  }

  getToken(): string | null {
    // The cookie is httpOnly, so we can't read it directly
    // But we return a truthy value if user exists to indicate authentication
    // The actual cookie is handled automatically by the browser
    return this.user !== null ? 'authenticated' : null;
  }
}

export const authService = new AuthService();

