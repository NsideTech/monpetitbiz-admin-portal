interface Business {
  id: string;
  name: string;
  businessCode: string;
  currency: string;
  timezone: string;
  ownerName?: string;
  country?: string;
  createdAt: string;
}

interface BusinessStats {
  business: Business;
  transactionCount: number;
  totalSales: number;
  totalExpenses: number;
  profit: number;
  userCount: number;
}

interface BusinessTableProps {
  businesses: BusinessStats[];
  loading?: boolean;
}

export function BusinessTable({ businesses, loading }: BusinessTableProps) {
  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <p>Chargement...</p>
      </div>
    );
  }

  if (businesses.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
        <p>Aucune entreprise</p>
      </div>
    );
  }

  return (
    <div
      style={{
        background: 'white',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        overflow: 'hidden',
      }}
    >
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
              <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: '600' }}>
                Entreprise
              </th>
              <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: '600' }}>
                Code
              </th>
              <th style={{ padding: '12px', textAlign: 'right', fontSize: '14px', fontWeight: '600' }}>
                Transactions
              </th>
              <th style={{ padding: '12px', textAlign: 'right', fontSize: '14px', fontWeight: '600' }}>
                Ventes
              </th>
              <th style={{ padding: '12px', textAlign: 'right', fontSize: '14px', fontWeight: '600' }}>
                Dépenses
              </th>
              <th style={{ padding: '12px', textAlign: 'right', fontSize: '14px', fontWeight: '600' }}>
                Profit
              </th>
              <th style={{ padding: '12px', textAlign: 'right', fontSize: '14px', fontWeight: '600' }}>
                Utilisateurs
              </th>
              <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: '600' }}>
                Créé le
              </th>
            </tr>
          </thead>
          <tbody>
            {businesses.map((stats) => (
              <tr
                key={stats.business.id}
                style={{
                  borderBottom: '1px solid #dee2e6',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#f8f9fa';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'white';
                }}
              >
                <td style={{ padding: '12px' }}>
                  <div>
                    <p style={{ margin: 0, fontWeight: '600' }}>{stats.business.name}</p>
                    {stats.business.ownerName && (
                      <p style={{ margin: 0, fontSize: '12px', color: '#666' }}>
                        {stats.business.ownerName}
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
                    {stats.business.businessCode}
                  </code>
                </td>
                <td style={{ padding: '12px', textAlign: 'right' }}>
                  {stats.transactionCount.toLocaleString()}
                </td>
                <td style={{ padding: '12px', textAlign: 'right', color: '#28a745', fontWeight: '600' }}>
                  {stats.totalSales.toLocaleString()} {stats.business.currency}
                </td>
                <td style={{ padding: '12px', textAlign: 'right', color: '#dc3545', fontWeight: '600' }}>
                  {stats.totalExpenses.toLocaleString()} {stats.business.currency}
                </td>
                <td
                  style={{
                    padding: '12px',
                    textAlign: 'right',
                    color: stats.profit >= 0 ? '#28a745' : '#dc3545',
                    fontWeight: '600',
                  }}
                >
                  {stats.profit.toLocaleString()} {stats.business.currency}
                </td>
                <td style={{ padding: '12px', textAlign: 'right' }}>
                  {stats.userCount}
                </td>
                <td style={{ padding: '12px', fontSize: '14px', color: '#666' }}>
                  {new Date(stats.business.createdAt).toLocaleDateString('fr-FR')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

