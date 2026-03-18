export default function ScoreRing({ score, max = 100, label, color = 'var(--neon-pink)', size = 72 }) {
  const clamped = Math.min(Math.max(score, 0), max)
  const radius = (size - 8) / 2
  const circ = 2 * Math.PI * radius
  const pct = clamped / max
  const dash = pct * circ

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={4} />
          <circle
            cx={size/2} cy={size/2} r={radius}
            fill="none" stroke={color} strokeWidth={4}
            strokeDasharray={`${dash} ${circ - dash}`}
            strokeLinecap="square"
            style={{ transition: 'stroke-dasharray 1.2s cubic-bezier(0.16, 1, 0.3, 1)' }}
          />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: size * 0.24, fontWeight: 700, color, fontFamily: "'Space Mono', monospace" }}>{Math.round(clamped)}</span>
        </div>
      </div>
      <div style={{ fontSize: 9, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.12em', fontFamily: "'Space Mono', monospace" }}>{label}</div>
    </div>
  )
}
