import { useState, useEffect, useRef, memo, lazy, Suspense } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import AddressSearch from './components/AddressSearch'
import LoadingState from './components/LoadingState'
const Dashboard = lazy(() => import('./components/Dashboard'))
import AuthModal from './components/AuthModal'
import PaywallModal from './components/PaywallModal'
import GlobalBackground from './components/GlobalBackground'
import BlurText from './components/BlurText'
import CountUp from './components/CountUp'
import { useInView } from './hooks/useInView'
import { geocodeStructured } from './lib/nominatim'
import { getCurrentWeather, getClimateNormals } from './lib/weather'
import { analyzeProperty } from './lib/cerebras'
import { aggregateListings, computeRiskScore, getMarketTemperature } from './lib/areaAnalysis'
import { getNeighborhoodScores } from './lib/overpass'
import { getCensusData } from './lib/census'
import { getFairMarketRent, getFloodZone } from './lib/hud'
import { supabase } from './lib/supabase'


const FREE_LIMIT = 10

const HERO_POSTER = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663463031725/5FNF4QVCkxSRz6ba3cCadG/hero-poster-ZHdSBZKm8ENZMaTu9N2eqV.webp'
const LOGO = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663463031725/5FNF4QVCkxSRz6ba3cCadG/dwelling-logo-3AJU9MMgr8YxSGXWKetVFA.webp'
const FEATURE_VALUATION = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663463031725/5FNF4QVCkxSRz6ba3cCadG/feature-valuation-6WBABoG6LMJhpCDnAn9n88.webp'
const FEATURE_NEIGHBORHOOD = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663463031725/5FNF4QVCkxSRz6ba3cCadG/feature-neighborhood-3qp5DELyzSPBFnzNqvRpCf.webp'

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function scrollTo(id) {
  const el = document.getElementById(id)
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function Reveal({ children, delay = '', style = {} }) {
  const [ref, inView] = useInView()
  return <div ref={ref} className={`reveal ${delay} ${inView ? 'in-view' : ''}`} style={style}>{children}</div>
}

function Section({ children, style = {} }) {
  return (
    <section style={{ position: 'relative', overflow: 'hidden', background: '#000', contain: 'layout', ...style }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'rgba(255,255,255,0.04)' }} />
      <div style={{ position: 'relative', zIndex: 10 }}>{children}</div>
    </section>
  )
}

// ─── TERMS MODAL ─────────────────────────────────────────────────────────────
function TermsModal({ onClose }) {
  const sections = [
    { title: '1. Definitions', body: '"Platform" means the Dwelling website. "Company" refers to Dwelling. "User" refers to any individual accessing the Platform.' },
    { title: '2. Services', body: 'The Platform provides automated property intelligence reports based on publicly available data and AI-generated analysis. All Services are provided on an "as-is" basis.' },
    { title: '3. No Professional Advice', body: 'ALL CONTENT IS FOR INFORMATIONAL PURPOSES ONLY. Nothing constitutes financial, real estate, investment, legal, or tax advice. Always consult a qualified licensed professional before making any property-related decision.' },
    { title: '4. Data Accuracy', body: 'The Company makes no warranties regarding accuracy, completeness, or timeliness of any Content. Property valuations are algorithmic estimates only.' },
    { title: '5. User Obligations', body: 'You agree to use the Platform lawfully and not scrape or redistribute Content at scale.' },
    { title: '6. Intellectual Property', body: 'All Platform technology, design, and Content are the exclusive property of the Company.' },
    { title: '7. Limitation of Liability', body: 'TO THE MAXIMUM EXTENT PERMITTED BY LAW, THE COMPANY SHALL NOT BE LIABLE FOR ANY DAMAGES. TOTAL LIABILITY SHALL NOT EXCEED CAD $100.00.' },
    { title: '8. Governing Law', body: 'These Terms are governed by the laws of Ontario, Canada.' },
  ]
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} onClick={e => e.stopPropagation()}
        className="liquid-glass-strong" style={{ borderRadius: 24, maxWidth: 700, width: '100%', height: '80vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 28px', borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
          <span style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 22, color: '#fff' }}>Terms & Conditions</span>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff', fontFamily: "'Barlow',sans-serif", fontSize: 12, padding: '6px 14px', cursor: 'pointer' }}>✕ Close</button>
        </div>
        <div style={{ flex: 1, overflowY: 'scroll', padding: '28px' }}>
          {sections.map(({ title, body }) => (
            <div key={title} style={{ marginBottom: 24 }}>
              <div style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 17, color: '#fff', marginBottom: 8 }}>{title}</div>
              <p style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 1.8 }}>{body}</p>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  )
}

// ─── FAQ ─────────────────────────────────────────────────────────────────────
const FAQ_ITEMS = [
  { q: 'How accurate are the property estimates?', a: 'Estimates are AI-generated using real neighborhood data, census figures, and market trends. Always verify with a licensed appraiser before financial decisions.' },
  { q: 'Where does the data come from?', a: 'OpenStreetMap (neighborhood scores), Open-Meteo (weather/climate), US Census Bureau, HUD (fair market rents), FEMA (flood zones), and Cerebras AI.' },
  { q: 'Is Dwelling free to use?', a: 'Free users get 10 analyses per month. Upgrade to Pro for $9/month for unlimited analyses.' },
  { q: 'Does Dwelling work outside the United States?', a: 'Yes — globally supported. Some sources (Census, HUD, FEMA) are US-only, so international analyses rely more on AI estimation and OpenStreetMap.' },
  { q: 'Can I use the results to make a real estate decision?', a: 'No. All outputs are informational only and do not constitute financial, legal, or real estate advice.' },
  { q: 'Does Dwelling store my address searches?', a: 'No. Searches are processed in real time and discarded immediately.' },
  { q: 'What is the "Correct AI Estimates" feature?', a: "Enter known facts — beds, baths, sqft, year built, purchase price — to override AI guesses and trigger a recalculation." },
]

