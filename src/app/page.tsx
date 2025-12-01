'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '@/lib/auth';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      // Try to restore session first
      if (authService.getUser() === null) {
        try {
          await authService.refreshUser();
        } catch (error) {
          // Session invalid, will redirect to login
        }
      }

      if (authService.isAuthenticated()) {
        const user = authService.getUser();
        if (user?.role === 'admin') {
          // Admins go to dashboard by default
          router.push('/admin/dashboard');
        } else if (user?.businessId) {
          router.push(`/dashboard/${user.businessId}`);
        } else {
          router.push('/login');
        }
      } else {
        router.push('/login');
      }
    };

    checkAuth();
  }, [router]);

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh' 
    }}>
      <p>Chargement...</p>
    </div>
  );
}

