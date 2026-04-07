import { useState, useEffect } from 'react'

const MONTHLY = 19
const ANNUAL = 149
const ANNUAL_MONTHLY = Math.round(ANNUAL / 12) // 12

const FREE_FEATURES = [
  { text: '10 free reports / month', highlight: false },
  { text: 'Area Verdict & AI Market Intelligence', highlight: false },
  { text: 'Investment Score preview', highlight: false },
  { text: 'Cost of Living breakdown', highlight: false },
  { text: 'Climate & weather data', highlight: false },
  { text: 'Local Market News', highlight: false },
  { text: 'Area Market Estimate', highlight: false },
  { text: 'Walkability & school scores', highlight: false },
  { text: 'Full Neighbourhood detail & safety', highlight: false },
  { text: 'Own API key — full privacy, no platform limits', highlight: false },
]

const PRO_FEATURES = [
  { text: 'Virtually unlimited analyses', highlight: false },
  { text: 'Investment Analysis & ROI score', highlight: true },
  { text: 'Environmental & flood risk detection', highlight: true },
  { text: 'Price history & market projections', highlight: true },
  { text: 'Side-by-side city comparison', highlight: true },
  { text: 'Priority support', highlight: false },
]

const SECTION_HOOK = {
  investment: { icon: '📈', text: "You're one step from knowing if this city makes financial sense." },
  pricehistory: { icon: '📊', text: "See where prices have been — and where they're going." },
  risk: { icon: '🛡', text: 'Find out what risks this area carries before you commit.' },
  neighborhood: { icon: '🏘', text: "You've seen the scores. Now get the full neighbourhood story." },
  limit: { icon: null, text: "You've used all 10 free reports this month." },
}

