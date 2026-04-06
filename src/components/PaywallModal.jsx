import { useState, useEffect } from 'react'

const MONTHLY = 19
const ANNUAL = 149
const ANNUAL_MONTHLY = Math.round(ANNUAL / 12)

const PRO_FEATURES = [
  { icon: '📈', title: 'Investment Analysis', desc: 'Rent yield, ROI score, and 3–5 year market outlook.' },
  { icon: '📊', title: 'Price History & Projections', desc: '10-year historical trends + 2-year AI forecast.' },
  { icon: '🛡', title: 'Environmental Risk', desc: 'Flood, fire, seismic, pollution, and air quality scores.' },
  { icon: '⚖️', title: 'City Comparison', desc: 'Run two cities head-to-head — every metric, side by side.' },
]

const SECTION_COPY = {
  investment: {
    icon: '📈',
    hook: "You're one upgrade away from knowing if this city makes financial sense.",
    highlight: 0,
  },
  pricehistory: {
    icon: '📊',
    hook: "See where prices have been — and where they're going.",
    highlight: 1,
  },
  risk: {
    icon: '🛡',
    hook: 'Find out what risks this area carries before you commit.',
    highlight: 2,
  },
  neighborhood: {
    icon: '🏘',
    hook: "You've seen the scores. Now get the full neighbourhood story.",
    highlight: null,
  },
}

