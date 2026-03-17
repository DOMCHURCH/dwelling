// score is always 0-100 here. Callers should NOT multiply by 10.
export default function ScoreRing({ score, max = 100, label, color = 'var(--accent)', size = 72 }) {
  const clamped = Math.min(Math.max(score, 0), max)
  const radius = (size - 10) / 2
  const circ = 2 * Math.PI * radius
  const pct = clamped / max
  const dash = pct * circ

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={5} />
        <circle
          cx={size/2} cy={size/2} r={radius}
          fill="none"
          stroke={color}
          strokeWidth={5}
          strokeDasharray={`${dash} ${circ - dash}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 1s ease' }}
        />
      </svg>
      <div style={{ textAlign: 'center', marginTop: -size * 0.72, marginBottom: size * 0.35 }}>
        <div style={{ fontSize: size * 0.26, fontWeight: 500, color: 'var(--text)', lineHeight: 1 }}>{Math.round(clamped)}</div>
      </div>
      <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</div>
    </div>
  )
}