const FAQ = memo(function FAQ() {
  const [open, setOpen] = useState(null)
  return (
    <section id="faq" style={{ padding: '96px 24px', maxWidth: 780, margin: '0 auto' }}>
      <Reveal>
        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 40, display: 'inline-flex', padding: '5px 14px', fontSize: 11, color: 'rgba(255,255,255,0.5)', fontFamily: "'Barlow',sans-serif", letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 16 }}>Support</div>
      </Reveal>
      <h2 style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 'clamp(2rem,5vw,3.5rem)', color: '#fff', marginBottom: 40, lineHeight: 0.9, letterSpacing: '-0.02em' }}>
        <BlurText text="Questions, answered." />
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {FAQ_ITEMS.map((item, i) => (
          <div key={i} className="liquid-glass" style={{ borderRadius: 18, overflow: 'hidden' }}>
            <button onClick={() => setOpen(open === i ? null : i)}
              style={{ width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', background: 'transparent', border: 'none', cursor: 'pointer' }}>
              <span style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 400, fontSize: 14, color: '#fff', flex: 1, paddingRight: 16 }}>{item.q}</span>
              <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 18, transition: 'transform 0.2s', transform: open === i ? 'rotate(180deg)' : 'none', flexShrink: 0 }}>⌄</span>
            </button>
            <AnimatePresence>
              {open === i && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}>
                  <p style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 1.7, padding: '0 22px 18px' }}>{item.a}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </section>
  )
})

// ─── NAVBAR ──────────────────────────────────────────────────────────────────
function Navbar({ user, userRecord, analysesLeft, onSignOut, onHome }) {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const h = () => { const s = window.scrollY > 50; setScrolled(prev => prev === s ? prev : s) }
    window.addEventListener('scroll', h, { passive: true })
    return () => window.removeEventListener('scroll', h)
  }, [])
  const links = [
    { label: 'Features', id: 'features' },
    { label: 'How It Works', id: 'how-it-works' },
    { label: 'Pricing', id: 'pricing' },
    { label: 'FAQ', id: 'faq' },
  ]
  const low = typeof analysesLeft === 'number' && analysesLeft <= 3
  return (
    <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, padding: '14px 24px', background: scrolled ? 'rgba(0,0,0,0.85)' : 'transparent', backdropFilter: scrolled ? 'blur(16px)' : 'none', WebkitBackdropFilter: scrolled ? 'blur(16px)' : 'none', borderBottom: scrolled ? '1px solid rgba(255,255,255,0.06)' : '1px solid transparent', transition: 'background 0.3s, border-color 0.3s' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <button onClick={onHome} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
          <img src={LOGO} alt="Dwelling" style={{ width: 36, height: 36, borderRadius: 8 }} />
          <span style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 20, color: '#fff' }}>Dwelling</span>
        </button>
        <div className="liquid-glass" style={{ borderRadius: 40, padding: '6px 8px', display: 'flex', alignItems: 'center', gap: 4 }}>
          {links.map(link => (
            <button key={link.id} onClick={() => scrollTo(link.id)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'Barlow',sans-serif", fontWeight: 400, fontSize: 13, color: 'rgba(255,255,255,0.8)', padding: '6px 14px', borderRadius: 40, transition: 'background 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.07)'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}>
              {link.label}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {user ? (
            <>
              <span className="liquid-glass" style={{ borderRadius: 40, padding: '5px 12px', fontSize: 12, fontFamily: "'Barlow',sans-serif", color: userRecord?.is_pro ? '#fbbf24' : low ? '#f87171' : 'rgba(255,255,255,0.5)' }}>
                {userRecord?.is_pro ? '★ Pro' : `${analysesLeft} / ${FREE_LIMIT} left`}
              </span>
              <button onClick={onSignOut} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 12, color: 'rgba(255,255,255,0.35)', padding: '5px 8px', transition: 'color 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.7)'}
                onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.35)'}>Sign out</button>
            </>
          ) : (
            <button onClick={onHome} style={{ background: '#fff', color: '#000', border: 'none', cursor: 'pointer', fontFamily: "'Barlow',sans-serif", fontWeight: 600, fontSize: 13, borderRadius: 40, padding: '8px 18px', display: 'flex', alignItems: 'center', gap: 6, transition: 'transform 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.03)'}
              onMouseLeave={e => e.currentTarget.style.transform = ''}>
              Get Started ↗
            </button>
          )}
        </div>
      </div>
    </nav>
  )
}

// ─── HERO ────────────────────────────────────────────────────────────────────
function Hero({ onSearch, loading, onShowDemo }) {
  return (
    <section id="hero" style={{ position: 'relative', overflow: 'hidden', background: 'transparent', height: 1000 }}>
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 350, background: 'linear-gradient(to top, #000 40%, transparent)', zIndex: 2 }} />
      <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', maxWidth: 900, margin: '0 auto', padding: '150px 24px 96px' }}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}>
          <div className="liquid-glass" style={{ borderRadius: 40, display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 16px', marginBottom: 28 }}>
            <span style={{ background: '#fff', color: '#000', fontSize: 11, fontFamily: "'Barlow',sans-serif", fontWeight: 600, borderRadius: 20, padding: '2px 8px' }}>New</span>
            <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, fontFamily: "'Barlow',sans-serif", fontWeight: 300 }}>Introducing AI-powered area intelligence.</span>
          </div>
        </motion.div>
        <h1 style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 'clamp(3rem,9vw,6rem)', color: '#fff', lineHeight: 0.88, letterSpacing: '-0.03em', marginBottom: 28 }}>
          <BlurText text="Know Any Area Before You Move." delay={0.3} />
        </h1>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, delay: 0.8 }}
          style={{ color: 'rgba(255,255,255,0.5)', fontSize: 16, fontFamily: "'Barlow',sans-serif", fontWeight: 300, maxWidth: 540, lineHeight: 1.7, marginBottom: 40 }}>
          Type any city or neighbourhood. Get a stability score, market temperature, AI verdict, and local news — all in seconds.
        </motion.p>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 1.3 }} style={{ width: '100%', maxWidth: 600 }}>
          <AddressSearch onSearch={onSearch} loading={loading} />
        </motion.div>
        <div style={{ display: 'flex', gap: 10, marginTop: 24, flexWrap: 'wrap', justifyContent: 'center' }}>
          {[['100k+','Cities'],['50+','Countries'],['10','Free / Month'],['<30s','Analysis time']].map(([val, lbl]) => (
            <div key={lbl} className="liquid-glass" style={{ borderRadius: 40, padding: '7px 16px', display: 'flex', alignItems: 'center', gap: 7 }}>
              <span style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 17, color: '#fff' }}>{val}</span>
              <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, fontFamily: "'Barlow',sans-serif", fontWeight: 300 }}>{lbl}</span>
            </div>
          ))}
        </div>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, delay: 1.6 }} style={{ marginTop: 20 }}>
          <button onClick={onShowDemo} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 13, color: 'rgba(255,255,255,0.4)', textDecoration: 'underline', textUnderlineOffset: 3, padding: '4px 8px', transition: 'color 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.7)'}
            onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.4)'}>
            or see a sample report →
          </button>
        </motion.div>
        <div style={{ position: 'absolute', bottom: 28, left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, cursor: 'pointer', opacity: 0.4 }} onClick={() => scrollTo('how-it-works')}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M8 3v10M3 9l5 5 5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', fontFamily: "'Barlow',sans-serif", letterSpacing: '0.12em', textTransform: 'uppercase' }}>Scroll</span>
        </div>
      </div>
    </section>
  )
}

