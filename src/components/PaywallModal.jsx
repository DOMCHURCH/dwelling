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
      price: '$9',
      period: '/mo',
      badge: 'Most Popular',
      features: ['Unlimited analyses', 'All data sources', 'AI analysis', 'Priority support'],
      cta: 'Upgrade to Pro — $9/month →',
    },
    {
      id: 'onetime',
      label: '30-Day Pass',
      price: '$18',
      period: 'one time',
      badge: 'Best for relocating',
      features: ['Unlimited analyses for 30 days', 'All data sources', 'AI analysis', 'No subscription needed'],
      cta: 'Get 30-Day Access — $18 →',
    },
  ]

  const activePlan = plans.find(p => p.id === selected)

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div className="liquid-glass-strong" style={{ borderRadius: 24, maxWidth: 480, width: '100%', padding: 32, animation: 'fadeUp 0.3s ease' }}>

        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 26, color: '#fff', marginBottom: 8 }}>You have used your 10 free analyses</div>
          <p style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>Choose how you want to continue.</p>
        </div>

        <div className="liquid-glass" style={{ borderRadius: 14, padding: '14px 16px', marginBottom: 16 }}>
          <div style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 11, color: 'rgba(255,255,255,0.3)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Free — $0/mo</div>
          {['10 analyses/month', 'All data sources', 'AI analysis'].map(f => (
            <div key={f} style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>✓ {f}</div>
          ))}
        </div>

        <div className="liquid-glass" style={{ borderRadius: 40, padding: 4, display: 'flex', marginBottom: 16 }}>
          {plans.map(p => (
            <button key={p.id} onClick={() => setSelected(p.id)}
              style={{ flex: 1, padding: '8px 4px', borderRadius: 36, border: 'none', cursor: 'pointer', fontFamily: "'Barlow',sans-serif", fontSize: 12, fontWeight: 500, transition: 'background 0.2s, color 0.2s', background: selected === p.id ? '#fff' : 'transparent', color: selected === p.id ? '#000' : 'rgba(255,255,255,0.4)' }}>
              {p.label}
            </button>
          ))}
        </div>

        {activePlan && (
          <div className="liquid-glass-strong" style={{ borderRadius: 16, padding: 20, border: '1px solid rgba(255,255,255,0.2)', marginBottom: 16 }}>
            <div style={{ display: 'inline-block', background: '#fff', color: '#000', fontFamily: "'Barlow',sans-serif", fontWeight: 600, fontSize: 10, borderRadius: 20, padding: '2px 10px', marginBottom: 10 }}>{activePlan.badge}</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 14 }}>
              <span style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 36, color: '#fff' }}>{activePlan.price}</span>
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', fontFamily: "'Barlow',sans-serif", fontWeight: 300 }}>{activePlan.period}</span>
            </div>
            {activePlan.features.map(f => (
              <div key={f} style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 12, color: '#fff', marginBottom: 6 }}>✓ {f}</div>
            ))}
          </div>
        )}

        <button onClick={onUpgrade} style={btn(true)}
          onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'}
          onMouseLeave={e => e.currentTarget.style.transform = ''}>
          {activePlan?.cta}
        </button>

        <div style={{ textAlign: 'center', marginTop: 10 }}>
          <span style={{ fontFamily: "'Barlow',sans-serif", fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>
            Stripe integration coming soon
          </span>
        </div>

        <button onClick={onClose} style={{ ...btn(false), marginTop: 8 }}
          onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.7)'}
          onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.4)'}>
          Maybe later
        </button>
      </div>
    </div>
  )
}
