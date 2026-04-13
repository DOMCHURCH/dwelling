import { memo } from 'react'
import { useScrollReveal } from '../../hooks/useScrollReveal'

const ProShowcase = memo(function ProShowcase({ onUpgrade }) {
  const revealRef = useScrollReveal({ y: 32, opacity: 0, duration: 0.75, stagger: 0.13, selector: '.pro-card', start: 'top bottom' })
  return (
    <section style={{ padding: '80px 24px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div>
          <div className="liquid-glass" style={{ borderRadius: 40, display: 'inline-flex', padding: '5px 14px', fontSize: 11, color: 'rgba(255,255,255,0.5)', fontFamily: "'Barlow',sans-serif", letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 16 }}>Pro Features</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 40 }}>
          <h2 style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 'clamp(2rem,5vw,3.5rem)', color: '#fff', lineHeight: 0.9, letterSpacing: '-0.02em' }}>
            The full picture.
          </h2>
          <p style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 14, color: 'rgba(255,255,255,0.4)', maxWidth: 340, lineHeight: 1.7 }}>
            Free shows you the neighbourhood. Pro tells you whether to buy into it.
          </p>
        </div>
        <div ref={revealRef} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 14 }}>

          {/* Investment Analysis card */}
          <div className="liquid-glass pro-card" style={{ borderRadius: 20, padding: 28, border: '1px solid rgba(56,189,248,0.15)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <div className="liquid-glass-strong" style={{ borderRadius: 10, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>📈</div>
              <div>
                <div style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 500, fontSize: 13, color: '#fff' }}>Investment Analysis</div>
                <div style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 1 }}>ROI score, rent yield & outlook</div>
              </div>
              <div style={{ marginLeft: 'auto', background: 'rgba(56,189,248,0.12)', border: '1px solid rgba(56,189,248,0.3)', borderRadius: 20, padding: '3px 10px', fontSize: 10, color: '#38bdf8', fontFamily: "'Barlow',sans-serif", fontWeight: 600 }}>Pro</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 14 }}>
              {[['Rent Yield','5.2%','#4ade80'],['Inv. Score','74/100','#fff'],['Outlook','BULLISH','#4ade80']].map(([label, val, color]) => (
                <div key={label} className="liquid-glass" style={{ borderRadius: 12, padding: '12px 10px', textAlign: 'center' }}>
                  <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6, fontFamily: "'Barlow',sans-serif" }}>{label}</div>
                  <div style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 17, color }}>{val}</div>
                </div>
              ))}
            </div>
            <p style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 1.7, marginBottom: 16 }}>
              Immigration-driven demand and limited new construction support a bullish 3–5 year outlook. Gross yields above national average.
            </p>
            <button onClick={onUpgrade} style={{ width: '100%', padding: '11px', borderRadius: 40, border: 'none', background: '#fff', color: '#000', fontFamily: "'Barlow',sans-serif", fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
              Unlock for $29/mo →
            </button>
          </div>

          {/* Price History card */}
          <div className="liquid-glass pro-card" style={{ borderRadius: 20, padding: 28, border: '1px solid rgba(124,92,252,0.15)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <div className="liquid-glass-strong" style={{ borderRadius: 10, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>📊</div>
              <div>
                <div style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 500, fontSize: 13, color: '#fff' }}>Price History & Projections</div>
                <div style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 1 }}>Market trends & 2-year forecast</div>
              </div>
              <div style={{ marginLeft: 'auto', background: 'rgba(124,92,252,0.12)', border: '1px solid rgba(124,92,252,0.3)', borderRadius: 20, padding: '3px 10px', fontSize: 10, color: '#a78bfa', fontFamily: "'Barlow',sans-serif", fontWeight: 600 }}>Pro</div>
            </div>
            <div style={{ display: 'flex', gap: 20, marginBottom: 14 }}>
              <div><div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4, fontFamily: "'Barlow',sans-serif" }}>Area Avg</div><div style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 22, color: '#fff' }}>$648K</div></div>
              <div><div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4, fontFamily: "'Barlow',sans-serif" }}>Since 2019</div><div style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 22, color: '#4ade80' }}>+41%</div></div>
            </div>
            <div style={{ height: 90, background: 'rgba(124,92,252,0.04)', borderRadius: 10, border: '1px solid rgba(124,92,252,0.1)', marginBottom: 16, position: 'relative', overflow: 'hidden', padding: '12px 8px 8px' }}>
              <svg width="100%" height="100%" viewBox="0 0 260 70" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#7c5cfc" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#7c5cfc" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path d="M0 60 L40 52 L80 44 L110 48 L140 36 L180 24 L210 20 L260 14" fill="none" stroke="#7c5cfc" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
                <path d="M0 60 L40 52 L80 44 L110 48 L140 36 L180 24 L210 20 L260 14 L260 70 L0 70 Z" fill="url(#chartGrad)" />
                <path d="M210 20 L260 8" fill="none" stroke="#b98aff" strokeWidth="2" strokeDasharray="5 3" strokeLinejoin="round" strokeLinecap="round" />
              </svg>
              <div style={{ position: 'absolute', top: 6, right: 10, fontSize: 9, color: '#b98aff', fontFamily: "'Barlow',sans-serif" }}>— projected</div>
            </div>
            <button onClick={onUpgrade} style={{ width: '100%', padding: '11px', borderRadius: 40, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.06)', color: '#fff', fontFamily: "'Barlow',sans-serif", fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
              Unlock for $29/mo →
            </button>
          </div>

          {/* City Comparison card */}
          <div className="liquid-glass pro-card" style={{ borderRadius: 20, padding: 28, border: '1px solid rgba(74,222,128,0.1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <div className="liquid-glass-strong" style={{ borderRadius: 10, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>⚖️</div>
              <div>
                <div style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 500, fontSize: 13, color: '#fff' }}>Side-by-Side Comparison</div>
                <div style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 1 }}>Compare any two cities head-to-head</div>
              </div>
              <div style={{ marginLeft: 'auto', background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.25)', borderRadius: 20, padding: '3px 10px', fontSize: 10, color: '#4ade80', fontFamily: "'Barlow',sans-serif", fontWeight: 600 }}>Pro</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
              {[['Ottawa','Score 68','Balanced'],['Calgary','Score 81','Hot']].map(([city, score, temp]) => (
                <div key={city} className="liquid-glass" style={{ borderRadius: 12, padding: '12px 14px' }}>
                  <div style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 15, color: '#fff', marginBottom: 6 }}>{city}</div>
                  <div style={{ fontFamily: "'Barlow',sans-serif", fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 2 }}>{score}</div>
                  <div style={{ fontFamily: "'Barlow',sans-serif", fontSize: 11, color: temp === 'Hot' ? '#f87171' : '#a78bfa' }}>{temp} Market</div>
                </div>
              ))}
            </div>
            <p style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 1.7, marginBottom: 16 }}>
              Run two cities in parallel and compare investment score, cost of living, climate, and neighbourhood quality side by side.
            </p>
            <button onClick={onUpgrade} style={{ width: '100%', padding: '11px', borderRadius: 40, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.06)', color: '#fff', fontFamily: "'Barlow',sans-serif", fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
              Unlock for $29/mo →
            </button>
          </div>

        </div>
      </div>
    </section>
  )
})

export default ProShowcase
