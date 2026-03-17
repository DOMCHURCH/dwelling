export default function SectionCard({ title, icon, children, delay = 0 }) {
  return (
    <div className="fade-up" style={{
      background: 'rgba(255,255,255,0.025)',
      border: '1px solid var(--glass-border)',
      borderRadius: 'var(--radius-lg)',
      padding: '22px 24px',
      animationDelay: `${delay}ms`,
      transition: 'border-color 0.2s, background 0.2s',
    }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(124,92,252,0.25)'; e.currentTarget.style.background = 'rgba(124,92,252,0.04)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--glass-border)'; e.currentTarget.style.background = 'rgba(255,255,255,0.025)' }}
    >
      {title && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          marginBottom: 18, paddingBottom: 14,
          borderBottom: '1px solid var(--glass-border)',
        }}>
          {icon && <span style={{ fontSize: 14 }}>{icon}</span>}
          <h2 style={{
            fontSize: 10, fontFamily: 'DM Sans, sans-serif', fontWeight: 600,
            color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.14em',
          }}>
            {title}
          </h2>
        </div>
      )}
      {children}
    </div>
  )
}