// ─── PARTNERS ────────────────────────────────────────────────────────────────
const Partners = memo(function Partners() {
  const partners = ['Redfin', 'Open-Meteo', 'US Census', 'HUD', 'FEMA', 'Cerebras']
  return (
    <section style={{ padding: '64px 24px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div className="liquid-glass" style={{ borderRadius: 40, padding: '4px 14px', fontSize: 11, color: 'rgba(255,255,255,0.5)', fontFamily: "'Barlow',sans-serif", letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 28 }}>
          Powered by leading data sources
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 32 }}>
          {partners.map(name => (
            <span key={name} style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 26, color: 'rgba(255,255,255,0.7)', transition: 'color 0.2s', cursor: 'default' }}
              onMouseEnter={e => e.currentTarget.style.color = '#fff'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.7)'}>{name}</span>
          ))}
        </div>
      </div>
    </section>
  )
})

// ─── HOW IT WORKS ────────────────────────────────────────────────────────────
const HowItWorks = memo(function HowItWorks() {
  const steps = [
    { num: '01', icon: '📍', title: 'Enter a city or neighbourhood', desc: 'Any location in the world. No street address needed — just the area you want to understand.' },
    { num: '02', icon: '⚡', title: 'We pull real market data', desc: 'Active listings, days on market, inventory levels, census demographics, FEMA risk, walkability — all in real time.' },
    { num: '03', icon: '🧠', title: 'AI builds your area report', desc: 'Cerebras AI synthesizes everything into a stability score, market verdict, price trends, and investment outlook in under 30 seconds.' },
  ]
  return (
    <Section style={{ minHeight: 700, padding: '128px 24px' }}>
      <div style={{ maxWidth: 900, margin: '0 auto', textAlign: 'center' }} id="how-it-works">
        <div className="liquid-glass" style={{ borderRadius: 40, display: 'inline-flex', padding: '5px 14px', fontSize: 11, color: 'rgba(255,255,255,0.5)', fontFamily: "'Barlow',sans-serif", letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 16 }}>How It Works</div>
        <h2 style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 'clamp(2rem,5vw,3.5rem)', color: '#fff', marginBottom: 12, lineHeight: 0.9, letterSpacing: '-0.02em' }}>
          <BlurText text="Analyze. Understand. Decide." />
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 15, fontFamily: "'Barlow',sans-serif", fontWeight: 300, maxWidth: 500, lineHeight: 1.7, marginBottom: 56, margin: '0 auto 56px' }}>
          Enter any city or neighbourhood. Our AI instantly processes listing data, demographics, risk scores, and market trends.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 14, textAlign: 'left' }}>
          {steps.map((s, i) => (
            <div key={i} className="liquid-glass" style={{ borderRadius: 20, padding: 28, transition: 'transform 0.2s', cursor: 'default' }}
              onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02) translateY(-3px)'}
              onMouseLeave={e => e.currentTarget.style.transform = ''}>
              <div style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 52, color: 'rgba(255,255,255,0.06)', lineHeight: 1, marginBottom: 14 }}>{s.num}</div>
              <div className="liquid-glass-strong" style={{ borderRadius: '50%', width: 42, height: 42, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14, fontSize: 17 }}>{s.icon}</div>
              <h3 style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 19, color: '#fff', marginBottom: 10 }}>{s.title}</h3>
              <p style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.7 }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </Section>
  )
})

