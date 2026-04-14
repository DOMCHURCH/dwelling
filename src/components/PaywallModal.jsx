import { useState, useEffect } from 'react'
import { getAuthToken } from '../lib/localAuth'

const MONTHLY = 29
const ANNUAL = 228
const ANNUAL_MONTHLY = 19

const FREE_FEATURES = [
  { text: '10 free reports / month', highlight: false },
  { text: 'Area Verdict & AI Market Intelligence', highlight: false },
  { text: 'Investment Score preview', highlight: false },
  { text: 'Cost of Living breakdown', highlight: false },
  { text: 'Climate & weather data', highlight: false },
]
const FREE_HIDDEN = 5 // "& 5 more" note

const PRO_FEATURES = [
  { text: '100–150 reports / month', highlight: false },
  { text: 'Full AI reports — all sections unlocked', highlight: false },
  { text: 'Investment Analysis & ROI score', highlight: true },
  { text: 'Environmental & flood risk detection', highlight: true },
  { text: 'Price history & market projections', highlight: true },
  { text: 'PDF export', highlight: true },
  { text: 'Compare up to 3 areas side-by-side', highlight: true },
  { text: 'Saved reports', highlight: false },
  { text: 'Priority processing', highlight: false },
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
      width: 17, height: 17, borderRadius: '50%', flexShrink: 0, marginTop: 1,
      background: highlight ? 'rgba(56,189,248,0.15)' : 'rgba(255,255,255,0.05)',
      border: highlight ? '1px solid rgba(56,189,248,0.4)' : '1px solid rgba(255,255,255,0.08)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <span style={{ fontSize: 9, color: highlight ? '#38bdf8' : 'rgba(255,255,255,0.3)' }}>✓</span>
    </div>
  )
}

