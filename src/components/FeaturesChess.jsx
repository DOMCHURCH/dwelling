import { memo } from 'react'
import { useScrollReveal } from '../../hooks/useScrollReveal'
import { scrollTo } from '../lib/appHelpers'

const FeaturesChess = memo(function FeaturesChess() {
  const revealRef = useScrollReveal({ y: 0, opacity: 0, duration: 0.6, stagger: 0.12, selector: '.feature-chess-item' })
  const features = [
    {
      title: 'City stability scored. Not guessed.',
      desc: 'We pull active Realtor.ca listings per Canadian city and compute a real stability score — median price, days on market, price volatility, inventory level. Concrete data sourced directly from MLS.',
      stats: [
        { val: 'Live', label: 'Listings analyzed' },
        { val: '<30s', label: 'Analysis time' },
        { val: '100%', label: 'Real MLS data' },
      ],
    },
    {
      title: 'Neighbourhood intelligence — actually real.',
      desc: 'Walkability, transit stops, schools, flood risk, air quality, seismic risk — all derived from OpenStreetMap, StatCan, and USGS within 2km of your target city.',
      stats: [
        { val: '15+', label: 'Data sources' },
        { val: 'StatCan', label: 'Demographics' },
        { val: 'Live', label: 'Market feeds' },
      ],
    },
    {
      title: 'One score. Clear decision.',
      desc: "Following the best-practice recommendation to turn raw indicators into clear, actionable scores — we produce a single Investment Score and Market Verdict so you know exactly what you're looking at.",
      stats: [
        { val: '5', label: 'Verdict levels' },
        { val: '0–100', label: 'Stability score' },
        { val: 'AI', label: 'Synthesized verdict' },
      ],
    },
  ]
  return (
    <section ref={revealRef} id="features" style={{ padding: '96px 24px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div>
          <div className="liquid-glass" style={{ borderRadius: 40, display: 'inline-flex', padding: '5px 14px', fontSize: 11, color: 'rgba(255,255,255,0.5)', fontFamily: "'Barlow',sans-serif", letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 16 }}>Capabilities</div>
        </div>
        <h2 style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 'clamp(2rem,5vw,3.5rem)', color: '#fff', marginBottom: 56, lineHeight: 0.9, letterSpacing: '-0.02em' }}>
          <span style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic' }}>Unrivaled insights. Simplified.</span>
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {features.map((f, i) => (
            <div key={i} style={{ paddingBottom: 48, paddingTop: i > 0 ? 48 : 0, borderBottom: i < features.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, alignItems: 'center' }}>
                <div>
                  <div>
                    <h3 style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 'clamp(1.4rem,3vw,1.9rem)', color: '#fff', marginBottom: 14, lineHeight: 1.1 }}>{f.title}</h3>
                    <p style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 14, color: 'rgba(255,255,255,0.5)', lineHeight: 1.8, marginBottom: 22 }}>{f.desc}</p>
                    <button onClick={() => scrollTo('pricing')} style={{ borderRadius: 40, padding: '10px 20px', fontSize: 13, fontFamily: "'Barlow',sans-serif", color: '#fff', border: 'none', cursor: 'pointer', background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)', transition: 'transform 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
                      onMouseLeave={e => e.currentTarget.style.opacity = '1'}>Get started →</button>
                  </div>
                </div>
                <div>
                  <div className="liquid-glass" style={{ borderRadius: 18, padding: 32, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                    {f.stats.map((s, j) => (
                      <div key={j} style={{ textAlign: 'center' }}>
                        <div style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 'clamp(1.4rem,2.5vw,2rem)', color: '#fff', lineHeight: 1, marginBottom: 6 }}>{s.val}</div>
                        <div style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 11, color: 'rgba(255,255,255,0.35)', lineHeight: 1.4 }}>{s.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
})

export default FeaturesChess
