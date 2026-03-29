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
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 14,
      padding: '14px 16px',
      transition: 'background 0.2s ease, border-color 0.2s ease',
    }}
      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.borderColor = accent ? accent + '44' : 'rgba(255,255,255,0.18)' }}
      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)' }}
    >
      <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6, fontFamily: "'Barlow', sans-serif", display: 'flex', alignItems: 'center', gap: 5 }}>
        {icon && <span>{icon}</span>}
        {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 600, color: accent ?? '#ffffff', lineHeight: 1.1, fontFamily: "'Instrument Serif', serif", fontStyle: 'italic' }}>
        {displayed}
      </div>
      {sub && <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 4, fontFamily: "'Barlow', sans-serif" }}>{sub}</div>}
    </div>
  )
}