// ─── FEATURES ────────────────────────────────────────────────────────────────
const FeaturesChess = memo(function FeaturesChess() {
  const rows = [
    { title: 'Market stability scored. Not guessed.', desc: 'We aggregate 200+ real listings per area and compute a stability score from price volatility, days on market, and inventory trends. Concrete data, not estimations.', img: FEATURE_VALUATION, reverse: false },
    { title: "Neighbourhood intelligence — actually real.", desc: "Walkability, transit, schools, flood risk, air quality, seismic risk — all derived from OpenStreetMap, FEMA, EPA, and USGS within 2km.", img: FEATURE_NEIGHBORHOOD, reverse: true },
  ]
  return (
    <section id="features" style={{ padding: '96px 24px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <Reveal>
          <div className="liquid-glass" style={{ borderRadius: 40, display: 'inline-flex', padding: '5px 14px', fontSize: 11, color: 'rgba(255,255,255,0.5)', fontFamily: "'Barlow',sans-serif", letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 16 }}>Capabilities</div>
        </Reveal>
        <h2 style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 'clamp(2rem,5vw,3.5rem)', color: '#fff', marginBottom: 56, lineHeight: 0.9, letterSpacing: '-0.02em' }}>
          <BlurText text="Unrivaled insights. Simplified." />
        </h2>
        {rows.map((row, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: row.reverse ? 'row-reverse' : 'row', gap: 56, alignItems: 'center', paddingBottom: 56, paddingTop: i > 0 ? 56 : 0, borderBottom: i < rows.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 260px' }}>
              <h3 style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 'clamp(1.4rem,3vw,1.9rem)', color: '#fff', marginBottom: 14, lineHeight: 1.1 }}>{row.title}</h3>
              <p style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 14, color: 'rgba(255,255,255,0.5)', lineHeight: 1.8, marginBottom: 22 }}>{row.desc}</p>
              <button onClick={() => scrollTo('pricing')} style={{ borderRadius: 40, padding: '10px 20px', fontSize: 13, fontFamily: "'Barlow',sans-serif", color: '#fff', border: 'none', cursor: 'pointer', background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)', transition: 'transform 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.04)'}
                onMouseLeave={e => e.currentTarget.style.transform = ''}>Get started →</button>
            </div>
            <div style={{ flex: '1 1 260px' }}>
              <div className="liquid-glass" style={{ borderRadius: 18, overflow: 'hidden' }}>
                <img src={row.img} alt={row.title} loading="lazy" style={{ width: '100%', height: 'auto', objectFit: 'cover', display: 'block' }} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
})

const FeaturesGrid = memo(function FeaturesGrid() {
  const cards = [
    { icon: '🌍', title: 'Global Coverage', desc: 'Any city or neighbourhood in the world. 50+ countries. Real data wherever you search.' },
    { icon: '📊', title: 'Real Data Sources', desc: 'Census Bureau, HUD, FEMA, Redfin, OpenStreetMap, Open-Meteo. No made-up numbers.' },
    { icon: '⚡', title: 'Instant Analysis', desc: 'Full area intelligence report in under 30 seconds.' },
    { icon: '🔒', title: 'Secure & Private', desc: 'Your searches are never stored. Bank-grade auth with Supabase.' },
  ]
  return (
    <section style={{ padding: '80px 24px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <Reveal>
          <div className="liquid-glass" style={{ borderRadius: 40, display: 'inline-flex', padding: '5px 14px', fontSize: 11, color: 'rgba(255,255,255,0.5)', fontFamily: "'Barlow',sans-serif", letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 16 }}>Why Dwelling</div>
        </Reveal>
        <h2 style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 'clamp(2rem,5vw,3.5rem)', color: '#fff', marginBottom: 40, lineHeight: 0.9, letterSpacing: '-0.02em' }}>
          <BlurText text="The difference is intelligence." />
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 14 }}>
          {cards.map((card, i) => (
            <Reveal key={i} delay={`reveal-d${i % 3 + 1}`}>
              <div className="liquid-glass" style={{ borderRadius: 18, padding: 24, transition: 'transform 0.2s', cursor: 'default' }}
                onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02) translateY(-3px)'}
                onMouseLeave={e => e.currentTarget.style.transform = ''}>
                <div className="liquid-glass-strong" style={{ borderRadius: '50%', width: 42, height: 42, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18, fontSize: 17 }}>{card.icon}</div>
                <h3 style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 17, color: '#fff', marginBottom: 7 }}>{card.title}</h3>
                <p style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.7 }}>{card.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
})

