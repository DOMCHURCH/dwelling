import { memo } from 'react'

const Testimonials = memo(function Testimonials() {
  return (
    <section style={{ padding: '96px 24px' }}>
      <div style={{ maxWidth: 860, margin: '0 auto', textAlign: 'center' }}>
        <div>
          <div className="liquid-glass" style={{ borderRadius: 40, display: 'inline-flex', padding: '5px 14px', fontSize: 11, color: 'rgba(255,255,255,0.5)', fontFamily: "'Barlow',sans-serif", letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 24 }}>Why we built this</div>
        </div>
        <div className="liquid-glass-strong" style={{ borderRadius: 24, padding: '40px 48px', maxWidth: 700, margin: '0 auto' }}>
          <div style={{ fontSize: 32, marginBottom: 20 }}>🏠</div>
          <p style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 'clamp(1.2rem,2.5vw,1.6rem)', color: '#fff', lineHeight: 1.5, marginBottom: 20 }}>
            "I built Dwelling because I couldn't find clear area intelligence when I was apartment hunting. Every tool gave me listing prices — nobody told me whether an area was actually worth moving to."
          </p>
          <div style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 400, fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>— Dom, founder</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 12, marginTop: 24, maxWidth: 700, margin: '24px auto 0' }}>
          {[
            { icon: '📍', text: 'Built for people relocating to a new city' },
            { icon: '📊', text: 'Grounded in real listing data, not AI guesses' },
            { icon: '🇨🇦', text: 'Built for the Canadian market' },
          ].map(({ icon, text }) => (
            <div key={text} className="liquid-glass" style={{ borderRadius: 16, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 20 }}>{icon}</span>
              <span style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>{text}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
})

export default Testimonials
