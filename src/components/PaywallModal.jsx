import { useState } from 'react'

const PRICING_FREE = [
  'Area intelligence reports',
  'Neighbourhood & walkability scores',
  'Climate & weather data',
  'Risk & hazard overview',
]

const PRICING_PRO = [
  { text: 'Unlimited analyses', highlight: false },
  { text: 'Full investment-grade AI analysis', highlight: true },
  { text: 'Hidden risk & hazard detection', highlight: true },
  { text: 'Price trend & market predictions', highlight: true },
  { text: 'Side-by-side area comparison', highlight: false },
  { text: 'All neighbourhood data', highlight: false },
  { text: 'Priority support', highlight: false },
]

export default function PaywallModal({ onClose, onUpgrade }) {
  const [annual, setAnnual] = useState(false)
  const [hovUpgrade, setHovUpgrade] = useState(false)

  const monthlyPrice = 19
  const annualPrice = 152
  const displayPrice = annual ? Math.round(annualPrice / 12) : monthlyPrice

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(12px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <div className="liquid-glass-strong" style={{
        borderRadius: 24, maxWidth: 560, width: '100%',
        padding: 36, animation: 'fadeUp 0.3s ease',
        maxHeight: '92vh', overflowY: 'auto',
        border: '1px solid rgba(255,255,255,0.1)',
      }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 28, color: '#fff', marginBottom: 8, lineHeight: 1.1 }}>
            Your free analyses are used up
          </div>
          <p style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 14, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6, marginBottom: 4 }}>
            Upgrade to keep going — or risk making a mistake worth far more.
          </p>
          <p style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 12, color: 'rgba(255,255,255,0.25)' }}>
            Pro costs less than 0.002% of the average Canadian home purchase.
          </p>
        </div>

        {/* Annual toggle */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 24 }}>
          <span style={{ fontFamily: "'Barlow',sans-serif", fontSize: 13, color: annual ? 'rgba(255,255,255,0.35)' : '#fff' }}>Monthly</span>
          <button
            onClick={() => setAnnual(a => !a)}
            style={{
              width: 48, height: 26, borderRadius: 13, border: 'none', cursor: 'pointer', position: 'relative',
              background: annual ? 'linear-gradient(90deg, #38bdf8, #818cf8)' : 'rgba(255,255,255,0.15)',
              transition: 'background 0.25s ease', flexShrink: 0,
            }}
          >
            <div style={{
              position: 'absolute', top: 3, left: annual ? 25 : 3,
              width: 20, height: 20, borderRadius: '50%', background: '#fff',
              transition: 'left 0.25s ease',
            }} />
          </button>
          <span style={{ fontFamily: "'Barlow',sans-serif", fontSize: 13, color: annual ? '#fff' : 'rgba(255,255,255,0.35)' }}>
            Annual
            <span style={{ marginLeft: 6, background: 'rgba(56,189,248,0.15)', border: '1px solid rgba(56,189,248,0.3)', borderRadius: 20, padding: '2px 8px', fontSize: 11, color: '#38bdf8' }}>Save 33%</span>
          </span>
        </div>

        {/* Two plan cards side by side */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>

          {/* Free */}
          <div style={{
            borderRadius: 18, padding: 20,
            background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
            border: '1px solid rgba(255,255,255,0.07)',
          }}>
            <div style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 20, color: 'rgba(255,255,255,0.5)', marginBottom: 2 }}>Free</div>
            <div style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 11, color: 'rgba(255,255,255,0.25)', marginBottom: 14 }}>Good for exploring</div>
            <div style={{ marginBottom: 14, paddingBottom: 14, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <span style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 32, color: 'rgba(255,255,255,0.4)' }}>$0</span>
              <span style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 12, color: 'rgba(255,255,255,0.2)', marginLeft: 4 }}>/month</span>
            </div>
            {PRICING_FREE.map(f => (
              <div key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 7, marginBottom: 7 }}>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', flexShrink: 0, marginTop: 1 }}>✓</span>
                <span style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 11, color: 'rgba(255,255,255,0.3)', lineHeight: 1.4 }}>{f}</span>
              </div>
            ))}
          </div>

          {/* Pro */}
          <div style={{
            borderRadius: 18, padding: 20, position: 'relative',
            background: 'linear-gradient(135deg, rgba(255,255,255,0.13) 0%, rgba(255,255,255,0.06) 100%)',
            border: '1px solid rgba(255,255,255,0.2)',
            boxShadow: '0 16px 48px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.12)',
          }}>
            <div style={{
              position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)',
              background: 'linear-gradient(90deg, #38bdf8, #818cf8)',
              borderRadius: 20, padding: '3px 14px',
              fontFamily: "'Barlow',sans-serif", fontWeight: 700, fontSize: 10,
              color: '#000', whiteSpace: 'nowrap', letterSpacing: '0.06em', textTransform: 'uppercase',
            }}>Most Popular</div>

            <div style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 20, color: '#fff', marginBottom: 2 }}>Pro</div>
            <div style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 14 }}>
              {annual ? 'Billed $152/year' : 'Full intelligence'}
            </div>
            <div style={{ marginBottom: 14, paddingBottom: 14, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <span style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 32, color: '#fff' }}>${displayPrice}</span>
              <span style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 12, color: 'rgba(255,255,255,0.4)', marginLeft: 4 }}>{annual ? '/mo' : '/month'}</span>
            </div>
            {PRICING_PRO.map(f => (
              <div key={f.text} style={{ display: 'flex', alignItems: 'flex-start', gap: 7, marginBottom: 7 }}>
                <div style={{
                  width: 14, height: 14, borderRadius: '50%', flexShrink: 0, marginTop: 1,
                  background: f.highlight ? 'rgba(56,189,248,0.15)' : 'rgba(255,255,255,0.06)',
                  border: f.highlight ? '1px solid rgba(56,189,248,0.4)' : '1px solid rgba(255,255,255,0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <span style={{ fontSize: 8, color: f.highlight ? '#38bdf8' : 'rgba(255,255,255,0.4)' }}>✓</span>
                </div>
                <span style={{ fontFamily: "'Barlow',sans-serif", fontWeight: f.highlight ? 400 : 300, fontSize: 11, color: f.highlight ? '#fff' : 'rgba(255,255,255,0.6)', lineHeight: 1.4 }}>{f.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <button
          onClick={onUpgrade}
          onMouseEnter={() => setHovUpgrade(true)}
          onMouseLeave={() => setHovUpgrade(false)}
          style={{
            width: '100%', padding: '15px', borderRadius: 40, border: 'none', cursor: 'pointer',
            fontFamily: "'Barlow',sans-serif", fontWeight: 600, fontSize: 15,
            background: hovUpgrade ? 'rgba(255,255,255,0.92)' : '#fff',
            color: '#000', transition: 'background 0.2s, transform 0.15s',
            transform: hovUpgrade ? 'scale(1.01)' : 'scale(1)',
            marginBottom: 10,
          }}
        >
          {annual ? `Upgrade to Pro — $152/year →` : `Upgrade to Pro — $19/month →`}
        </button>

        <div style={{ textAlign: 'center', marginBottom: 6 }}>
          <span style={{ fontFamily: "'Barlow',sans-serif", fontSize: 12, color: 'rgba(74,222,128,0.7)', fontWeight: 300 }}>
            ✓ Full refund if not satisfied · Cancel anytime
          </span>
        </div>

        <button
          onClick={onClose}
          style={{
            display: 'block', width: '100%', padding: '10px', background: 'none', border: 'none',
            cursor: 'pointer', fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 13,
            color: 'rgba(255,255,255,0.3)', transition: 'color 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.6)'}
          onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.3)'}
        >
          Maybe later
        </button>
      </div>
    </div>
  )
}