// ─── STATS ───────────────────────────────────────────────────────────────────
const Stats = memo(function Stats() {
  return (
    <Section style={{ padding: '128px 24px' }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        <div className="liquid-glass" style={{ borderRadius: 26, padding: '44px 28px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 28, textAlign: 'center' }}>
            {[
              { target: 15, suffix: '+', label: 'Data sources per report' },
              { target: 100, suffix: 'k+', label: 'Cities covered' },
              { target: 10, suffix: '', label: 'Free / Month' },
              { target: 30, prefix: '<', suffix: 's', label: 'Avg analysis time' },
            ].map(({ target, suffix, prefix, label }) => (
              <div key={label}>
                <div style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 'clamp(2.2rem,5vw,3.8rem)', color: '#fff', lineHeight: 1 }}>
                  <CountUp target={target} suffix={suffix} prefix={prefix || ''} />
                </div>
                <div style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 7 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Section>
  )
})

// ─── WHY WE BUILT THIS ───────────────────────────────────────────────────────
const Testimonials = memo(function Testimonials() {
  return (
    <section style={{ padding: '96px 24px' }}>
      <div style={{ maxWidth: 860, margin: '0 auto', textAlign: 'center' }}>
        <Reveal>
          <div className="liquid-glass" style={{ borderRadius: 40, display: 'inline-flex', padding: '5px 14px', fontSize: 11, color: 'rgba(255,255,255,0.5)', fontFamily: "'Barlow',sans-serif", letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 24 }}>Why we built this</div>
        </Reveal>
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
            { icon: '🌍', text: 'Works anywhere in the world, not just the US' },
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

// ─── PRICING ─────────────────────────────────────────────────────────────────
const PRICING_FREE = ['10 analyses/month','All data sources','Area intelligence reports','Neighbourhood scores','Climate & weather']
const PRICING_PRO = ['Unlimited analyses','All data sources','Area intelligence reports','Neighbourhood scores','Climate & weather','Priority support','Early feature access']
const Pricing = memo(function Pricing({ onUpgrade }) {


  return (
    <section id="pricing" style={{ padding: '80px 24px', maxWidth: 880, margin: '0 auto' }}>
      <Reveal>
        <div className="liquid-glass" style={{ borderRadius: 40, display: 'inline-flex', padding: '5px 14px', fontSize: 11, color: 'rgba(255,255,255,0.5)', fontFamily: "'Barlow',sans-serif", letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 16 }}>Pricing</div>
      </Reveal>
      <h2 style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 'clamp(2rem,5vw,3.5rem)', color: '#fff', marginBottom: 40, lineHeight: 0.9, letterSpacing: '-0.02em' }}>
        <BlurText text="Simple. Transparent. Fair." />
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(270px,1fr))', gap: 14 }}>
        <div className="liquid-glass" style={{ borderRadius: 18, padding: 28 }}>
          <div style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 21, color: '#fff', marginBottom: 14 }}>Free</div>
          <div style={{ marginBottom: 20, paddingBottom: 20, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <span style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 44, color: '#fff' }}>$0</span>
            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 15, fontFamily: "'Barlow',sans-serif", fontWeight: 300 }}>/month</span>
          </div>
          <div style={{ marginBottom: 24 }}>{PRICING_FREE.map(f => <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 10 }}><span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>✓</span><span style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>{f}</span></div>)}</div>
          <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} style={{ width: '100%', borderRadius: 40, padding: '12px', fontFamily: "'Barlow',sans-serif", fontWeight: 600, fontSize: 13, background: 'rgba(255,255,255,0.08)', color: '#fff', border: 'none', cursor: 'pointer', transition: 'transform 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'}
            onMouseLeave={e => e.currentTarget.style.transform = ''}>Start for free</button>
        </div>
        <div className="liquid-glass-strong" style={{ borderRadius: 18, padding: 28, border: '1px solid rgba(255,255,255,0.2)' }}>
          <div style={{ display: 'inline-block', background: '#fff', color: '#000', fontFamily: "'Barlow',sans-serif", fontWeight: 600, fontSize: 10, borderRadius: 20, padding: '3px 10px', marginBottom: 10 }}>Most Popular</div>
          <div style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 21, color: '#fff', marginBottom: 14 }}>Pro</div>
          <div style={{ marginBottom: 20, paddingBottom: 20, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <span style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 44, color: '#fff' }}>$9</span>
            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 15, fontFamily: "'Barlow',sans-serif", fontWeight: 300 }}>/month</span>
          </div>
          <div style={{ marginBottom: 24 }}>{PRICING_PRO.map(f => <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 10 }}><span style={{ color: '#fff', fontSize: 12 }}>✓</span><span style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 13, color: '#fff' }}>{f}</span></div>)}</div>
          <button onClick={onUpgrade} style={{ width: '100%', borderRadius: 40, padding: '12px', fontFamily: "'Barlow',sans-serif", fontWeight: 600, fontSize: 13, background: '#fff', color: '#000', border: 'none', cursor: 'pointer', transition: 'transform 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'}
            onMouseLeave={e => e.currentTarget.style.transform = ''}>Upgrade to Pro →</button>
        </div>
      </div>
    </section>
  )
})

// ─── CTA + FOOTER ────────────────────────────────────────────────────────────
function CTAFooter({ onTermsClick, onScrollToTop, onUpgrade }) {
  return (
    <Section>
      <div style={{ maxWidth: 860, margin: '0 auto', textAlign: 'center', padding: '128px 24px 80px' }}>
        <h2 style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 'clamp(2.2rem,6vw,4.5rem)', color: '#fff', lineHeight: 0.9, letterSpacing: '-0.03em', marginBottom: 20 }}>
          <BlurText text="Your next area decision starts here." />
        </h2>
        <p style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 16, color: 'rgba(255,255,255,0.5)', marginBottom: 36, lineHeight: 1.7 }}>
          Free to start. Instant results. No credit card required.
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button onClick={onScrollToTop} style={{ borderRadius: 40, padding: '13px 28px', fontFamily: "'Barlow',sans-serif", fontSize: 14, color: '#fff', border: 'none', cursor: 'pointer', background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)', transition: 'transform 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.04)'}
            onMouseLeave={e => e.currentTarget.style.transform = ''}>Start for free →</button>
          <button onClick={onUpgrade} style={{ borderRadius: 40, padding: '13px 28px', fontFamily: "'Barlow',sans-serif", fontWeight: 600, fontSize: 14, background: '#fff', color: '#000', border: 'none', cursor: 'pointer', transition: 'transform 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.04)'}
            onMouseLeave={e => e.currentTarget.style.transform = ''}>Upgrade to Pro</button>
        </div>
      </div>
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '24px', position: 'relative', zIndex: 2 }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
          <div style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 17, color: 'rgba(255,255,255,0.4)' }}>Dwelling</div>
          <span style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>© 2026 Dwelling. All rights reserved.</span>
          <div style={{ display: 'flex', gap: 18 }}>
            <button onClick={onTermsClick} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 11, color: 'rgba(255,255,255,0.3)', textDecoration: 'underline', padding: 0, transition: 'color 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.6)'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.3)'}>Terms & Conditions</button>
            <span style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>Not financial advice</span>
          </div>
        </div>
      </footer>
    </Section>
  )
}