export default function PaywallModal({ onClose, trigger = 'limit' }) {
  const [annual, setAnnual] = useState(true)
  const [notified, setNotified] = useState(false)
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  const section = SECTION_COPY[trigger]
  const highlightIdx = section?.highlight ?? null

  const hook = section?.hook
    ?? (trigger === 'limit'
      ? "You've used all 10 free reports this month."
      : 'Get the full picture on any Canadian city.')

  const subhook = trigger === 'limit'
    ? 'Upgrade to Pro for unlimited analyses — investment scores, price history, risk data, and city comparison.'
    : null

  const displayPrice = annual ? ANNUAL_MONTHLY : MONTHLY
  const priceSuffix = annual ? '/mo · billed $149/yr' : '/month'

  const handleNotify = async (e) => {
    e.preventDefault()
    if (!email.trim()) return
    setSubmitting(true)
    // Fire-and-forget — just need an email collected
    try {
      await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'notify-pro', email: email.trim() }),
      })
    } catch { /* non-critical */ }
    setSubmitting(false)
    setNotified(true)
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="paywall-title"
      data-lenis-prevent
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(14px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px 20px', overflowY: 'auto', overscrollBehavior: 'contain',
      }}
    >
      <div
        className="liquid-glass-strong"
        style={{
          borderRadius: 28, maxWidth: 480, width: '100%',
          padding: '36px 32px', animation: 'fadeUp 0.28s ease',
          border: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        {notified ? (
          /* ── Post-submit confirmation ── */
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
            <div style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 24, color: '#fff', marginBottom: 10 }}>
              You're on the list.
            </div>
            <p style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 14, color: 'rgba(255,255,255,0.5)', lineHeight: 1.7, marginBottom: 28 }}>
              We'll email you the moment Pro payments go live — you'll be first in.
            </p>
            <button onClick={onClose} style={ctaStyle(true)}>Back to my report</button>
          </div>
        ) : (
          <>
            {/* ── Hook ── */}
            <div style={{ marginBottom: 24 }}>
              {section?.icon && (
                <div style={{ fontSize: 36, marginBottom: 12 }}>{section.icon}</div>
              )}
              <div
                id="paywall-title"
                style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 'clamp(1.3rem,4vw,1.7rem)', color: '#fff', lineHeight: 1.2, marginBottom: subhook ? 10 : 0 }}
              >
                {hook}
              </div>
              {subhook && (
                <p style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6, marginTop: 8 }}>
                  {subhook}
                </p>
              )}
            </div>

            {/* ── Pro features ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
              {PRO_FEATURES.map((f, i) => (
                <div
                  key={f.title}
                  className="liquid-glass"
                  style={{
                    borderRadius: 14, padding: '12px 16px',
                    display: 'flex', alignItems: 'center', gap: 12,
                    border: i === highlightIdx
                      ? '1px solid rgba(56,189,248,0.35)'
                      : '1px solid rgba(255,255,255,0.06)',
                    background: i === highlightIdx ? 'rgba(56,189,248,0.06)' : undefined,
                  }}
                >
                  <span style={{ fontSize: 18, flexShrink: 0 }}>{f.icon}</span>
                  <div>
                    <div style={{
                      fontFamily: "'Barlow',sans-serif", fontWeight: 500, fontSize: 13,
                      color: i === highlightIdx ? '#38bdf8' : '#fff', marginBottom: 2,
                    }}>{f.title}</div>
                    <div style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 11, color: 'rgba(255,255,255,0.4)', lineHeight: 1.4 }}>{f.desc}</div>
                  </div>
                  {i === highlightIdx && (
                    <div style={{ marginLeft: 'auto', flexShrink: 0, background: 'rgba(56,189,248,0.15)', border: '1px solid rgba(56,189,248,0.3)', borderRadius: 20, padding: '2px 8px', fontSize: 9, color: '#38bdf8', fontFamily: "'Barlow',sans-serif", fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      Unlocks
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* ── Billing toggle ── */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: '10px 14px' }}>
              <button
                onClick={() => setAnnual(false)}
                style={{ flex: 1, padding: '8px', borderRadius: 8, border: 'none', cursor: 'pointer', fontFamily: "'Barlow',sans-serif", fontSize: 13, fontWeight: 500, transition: 'background 0.2s, color 0.2s', background: !annual ? '#fff' : 'transparent', color: !annual ? '#000' : 'rgba(255,255,255,0.4)' }}
              >
                Monthly
              </button>
              <button
                onClick={() => setAnnual(true)}
                style={{ flex: 1, padding: '8px', borderRadius: 8, border: 'none', cursor: 'pointer', fontFamily: "'Barlow',sans-serif", fontSize: 13, fontWeight: 500, transition: 'background 0.2s, color 0.2s', background: annual ? '#fff' : 'transparent', color: annual ? '#000' : 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
              >
                Annual
                <span style={{ background: annual ? 'rgba(56,189,248,0.15)' : 'rgba(255,255,255,0.08)', border: `1px solid ${annual ? 'rgba(56,189,248,0.4)' : 'rgba(255,255,255,0.1)'}`, borderRadius: 20, padding: '1px 6px', fontSize: 9, color: annual ? '#38bdf8' : 'rgba(255,255,255,0.3)', fontWeight: 600 }}>
                  −35%
                </span>
              </button>
            </div>

            {/* ── Price ── */}
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <span style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 44, color: '#fff', lineHeight: 1 }}>${displayPrice}</span>
              <span style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 13, color: 'rgba(255,255,255,0.4)', marginLeft: 6 }}>{priceSuffix}</span>
            </div>

            {/* ── CTA ── */}
            <form onSubmit={handleNotify} style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  style={{
                    flex: 1, padding: '13px 16px', borderRadius: 40,
                    background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
                    color: '#fff', fontFamily: "'Barlow',sans-serif", fontSize: 14, outline: 'none',
                  }}
                  onFocus={e => e.target.style.borderColor = 'rgba(255,255,255,0.3)'}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.12)'}
                />
                <button
                  type="submit"
                  disabled={submitting}
                  style={ctaStyle(submitting, false)}
                >
                  {submitting ? '...' : `Get Pro →`}
                </button>
              </div>
              <p style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 11, color: 'rgba(255,255,255,0.25)', textAlign: 'center', lineHeight: 1.5 }}>
                Stripe payments launching shortly — drop your email and you'll be first to unlock Pro.
              </p>
            </form>

            <div style={{ textAlign: 'center', marginBottom: 8 }}>
              <span style={{ fontFamily: "'Barlow',sans-serif", fontSize: 11, color: 'rgba(74,222,128,0.6)', fontWeight: 300 }}>
                ✓ Cancel anytime &nbsp;·&nbsp; No long-term commitment
              </span>
            </div>

            <button
              onClick={onClose}
              style={{
                display: 'block', width: '100%', padding: '10px', background: 'none', border: 'none',
                cursor: 'pointer', fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 13,
                color: 'rgba(255,255,255,0.28)', transition: 'color 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.55)'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.28)'}
            >
              Continue on free
            </button>
          </>
        )}
      </div>
    </div>
  )
}

function ctaStyle(disabled, full = true) {
  return {
    ...(full ? { width: '100%' } : {}),
    padding: '13px 22px', borderRadius: 40, border: 'none',
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontFamily: "'Barlow',sans-serif", fontWeight: 600, fontSize: 14,
    background: disabled ? 'rgba(255,255,255,0.08)' : '#fff',
    color: disabled ? 'rgba(255,255,255,0.3)' : '#000',
    transition: 'background 0.2s',
    whiteSpace: 'nowrap',
  }
}
