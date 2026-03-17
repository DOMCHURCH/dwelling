export default function ScoreRing({ score, max = 100, label, color = 'var(--accent)', size = 72 }) {
  const clamped = Math.min(Math.max(score, 0), max)
  const radius = (size - 10) / 2
  const circ = 2 * Math.PI * radius
  const pct = clamped / max
  const dash = pct * circ

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={5} />
          <circle
            cx={size/2} cy={size/2} r={radius}
            fill="none"
            stroke={color}
            strokeWidth={5}
            strokeDasharray={`${dash} ${circ - dash}`}
            strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 1.2s cubic-bezier(0.16, 1, 0.3, 1)', filter: `drop-shadow(0 0 4px ${color})` }}
          />
        </svg>
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontSize: size * 0.24, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.02em' }}>{Math.round(clamped)}</span>
        </div>
      </div>
      <div style={{ fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{label}</div>
    </div>
  )
}
