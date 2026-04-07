import { useState, useEffect } from 'react'

const MONTHLY = 19
const ANNUAL = 149
const ANNUAL_MONTHLY = Math.round(ANNUAL / 12) // 12

const FREE_FEATURES = [
  '10 free reports / month',
  'Area Verdict & AI Market Intelligence',
  'Investment Score preview',
  'Cost of Living breakdown',
  'Climate & weather data',
  'Local Market News',
  'Area Market Estimate',
  'Walkability & school scores',
  'Full Neighbourhood detail & safety',
]

const PRO_EXTRAS = [
  { text: 'Unlimited analyses', key: true },
  { text: 'Investment Analysis & ROI score', key: true },
  { text: 'Price history & market projections', key: true },
  { text: 'Environmental & flood risk detection', key: true },
  { text: 'Side-by-side city comparison', key: true },
  { text: 'BYOK — full privacy, no platform limits', key: false },
  { text: 'Priority support', key: false },
]

const SECTION_HOOK = {
  investment: { icon: '📈', text: "You're one step from knowing if this city makes financial sense." },
  pricehistory: { icon: '📊', text: "See where prices have been — and where they're going." },
  risk: { icon: '🛡', text: 'Find out what risks this area carries before you commit.' },
  neighborhood: { icon: '🏘', text: "You've seen the scores. Now get the full neighbourhood story." },
  limit: { icon: null, text: "You've used all 10 free reports this month." },
}

