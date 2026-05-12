'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiClient, DashboardData } from '@/lib/api';
import { authService } from '@/lib/auth';

export default function DashboardPage() {
  const params = useParams();
  const router = useRouter();
  const businessId = params.businessId as string;
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkAuthAndLoad = async () => {
      // Try to restore session if user is not loaded
      if (!authService.getUser()) {
        try {
          await authService.refreshUser();
        } catch (error) {
          // Session invalid, redirect to login
          router.push('/login');
          return;
        }
      }

      if (!authService.isAuthenticated()) {
        router.push('/login');
        return;
      }

      const loadDashboard = async () => {
        try {
          const dashboardData = await apiClient.getDashboardData(businessId);
          setData(dashboardData);
        } catch (err: any) {
          setError(err.message || 'Erreur lors du chargement du tableau de bord');
        } finally {
          setLoading(false);
        }
      };

      loadDashboard();
    };

    checkAuthAndLoad();
  }, [businessId, router]);

  const handleLogout = () => {
    authService.logout();
    router.push('/login');
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <p>Chargement...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '40px' }}>
        <div style={{
          background: '#fee',
          color: '#c33',
          padding: '20px',
          borderRadius: '4px',
          marginBottom: '20px',
        }}>
          {error}
        </div>
        <button
          onClick={() => router.push('/login')}
          style={{
            padding: '12px 24px',
            background: '#2c5aa0',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Retour à la connexion
        </button>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      <header style={{
        background: 'white',
        padding: '20px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        marginBottom: '20px',
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <h1>MonPetitBiz Dashboard</h1>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            {authService.getUser()?.role === 'admin' && (
              <button
                onClick={() => router.push('/admin/users')}
                style={{
                  padding: '8px 16px',
                  background: '#2c5aa0',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                Gestion utilisateurs
              </button>
            )}
            <button
              onClick={handleLogout}
              style={{
                padding: '8px 16px',
                background: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              Déconnexion
            </button>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '20px',
          marginBottom: '30px',
        }}>
          <div style={{
            background: 'white',
            padding: '20px',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          }}>
            <h3 style={{ marginBottom: '10px', color: '#666' }}>Aujourd&apos;hui</h3>
            <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#2c5aa0' }}>
              {data.summary.dailyTotal.toLocaleString()} FCFA
            </p>
          </div>
          <div style={{
            background: 'white',
            padding: '20px',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          }}>
            <h3 style={{ marginBottom: '10px', color: '#666' }}>Cette semaine</h3>
            <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#2c5aa0' }}>
              {data.summary.weeklyTotal.toLocaleString()} FCFA
            </p>
          </div>
          <div style={{
            background: 'white',
            padding: '20px',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          }}>
            <h3 style={{ marginBottom: '10px', color: '#666' }}>Ce mois</h3>
            <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#2c5aa0' }}>
              {data.summary.monthlyTotal.toLocaleString()} FCFA
            </p>
          </div>
          <div style={{
            background: 'white',
            padding: '20px',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          }}>
            <h3 style={{ marginBottom: '10px', color: '#666' }}>Total transactions</h3>
            <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#2c5aa0' }}>
              {data.summary.totalTransactions}
            </p>
          </div>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
          gap: '20px',
        }}>
          <div style={{
            background: 'white',
            padding: '20px',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          }}>
            <h2 style={{ marginBottom: '20px' }}>Transactions récentes</h2>
            {data.recentTransactions.length === 0 ? (
              <p style={{ color: '#666' }}>Aucune transaction</p>
            ) : (
              <ul style={{ listStyle: 'none' }}>
                {data.recentTransactions.map((transaction) => (
                  <li
                    key={transaction.id}
                    style={{
                      padding: '12px',
                      borderBottom: '1px solid #eee',
                      display: 'flex',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      <p style={{ fontWeight: 'bold' }}>{transaction.description}</p>
                      <p style={{ fontSize: '12px', color: '#666' }}>
                        {new Date(transaction.createdAt).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                    <p style={{
                      fontWeight: 'bold',
                      color: transaction.type === 'sale' ? '#28a745' : '#dc3545',
                    }}>
                      {transaction.type === 'sale' ? '+' : '-'}
                      {transaction.amount.toLocaleString()} FCFA
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div style={{
            background: 'white',
            padding: '20px',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          }}>
            <h2 style={{ marginBottom: '20px' }}>Alertes stock</h2>
            {data.stockWarnings.length === 0 ? (
              <p style={{ color: '#28a745' }}>Aucune alerte</p>
            ) : (
              <ul style={{ listStyle: 'none' }}>
                {data.stockWarnings.map((warning) => (
                  <li
                    key={warning.id}
                    style={{
                      padding: '12px',
                      borderBottom: '1px solid #eee',
                      background: '#fff3cd',
                      borderRadius: '4px',
                      marginBottom: '8px',
                    }}
                  >
                    <p style={{ fontWeight: 'bold' }}>{warning.productName}</p>
                    <p style={{ fontSize: '14px', color: '#856404' }}>
                      Stock: {warning.quantity} (seuil: {warning.threshold})
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

