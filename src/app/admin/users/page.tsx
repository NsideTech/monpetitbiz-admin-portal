'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Pagination } from '@/components/admin/Pagination';

interface User {
  id: string;
  username: string;
  fullName?: string;
  role: string;
  businessId?: string;
  createdAt: string;
  updatedAt: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [limit] = useState(10);
  const [pagination, setPagination] = useState({
    total: 0,
    totalPages: 0,
  });
  const [formData, setFormData] = useState({
    fullName: '',
    username: '',
    password: '',
    role: 'admin' as 'admin' | 'manager',
    businessId: '',
  });

  useEffect(() => {
    loadUsers();
  }, [currentPage, search]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: limit.toString(),
      });
      if (search) {
        params.set('search', search);
      }
      const response = await axios.get(`/api/users?${params.toString()}`);
      if (response.data.success) {
        setUsers(response.data.data);
        if (response.data.pagination) {
          setPagination({
            total: response.data.pagination.total,
            totalPages: response.data.pagination.totalPages,
          });
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors du chargement des utilisateurs');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    loadUsers();
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      if (editingUser) {
        // Update user
        const updateData: any = {
          fullName: formData.fullName,
          username: formData.username,
          password: formData.password,
          role: formData.role,
          businessId: formData.businessId || null,
        };
        await axios.put(`/api/users/${editingUser.id}`, updateData);
      } else {
        // Create user
        await axios.post('/api/users', formData);
      }

      setShowForm(false);
      setEditingUser(null);
      setFormData({ fullName: '', username: '', password: '', role: 'admin', businessId: '' });
      loadUsers();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors de la sauvegarde');
    }
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      fullName: user.fullName || '',
      username: user.username,
      password: '',
      role: user.role as 'admin' | 'manager',
      businessId: user.businessId || '',
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) {
      return;
    }

    try {
      await axios.delete(`/api/users/${id}`);
      loadUsers();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors de la suppression');
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingUser(null);
    setFormData({ fullName: '', username: '', password: '', role: 'admin', businessId: '' });
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '30px',
          }}>
            <div>
              <h1 style={{ margin: 0, marginBottom: '8px' }}>Gestion des utilisateurs</h1>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <a
                  href="/admin/dashboard"
                  style={{
                    color: '#2c5aa0',
                    textDecoration: 'none',
                    fontSize: '14px',
                  }}
                >
                  ← Retour au dashboard
                </a>
              </div>
            </div>
            <button
              onClick={() => {
                setEditingUser(null);
                setFormData({ fullName: '', username: '', password: '', role: 'admin', businessId: '' });
                setShowForm(true);
              }}
              style={{
                padding: '12px 24px',
                background: '#2c5aa0',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: 'bold',
              }}
            >
              + Nouvel utilisateur
            </button>
          </div>

          {/* Search bar */}
          <div style={{ marginBottom: '20px' }}>
            <form onSubmit={handleSearch} style={{ display: 'flex', gap: '10px' }}>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher par nom d'utilisateur..."
                style={{
                  flex: 1,
                  padding: '12px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '16px',
                }}
              />
              <button
                type="submit"
                style={{
                  padding: '12px 24px',
                  background: '#2c5aa0',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: 'bold',
                }}
              >
                Rechercher
              </button>
              {search && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch('');
                    setCurrentPage(1);
                  }}
                  style={{
                    padding: '12px 24px',
                    background: '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '16px',
                  }}
                >
                  Effacer
                </button>
              )}
            </form>
          </div>

          {error && (
            <div style={{
              background: '#fee',
              color: '#c33',
              padding: '12px',
              borderRadius: '4px',
              marginBottom: '20px',
            }}>
              {error}
            </div>
          )}

          {showForm && (
            <div style={{
              background: 'white',
              padding: '30px',
              borderRadius: '8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              marginBottom: '30px',
            }}>
              <h2 style={{ marginBottom: '20px' }}>
                {editingUser ? 'Modifier l\'utilisateur' : 'Nouvel utilisateur'}
              </h2>
              <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                    Nom complet
                  </label>
                  <input
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    required={!editingUser}
                    // disabled={!!editingUser}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '16px',
                    }}
                  />
                </div>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                    Nom d&apos;utilisateur
                  </label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    required={!editingUser}
                    disabled={!!editingUser}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '16px',
                    }}
                  />
                </div>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                    Mot de passe {editingUser && '(laisser vide pour ne pas changer)'}
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required={!editingUser}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '16px',
                    }}
                  />
                </div>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                    Rôle
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                    required
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '16px',
                    }}
                  >
                    <option value="admin">Admin</option>
                    <option value="manager">Manager</option>
                  </select>
                </div>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                    Business ID (optionnel)
                  </label>
                  <input
                    type="text"
                    value={formData.businessId}
                    onChange={(e) => setFormData({ ...formData, businessId: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '16px',
                    }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="submit"
                    style={{
                      padding: '12px 24px',
                      background: '#2c5aa0',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '16px',
                      fontWeight: 'bold',
                    }}
                  >
                    {editingUser ? 'Enregistrer' : 'Créer'}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancel}
                    style={{
                      padding: '12px 24px',
                      background: '#6c757d',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '16px',
                    }}
                  >
                    Annuler
                  </button>
                </div>
              </form>
            </div>
          )}

          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <p>Chargement...</p>
            </div>
          ) : (
            <div style={{
              background: 'white',
              borderRadius: '8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              overflow: 'hidden',
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                    <th style={{ padding: '12px', textAlign: 'left' }}>Nom d&apos;utilisateur</th>
                    <th style={{ padding: '12px', textAlign: 'left' }}>Rôle</th>
                    <th style={{ padding: '12px', textAlign: 'left' }}>Business ID</th>
                    <th style={{ padding: '12px', textAlign: 'left' }}>Créé le</th>
                    <th style={{ padding: '12px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
                        Aucun utilisateur
                      </td>
                    </tr>
                  ) : (
                    users.map((user) => (
                      <tr key={user.id} style={{ borderBottom: '1px solid #dee2e6' }}>
                        <td style={{ padding: '12px' }}>{user.username}</td>
                        <td style={{ padding: '12px' }}>
                          <span style={{
                            padding: '4px 8px',
                            borderRadius: '4px',
                            background: user.role === 'admin' ? '#dc3545' : '#2c5aa0',
                            color: 'white',
                            fontSize: '12px',
                            fontWeight: 'bold',
                          }}>
                            {user.role}
                          </span>
                        </td>
                        <td style={{ padding: '12px' }}>{user.businessId || '-'}</td>
                        <td style={{ padding: '12px' }}>
                          {new Date(user.createdAt).toLocaleDateString('fr-FR')}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'right' }}>
                          <button
                            onClick={() => handleEdit(user)}
                            style={{
                              padding: '6px 12px',
                              marginRight: '8px',
                              background: '#2c5aa0',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '14px',
                            }}
                          >
                            Modifier
                          </button>
                          <button
                            onClick={() => handleDelete(user.id)}
                            style={{
                              padding: '6px 12px',
                              background: '#dc3545',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '14px',
                            }}
                          >
                            Supprimer
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {pagination.totalPages > 0 && (
            <Pagination
              currentPage={currentPage}
              totalPages={pagination.totalPages}
              onPageChange={handlePageChange}
              totalItems={pagination.total}
              itemsPerPage={limit}
            />
          )}
        </div>
  );
}

