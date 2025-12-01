import { getBackendServiceToken } from './backend-auth';
import axios from 'axios';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9000';

export interface Business {
  id: string;
  name: string;
  businessCode: string;
  currency: string;
  timezone: string;
  ownerName?: string;
  country?: string;
  isActive?: boolean;
  deletedAt?: string | null;
  createdAt: string;
}

export interface BusinessStats {
  business: Business;
  transactionCount: number;
  totalSales: number;
  totalExpenses: number;
  profit: number;
  userCount: number;
}

export interface PlatformStats {
  totalBusinesses: number;
  totalTransactions: number;
  totalSales: number;
  totalExpenses: number;
  profit: number;
  activeUsers: number;
}

export interface PaginatedBusinesses {
  data: Business[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface BusinessDetails {
  business: Business & {
    isActive: boolean;
    deletedAt: string | null;
  };
  owner: {
    id: string;
    employeeName: string | null;
    phoneNumber: string;
  } | null;
  statistics: {
    transactionCount: number;
    totalSales: number;
    totalExpenses: number;
    profit: number;
    userCount: number;
  };
}

export interface ProductInput {
  name: string;
  quantity: number;
  unitPrice?: number;
}

export interface UploadProductsResult {
  success: boolean;
  created: number;
  skipped: number;
  errors: string[];
  message?: string;
}

export interface Product {
  id: string;
  product: string;
  productCode: string | null;
  quantity: number;
  unitPrice: number | null;
  updatedAt: string;
}

export interface CreateProductInput {
  name: string;
  quantity: number;
  unitPrice?: number;
}

export interface UpdateProductInput {
  name?: string;
  quantity?: number;
  unitPrice?: number;
}

/**
 * MonPetitBiz Database Client
 * 
 * This class calls the backend API to get statistics and business data.
 * It does NOT connect directly to the database.
 */
class MonPetitBizDatabase {
  private async makeRequest(endpoint: string, options?: RequestInit): Promise<any> {
    try {
      const token = getBackendServiceToken();
      const url = `${BACKEND_URL}${endpoint}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        ...options,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Backend API error (${response.status}) for ${url}: ${errorText || response.statusText}`
        );
      }

      return await response.json();
    } catch (error: any) {
      // Améliorer le message d'erreur pour le debugging
      if (error.message.includes('Backend API error')) {
        throw error;
      }
      
      // Erreur de connexion ou autre
      throw new Error(
        `Failed to connect to backend at ${BACKEND_URL}${endpoint}: ${error.message}`
      );
    }
  }

  // Statistics methods - call backend API
  async getTotalBusinesses(): Promise<number> {
    const stats = await this.getPlatformStats();
    return stats.totalBusinesses;
  }

  async getTotalTransactions(): Promise<number> {
    const stats = await this.getPlatformStats();
    return stats.totalTransactions;
  }

  async getTotalSales(): Promise<number> {
    const stats = await this.getPlatformStats();
    return stats.totalSales;
  }

  async getTotalExpenses(): Promise<number> {
    const stats = await this.getPlatformStats();
    return stats.totalExpenses;
  }

  async getActiveUsersCount(): Promise<number> {
    const stats = await this.getPlatformStats();
    return stats.activeUsers;
  }

  async getPlatformStats(): Promise<PlatformStats> {
    return await this.makeRequest('/admin/stats');
  }

  async getAllBusinesses(): Promise<Business[]> {
    const businessesWithStats = await this.getAllBusinessesWithStats();
    return businessesWithStats.map(bs => bs.business);
  }

  async getBusinessStats(businessId: string): Promise<BusinessStats | null> {
    const allBusinesses = await this.getAllBusinessesWithStats();
    return allBusinesses.find(bs => bs.business.id === businessId) || null;
  }

  async getAllBusinessesWithStats(): Promise<BusinessStats[]> {
    return await this.makeRequest('/admin/stats/businesses');
  }

