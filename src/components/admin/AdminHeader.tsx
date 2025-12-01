'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { authService } from '@/lib/auth';

interface User {
  id: string;
  username: string;
  role: string;
  businessId?: string;
}

export function AdminHeader() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const response = await axios.get('/api/auth/me');
      if (response.data.success && response.data.data?.user) {
        setUser(response.data.data.user);
      }
    } catch (err) {
      console.error('Failed to load user:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    authService.logout();
    router.push('/login');
  };

  if (loading) {
    return (
      <div style={{
        background: 'white',
        padding: '16px 20px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        marginBottom: '20px',
      }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          <p style={{ margin: 0, color: '#666' }}>Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      background: 'white',
      padding: '16px 20px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      marginBottom: '20px',
    }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '20px', color: '#2c5aa0' }}>MonPetitBiz Admin</h2>
        </div>
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowMenu(!showMenu)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              background: 'transparent',
              border: '1px solid #ddd',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            <span>Bonjour {user?.username || 'Utilisateur'}</span>
            <span style={{ fontSize: '12px' }}>▼</span>
          </button>
          {showMenu && (
            <div style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              marginTop: '8px',
              background: 'white',
              border: '1px solid #ddd',
              borderRadius: '4px',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
              minWidth: '200px',
              zIndex: 1000,
            }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid #eee' }}>
                <p style={{ margin: 0, fontSize: '14px', fontWeight: 'bold' }}>{user?.username}</p>
                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#666' }}>
                  Rôle: {user?.role || '-'}
                </p>
              </div>
              <button
                onClick={handleLogout}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  background: 'transparent',
                  border: 'none',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontSize: '14px',
                  color: '#dc3545',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#f5f5f5';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                Déconnexion
              </button>
            </div>
          )}
        </div>
      </div>
      {showMenu && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 999,
          }}
          onClick={() => setShowMenu(false)}
        />
      )}
    </div>
  );
}