// ─── DEMO RESULT (Ottawa, ON — shown before login) ───────────────────────────
const DEMO_RESULT = {
  isAreaMode: true,
  geo: {
    lat: 45.4215, lon: -75.6972,
    displayName: 'Ottawa, Ontario, Canada',
    userCity: 'Ottawa', userCountry: 'Canada', userState: 'Ontario', userStreet: '',
    address: { city: 'Ottawa', state: 'Ontario', country: 'Canada', postcode: 'K1P' },
  },
  weather: {
    current: { temperature_2m: 4, weather_code: 3 },
  },
  climate: null,
  knownFacts: {},
  realData: {
    isAreaMode: true,
    areaMetrics: {
      medianPrice: 649000, avgPrice: 712000, priceRange: [289000, 1850000],
      medianDOM: 22, count: 214, volatility: 0.18,
      slowListingPct: 14, fastListingPct: 31,
    },
    areaRiskScore: 68,
    marketTemperature: 'Balanced',
    neighborhoodScores: {
      walkability: 72, transit: 65, schools: 81, parks: 78, groceries: 84,
    },
    censusData: { medianHouseholdIncome: 94000, medianHomeValue: 620000, ownerPct: 61, renterPct: 39 },
    fmr: { twoBed: 1820 },
    floodZone: { zone: 'X', description: 'Minimal flood risk' },
    riskData: {
      overall: { score: 3.2, label: 'Low' },
      hazards: { flood: 1.1, earthquake: 0.4, wind: 2.8, wildfire: 0.6 },
      airQuality: { pm25Percentile: 28 },
    },
    newsData: {
      articles: [
        { title: 'Ottawa condo market softens as inventory rises in 2025', source: 'Ottawa Citizen', url: '#' },
        { title: 'Centretown sees renewed buyer interest after rate cuts', source: 'CBC Ottawa', url: '#' },
        { title: 'Gatineau vs Ottawa: where first-time buyers are actually buying', source: 'Ottawa Citizen', url: '#' },
      ]
    },
  },
  ai: {
    areaIntelligence: {
      verdict: 'Good',
      stabilityScore: 68,
      marketConditions: 'Ottawa is a balanced market as of early 2025. The government employment base provides a meaningful price floor — federal job stability insulates the market from the volatility seen in Toronto or Vancouver. Median days on market sits at 22, and 31% of listings move within 14 days, signalling genuine buyer demand without the frenzy of a seller's market.',
      priceTrend: 'Prices are flat to modestly down (-2 to -4%) from their 2022 peak, partially recovered through 2024. The $649,000 median reflects a market that corrected without collapsing. Condos have softened more than detached homes, where supply remains tight.',
      investmentOutlook: 'Moderate long-term upside. Immigration-driven population growth and persistent new construction shortfall (~5,000 units/year behind demand) support prices over a 3–5 year horizon. Yield-focused investors should note that HUD-equivalent fair market rent for a 2BR sits around $1,820/month, giving cap rates of approximately 3.2–3.8% on median-priced condos.',
      risks: 'Federal public sector employment is Ottawa's single largest risk factor — any significant government restructuring or remote-work policy shift could reduce housing demand meaningfully. Interest rate sensitivity remains elevated with many mortgages renewing at higher rates through 2025–2026.',
      upsides: 'Stable, recession-resistant employment base. Strong school ratings. Lower price volatility than other major Canadian cities. Growing tech sector (Shopify, Ciena) diversifying the economic base beyond government.',
      liveability: 'High. Walkability scores of 72 in central neighbourhoods, strong parks and greenspace, and consistently ranked among Canada's most liveable cities. Winters are genuinely cold (-15°C average January), which is the most common reason people leave.',
      bestFor: 'Government employees, families prioritising school quality, risk-averse investors, and anyone priced out of Toronto or Vancouver seeking a major Canadian city with career infrastructure.',
    },
    propertyEstimate: { estimatedValue: null, confidenceScore: null, confidenceLevel: 'Area mode — no property estimate' },
    costOfLiving: {
      monthlyBudgetUSD: 3200, groceriesMonthlyUSD: 480, transportMonthlyUSD: 160,
      utilitiesMonthlyUSD: 220, diningOutMonthlyUSD: 340,
    },
    neighborhood: {
      summary: 'Ottawa's central neighbourhoods offer strong urban amenities — walkable to the ByWard Market, Rideau Canal, and Parliament Hill. The Glebe and Westboro are the most sought-after residential areas, with Lower Town and Vanier offering more affordable entry points.',
      highlights: ['Rideau Canal skating and cycling', 'Strong French-English bilingual services', 'Major tech employers: Shopify, Ciena, Nokia'],
    },
    investment: {
      outlook: 'Moderate',
      rentalYield: '3.4%',
      priceGrowth5yr: '+12–18% projected',
      summary: 'Solid long-term hold. Not a high-growth market, but one of the most stable in Canada.',
    },
    localInsights: {
      summary: 'A federal government town with a growing private sector. Best suited to long-term residents rather than short-term flippers.',
    },
    priceHistory: {
      currency: 'CAD',
      years: ['2020','2021','2022','2023','2024','2025'],
      medianPrices: [480000, 580000, 740000, 660000, 630000, 649000],
    },
    riskData: null,
  },
}