function CircleCheck({ highlight }) {
  return (
    <div style={{
      width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
      background: highlight ? 'rgba(56,189,248,0.15)' : 'rgba(255,255,255,0.06)',
      border: highlight ? '1px solid rgba(56,189,248,0.4)' : '1px solid rgba(255,255,255,0.1)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <span style={{ fontSize: 10, color: highlight ? '#38bdf8' : 'rgba(255,255,255,0.5)' }}>✓</span>
    </div>
  )
}

export default function PaywallModal({ onClose, trigger = 'limit' }) {
  const [annual, setAnnual] = useState(true)
  const [view, setView] = useState('main') // 'main' | 'notify' | 'success'
  const [notifyEmail, setNotifyEmail] = useState('')
  const [notifyLoading, setNotifyLoading] = useState(false)

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  const hook = SECTION_HOOK[trigger] ?? SECTION_HOOK.limit
  const displayPrice = annual ? ANNUAL_MONTHLY : MONTHLY
  const priceDesc = annual ? `Billed $${ANNUAL}/year — cancel anytime` : 'Everything in Free, plus the full picture'

  const handleNotify = async (e) => {
    e.preventDefault()
    if (!notifyEmail.trim()) return
    setNotifyLoading(true)
    try {
      await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'notify-pro', email: notifyEmail.trim() }),
      })
    } catch { /* non-critical */ }
    setNotifyLoading(false)
    setView('success')
  }

  // ── Success ─────────────────────────────────────────────────────────────────
  if (view === 'success') {
    return (
      <Overlay onClose={onClose}>
        <div style={{ textAlign: 'center', padding: '32px 0' }}>
          <div style={{ fontSize: 52, marginBottom: 16 }}>🎉</div>
          <div style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 28, color: '#fff', marginBottom: 10 }}>
            You're on the list.
          </div>
          <p style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 14, color: 'rgba(255,255,255,0.5)', lineHeight: 1.7, marginBottom: 28 }}>
            You'll be first to know when Pro launches — and first to lock in the early price.
          </p>
          <button onClick={onClose} style={btnPrimary}>Back to my report →</button>
        </div>
      </Overlay>
    )
  }

  // ── Notify ──────────────────────────────────────────────────────────────────
  if (view === 'notify') {
    return (
      <Overlay onClose={onClose}>
        <button onClick={() => setView('main')} style={backBtn}>← Back</button>
        <div style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 24, color: '#fff', marginBottom: 8 }}>
          Get notified when Pro launches
        </div>
        <p style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 13, color: 'rgba(255,255,255,0.45)', marginBottom: 24, lineHeight: 1.6 }}>
          Payments are launching shortly. Drop your email and you'll be first to know — and first to lock in the early price.
        </p>
        <form onSubmit={handleNotify}>
          <input
            autoFocus
            type="email"
            value={notifyEmail}
            onChange={e => setNotifyEmail(e.target.value)}
            placeholder="you@example.com"
            required
            style={{ ...inputStyle, marginBottom: 10 }}
            onFocus={e => e.target.style.borderColor = 'rgba(255,255,255,0.35)'}
            onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.12)'}
          />
          <button type="submit" disabled={notifyLoading} style={{ ...btnPrimary, opacity: notifyLoading ? 0.6 : 1 }}>
            {notifyLoading ? 'Saving...' : 'Notify me →'}
          </button>
        </form>
      </Overlay>
    )
  }

  // ── Main ────────────────────────────────────────────────────────────────────
  return (
    <Overlay onClose={onClose} wide>

      {/* Close button */}
      <button
        onClick={onClose}
        aria-label="Close"
        style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', fontSize: 20, lineHeight: 1, padding: 4, transition: 'color 0.2s', zIndex: 2 }}
        onMouseEnter={e => e.currentTarget.style.color = '#fff'}
        onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.3)'}
      >✕</button>

      {/* Context hook */}
      {trigger !== 'pricing' && (
        <div style={{ textAlign: 'center', marginBottom: 20, paddingBottom: 18, borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          {hook.icon && <span style={{ fontSize: 24, display: 'block', marginBottom: 6 }}>{hook.icon}</span>}
          <p id="paywall-title" style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 'clamp(1rem,3vw,1.25rem)', color: 'rgba(255,255,255,0.8)', lineHeight: 1.3 }}>
            {hook.text}
          </p>
        </div>
      )}

      {/* Billing toggle */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 28 }}>
        <span style={{ fontFamily: "'Barlow',sans-serif", fontSize: 13, color: annual ? 'rgba(255,255,255,0.35)' : '#fff', fontWeight: 400, transition: 'color 0.2s' }}>Monthly</span>
        <button
          onClick={() => setAnnual(a => !a)}
          aria-label="Toggle billing period"
          style={{
            width: 48, height: 26, borderRadius: 13, border: 'none', cursor: 'pointer', position: 'relative',
            background: annual ? 'linear-gradient(90deg, #38bdf8, #818cf8)' : 'rgba(255,255,255,0.15)',
            transition: 'background 0.25s ease',
          }}
        >
          <div style={{
            position: 'absolute', top: 3, left: annual ? 25 : 3,
            width: 20, height: 20, borderRadius: '50%', background: '#fff',
            transition: 'left 0.25s ease',
          }} />
        </button>
        <span style={{ fontFamily: "'Barlow',sans-serif", fontSize: 13, color: annual ? '#fff' : 'rgba(255,255,255,0.35)', fontWeight: 400, transition: 'color 0.2s' }}>
          Annual
          <span style={{ marginLeft: 6, background: 'rgba(56,189,248,0.15)', border: '1px solid rgba(56,189,248,0.3)', borderRadius: 20, padding: '2px 8px', fontSize: 11, color: '#38bdf8' }}>Save 35%</span>
        </span>
      </div>

      {/* Cards */}
      <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap', alignItems: 'flex-start' }}>

        {/* Free */}
        <div style={{
          flex: '1 1 240px', maxWidth: 320, borderRadius: 24, padding: '28px 24px',
          background: 'linear-gradient(135deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.03) 100%)',
          border: '1px solid rgba(255,255,255,0.09)', backdropFilter: 'blur(20px)',
          display: 'flex', flexDirection: 'column',
        }}>
          <div style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 26, color: '#fff', marginBottom: 4 }}>Free</div>
          <div style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 13, color: 'rgba(255,255,255,0.45)', marginBottom: 18 }}>Good for exploring</div>

          <div style={{ marginBottom: 20, paddingBottom: 20, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <span style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 48, color: '#fff', lineHeight: 1 }}>$0</span>
            <span style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 13, color: 'rgba(255,255,255,0.35)', marginLeft: 5 }}>/month</span>
          </div>

          <div style={{ flex: 1, marginBottom: 20 }}>
            {FREE_FEATURES.map(f => (
              <div key={f.text} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
                <CircleCheck highlight={false} />
                <span style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 12, color: 'rgba(255,255,255,0.65)', lineHeight: 1.4 }}>{f.text}</span>
              </div>
            ))}
          </div>

          <button
            onClick={onClose}
            style={{
              width: '100%', borderRadius: 40, padding: '13px',
              fontFamily: "'Barlow',sans-serif", fontWeight: 600, fontSize: 13,
              border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.06)',
              color: '#fff', cursor: 'pointer', transition: 'background 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
          >
            Start for free
          </button>
        </div>

        {/* Pro */}
        <div style={{
          flex: '1 1 240px', maxWidth: 320, borderRadius: 24, padding: '28px 24px',
          background: 'linear-gradient(135deg, rgba(255,255,255,0.13) 0%, rgba(255,255,255,0.06) 100%)',
          border: '1px solid rgba(255,255,255,0.22)', backdropFilter: 'blur(20px)',
          boxShadow: '0 24px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.15)',
          display: 'flex', flexDirection: 'column', position: 'relative',
          transform: 'scale(1.03)',
        }}>
          {/* Badge */}
          <div style={{
            position: 'absolute', top: -13, left: '50%', transform: 'translateX(-50%)',
            background: 'linear-gradient(90deg, #38bdf8, #818cf8)',
            borderRadius: 20, padding: '4px 16px',
            fontFamily: "'Barlow',sans-serif", fontWeight: 700, fontSize: 10,
            color: '#000', whiteSpace: 'nowrap', letterSpacing: '0.06em', textTransform: 'uppercase',
          }}>Most Popular</div>

          <div style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 26, color: '#fff', marginBottom: 4 }}>Pro</div>
          <div style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 13, color: 'rgba(255,255,255,0.45)', marginBottom: 18 }}>{priceDesc}</div>

          <div style={{ marginBottom: 20, paddingBottom: 20, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <span style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 48, color: '#fff', lineHeight: 1 }}>${displayPrice}</span>
            <span style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 13, color: 'rgba(255,255,255,0.35)', marginLeft: 5 }}>/month</span>
          </div>

          <div style={{ flex: 1, marginBottom: 20 }}>
            {PRO_FEATURES.map(f => (
              <div key={f.text} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
                <CircleCheck highlight={f.highlight} />
                <span style={{ fontFamily: "'Barlow',sans-serif", fontWeight: f.highlight ? 400 : 300, fontSize: 12, color: f.highlight ? '#fff' : 'rgba(255,255,255,0.65)', lineHeight: 1.4 }}>{f.text}</span>
              </div>
            ))}
          </div>

          <button
            onClick={() => setView('notify')}
            style={{ ...btnPrimary, marginBottom: 8 }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          >
            {annual ? `Get Pro — $${ANNUAL}/year →` : 'Upgrade to Pro →'}
          </button>
          <div style={{ textAlign: 'center' }}>
            <span style={{ fontFamily: "'Barlow',sans-serif", fontSize: 11, color: 'rgba(255,255,255,0.25)', fontWeight: 300 }}>Cancel anytime</span>
          </div>
        </div>
      </div>

      {/* Maybe later */}
      <div style={{ textAlign: 'center', marginTop: 20 }}>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 12, color: 'rgba(255,255,255,0.25)', transition: 'color 0.2s' }}
          onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.55)'}
          onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.25)'}
        >
          Maybe later
        </button>
      </div>
    </Overlay>
  )
}

