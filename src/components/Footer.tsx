'use client';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer
      style={{
        background: '#2c3e50',
        color: '#ecf0f1',
        padding: '20px',
        marginTop: 'auto',
        textAlign: 'center',
      }}
    >
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        <p style={{ margin: 0, fontSize: '14px' }}>
          © {currentYear} Nside Technologies. Tous droits réservés.
        </p>
      </div>
    </footer>
  );
}

