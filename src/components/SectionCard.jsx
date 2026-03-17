export default function SectionCard({ title, icon, children, delay = 0 }) {
  return (
    <div
      className="fade-up"
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: '24px',
        animationDelay: `${delay}ms`,
      }}
    >
      {title && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginBottom: 20,
          paddingBottom: 16,
          borderBottom: '1px solid var(--border)',
        }}>
          {icon && <span style={{ fontSize: 16 }}>{icon}</span>}
          <h2 style={{
            fontSize: 14,
            fontFamily: "'Instrument Sans', sans-serif",
            fontWeight: 500,
            color: 'var(--muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
          }}>
            {title}
          </h2>
        </div>
      )}
      {children}
    </div>
  )
}
