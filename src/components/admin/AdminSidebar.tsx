'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import axios from 'axios';
import { authService } from '@/lib/auth';

interface User {
  id: string;
  username: string;
  role: string;
  businessId?: string;
  fullName?: string;
}

interface MenuItem {
  label: string;
  path: string;
  icon: string;
}

const menuItems: MenuItem[] = [
  { label: 'Dashboard', path: '/admin/dashboard', icon: '📊' },
  { label: 'Entreprises', path: '/admin/businesses', icon: '🏢' },
  { label: 'Utilisateurs', path: '/admin/users', icon: '👥' },
];

export function AdminSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

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

  const getInitials = (username: string, fullName?: string): string => {
    if (fullName) {
      const parts = fullName.trim().split(' ');
      if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      }
      return fullName.substring(0, 2).toUpperCase();
    }
    return username.substring(0, 2).toUpperCase();
  };

  const getDisplayName = (): string => {
    if (user?.fullName) return user.fullName;
    return user?.username || 'Utilisateur';
  };

  if (loading) {
    return (
      <div style={{
        width: '250px',
        background: '#2c3e50',
        minHeight: '100vh',
        padding: '20px',
        color: 'white',
      }}>
        <p>Chargement...</p>
      </div>
    );
  }

  return (
    <div style={{
      width: '250px',
      background: '#2c3e50',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      color: 'white',
      position: 'fixed',
      left: 0,
      top: 0,
      zIndex: 100,
    }}>
      {/* Logo/Title */}
      <div style={{
        padding: '20px',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        marginBottom: '20px',
      }}>
        <h2 style={{
          margin: 0,
          fontSize: '20px',
          fontWeight: 'bold',
          color: 'white',
        }}>
          MonPetitBiz
        </h2>
        <p style={{
          margin: '4px 0 0 0',
          fontSize: '12px',
          color: 'rgba(255,255,255,0.7)',
        }}>
          Admin Portal
        </p>
      </div>

      {/* Menu Items */}
      <nav style={{ flex: 1, padding: '0 10px' }}>
        {menuItems.map((item) => {
          const isActive = pathname === item.path || pathname?.startsWith(item.path + '/');
          return (
            <button
              key={item.path}
              onClick={() => router.push(item.path)}
              style={{
                width: '100%',
                padding: '12px 16px',
                marginBottom: '8px',
                background: isActive ? '#3498db' : 'transparent',
                border: 'none',
                borderRadius: '6px',
                color: 'white',
                fontSize: '14px',
                textAlign: 'left',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'transparent';
                }
              }}
            >
              <span style={{ fontSize: '18px' }}>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* User Profile Section */}
      <div style={{
        padding: '20px',
        borderTop: '1px solid rgba(255,255,255,0.1)',
        marginTop: 'auto',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '16px',
        }}>
          {/* Avatar */}
          <div style={{
            width: '50px',
            height: '50px',
            borderRadius: '50%',
            background: '#3498db',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '18px',
            fontWeight: 'bold',
            color: 'white',
            flexShrink: 0,
          }}>
            {user ? getInitials(user.username, user.fullName) : 'U'}
          </div>
          
          {/* User Info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{
              margin: 0,
              fontSize: '14px',
              fontWeight: '600',
              color: 'white',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}>
              {getDisplayName()}
            </p>
            <p style={{
              margin: '4px 0 0 0',
              fontSize: '12px',
              color: 'rgba(255,255,255,0.7)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}>
              {user?.role || 'Admin'}
            </p>
          </div>
        </div>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          style={{
            width: '100%',
            padding: '10px 16px',
            background: 'rgba(231, 76, 60, 0.2)',
            border: '1px solid rgba(231, 76, 60, 0.5)',
            borderRadius: '6px',
            color: '#e74c3c',
            fontSize: '14px',
            cursor: 'pointer',
            fontWeight: '500',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(231, 76, 60, 0.3)';
            e.currentTarget.style.borderColor = '#e74c3c';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(231, 76, 60, 0.2)';
            e.currentTarget.style.borderColor = 'rgba(231, 76, 60, 0.5)';
          }}
        >
          Déconnexion
        </button>
      </div>
    </div>
  );
}

