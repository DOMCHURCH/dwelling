import { memo } from 'react'
import { useScrollReveal } from '../../hooks/useScrollReveal'
import Section from './Section'
import HoverGroup from './HoverGroup'

const HowItWorks = memo(function HowItWorks() {
  const steps = [
    { num: '01', icon: '📍', title: 'Enter any Canadian city', desc: 'Type a city name — no street address needed. Our city dropdown covers every major Canadian market from Halifax to Victoria.' },
    { num: '02', icon: '⚡', title: 'We pull 16+ live data sources', desc: 'MLS listings, days on market, census demographics, climate risk, school ratings, crime data, walkability, and investment signals — all in real time.' },
    { num: '03', icon: '🧠', title: 'AI builds your intelligence report', desc: 'Our AI synthesizes everything into a stability score, AI verdict, investment outlook, school ratings, crime data, and climate risk — in under 30 seconds.' },
  ]
  const headRef = useScrollReveal({ y: 32, opacity: 0, duration: 0.9, ease: 'power3.out' })
  const stepsRef = useScrollReveal({ y: 40, opacity: 0, duration: 0.7, stagger: 0.15, selector: '.how-step', delay: 0.1 })

  return (
    <Section style={{ minHeight: 'auto', padding: 'clamp(60px, 10vw, 128px) 20px' }}>
      <div style={{ maxWidth: 900, margin: '0 auto', textAlign: 'center' }} id="how-it-works">
        <div ref={headRef}>
          <div className="liquid-glass" style={{ borderRadius: 40, display: 'inline-flex', padding: '5px 14px', fontSize: 11, color: 'rgba(255,255,255,0.5)', fontFamily: "'Barlow',sans-serif", letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 16 }}>How It Works</div>
          <h2 style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 'clamp(2rem,5vw,3.5rem)', color: '#fff', marginBottom: 12, lineHeight: 0.9, letterSpacing: '-0.02em' }}>
            <span style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic' }}>Analyze. Understand. Decide.</span>
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 15, fontFamily: "'Barlow',sans-serif", fontWeight: 300, maxWidth: 500, lineHeight: 1.7, marginBottom: 56, margin: '0 auto 56px' }}>
            Enter any city or neighbourhood. Our AI instantly processes listing data, demographics, risk scores, and market trends.
          </p>
        </div>
        <div ref={stepsRef}>
          <HoverGroup steps={steps} />
        </div>
      </div>
    </Section>
  )
})

export default HowItWorks
