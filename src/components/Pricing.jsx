import { memo, useState, useCallback } from 'react'
import { getAuthToken } from '../lib/localAuth'
import { useScrollReveal } from '../../hooks/useScrollReveal'
import PricingCard, { PRICING_FREE, PRICING_PRO, BusinessCard } from './PricingCard'

const Pricing = memo(function Pricing({ onUpgrade }) {
  const headRef = useScrollReveal({ y: 28, opacity: 0, duration: 0.85, ease: 'power3.out' })
  const cardsRef = useScrollReveal({ y: 40, opacity: 0, duration: 0.7, stagger: 0.15, selector: '.pricing-card-anim' })
  const [annual, setAnnual] = useState(false)
  const monthlyPrice = 29
  const annualPrice = 228
  const displayPrice = annual ? 12 : monthlyPrice

  return (
    <section id="pricing" style={{ position: 'relative', overflow: 'hidden', padding: 'clamp(80px, 10vw, 120px) 20px' }}>
      <video autoPlay muted loop playsInline
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.1, zIndex: 0, willChange: 'transform' }}>
        <source src="/pricing-bg.webm" type="video/webm" />
      </video>
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, #000 0%, rgba(0,0,0,0.6) 30%, rgba(0,0,0,0.6) 70%, #000 100%)', zIndex: 1 }} />
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 80% 60% at 50% 50%, rgba(56,189,248,0.07) 0%, transparent 70%)', zIndex: 1 }} />

      <div ref={headRef} style={{ position: 'relative', zIndex: 2, maxWidth: 900, margin: '0 auto', textAlign: 'center' }}>
        <div className="liquid-glass" style={{ borderRadius: 40, display: 'inline-flex', padding: '5px 14px', fontSize: 11, color: 'rgba(255,255,255,0.5)', fontFamily: "'Barlow',sans-serif", letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 20 }}>Pricing</div>

        <h2 style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 'clamp(2.2rem,5vw,3.8rem)', color: '#fff', marginBottom: 12, lineHeight: 0.95, letterSpacing: '-0.02em' }}>
          Know before you move.
        </h2>
        <p style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 16, color: 'rgba(255,255,255,0.45)', marginBottom: 56, lineHeight: 1.7, maxWidth: 500, margin: '0 auto 56px' }}>
          Start free. Upgrade when you need the full picture — Pro pays for itself the moment it helps you avoid the wrong neighbourhood.
        </p>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 40 }}>
          <span style={{ fontFamily: "'Barlow',sans-serif", fontSize: 13, color: annual ? 'rgba(255,255,255,0.35)' : '#fff', fontWeight: 400 }}>Monthly</span>
          <button
            onClick={() => setAnnual(a => !a)}
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
          <span style={{ fontFamily: "'Barlow',sans-serif", fontSize: 13, color: annual ? '#fff' : 'rgba(255,255,255,0.35)', fontWeight: 400 }}>
            Annual
            <span style={{ marginLeft: 6, background: 'rgba(56,189,248,0.15)', border: '1px solid rgba(56,189,248,0.3)', borderRadius: 20, padding: '2px 8px', fontSize: 11, color: '#38bdf8' }}>Save 37%</span>
          </span>
        </div>

        <div ref={cardsRef} style={{ display: 'flex', gap: 24, justifyContent: 'center', flexWrap: 'wrap', alignItems: 'center' }}>
          <PricingCard
            plan="Free" price="0" desc="Good for exploring"
            features={PRICING_FREE}
            cta="Continue with Free"
            onCta={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            popular={false}
          />
          <PricingCard
            plan="Pro" price={String(displayPrice)} desc={annual ? "Billed $228/year — cancel anytime" : "Full intelligence, no limits"}
            priceLabel={annual ? '/mo · billed yearly' : '/month'}
            features={PRICING_PRO}
            cta={annual ? `Get Pro — $228/year →` : "Upgrade to Pro →"}
            onCta={onUpgrade}
            popular={true}
            annualSavings={annual}
          />
          <BusinessCard annual={annual} onCta={() => {
            window.location.href = 'mailto:01dominique.c@gmail.com?subject=Dwelling Business Plan — Early Access'
          }} />
        </div>
      </div>
    </section>
  )
})

export default Pricing
