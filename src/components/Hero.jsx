import AddressSearch from './AddressSearch'
import { scrollTo } from '../lib/appHelpers'

export default function Hero({ onSearch, loading, onShowDemo, user, onOpenAuth }) {
  return (
    <section id="hero" style={{ position: 'relative', overflow: 'hidden', background: '#060d1c', minHeight: 'min(1000px, 100svh)', height: 'auto', zIndex: 0 }}>

      {/* Static city background layers */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'url(/hero-sky.jpg)', backgroundSize: 'cover', backgroundPosition: 'center 60%' }} />
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'url(/hero-near.jpg)', backgroundSize: 'cover', backgroundPosition: 'center 60%' }} />
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '55%', backgroundImage: 'url(/hero-far.webp)', backgroundSize: '80% auto', backgroundPosition: 'center bottom', backgroundRepeat: 'no-repeat', mixBlendMode: 'multiply' }} />
      </div>

      {/* Bottom gradient — fades into page */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 280, background: 'linear-gradient(to top, #000 30%, transparent)', zIndex: 2, pointerEvents: 'none' }} />

      <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', maxWidth: 900, margin: '0 auto', padding: 'clamp(100px, 20vw, 150px) 20px 80px' }}>
        <div className="liquid-glass" style={{ borderRadius: 40, display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 16px', marginBottom: 28 }}>
          <span style={{ background: '#fff', color: '#000', fontSize: 11, fontFamily: "'Barlow',sans-serif", fontWeight: 600, borderRadius: 20, padding: '2px 8px' }}>New</span>
          <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, fontFamily: "'Barlow',sans-serif", fontWeight: 300 }}>Introducing AI-powered area intelligence.</span>
        </div>
        <h1 style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 'clamp(3rem,9vw,6rem)', color: '#fff', lineHeight: 0.88, letterSpacing: '-0.03em', marginBottom: 28 }}>
          Is This City Worth Moving To?
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 16, fontFamily: "'Barlow',sans-serif", fontWeight: 300, maxWidth: 540, lineHeight: 1.7, marginBottom: 40 }}>
          Run a full neighbourhood intelligence report — investment score, climate risk, school ratings, cost of living, and an AI verdict. Any Canadian city, in 30 seconds.
        </p>
        <div style={{ width: '100%', maxWidth: 600 }}>
          <AddressSearch onSearch={onSearch} loading={loading} />
          {!user && (
            <p style={{ marginTop: 12, fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 13, color: 'rgba(255,255,255,0.45)', textAlign: 'center', lineHeight: 1.6 }}>
              <span onClick={onOpenAuth} style={{ color: '#fff', textDecoration: 'underline', textUnderlineOffset: 3, cursor: 'pointer' }}>Create a free account</span> to run your first search →
            </p>
          )}
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 24, flexWrap: 'wrap', justifyContent: 'center' }}>
          {[['1,737+','Canadian Cities'],['4,800+','Reports this month'],['<30s','Analysis time']].map(([val, lbl]) => (
            <div key={lbl} className="liquid-glass" style={{ borderRadius: 40, padding: '7px 16px', display: 'flex', alignItems: 'center', gap: 7 }}>
              <span style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 17, color: '#fff' }}>{val}</span>
              <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, fontFamily: "'Barlow',sans-serif", fontWeight: 300 }}>{lbl}</span>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 20 }}>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
            <button onClick={onShowDemo} style={{ display: 'inline-block', background: 'none', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 10, padding: '10px 20px', cursor: 'pointer', fontFamily: "'Barlow',sans-serif", fontWeight: 400, fontSize: 13, color: 'rgba(255,255,255,0.65)', transition: 'all 0.2s', textDecoration: 'none' }}
              onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.4)' }}
              onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.65)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)' }}>
              See a sample report →
            </button>
            <button onClick={() => scrollTo('pricing')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 13, color: 'rgba(255,255,255,0.25)', textDecoration: 'underline', textUnderlineOffset: 3, padding: '4px 8px', transition: 'color 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.55)'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.25)'}>
              view pricing →
            </button>
          </div>
        </div>
        <div style={{ position: 'absolute', bottom: 28, left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, cursor: 'pointer', opacity: 0.4 }} onClick={() => scrollTo('how-it-works')}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M8 3v10M3 9l5 5 5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', fontFamily: "'Barlow',sans-serif", letterSpacing: '0.12em', textTransform: 'uppercase' }}>Scroll</span>
        </div>
      </div>
    </section>
  )
}
