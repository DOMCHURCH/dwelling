export default function StatCard({ label, value, sub, accent, icon }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid var(--glass-border)',
      borderRadius: 'var(--radius)',
      padding: '14px 16px',
      display: 'flex', flexDirection: 'column', gap: 4,
      transition: 'all 0.2s',
    }}
      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(124,92,252,0.07)'; e.currentTarget.style.borderColor = 'rgba(124,92,252,0.2)' }}
      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = 'var(--glass-border)' }}
    >
      <div style={{ fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'DM Sans, sans-serif' }}>
        {icon && <span style={{ fontSize: 11 }}>{icon}</span>}
        {label}
      </div>
      <div style={{ fontSize: 20, fontWeight: 800, color: accent ?? 'var(--text)', lineHeight: 1.2, letterSpacing: '-0.03em', fontFamily: 'Syne, sans-serif' }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'DM Sans, sans-serif' }}>{sub}</div>}
    </div>
  )
}
