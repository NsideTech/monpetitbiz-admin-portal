import { AdminHeader } from '@/components/admin/AdminHeader';
import { AdminGuard } from '@/lib/admin-guard';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminGuard>
      <AdminHeader />
      {children}
    </AdminGuard>
  );
}

