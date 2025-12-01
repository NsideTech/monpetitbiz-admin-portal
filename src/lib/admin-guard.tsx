'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { authService } from './auth';

interface AdminGuardProps {
  children: React.ReactNode;
}

export function AdminGuard({ children }: AdminGuardProps) {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // First, try to restore session in authService
        await authService.refreshUser();
        
        // Then check if authenticated via API call (more reliable with cookies)
        const response = await axios.get('/api/auth/me', {
          withCredentials: true,
        });

        if (response.data.success && response.data.data?.user) {
          const user = response.data.data.user;
          
          // Check if user is admin
          if (user.role !== 'admin') {
            setIsLoading(false);
            router.push('/');
            return;
          }

          setIsAuthorized(true);
          setIsLoading(false);
        } else {
          // Not authenticated
          setIsLoading(false);
          router.push('/login');
        }
      } catch (error: any) {
        // API call failed - user not authenticated
        console.error('Auth check failed:', error);
        setIsLoading(false);
        router.push('/login');
      }
    };

    checkAuth();
  }, [router]);

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
      }}>
        <p>Chargement...</p>
      </div>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  return <>{children}</>;
}