function Check() {
  return (
    <svg width="11" height="11" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0, marginTop: 2 }}>
      <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
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
  const priceSuffix = annual ? '/mo · billed $149/yr' : '/month'

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

  // ── Success screen ──────────────────────────────────────────────────────────
  if (view === 'success') {
    return (
      <Overlay onClose={onClose}>
        <div style={{ textAlign: 'center', padding: '24px 0' }}>
          <div style={{ fontSize: 52, marginBottom: 16 }}>🎉</div>
          <div style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 26, color: '#fff', marginBottom: 10 }}>
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

  // ── Notify waitlist ─────────────────────────────────────────────────────────
  if (view === 'notify') {
    return (
      <Overlay onClose={onClose}>
        <button onClick={() => setView('main')} style={backBtn}>← Back</button>
        <div style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 22, color: '#fff', marginBottom: 6 }}>
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

  // ── Main two-column paywall ─────────────────────────────────────────────────
  return (
    <Overlay onClose={onClose} wide>

      {/* Context hook — only shown when triggered from a specific section */}
      {trigger !== 'pricing' && (
        <div style={{ marginBottom: 24, paddingBottom: 20, borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          {hook.icon && <span style={{ fontSize: 28, display: 'block', marginBottom: 8 }}>{hook.icon}</span>}
          <p id="paywall-title" style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 'clamp(1.1rem,3vw,1.4rem)', color: '#fff', lineHeight: 1.3 }}>
            {hook.text}
          </p>
        </div>
      )}

      {/* Two-column grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,2fr) minmax(0,3fr)', gap: 0, borderRadius: 18, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)' }}>

        {/* ── Free column ── */}
        <div style={{ padding: '24px 20px', borderRight: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 20, color: 'rgba(255,255,255,0.7)', marginBottom: 4 }}>Free</div>
          <div style={{ marginBottom: 4 }}>
            <span style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 28, color: 'rgba(255,255,255,0.7)' }}>$0</span>
            <span style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 12, color: 'rgba(255,255,255,0.3)', marginLeft: 4 }}>/month</span>
          </div>
          <div style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 11, color: 'rgba(255,255,255,0.3)', marginBottom: 16 }}>No credit card required</div>

          <button
            onClick={onClose}
            style={{ width: '100%', padding: '10px', borderRadius: 40, border: '1px solid rgba(255,255,255,0.15)', background: 'transparent', color: 'rgba(255,255,255,0.5)', fontFamily: "'Barlow',sans-serif", fontWeight: 500, fontSize: 12, cursor: 'pointer', marginBottom: 16, transition: 'border-color 0.2s, color 0.2s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.35)'; e.currentTarget.style.color = '#fff' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)' }}
          >
            Continue on free
          </button>

          <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', marginBottom: 14 }} />

          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 9, flex: 1 }}>
            {FREE_FEATURES.map(f => (
              <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <span style={{ color: 'rgba(255,255,255,0.4)', marginTop: 1 }}><Check /></span>
                <span style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 11, color: 'rgba(255,255,255,0.5)', lineHeight: 1.4 }}>{f}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* ── Pro column ── */}
        <div style={{ padding: '24px 22px', background: 'rgba(255,255,255,0.04)', display: 'flex', flexDirection: 'column', position: 'relative' }}>
          {/* Popular badge */}
          <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: 'linear-gradient(90deg, #38bdf8, #818cf8)', borderRadius: 20, padding: '3px 14px', fontFamily: "'Barlow',sans-serif", fontWeight: 700, fontSize: 10, color: '#000', whiteSpace: 'nowrap', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            Most Popular
          </div>

          <div style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 20, color: '#fff', marginBottom: 4 }}>Pro</div>

          {/* Billing toggle */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
            {[{ label: 'Monthly', val: false }, { label: 'Annual −35%', val: true }].map(({ label, val }) => (
              <button key={label} onClick={() => setAnnual(val)} style={{ flex: 1, padding: '5px 6px', borderRadius: 8, border: 'none', cursor: 'pointer', fontFamily: "'Barlow',sans-serif", fontSize: 11, fontWeight: 500, transition: 'all 0.2s', background: annual === val ? '#fff' : 'rgba(255,255,255,0.06)', color: annual === val ? '#000' : 'rgba(255,255,255,0.4)' }}>
                {label}
              </button>
            ))}
          </div>

          <div style={{ marginBottom: 4 }}>
            <span style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 28, color: '#fff' }}>${displayPrice}</span>
            <span style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 12, color: 'rgba(255,255,255,0.4)', marginLeft: 4 }}>{priceSuffix}</span>
          </div>
          <div style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 11, color: 'rgba(255,255,255,0.3)', marginBottom: 14 }}>
            {annual ? 'Billed $149/year — cancel anytime' : 'Cancel anytime'}
          </div>

          {/* Primary CTA */}
          <button
            onClick={() => setView('notify')}
            style={{ ...btnPrimary, marginBottom: 16, fontSize: 13 }}
          >
            {annual ? 'Get Pro — $149/year →' : 'Get Pro — $19/month →'}
          </button>

          <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', marginBottom: 14 }} />

          <div style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 500, fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Everything in Free, plus:
          </div>

          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
            {PRO_EXTRAS.map(f => (
              <li key={f.text} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <span style={{ color: f.key ? '#38bdf8' : 'rgba(255,255,255,0.4)', marginTop: 1 }}><Check /></span>
                <span style={{ fontFamily: "'Barlow',sans-serif", fontWeight: f.key ? 400 : 300, fontSize: 11, color: f.key ? '#fff' : 'rgba(255,255,255,0.55)', lineHeight: 1.4 }}>{f.text}</span>
              </li>
            ))}
          </ul>

          <div style={{ marginTop: 14, textAlign: 'center' }}>
            <span style={{ fontFamily: "'Barlow',sans-serif", fontSize: 10, color: 'rgba(74,222,128,0.55)', fontWeight: 300 }}>
              ✓ Cancel anytime · No long-term commitment
            </span>
          </div>
        </div>
      </div>
    </Overlay>
  )
}

// ── Shared sub-components ──────────────────────────────────────────────────────

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
          borderRadius: 24, width: '100%',
          maxWidth: wide ? 680 : 420,
          padding: wide ? '28px 28px 24px' : '32px 28px',
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
  width: '100%', padding: '12px 20px', borderRadius: 40, border: 'none',
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
