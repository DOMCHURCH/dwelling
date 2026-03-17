const steps = [
  'Locating address...',
  'Fetching climate data...',
  'Pulling market context...',
  'Running AI analysis...',
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
      gap: 28,
    }}>
      <div style={{ position: 'relative', width: 52, height: 52 }}>
        <div style={{
          position: 'absolute', inset: 0,
          border: '1.5px solid rgba(59,130,246,0.15)',
          borderTopColor: 'var(--accent)',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
          boxShadow: '0 0 12px rgba(59,130,246,0.3)',
        }} />
        <div style={{
          position: 'absolute', inset: 8,
          border: '1.5px solid rgba(6,182,212,0.15)',
          borderBottomColor: 'var(--cyan)',
          borderRadius: '50%',
          animation: 'spin 1.2s linear infinite reverse',
        }} />
      </div>

      <div style={{ textAlign: 'center' }}>
        <div style={{
          fontSize: 18, fontWeight: 600, marginBottom: 8,
          letterSpacing: '-0.02em', color: 'var(--text)',
        }}>
          Analyzing property
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-2)', animation: 'pulse 1.5s ease infinite' }}>
          {steps[Math.min(step, steps.length - 1)]}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 5 }}>
        {steps.map((_, i) => (
          <div key={i} style={{
            width: i === step ? 20 : 5,
            height: 3,
            borderRadius: 2,
            background: i <= step ? 'var(--accent)' : 'rgba(255,255,255,0.1)',
            transition: 'all 0.3s ease',
            boxShadow: i === step ? '0 0 6px var(--accent)' : 'none',
          }} />
        ))}
      </div>
    </div>
  )
}
