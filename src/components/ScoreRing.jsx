export default function ScoreRing({ score, max = 100, label, color = 'rgba(255,255,255,0.8)', size = 72 }) {
  const safeScore = (score == null || isNaN(score)) ? 0 : score
  const clamped = Math.min(Math.max(safeScore, 0), max)
  const radius = (size - 8) / 2
  const circ = 2 * Math.PI * radius
  const pct = clamped / max
  const dash = pct * circ

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={4} />
          <circle
            cx={size/2} cy={size/2} r={radius}
            fill="none" stroke={color} strokeWidth={4}
            strokeDasharray={`${dash} ${circ - dash}`}
            strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 1.2s cubic-bezier(0.16, 1, 0.3, 1)' }}
          />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: size * 0.24, fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontWeight: 400, color: '#ffffff' }}>
            {Math.round(clamped)}
          </span>
        </div>
      </div>
      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.12em', fontFamily: "'Barlow', sans-serif", fontWeight: 300 }}>{label}</div>
    </div>
  )
}