export default function PaywallModal({ onClose, trigger = 'limit', initialAnnual = false, onShowAuth }) {
  const [annual, setAnnual] = useState(initialAnnual)
  const [upgrading, setUpgrading] = useState(false)

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  const hook = SECTION_HOOK[trigger] ?? SECTION_HOOK.limit
  const displayPrice = annual ? ANNUAL_MONTHLY : MONTHLY
  const priceDesc = annual ? `Billed $${ANNUAL}/year — cancel anytime` : 'Full intelligence, no limits'

  // Stripe checkout for Pro
  const handleUpgrade = async () => {
    setUpgrading(true)
    try {
      const token = await getAuthToken()
      if (!token) {
        onShowAuth?.()
        setUpgrading(false)
        return
      }
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: 'create-checkout', lookup_key: annual ? 'pro_yearly' : 'pro_monthly' }),
      })
      const data = await res.json()
      if (data.url) { window.location.href = data.url; return }
      alert(data.error || 'Something went wrong. Email hello@dwelling.one')
    } catch { alert('Something went wrong. Email hello@dwelling.one') }
    setUpgrading(false)
  }

  // Stripe checkout for Business
  const handleBusinessUpgrade = async () => {
    try {
      const token = await getAuthToken()
      if (!token) { onShowAuth?.(); return }
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: 'create-checkout', lookup_key: annual ? 'business_yearly' : 'business_monthly' }),
      })
      const data = await res.json()
      if (data.url) { window.location.href = data.url; return }
      alert(data.error || 'Something went wrong. Email hello@dwelling.one')
    } catch { alert('Something went wrong. Email hello@dwelling.one') }
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
          <span style={{ marginLeft: 6, background: 'rgba(56,189,248,0.15)', border: '1px solid rgba(56,189,248,0.3)', borderRadius: 20, padding: '2px 8px', fontSize: 11, color: '#38bdf8' }}>Save 34%</span>
        </span>
      </div>

      {/* Cards */}
      <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap', alignItems: 'center' }}>

        {/* Free — visually subdued */}
        <div style={{
          flex: '1 1 220px', maxWidth: 300,
          borderRadius: 24, padding: '24px 22px',
          background: 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)',
          border: '1px solid rgba(255,255,255,0.07)',
          backdropFilter: 'blur(20px)',
          display: 'flex', flexDirection: 'column',
          opacity: 0.72,
        }}>
          <div style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 22, color: 'rgba(255,255,255,0.6)', marginBottom: 3 }}>Free</div>
          <div style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 12, color: 'rgba(255,255,255,0.28)', marginBottom: 14 }}>Good for exploring</div>

          <div style={{ marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <span style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 42, color: 'rgba(255,255,255,0.5)', lineHeight: 1 }}>$0</span>
            <span style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 12, color: 'rgba(255,255,255,0.25)', marginLeft: 4 }}>/month</span>
          </div>

          <div style={{ flex: 1, marginBottom: 18 }}>
            {FREE_FEATURES.map(f => (
              <div key={f.text} style={{ display: 'flex', alignItems: 'flex-start', gap: 9, marginBottom: 8 }}>
                <CircleCheck highlight={false} />
                <span style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 11, color: 'rgba(255,255,255,0.38)', lineHeight: 1.4 }}>{f.text}</span>
              </div>
            ))}
            <div style={{ fontFamily: "'Barlow',sans-serif", fontSize: 11, color: 'rgba(255,255,255,0.22)', paddingLeft: 26, marginTop: 4 }}>& {FREE_HIDDEN} more</div>
          </div>

          <button
            onClick={onClose}
            style={{
              width: '100%', borderRadius: 40, padding: '11px',
              fontFamily: "'Barlow',sans-serif", fontWeight: 400, fontSize: 12,
              border: 'none',
              background: 'rgba(255,255,255,0.04)',
              color: 'rgba(255,255,255,0.35)', cursor: 'pointer',
            }}
          >
            Continue with Free
          </button>
        </div>

        {/* Pro — gradient border, dominant */}
        <div style={{
          flex: '1 1 220px', maxWidth: 320,
          padding: 1.5, borderRadius: 25.5,
          background: 'linear-gradient(135deg, rgba(56,189,248,0.55) 0%, rgba(129,140,248,0.55) 50%, rgba(167,139,250,0.55) 100%)',
          boxShadow: '0 0 80px rgba(56,189,248,0.12), 0 28px 72px rgba(0,0,0,0.5)',
          position: 'relative',
        }}>
          {/* Badge */}
          <div style={{
            position: 'absolute', top: -16, left: '50%', transform: 'translateX(-50%)',
            background: 'linear-gradient(90deg, #38bdf8, #818cf8)',
            borderRadius: 20, padding: '5px 18px',
            fontFamily: "'Barlow',sans-serif", fontWeight: 700, fontSize: 10,
            color: '#000', whiteSpace: 'nowrap', letterSpacing: '0.08em', textTransform: 'uppercase',
            boxShadow: '0 4px 16px rgba(56,189,248,0.4)',
            zIndex: 2,
          }}>Best Value</div>

          <div style={{
            borderRadius: 22.5, padding: '28px 24px',
            background: 'linear-gradient(135deg, rgba(14,16,32,0.98) 0%, rgba(8,10,24,0.98) 100%)',
            backdropFilter: 'blur(24px)',
            display: 'flex', flexDirection: 'column',
            width: '100%', boxSizing: 'border-box',
          }}>
            <div style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 28, color: '#fff', marginBottom: 4 }}>Pro</div>
            <div style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 13, color: 'rgba(255,255,255,0.45)', marginBottom: 18 }}>{priceDesc}</div>

            <div style={{ marginBottom: 20, paddingBottom: 18, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <span style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 52, color: '#fff', lineHeight: 1 }}>${displayPrice}</span>
              <span style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 13, color: 'rgba(255,255,255,0.35)', marginLeft: 5 }}>/month</span>
              {annual && (
                <div style={{ marginTop: 4, fontFamily: "'Barlow',sans-serif", fontSize: 11, color: '#38bdf8', fontWeight: 500 }}>Billed $228/year — save 34%</div>
              )}
            </div>

            <div style={{ flex: 1, marginBottom: 20 }}>
              <div style={{ fontFamily: "'Barlow',sans-serif", fontSize: 10, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>Everything in Free, plus:</div>
              {PRO_FEATURES.map(f => (
                <div key={f.text} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 11 }}>
                  <CircleCheck highlight={f.highlight} />
                  <span style={{ fontFamily: "'Barlow',sans-serif", fontWeight: f.highlight ? 500 : 300, fontSize: 12, color: f.highlight ? '#e2f5ff' : 'rgba(255,255,255,0.65)', lineHeight: 1.4 }}>{f.text}</span>
                </div>
              ))}
            </div>

            <button
              onClick={handleUpgrade}
              disabled={upgrading}
              style={{
                width: '100%', padding: '13px 20px', borderRadius: 40, border: 'none',
                cursor: upgrading ? 'wait' : 'pointer',
                fontFamily: "'Barlow',sans-serif", fontWeight: 700, fontSize: 14,
                background: upgrading ? 'rgba(56,189,248,0.5)' : 'linear-gradient(90deg, #38bdf8, #818cf8)',
                color: '#000',
                transition: 'opacity 0.15s',
                letterSpacing: '0.01em',
              }}
              onMouseEnter={e => { if (!upgrading) e.currentTarget.style.opacity = '0.88' }}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            >
              {upgrading ? 'Redirecting...' : (annual ? `Get Pro — $${ANNUAL}/year →` : 'Upgrade to Pro →')}
            </button>
            <div style={{ textAlign: 'center', marginTop: 8 }}>
              <span style={{ fontFamily: "'Barlow',sans-serif", fontSize: 11, color: 'rgba(255,255,255,0.22)', fontWeight: 300 }}>Cancel anytime</span>
            </div>
          </div>
        </div>
        {/* Business — amber, for teams */}
        <div style={{
          flex: '1 1 200px', maxWidth: 280,
          padding: 1.5, borderRadius: 25.5,
          background: 'linear-gradient(135deg, rgba(251,191,36,0.4) 0%, rgba(245,158,11,0.3) 50%, rgba(180,83,9,0.25) 100%)',
          boxShadow: '0 0 40px rgba(251,191,36,0.07), 0 20px 50px rgba(0,0,0,0.4)',
          position: 'relative',
        }}>
          <div style={{
            position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)',
            background: 'linear-gradient(90deg, #fbbf24, #f59e0b)',
            borderRadius: 20, padding: '4px 14px',
            fontFamily: "'Barlow',sans-serif", fontWeight: 700, fontSize: 9,
            color: '#000', whiteSpace: 'nowrap', letterSpacing: '0.08em', textTransform: 'uppercase',
            boxShadow: '0 3px 12px rgba(251,191,36,0.3)',
            zIndex: 2,
          }}>For Teams</div>
          <div style={{
            borderRadius: 22.5, padding: '24px 20px',
            background: 'linear-gradient(135deg, rgba(20,14,4,0.98) 0%, rgba(12,8,2,0.98) 100%)',
            backdropFilter: 'blur(24px)',
            display: 'flex', flexDirection: 'column',
            width: '100%', boxSizing: 'border-box',
          }}>
            <div style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 22, color: '#fff', marginBottom: 3 }}>Business</div>
            <div style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 11, color: 'rgba(255,255,255,0.35)', marginBottom: 14 }}>Agencies & brokers</div>
            <div style={{ marginBottom: 16, paddingBottom: 14, borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              <span style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 38, color: '#fff', lineHeight: 1 }}>${annual ? 120 : 150}</span>
              <span style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 11, color: 'rgba(255,255,255,0.3)', marginLeft: 4 }}>/mo</span>
              <div style={{ marginTop: 4, fontFamily: "'Barlow',sans-serif", fontSize: 10, color: '#fbbf24', fontWeight: 500 }}>
                {annual ? 'Billed $1,440/year — save 20%' : 'Up to $249/mo for larger teams'}
              </div>
            </div>
            <div style={{ flex: 1, marginBottom: 16 }}>
              {[
                ['1,000–3,000 reports / month', false],
                ['200–1,000 reports / day', false],
                ['3–10 team members', true],
                ['5 API keys', true],
                ['Team workspace', true],
                ['Client sharing links', true],
                ['Branded PDF reports', true],
              ].map(([text, hl]) => (
                <div key={text} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
                  <div style={{
                    width: 15, height: 15, borderRadius: '50%', flexShrink: 0, marginTop: 1,
                    background: hl ? 'rgba(251,191,36,0.15)' : 'rgba(255,255,255,0.05)',
                    border: hl ? '1px solid rgba(251,191,36,0.35)' : '1px solid rgba(255,255,255,0.08)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <span style={{ fontSize: 8, color: hl ? '#fbbf24' : 'rgba(255,255,255,0.3)' }}>✓</span>
                  </div>
                  <span style={{ fontFamily: "'Barlow',sans-serif", fontWeight: hl ? 500 : 300, fontSize: 11, color: hl ? '#fef3c7' : 'rgba(255,255,255,0.55)', lineHeight: 1.4 }}>{text}</span>
                </div>
              ))}
            </div>
            <button
              onClick={handleBusinessUpgrade}
              style={{
                width: '100%', padding: '11px', borderRadius: 40, border: 'none',
                cursor: 'pointer', fontFamily: "'Barlow',sans-serif", fontWeight: 700, fontSize: 12,
                background: 'linear-gradient(90deg, #fbbf24, #d97706)',
                color: '#000', transition: 'opacity 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            >{annual ? `Start Business — $1,440/year →` : 'Start Business →'}</button>
            <div style={{ textAlign: 'center', marginTop: 8 }}>
              <span style={{ fontFamily: "'Barlow',sans-serif", fontSize: 11, color: 'rgba(255,255,255,0.22)', fontWeight: 300 }}>Cancel anytime</span>
            </div>
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
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(14px)',
        overflowY: 'auto', overscrollBehavior: 'contain',
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          display: 'flex', minHeight: '100%',
          alignItems: 'center', justifyContent: 'center',
          padding: '32px 20px', boxSizing: 'border-box',
        }}
        onClick={e => e.target === e.currentTarget && onClose()}
      >
        <div
          className="liquid-glass-strong"
          style={{
            borderRadius: 24, width: '100%', position: 'relative',
            maxWidth: wide ? 980 : 420,
            padding: wide ? '36px 28px 28px' : '32px 28px',
            animation: 'fadeUp 0.28s ease',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          {children}
        </div>
      </div>
    </div>
  )
}

