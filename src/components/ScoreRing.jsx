const steps = ['Locating address...', 'Fetching climate data...', 'Pulling market context...', 'Running AI analysis...', 'Building your report...']

export default function LoadingState({ step = 0 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 20px', gap: 28 }}>
      <div style={{ position: 'relative', width: 52, height: 52 }}>
        <div style={{
          position: 'absolute', inset: 0,
          border: '1.5px solid rgba(124,92,252,0.15)',
          borderTopColor: 'var(--accent)',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
          boxShadow: '0 0 16px rgba(124,92,252,0.4)',
        }} />
        <div style={{
          position: 'absolute', inset: 9,
          border: '1.5px solid rgba(185,138,255,0.1)',
          borderBottomColor: 'var(--accent-2)',
          borderRadius: '50%',
          animation: 'spin 1.3s linear infinite reverse',
        }} />
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 8, letterSpacing: '-0.03em', fontFamily: 'Syne, sans-serif' }}>
          Analyzing property
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-2)', animation: 'pulse 1.5s ease infinite' }}>
          {steps[Math.min(step, steps.length - 1)]}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 5 }}>
        {steps.map((_, i) => (
          <div key={i} style={{
            width: i === step ? 22 : 5, height: 3, borderRadius: 2,
            background: i <= step ? 'var(--accent)' : 'rgba(255,255,255,0.08)',
            transition: 'all 0.3s ease',
            boxShadow: i === step ? '0 0 8px var(--accent-glow)' : 'none',
          }} />
        ))}
      </div>
    </div>
  )
}
