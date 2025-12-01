interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: string;
  color?: 'blue' | 'green' | 'red' | 'purple' | 'orange';
}

export function MetricCard({ title, value, subtitle, icon, color = 'blue' }: MetricCardProps) {
  const colorClasses = {
    blue: { bg: '#e3f2fd', text: '#1976d2', border: '#2196f3' },
    green: { bg: '#e8f5e9', text: '#388e3c', border: '#4caf50' },
    red: { bg: '#ffebee', text: '#d32f2f', border: '#f44336' },
    purple: { bg: '#f3e5f5', text: '#7b1fa2', border: '#9c27b0' },
    orange: { bg: '#fff3e0', text: '#f57c00', border: '#ff9800' },
  };

  const colors = colorClasses[color];

  return (
    <div
      style={{
        background: 'white',
        padding: '24px',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        borderLeft: `4px solid ${colors.border}`,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <p
            style={{
              margin: 0,
              marginBottom: '8px',
              color: '#666',
              fontSize: '14px',
              fontWeight: '500',
            }}
          >
            {title}
          </p>
          <p
            style={{
              margin: 0,
              fontSize: '28px',
              fontWeight: 'bold',
              color: colors.text,
            }}
          >
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
          {subtitle && (
            <p
              style={{
                margin: 0,
                marginTop: '4px',
                fontSize: '12px',
                color: '#999',
              }}
            >
              {subtitle}
            </p>
          )}
        </div>
        {icon && (
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '8px',
              background: colors.bg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
            }}
          >
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}

