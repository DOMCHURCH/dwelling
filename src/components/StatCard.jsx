export default function StatCard({ label, value, sub, accent, icon }) {
  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius)',
      padding: '16px 18px',
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
    }}>
      <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: 6 }}>
        {icon && <span style={{ fontSize: 13 }}>{icon}</span>}
        {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 500, color: accent ?? 'var(--text)', lineHeight: 1.2, fontFamily: "'Playfair Display', serif" }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 12, color: 'var(--hint)' }}>{sub}</div>}
    </div>
  )
}
