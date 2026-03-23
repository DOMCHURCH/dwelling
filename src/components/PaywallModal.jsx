import { useState } from 'react'

export default function PaywallModal({ onClose, onUpgrade }) {
  const [selected, setSelected] = useState('monthly')

  const btn = (primary) => ({
    width: '100%', padding: '13px', borderRadius: 40, border: 'none', cursor: 'pointer',
    fontFamily: "'Barlow',sans-serif", fontWeight: 600, fontSize: 14,
    background: primary ? '#fff' : 'transparent',
    color: primary ? '#000' : 'rgba(255,255,255,0.4)',
    transition: 'transform 0.15s',
  })

  const plans = [
    {
      id: 'monthly',
      label: 'Pro Monthly',
      price: '$5',
      period: '/mo',
      badge: 'Most Popular',
      subheading: 'Make smarter location decisions',
      features: [
        { text: 'Unlimited analyses', highlight: false },
        { text: 'Full investment-grade AI analysis', highlight: true },
        { text: 'Hidden risk & hazard detection', highlight: true },
        { text: 'Price trend & market predictions', highlight: true },
        { text: 'Side-by-side area comparison', highlight: false },
        { text: 'Cancel anytime · No commitment', highlight: false },
      ],
      cta: 'Upgrade to Pro — $5/month →',
    },
  ]

  const activePlan = plans.find(p => p.id === selected)

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 999999, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div className="liquid-glass-strong" style={{ borderRadius: 24, maxWidth: 480, width: '100%', padding: 32, animation: 'fadeUp 0.3s ease', maxHeight: '90vh', overflowY: 'auto' }}>

        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 24, color: '#fff', marginBottom: 6 }}>Your free analyses are used up</div>
          <p style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>Upgrade to keep going — or make a mistake worth far more.</p>
          <p style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>Pro costs less than 0.002% of the average home purchase.</p>
        </div>

        {/* Free plan reminder */}
        <div className="liquid-glass" style={{ borderRadius: 12, padding: '12px 16px', marginBottom: 16 }}>
          <div style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 11, color: 'rgba(255,255,255,0.3)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Free — $0/mo</div>
          {['10 analyses/month', 'Area intelligence reports', 'Neighbourhood scores'].map(f => (
            <div key={f} style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 12, color: 'rgba(255,255,255,0.35)', marginBottom: 3 }}>✓ {f}</div>
          ))}
        </div>



        {/* Active plan */}
        {activePlan && (
          <div className="liquid-glass-strong" style={{ borderRadius: 16, padding: 20, border: '1px solid rgba(255,255,255,0.2)', marginBottom: 14 }}>
            <div style={{ display: 'inline-block', background: '#fff', color: '#000', fontFamily: "'Barlow',sans-serif", fontWeight: 600, fontSize: 10, borderRadius: 20, padding: '2px 10px', marginBottom: 8 }}>{activePlan.badge}</div>
            <div style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>{activePlan.subheading}</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 14 }}>
              <span style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 34, color: '#fff' }}>{activePlan.price}</span>
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', fontFamily: "'Barlow',sans-serif", fontWeight: 300 }}>{activePlan.period}</span>
            </div>
            {activePlan.features.map(f => (
              <div key={f.text} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
                <span style={{ fontSize: 11, color: f.highlight ? '#4ade80' : 'rgba(255,255,255,0.5)' }}>✓</span>
                <span style={{ fontFamily: "'Barlow',sans-serif", fontWeight: f.highlight ? 400 : 300, fontSize: 12, color: f.highlight ? '#fff' : 'rgba(255,255,255,0.65)' }}>{f.text}</span>
              </div>
            ))}
          </div>
        )}

        <button onClick={onUpgrade} style={btn(true)}
          onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'}
          onMouseLeave={e => e.currentTarget.style.transform = ''}>
          {activePlan?.cta}
        </button>

        <div style={{ textAlign: 'center', marginTop: 10, marginBottom: 4 }}>
          <span style={{ fontFamily: "'Barlow',sans-serif", fontSize: 12, color: 'rgba(74,222,128,0.6)', fontWeight: 300 }}>
            ✓ Full refund if not satisfied · Cancel anytime
          </span>
        </div>
        <div style={{ textAlign: 'center', marginTop: 4, marginBottom: 4 }}>
          <span style={{ fontFamily: "'Barlow',sans-serif", fontSize: 11, color: 'rgba(255,255,255,0.15)' }}>
            Stripe integration coming soon
          </span>
        </div>

        <button onClick={onClose} style={{ ...btn(false), marginTop: 4 }}
          onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.7)'}
          onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.4)'}>
          Maybe later
        </button>
      </div>
    </div>
  )
}