  // Business management methods - call frontend API proxy routes
  async getBusinessesPaginated(
    page: number = 1,
    limit: number = 10,
    search?: string
  ): Promise<PaginatedBusinesses> {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      if (search) {
        params.set('search', search);
      }
      
      // Call the frontend API proxy route which will forward to the backend
      const response = await axios.get(`/api/backend/businesses?${params.toString()}`, {
        withCredentials: true, // Include cookies for authentication
      });
      
      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to fetch businesses';
      throw new Error(errorMessage);
    }
  }

  async getBusinessDetails(businessId: string): Promise<BusinessDetails> {
    try {
      const response = await axios.get(`/api/backend/businesses/${businessId}`, {
        withCredentials: true, // Include cookies for authentication
      });
      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to fetch business details';
      throw new Error(errorMessage);
    }
  }

  async blockBusiness(businessId: string, isActive: boolean): Promise<void> {
    try {
      await axios.patch(
        `/api/backend/businesses/${businessId}`,
        { isActive },
        {
          withCredentials: true, // Include cookies for authentication
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to block/unblock business';
      throw new Error(errorMessage);
    }
  }

  async blockBusinessUsers(businessId: string, isActive: boolean): Promise<void> {
    try {
      await axios.patch(
        `/api/backend/businesses/${businessId}/block-users`,
        { isActive },
        {
          withCredentials: true, // Include cookies for authentication
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to block/unblock business users';
      throw new Error(errorMessage);
    }
  }

  async deleteBusiness(businessId: string): Promise<void> {
    try {
      await axios.delete(`/api/backend/businesses/${businessId}`, {
        withCredentials: true, // Include cookies for authentication
      });
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to delete business';
      throw new Error(errorMessage);
    }
  }

  async uploadProductsFromCSV(businessId: string, file: File): Promise<UploadProductsResult> {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await axios.post<UploadProductsResult>(
        `/api/backend/businesses/${businessId}/products/upload`,
        formData,
        {
          withCredentials: true, // Include cookies for authentication
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to upload products';
      throw new Error(errorMessage);
    }
  }

  async getBusinessProducts(businessId: string): Promise<Product[]> {
    try {
      const response = await axios.get<any>(
        `/api/backend/businesses/${businessId}/products`,
        {
          withCredentials: true, // Include cookies for authentication
        }
      );
      // Handle both array response and wrapped response
      if (Array.isArray(response.data)) {
        return response.data;
      }
      // If backend returns wrapped in data property
      if (response.data && Array.isArray(response.data.data)) {
        return response.data.data;
      }
      // If empty or unexpected format, return empty array
      console.warn('Unexpected products response format:', response.data);
      return [];
    } catch (error: any) {
      console.error('Error fetching products:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to fetch products';
      throw new Error(errorMessage);
    }
  }

  async createProduct(businessId: string, product: CreateProductInput): Promise<Product> {
    try {
      const response = await axios.post<Product>(
        `/api/backend/businesses/${businessId}/products`,
        product,
        {
          withCredentials: true, // Include cookies for authentication
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to create product';
      throw new Error(errorMessage);
    }
  }

  async updateProduct(businessId: string, productId: string, product: UpdateProductInput): Promise<Product> {
    try {
      const response = await axios.patch<Product>(
        `/api/backend/businesses/${businessId}/products/${productId}`,
        product,
        {
          withCredentials: true, // Include cookies for authentication
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to update product';
      throw new Error(errorMessage);
    }
  }

  async deleteProduct(businessId: string, productId: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await axios.delete<{ success: boolean; message: string }>(
        `/api/backend/businesses/${businessId}/products/${productId}`,
        {
          withCredentials: true, // Include cookies for authentication
        }
      );
      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to delete product';
      throw new Error(errorMessage);
    }
  }
}

let monpetitbizDb: MonPetitBizDatabase | null = null;

export function getMonPetitBizDatabase(): MonPetitBizDatabase {
  if (!monpetitbizDb) {
    monpetitbizDb = new MonPetitBizDatabase();
  }
  return monpetitbizDb;
}