export default function App() {
  const [loading, setLoading] = useState(false)
  const [loadStep, setLoadStep] = useState(0)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [showTerms, setShowTerms] = useState(false)
  const [showPaywall, setShowPaywall] = useState(false)
  const [user, setUser] = useState(null)
  const [userRecord, setUserRecord] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [showDemo, setShowDemo] = useState(false)
  const realtimeRef = useRef(null)

  const scrollTo = (id) => {
    const el = document.getElementById(id)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    else window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const subscribeToUserRecord = (userId) => {
    if (realtimeRef.current) supabase.removeChannel(realtimeRef.current)
    const ch = supabase.channel(`user-${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users', filter: `id=eq.${userId}` }, p => { if (p.new) setUserRecord(p.new) })
      .subscribe()
    realtimeRef.current = ch
  }

  const loadUserRecord = async (userId) => {
    const { data } = await supabase.from('users').select('*').eq('id', userId).maybeSingle()
    if (data) { setUserRecord(data) } else {
      let n = 0
      const iv = setInterval(async () => {
        n++
        const { data: r } = await supabase.from('users').select('*').eq('id', userId).maybeSingle()
        if (r) { setUserRecord(r); clearInterval(iv) }
        if (n >= 10) clearInterval(iv)
      }, 600)
    }
    subscribeToUserRecord(userId)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) { setUser(session.user); loadUserRecord(session.user.id) }
      setAuthLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session?.user) { setUser(session.user); loadUserRecord(session.user.id) }
      else { setUser(null); setUserRecord(null); if (realtimeRef.current) supabase.removeChannel(realtimeRef.current) }
    })
    return () => { subscription.unsubscribe(); if (realtimeRef.current) supabase.removeChannel(realtimeRef.current) }
  }, [])

  useEffect(() => {
    if (result) {
      const addr = [result.geo.userStreet, result.geo.userCity, result.geo.userCountry].filter(Boolean).join(', ')
      document.title = `${addr} — Dwelling`
    } else document.title = 'Dwelling — Property Intelligence'
  }, [result])

  const handleAuth = u => { setUser(u); loadUserRecord(u.id) }
  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setUser(null); setUserRecord(null); setResult(null)
    if (realtimeRef.current) supabase.removeChannel(realtimeRef.current)
  }

  const getRiskData = async ({ lat, lon, county, state, country }) => {
    try {
      const res = await fetch('/api/risk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat, lon, county, state, country }),
      })
      if (!res.ok) return null
      return await res.json()
    } catch { return null }
  }

  const handleSearch = async ({ street, city, state, country, knownFacts }) => {
    if (loading) return
    setLoading(true); setError(null); setResult(null); setLoadStep(0)
    const isAreaMode = !street.trim()
    try {
      const geocodeInput = isAreaMode ? { street: '', city, state, country } : { street, city, state, country }
      const geo = await geocodeStructured(geocodeInput); setLoadStep(1)
      const postcode = geo.address?.postcode ?? ''
      const [weather, climate, neighborhoodScores] = await Promise.all([getCurrentWeather(geo.lat, geo.lon), getClimateNormals(geo.lat, geo.lon), getNeighborhoodScores(geo.lat, geo.lon)]); setLoadStep(2)
      const [censusData, fmr, floodZone] = await Promise.all([getCensusData(street, city, state, country), getFairMarketRent(postcode), getFloodZone(geo.lat, geo.lon)]); setLoadStep(3)
      const riskData = await getRiskData({ lat: geo.lat, lon: geo.lon, county: geo.address?.county, state, country }).catch(() => null)

      const [bulkCompsRes, newsRes] = await Promise.allSettled([
        fetch('/api/comps', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ city, state, country, mode: 'area' }),
        }).then(r => r.json()).catch(() => null),
        fetch('/api/news', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ city, state, country }),
        }).then(r => r.json()).catch(() => null),
      ])

      const bulkListings = bulkCompsRes.status === 'fulfilled' ? bulkCompsRes.value?.listings || [] : []
      const newsData = newsRes.status === 'fulfilled' ? newsRes.value : null
      const areaMetrics = aggregateListings(bulkListings) || null
      const areaRiskScore = computeRiskScore(areaMetrics, null) || null
      const marketTemperature = getMarketTemperature(areaMetrics) || null

      const realData = { neighborhoodScores, censusData, fmr, floodZone, riskData, areaMetrics, areaRiskScore, marketTemperature, newsData, isAreaMode }
      const ai = await analyzeProperty(geo, weather, climate, knownFacts ?? {}, realData); setLoadStep(4)
      setResult({ geo, weather, climate, ai, knownFacts: knownFacts ?? {}, realData, isAreaMode })
    } catch (err) {
      if (err.message?.includes('context invalidated')) return
      if (err.message?.includes('limit reached') || err.message?.includes('429')) setShowPaywall(true)
      else setError(err.message ?? 'Something went wrong.')
    } finally { setLoading(false) }
  }

  const handleRecalculate = async corrections => {
    if (!result) return
    setLoading(true); setError(null)
    try {
      const merged = { ...(result.knownFacts ?? {}), ...corrections }
      const ai = await analyzeProperty(result.geo, result.weather, result.climate, merged, result.realData)
      setResult(p => ({ ...p, ai, knownFacts: merged }))
    } catch (err) { setError(err.message ?? 'Recalculation failed.') }
    finally { setLoading(false) }
  }

  const analysesLeft = userRecord ? (userRecord.is_pro ? '∞' : Math.max(0, FREE_LIMIT - (userRecord.analyses_used ?? 0))) : '...'

  if (authLoading) return (
    <div style={{ minHeight: '100vh', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 28, color: '#fff' }}>
        DW<span style={{ opacity: 0.4 }}>.</span>ELLING
      </div>
    </div>
  )

  // Allow unauthenticated users to view the demo
  if (!user && !showDemo) return <AuthModal onAuth={handleAuth} onDemo={() => setShowDemo(true)} />

  if (showDemo) return (
    <div style={{ minHeight: '100vh', background: '#000', display: 'flex', flexDirection: 'column' }}>
      <GlobalBackground />
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, padding: '14px 24px', background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <img src={LOGO} alt="Dwelling" style={{ width: 36, height: 36, borderRadius: 8 }} />
            <span style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 20, color: '#fff' }}>Dwelling</span>
          </div>
          <div className="liquid-glass" style={{ borderRadius: 40, padding: '6px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontFamily: "'Barlow',sans-serif", letterSpacing: '0.08em', textTransform: 'uppercase' }}>Sample Report</span>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ade80', display: 'inline-block' }} />
          </div>
          <button onClick={() => setShowDemo(false)} style={{ background: '#fff', color: '#000', border: 'none', cursor: 'pointer', fontFamily: "'Barlow',sans-serif", fontWeight: 600, fontSize: 13, borderRadius: 40, padding: '8px 18px', transition: 'transform 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.03)'}
            onMouseLeave={e => e.currentTarget.style.transform = ''}>
            Sign up free →
          </button>
        </div>
      </nav>
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '100px 24px 80px', width: '100%', position: 'relative', zIndex: 1 }}>
        <div className="liquid-glass" style={{ borderRadius: 12, padding: '10px 18px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 14 }}>👆</span>
          <p style={{ fontFamily: "'Barlow',sans-serif", fontSize: 13, color: 'rgba(255,255,255,0.6)', fontWeight: 300 }}>This is a real sample report for Ottawa, Ontario. <button onClick={() => setShowDemo(false)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontFamily: "'Barlow',sans-serif", fontSize: 13, textDecoration: 'underline', padding: 0 }}>Sign up free</button> to run your own.</p>
        </div>
        <Suspense fallback={<LoadingState step={0} />}>
          <Dashboard data={DEMO_RESULT} onRecalculate={() => {}} />
        </Suspense>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#000', display: 'flex', flexDirection: 'column' }}>
      <GlobalBackground />
      {showTerms && <TermsModal onClose={() => setShowTerms(false)} />}
      {showPaywall && <PaywallModal onClose={() => setShowPaywall(false)} onUpgrade={() => alert('Stripe coming soon!')} />}
      <Navbar user={user} userRecord={userRecord} analysesLeft={analysesLeft} onSignOut={handleSignOut}
        onHome={() => { setResult(null); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
        onScrollTo={scrollTo} />

      {(result || loading) ? (
        <div style={{ maxWidth: 960, margin: '0 auto', padding: '100px 24px 80px', width: '100%', position: 'relative', zIndex: 1 }}>
          {!loading && result && (
            <div style={{ marginBottom: 22 }}>
              <button onClick={() => setResult(null)}
                style={{ borderRadius: 40, padding: '8px 16px', fontSize: 13, fontFamily: "'Barlow',sans-serif", color: 'rgba(255,255,255,0.6)', border: 'none', cursor: 'pointer', marginBottom: 14, background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(12px)', transition: 'transform 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.04)'}
                onMouseLeave={e => e.currentTarget.style.transform = ''}>
                ← New search
              </button>
              <AddressSearch onSearch={handleSearch} loading={loading} compact />
            </div>
          )}
          {loading && <LoadingState step={loadStep} />}
          {error && (
            <div className="liquid-glass" style={{ borderRadius: 12, padding: '12px 18px', border: '1px solid rgba(248,113,113,0.3)', background: 'rgba(248,113,113,0.08)', marginBottom: 14 }}>
              <p style={{ fontFamily: "'Barlow',sans-serif", fontSize: 13, color: '#f87171' }}>⚠ {error}</p>
            </div>
          )}
          {result && !loading && <Suspense fallback={<LoadingState step={0} />}><Dashboard data={result} onRecalculate={handleRecalculate} /></Suspense>}
        </div>
      ) : (
        <div style={{ position: 'relative', zIndex: 1 }}>
          <Hero onSearch={handleSearch} loading={loading} onShowDemo={() => setShowDemo(true)} />
          <Partners />
          <HowItWorks />
          <FeaturesChess />
          <FeaturesGrid />
          <Stats />
          <Pricing onUpgrade={() => setShowPaywall(true)} />
          <FAQ />
          <CTAFooter
            onTermsClick={() => setShowTerms(true)}
            onScrollToTop={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            onUpgrade={() => setShowPaywall(true)}
          />
        </div>
      )}
    </div>
  )
}
