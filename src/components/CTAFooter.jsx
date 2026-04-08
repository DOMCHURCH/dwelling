import { useScrollReveal } from '../../hooks/useScrollReveal'
import Section from './Section'
import AnimatedTestimonials from './AnimatedTestimonials'

export default function CTAFooter({ onScrollToTop, onUpgrade }) {
  const ctaRef = useScrollReveal({ y: 36, opacity: 0, duration: 1.0, ease: 'power3.out' })
  return (
    <Section>
      <div ref={ctaRef} style={{ maxWidth: 860, margin: '0 auto', textAlign: 'center', padding: 'clamp(60px, 10vw, 128px) 20px 60px' }}>
        <h2 style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 'clamp(2.2rem,6vw,4.5rem)', color: '#fff', lineHeight: 0.9, letterSpacing: '-0.03em', marginBottom: 20 }}>
          <span style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic' }}>Your next area decision starts here.</span>
        </h2>
        <p style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 16, color: 'rgba(255,255,255,0.5)', marginBottom: 28, lineHeight: 1.7 }}>
          Free to start. Instant results. No credit card required.
        </p>
        <AnimatedTestimonials />
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button onClick={onScrollToTop} style={{ borderRadius: 40, padding: '13px 28px', fontFamily: "'Barlow',sans-serif", fontSize: 14, color: '#fff', border: 'none', cursor: 'pointer', background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)', transition: 'transform 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}>Start for free →</button>
          <button onClick={onUpgrade} style={{ borderRadius: 40, padding: '13px 28px', fontFamily: "'Barlow',sans-serif", fontWeight: 600, fontSize: 14, background: '#fff', color: '#000', border: 'none', cursor: 'pointer', transition: 'transform 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}>Upgrade to Pro</button>
        </div>
      </div>
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '24px', position: 'relative', zIndex: 2 }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
          <div style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 17, color: 'rgba(255,255,255,0.4)' }}>Dwelling</div>
          <span style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>© 2026 Dwelling. All rights reserved.</span>
          <div style={{ display: 'flex', gap: 18, alignItems: 'center' }}>
            <a href="https://mail.google.com/mail/?view=cm&to=01dominique.c@gmail.com&su=Dwelling+Support" target="_blank" rel="noopener noreferrer" style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 11, color: 'rgba(255,255,255,0.3)', textDecoration: 'none', transition: 'color 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.6)'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.3)'}>Support</a>
            <a href="/terms" style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 11, color: 'rgba(255,255,255,0.3)', textDecoration: 'underline', transition: 'color 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.6)'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.3)'}>Terms & Conditions</a>
            <a href="https://instagram.com/dwellinghq" target="_blank" rel="noopener noreferrer" style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 11, color: 'rgba(255,255,255,0.3)', textDecoration: 'none', transition: 'color 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.6)'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.3)'}>@dwellinghq</a>
            <span style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>Not financial advice</span>
          </div>
        </div>
      </footer>
    </Section>
  )
}
