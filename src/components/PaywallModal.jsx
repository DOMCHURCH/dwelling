const MONO = "'Space Mono', monospace"

export default function PaywallModal({ onClose, onUpgrade }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.9)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20,
    }}>
      <div style={{
        background: '#0a0a0f',
        border: '2px solid #ffffff',
        maxWidth: 480, width: '100%',
        boxShadow: '8px 8px 0px #eab308',
      }}>
        {/* Header */}
        <div style={{ padding: '24px 28px 20px', borderBottom: '2px solid rgba(255,255,255,0.2)' }}>
          <div style={{ fontFamily: MONO, fontSize: 10, color: '#eab308', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 6 }}>Usage Limit Reached</div>
          <div style={{ fontFamily: MONO, fontSize: 18, fontWeight: 700, color: '#ffffff', textTransform: 'uppercase' }}>You've used your 10 free analyses this month.</div>
        </div>

        {/* Body */}
        <div style={{ padding: '28px' }}>
          {/* Free vs Pro */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 28 }}>
            <div style={{ border: '1px solid rgba(255,255,255,0.15)', padding: '16px' }}>
              <div style={{ fontFamily: MONO, fontSize: 10, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 10 }}>Free</div>
              <div style={{ fontFamily: MONO, fontSize: 22, fontWeight: 700, color: '#ffffff', marginBottom: 12 }}>$0</div>
              {['10 analyses/month', 'All data sources', 'AI analysis'].map(f => (
                <div key={f} style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>✓ {f}</div>
              ))}
            </div>
            <div style={{ border: '2px solid #ff2d78', padding: '16px', position: 'relative', background: 'rgba(255,45,120,0.05)' }}>
              <div style={{ position: 'absolute', top: -10, left: 12, background: '#ff2d78', padding: '2px 10px', fontFamily: MONO, fontSize: 9, fontWeight: 700, color: '#ffffff', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Most Popular</div>
              <div style={{ fontFamily: MONO, fontSize: 10, color: '#ff2d78', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 10 }}>Pro</div>
              <div style={{ fontFamily: MONO, fontSize: 22, fontWeight: 700, color: '#ffffff', marginBottom: 12 }}>$9<span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>/mo</span></div>
              {['Unlimited analyses', 'All data sources', 'AI analysis', 'Priority support'].map(f => (
                <div key={f} style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: '#ffffff', marginBottom: 6 }}>✓ {f}</div>
              ))}
            </div>
          </div>

          <button onClick={onUpgrade} style={{
            width: '100%', padding: '14px',
            background: '#ff2d78', border: '2px solid #ff2d78',
            color: '#ffffff', fontFamily: MONO, fontSize: 13, fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.15em',
            cursor: 'crosshair', marginBottom: 10,
          }}>
            Upgrade to Pro — $9/month →
          </button>

          <button onClick={onClose} style={{
            width: '100%', padding: '10px',
            background: 'transparent', border: '1px solid rgba(255,255,255,0.2)',
            color: 'rgba(255,255,255,0.4)', fontFamily: MONO, fontSize: 11,
            textTransform: 'uppercase', letterSpacing: '0.1em',
            cursor: 'crosshair',
          }}>
            Maybe later
          </button>
        </div>
      </div>
    </div>
  )
}
