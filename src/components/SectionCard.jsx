export default function SectionCard({ title, icon, children, delay = 0 }) {
  return (
    <div
      className="fade-up"
      style={{
        background: 'var(--glass)',
        border: '1px solid var(--glass-border)',
        borderRadius: 'var(--radius-lg)',
        padding: '22px 24px',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        animationDelay: `${delay}ms`,
        transition: 'border-color 0.2s',
      }}
      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--glass-border-hover)'}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--glass-border)'}
    >
      {title && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 18,
          paddingBottom: 14,
          borderBottom: '1px solid var(--glass-border)',
        }}>
          {icon && <span style={{ fontSize: 14 }}>{icon}</span>}
          <h2 style={{
            fontSize: 11,
            fontFamily: 'Inter, sans-serif',
            fontWeight: 600,
            color: 'var(--text-3)',
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
          }}>
            {title}
          </h2>
        </div>
      )}
      {children}
    </div>
  )
}
