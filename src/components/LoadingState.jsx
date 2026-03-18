const steps = ['Locating address...', 'Fetching real data...', 'Running neighborhood analysis...', 'AI property valuation...', 'Building report...']

export default function LoadingState({ step = 0 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 20px', gap: 32 }}>
      {/* Brutalist spinner */}
      <div style={{ position: 'relative', width: 64, height: 64 }}>
        <div style={{
          position: 'absolute', inset: 0,
          border: '3px solid transparent',
          borderTopColor: 'var(--neon-pink)',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
        <div style={{
          position: 'absolute', inset: 10,
          border: '3px solid transparent',
          borderTopColor: 'var(--acid-yellow)',
          borderRadius: '50%',
          animation: 'spin 1.2s linear infinite reverse',
        }} />
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: "'Space Mono', monospace",
          fontSize: 18, fontWeight: 700,
          color: 'var(--white)',
        }}>$</div>
      </div>

      <div style={{ textAlign: 'center', border: '2px solid var(--white)', padding: '20px 32px' }}>
        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, fontFamily: "'Space Mono', monospace", textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Analyzing Property
        </div>
        <div style={{ fontSize: 12, color: 'var(--neon-pink)', fontFamily: "'Space Mono', monospace", animation: 'pulse 1.5s ease infinite' }}>
          {steps[Math.min(step, steps.length - 1)]}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 4 }}>
        {steps.map((_, i) => (
          <div key={i} style={{
            width: i === step ? 28 : 8, height: 4,
            background: i <= step ? 'var(--neon-pink)' : 'rgba(255,255,255,0.15)',
            transition: 'all 0.3s ease',
          }} />
        ))}
      </div>
    </div>
  )
}
