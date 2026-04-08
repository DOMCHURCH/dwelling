import { memo } from 'react'
import { useScrollReveal } from '../../hooks/useScrollReveal'
import HoverGroupGrid from './HoverGroupGrid'

const FeaturesGrid = memo(function FeaturesGrid() {
  const gridRef = useScrollReveal({ y: 28, opacity: 0, duration: 0.6, stagger: 0.08, selector: '.feature-grid-card' })
  const cards = [
    { icon: '🍁', title: 'Canada-First', desc: 'Built specifically for Canadian cities. Realtor.ca MLS data, Statistics Canada demographics, and Canadian market context baked in.' },
    { icon: '📊', title: 'Real MLS Data', desc: 'Active listings from Realtor.ca, StatCan NHPI price indices, and Open-Meteo climate normals. No made-up numbers.' },
    { icon: '⚡', title: 'Instant Analysis', desc: 'Full city intelligence report in under 30 seconds — stability score, verdict, market temperature, investment outlook.' },
    { icon: '🔒', title: 'Secure & Private', desc: 'Your searches are never stored. Bank-grade encryption. Searches processed in real time and never retained.' },
  ]
  return (
    <section style={{ padding: '80px 24px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div>
          <div className="liquid-glass" style={{ borderRadius: 40, display: 'inline-flex', padding: '5px 14px', fontSize: 11, color: 'rgba(255,255,255,0.5)', fontFamily: "'Barlow',sans-serif", letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 16 }}>Why Dwelling</div>
        </div>
        <h2 style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 'clamp(2rem,5vw,3.5rem)', color: '#fff', marginBottom: 40, lineHeight: 0.9, letterSpacing: '-0.02em' }}>
          <span style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic' }}>The difference is intelligence.</span>
        </h2>
        <HoverGroupGrid cards={cards} />
      </div>
    </section>
  )
})

export default FeaturesGrid
