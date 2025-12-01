import type { Metadata } from 'next';
import './globals.css';
import { Footer } from '@/components/Footer';

export const metadata: Metadata = {
  title: 'MonPetitBiz Admin Portal',
  description: 'Admin dashboard for MonPetitBiz business management',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <div style={{ flex: 1 }}>
          {children}
        </div>
        <Footer />
      </body>
    </html>
  );
}

