'use client';

import React, { useState, useEffect } from 'react';
import { getMonPetitBizDatabase, type PaginatedBusinesses, type Business } from '@/lib/monpetitbiz-db';
import { Pagination } from '@/components/admin/Pagination';
import { useRouter } from 'next/navigation';

export default function BusinessesPage() {
  const router = useRouter();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [limit] = useState(10);
  const [pagination, setPagination] = useState({
    total: 0,
    totalPages: 0,
  });

  useEffect(() => {
    loadBusinesses();
  }, [currentPage, search]);

  const loadBusinesses = async () => {
    try {
      setLoading(true);
      setError(null);
      const db = getMonPetitBizDatabase();
      const result: PaginatedBusinesses = await db.getBusinessesPaginated(
        currentPage,
        limit,
        search || undefined
      );
      setBusinesses(result.data);
      setPagination({
        total: result.total,
        totalPages: result.totalPages,
      });
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement des entreprises');
      console.error('Load businesses error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    loadBusinesses();
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const getStatusBadge = (business: Business) => {
    if (business.deletedAt) {
      return (
        <span
          style={{
            padding: '4px 8px',
            borderRadius: '4px',
            background: '#6c757d',
            color: 'white',
            fontSize: '12px',
            fontWeight: 'bold',
          }}
        >
          Supprimée
        </span>
      );
    }
    if (!business.isActive) {
      return (
        <span
          style={{
            padding: '4px 8px',
            borderRadius: '4px',
            background: '#dc3545',
            color: 'white',
            fontSize: '12px',
            fontWeight: 'bold',
          }}
        >
          Bloquée
        </span>
      );
    }
    return (
      <span
        style={{
          padding: '4px 8px',
          borderRadius: '4px',
          background: '#28a745',
          color: 'white',
          fontSize: '12px',
          fontWeight: 'bold',
        }}
      >
        Active
      </span>
    );
  };

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '30px',
          }}>
            <div>
              <h1 style={{ margin: 0, marginBottom: '8px' }}>Gestion des entreprises</h1>
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
          </div>

          {/* Search bar */}
          <div style={{ marginBottom: '20px' }}>
            <form onSubmit={handleSearch} style={{ display: 'flex', gap: '10px' }}>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher par nom ou code d'entreprise..."
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
              <button
                onClick={loadBusinesses}
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
              <p>Chargement...</p>
            </div>
          ) : (
            <>
              <div style={{
                background: 'white',
                borderRadius: '8px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                overflow: 'hidden',
              }}>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                        <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: '600' }}>
                          Nom
                        </th>
                        <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: '600' }}>
                          Code
                        </th>
                        <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: '600' }}>
                          Propriétaire
                        </th>
                        <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: '600' }}>
                          Statut
                        </th>
                        <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: '600' }}>
                          Créé le
                        </th>
                        <th style={{ padding: '12px', textAlign: 'right', fontSize: '14px', fontWeight: '600' }}>
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {businesses.length === 0 ? (
                        <tr>
                          <td colSpan={6} style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
                            {search ? 'Aucune entreprise trouvée' : 'Aucune entreprise'}
                          </td>
                        </tr>
                      ) : (
                        businesses.map((business) => (
                          <tr
                            key={business.id}
                            style={{
                              borderBottom: '1px solid #dee2e6',
                              transition: 'background 0.2s',
                              cursor: 'pointer',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = '#f8f9fa';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'white';
                            }}
                            onClick={() => router.push(`/admin/businesses/${business.id}`)}
                          >
                            <td style={{ padding: '12px' }}>
                              <div>
                                <p style={{ margin: 0, fontWeight: '600' }}>{business.name}</p>
                                {business.country && (
                                  <p style={{ margin: 0, fontSize: '12px', color: '#666' }}>
                                    {business.country}
                                  </p>
                                )}
                              </div>
                            </td>
                            <td style={{ padding: '12px' }}>
                              <code
                                style={{
                                  background: '#f0f0f0',
                                  padding: '4px 8px',
                                  borderRadius: '4px',
                                  fontSize: '12px',
                                }}
                              >
                                {business.businessCode}
                              </code>
                            </td>
                            <td style={{ padding: '12px' }}>
                              {business.ownerName || '-'}
                            </td>
                            <td style={{ padding: '12px' }}>
                              {getStatusBadge(business)}
                            </td>
                            <td style={{ padding: '12px', fontSize: '14px', color: '#666' }}>
                              {new Date(business.createdAt).toLocaleDateString('fr-FR')}
                            </td>
                            <td style={{ padding: '12px', textAlign: 'right' }}>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  router.push(`/admin/businesses/${business.id}`);
                                }}
                                style={{
                                  padding: '6px 12px',
                                  background: '#2c5aa0',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  fontSize: '14px',
                                }}
                              >
                                Voir détails
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {pagination.totalPages > 0 && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={pagination.totalPages}
                  onPageChange={handlePageChange}
                  totalItems={pagination.total}
                  itemsPerPage={limit}
                />
              )}
            </>
          )}
        </div>
  );
}