// ── Shared ────────────────────────────────────────────────────────────────────

function Overlay({ children, onClose, wide }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="paywall-title"
      data-lenis-prevent
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(14px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px 20px', overflowY: 'auto', overscrollBehavior: 'contain',
      }}
    >
      <div
        className="liquid-glass-strong"
        style={{
          borderRadius: 24, width: '100%', position: 'relative',
          maxWidth: wide ? 720 : 420,
          padding: wide ? '32px 28px 24px' : '32px 28px',
          animation: 'fadeUp 0.28s ease',
          border: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        {children}
      </div>
    </div>
  )
}

const btnPrimary = {
  width: '100%', padding: '13px 20px', borderRadius: 40, border: 'none',
  cursor: 'pointer', fontFamily: "'Barlow',sans-serif", fontWeight: 600, fontSize: 14,
  background: '#fff', color: '#000', transition: 'opacity 0.15s',
}

const inputStyle = {
  width: '100%', padding: '13px 16px', borderRadius: 40, boxSizing: 'border-box',
  background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
  color: '#fff', fontFamily: "'Barlow',sans-serif", fontSize: 14, outline: 'none',
}

const backBtn = {
  background: 'none', border: 'none', cursor: 'pointer',
  fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 12,
  color: 'rgba(255,255,255,0.35)', padding: '0 0 16px 0', display: 'block',
}
