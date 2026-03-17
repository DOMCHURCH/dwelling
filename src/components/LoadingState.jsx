const steps = [
  'Geocoding address...',
  'Fetching climate data...',
  'Pulling cost of living info...',
  'Running AI property analysis...',
  'Building your report...',
]

export default function LoadingState({ step = 0 }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '80px 20px',
      gap: 32,
    }}>
      <div style={{ position: 'relative', width: 60, height: 60 }}>
        <div style={{
          position: 'absolute', inset: 0,
          border: '2px solid var(--border)',
          borderTopColor: 'var(--accent)',
          borderRadius: '50%',
          animation: 'spin 0.9s linear infinite',
        }} />
        <div style={{
          position: 'absolute', inset: 8,
          border: '2px solid var(--border)',
          borderBottomColor: 'var(--accent)',
          borderRadius: '50%',
          animation: 'spin 1.4s linear infinite reverse',
        }} />
      </div>

      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 20, fontFamily: "'Playfair Display', serif", marginBottom: 8 }}>
          Analyzing property
        </div>
        <div style={{ fontSize: 14, color: 'var(--muted)', animation: 'pulse 1.5s ease infinite' }}>
          {steps[Math.min(step, steps.length - 1)]}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6 }}>
        {steps.map((_, i) => (
          <div key={i} style={{
            width: i === step ? 20 : 6,
            height: 4,
            borderRadius: 2,
            background: i <= step ? 'var(--accent)' : 'var(--border-active)',
            transition: 'all 0.3s ease',
          }} />
        ))}
      </div>
    </div>
  )
}
