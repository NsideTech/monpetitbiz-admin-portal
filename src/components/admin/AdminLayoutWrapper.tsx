'use client';

import { AdminHeader } from './AdminHeader';
import { AdminGuard } from '@/lib/admin-guard';

export function AdminLayoutWrapper({ children }: { children: React.ReactNode }) {
  return (
    <AdminGuard>
      <AdminHeader />
      {children}
    </AdminGuard>
  );
}

