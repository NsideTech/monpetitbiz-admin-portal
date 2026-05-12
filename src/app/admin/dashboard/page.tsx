'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { MetricCard } from '@/components/admin/MetricCard';
import { BusinessTable } from '@/components/admin/BusinessTable';

interface Stats {
  totalBusinesses: number;
  totalTransactions: number;
  totalSales: number;
  totalExpenses: number;
  profit: number;
  activeUsers: number;
}

interface BusinessStats {
  business: {
    id: string;
    name: string;
    businessCode: string;
    currency: string;
    timezone: string;
    ownerName?: string;
    country?: string;
    createdAt: string;
  };
  transactionCount: number;
  totalSales: number;
  totalExpenses: number;
  profit: number;
  userCount: number;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [businesses, setBusinesses] = useState<BusinessStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [statsResponse, businessesResponse] = await Promise.all([
        axios.get('/api/admin/stats'),
        axios.get('/api/admin/businesses'),
      ]);

      if (statsResponse.data.success) {
        setStats(statsResponse.data.data);
      }

      if (businessesResponse.data.success) {
        setBusinesses(businessesResponse.data.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors du chargement des données');
      console.error('Load dashboard data error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        <div style={{ marginBottom: '30px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h1 style={{ margin: 0, marginBottom: '8px' }}>Dashboard Admin</h1>
              <p style={{ margin: 0, color: '#666' }}>Vue d&apos;ensemble du système MonPetitBiz</p>
            </div>
          </div>
        </div>

        {error && (
          <div
            style={{
              background: '#fee',
              color: '#c33',
              padding: '12px',
              borderRadius: '4px',
              marginBottom: '20px',
            }}
          >
            {error}
            <button
              onClick={loadData}
              style={{
                marginLeft: '12px',
                padding: '4px 12px',
                background: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px',
              }}
            >
              Réessayer
            </button>
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <p>Chargement des données...</p>
          </div>
        ) : (
          <>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                gap: '20px',
                marginBottom: '30px',
              }}
            >
              <MetricCard
                title="Total Entreprises"
                value={stats?.totalBusinesses || 0}
                icon="🏢"
                color="blue"
              />
              <MetricCard
                title="Total Transactions"
                value={stats?.totalTransactions || 0}
                icon="📊"
                color="purple"
              />
              <MetricCard
                title="Ventes Totales"
                value={`${(stats?.totalSales || 0).toLocaleString()} XOF`}
                icon="💰"
                color="green"
              />
              <MetricCard
                title="Dépenses Totales"
                value={`${(stats?.totalExpenses || 0).toLocaleString()} XOF`}
                icon="💸"
                color="red"
              />
              <MetricCard
                title="Profit Net"
                value={`${(stats?.profit || 0).toLocaleString()} XOF`}
                subtitle={stats && stats.profit < 0 ? 'Déficit' : 'Bénéfice'}
                icon="📈"
                color={stats && stats.profit >= 0 ? 'green' : 'red'}
              />
              <MetricCard
                title="Utilisateurs Actifs"
                value={stats?.activeUsers || 0}
                icon="👥"
                color="orange"
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <h2 style={{ marginBottom: '16px' }}>Entreprises</h2>
              <BusinessTable businesses={businesses} loading={false} />
            </div>
          </>
        )}
    </div>
  );
}

