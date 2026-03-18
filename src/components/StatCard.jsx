import { useCountUp } from '../hooks/useCountUp'

export default function StatCard({ label, value, sub, accent, icon, animate = false }) {
  const isNumeric = animate && value != null && !isNaN(parseFloat(String(value).replace(/[^0-9.]/g, '')))
  const prefix = animate && typeof value === 'string' && value.startsWith('$') ? '$' : ''
  const suffix = animate && typeof value === 'string' && value.endsWith('%') ? '%' : ''
  const rawNum = isNumeric ? parseFloat(String(value).replace(/[^0-9.]/g, '')) : null
  const animated = useCountUp(isNumeric ? rawNum : null, 1200, prefix, suffix)
  const displayed = isNumeric ? animated : value

  return (
    <div style={{
      border: '2px solid var(--white)',
      padding: '16px',
      background: 'rgba(0,0,0,0.3)',
      position: 'relative',
      transition: 'all 0.1s',
    }}
      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = accent ?? 'var(--neon-pink)' }}
      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.3)'; e.currentTarget.style.borderColor = 'var(--white)' }}
    >
      <div style={{ fontSize: 9, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 6, fontFamily: "'Space Mono', monospace", display: 'flex', alignItems: 'center', gap: 5 }}>
        {icon && <span>{icon}</span>}
        {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, color: accent ?? 'var(--white)', lineHeight: 1.1, fontFamily: "'Space Mono', monospace" }}>
        {displayed}
      </div>
      {sub && <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 4, fontFamily: "'Space Mono', monospace" }}>{sub}</div>}
    </div>
  )
}
