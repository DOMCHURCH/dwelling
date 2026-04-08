import { memo } from 'react'
import { useScrollReveal } from '../../hooks/useScrollReveal'

const Partners = memo(function Partners() {
  const partners = ['Realtor.ca', 'StatCan', 'Open-Meteo', 'OpenStreetMap', 'Fraser Institute', 'Dwelling AI']
  const sectionRef = useScrollReveal({ y: 24, opacity: 0, duration: 0.8 })
  const partnersRef = useScrollReveal({ y: 0, opacity: 0, duration: 0.6, stagger: 0.07, selector: 'span.partner-name' })
  return (
    <section style={{ padding: '64px 24px' }}>
      <div ref={sectionRef} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div className="liquid-glass" style={{ borderRadius: 40, padding: '4px 14px', fontSize: 11, color: 'rgba(255,255,255,0.5)', fontFamily: "'Barlow',sans-serif", letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 28 }}>
          Powered by 16+ official data sources
        </div>
        <div ref={partnersRef} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 32 }}>
          {partners.map(name => (
            <span key={name} className="partner-name" style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 26, color: 'rgba(255,255,255,0.7)', transition: 'color 0.2s', cursor: 'default' }}
              onMouseEnter={e => e.currentTarget.style.color = '#fff'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.7)'}>{name}</span>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 24, marginTop: 32, flexWrap: 'wrap', justifyContent: 'center' }}>
          {[
            { icon: '🏆', text: 'No brokerage agenda — unbiased intelligence' },
            { icon: '🔒', text: 'Searches never stored or sold' },
            { icon: '⚡', text: 'Reports in under 30 seconds' },
          ].map(({ icon, text }) => (
            <div key={text} className="liquid-glass" style={{ borderRadius: 40, padding: '6px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 14 }}>{icon}</span>
              <span style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>{text}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
})

export default Partners
