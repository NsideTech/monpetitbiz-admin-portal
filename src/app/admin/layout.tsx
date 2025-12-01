import { AdminHeader } from '@/components/admin/AdminHeader';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { AdminGuard } from '@/lib/admin-guard';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminGuard>
      <div style={{ display: 'flex', minHeight: '100vh' }}>
        <AdminSidebar />
        <div style={{ 
          marginLeft: '250px', 
          flex: 1,
          background: '#f5f5f5',
          minHeight: '100vh',
        }}>
          <AdminHeader />
          <div style={{ padding: '20px' }}>
            {children}
          </div>
        </div>
      </div>
    </AdminGuard>
  );
}

