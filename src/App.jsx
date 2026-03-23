import { useState, useEffect, useRef, memo, lazy, Suspense } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import AddressSearch from './components/AddressSearch'
import LoadingState from './components/LoadingState'
const Dashboard = lazy(() => import('./components/Dashboard'))
import AuthModal from './components/AuthModal'
import PaywallModal from './components/PaywallModal'
import GlobalBackground from './components/GlobalBackground'
import CompareView from './components/CompareView'
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
const TRIAL_DAYS = 7

const HERO_POSTER = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663463031725/5FNF4QVCkxSRz6ba3cCadG/hero-poster-ZHdSBZKm8ENZMaTu9N2eqV.webp'
const LOGO = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663463031725/5FNF4QVCkxSRz6ba3cCadG/dwelling-logo-3AJU9MMgr8YxSGXWKetVFA.webp'


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
  { q: 'Is Dwelling free to use?', a: 'Free users get 10 analyses per month. Upgrade to Pro for $5/month for unlimited analyses.' },
  { q: 'Does Dwelling work outside the United States?', a: 'Yes — globally supported. Some sources (Census, HUD, FEMA) are US-only, so international analyses rely more on AI estimation and OpenStreetMap.' },
  { q: 'Can I use the results to make a real estate decision?', a: 'No. All outputs are informational only and do not constitute financial, legal, or real estate advice.' },
  { q: 'Does Dwelling store my address searches?', a: 'No. Searches are processed in real time and discarded immediately.' },
  { q: 'What is the "Correct AI Estimates" feature?', a: "Enter known facts — beds, baths, sqft, year built, purchase price — to override AI guesses and trigger a recalculation." },
]

const FAQ = memo(function FAQ() {
  const [open, setOpen] = useState(null)
  return (
    <section id="faq" style={{ padding: 'clamp(56px, 8vw, 96px) 20px', maxWidth: 780, margin: '0 auto' }}>
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
function Navbar({ user, userRecord, analysesLeft, isInTrial, trialDaysLeft, onSignOut, onHome }) {
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
        <div className="liquid-glass nav-links-desktop" style={{ borderRadius: 40, padding: '6px 8px', display: 'flex', alignItems: 'center', gap: 4 }}>
          {links.map(link => (
            <button key={link.id} onClick={() => scrollTo(link.id)} style={{ background: 'transparent', border: 'none', color: '#fff', fontFamily: "'Barlow',sans-serif", fontSize: 13, padding: '8px 14px', cursor: 'pointer', borderRadius: 32, transition: 'background 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>{link.label}</button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {user ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 8 }}>
                {isInTrial && <div style={{ background: 'rgba(255,193,7,0.15)', border: '1px solid rgba(255,193,7,0.3)', borderRadius: 20, padding: '4px 12px', fontSize: 11, color: '#ffc107', fontFamily: "'Barlow',sans-serif", fontWeight: 500 }}>{trialDaysLeft} days left</div>}
                {typeof analysesLeft === 'number' && <div style={{ background: low ? 'rgba(248,113,113,0.15)' : 'rgba(74,222,128,0.15)', border: `1px solid rgba(${low ? '248,113,113' : '74,222,128'},0.3)`, borderRadius: 20, padding: '4px 12px', fontSize: 11, color: low ? '#f87171' : '#4ade80', fontFamily: "'Barlow',sans-serif", fontWeight: 500 }}>{analysesLeft}/{FREE_LIMIT}</div>}
              </div>
              <button onClick={onSignOut} style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff', fontFamily: "'Barlow',sans-serif", fontSize: 12, padding: '6px 14px', cursor: 'pointer', transition: 'background 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}>Sign out</button>
            </>
          ) : (
            <button onClick={onHome} style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff', fontFamily: "'Barlow',sans-serif", fontSize: 12, padding: '6px 14px', cursor: 'pointer', transition: 'background 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}>Sign in</button>
          )}
        </div>
      </div>
    </nav>
  )
}

// ─── HERO ────────────────────────────────────────────────────────────────────
const Hero = memo(function Hero({ onAnalyze, onSignIn, user, loading }) {
  const handleAnalyze = (addr) => {
    if (!addr?.trim()) return
    onAnalyze(addr)
  }
  return (
    <section id="hero" style={{ position: 'relative', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '120px 24px 80px', textAlign: 'center', overflow: 'hidden' }}>
      <video autoPlay muted loop playsInline style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0, opacity: 0.3 }}>
        <source src={HERO_POSTER} type="video/webm" />
      </video>
      <div style={{ position: 'relative', zIndex: 10, maxWidth: 800 }}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <h1 style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 'clamp(2.2rem,10vw,4rem)', color: '#fff', marginBottom: 16, lineHeight: 1, letterSpacing: '-0.02em' }}>Know before you move.</h1>
          <p style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 'clamp(14px,2vw,18px)', color: 'rgba(255,255,255,0.6)', marginBottom: 32, lineHeight: 1.6 }}>
            Instant area intelligence. Real market data. No guesses.
          </p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}>
          <AddressSearch onAnalyze={handleAnalyze} loading={loading} />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }} style={{ marginTop: 32, display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center', alignItems: 'center' }} className="hero-pills">
          <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 24, padding: '8px 16px', fontSize: 12, color: 'rgba(255,255,255,0.5)', fontFamily: "'Barlow',sans-serif" }}>📍 Global coverage</div>
          <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 24, padding: '8px 16px', fontSize: 12, color: 'rgba(255,255,255,0.5)', fontFamily: "'Barlow',sans-serif" }}>⚡ 30 seconds</div>
          <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 24, padding: '8px 16px', fontSize: 12, color: 'rgba(255,255,255,0.5)', fontFamily: "'Barlow',sans-serif" }}>🔒 Private</div>
        </motion.div>
      </div>
    </section>
  )
})

// ─── FEATURES ────────────────────────────────────────────────────────────────
const FeaturesChess = memo(function FeaturesChess() {
  const rows = [
    { title: 'Market stability scored. Not guessed.', desc: 'We aggregate 200+ real listings per area and compute a stability score from price volatility, days on market, and inventory trends. Concrete data, not estimations.' },
    { title: "Neighbourhood intelligence — actually real.", desc: "Walkability, transit, schools, flood risk, air quality, seismic risk — all derived from OpenStreetMap, FEMA, EPA, and USGS within 2km." },
  ]
  return (
    <section id="features" style={{ padding: 'clamp(56px, 8vw, 96px) 24px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <Reveal>
          <div className="liquid-glass" style={{ borderRadius: 40, display: 'inline-flex', padding: '5px 14px', fontSize: 11, color: 'rgba(255,255,255,0.5)', fontFamily: "'Barlow',sans-serif", letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 16 }}>Capabilities</div>
        </Reveal>
        <h2 style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 'clamp(2rem,5vw,3.5rem)', color: '#fff', marginBottom: 'clamp(32px, 5vw, 56px)', lineHeight: 0.9, letterSpacing: '-0.02em' }}>
          <BlurText text="Unrivaled insights. Simplified." />
        </h2>
        {rows.map((row, i) => (
          <div key={i} className="features-row" style={{ paddingBottom: 'clamp(32px, 5vw, 48px)', paddingTop: i > 0 ? 'clamp(32px, 5vw, 48px)' : 0, borderBottom: i < rows.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
            <Reveal>
              <div>
                <h3 style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 'clamp(1.4rem,3vw,1.9rem)', color: '#fff', marginBottom: 14, lineHeight: 1.1 }}>{row.title}</h3>
                <p style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 14, color: 'rgba(255,255,255,0.5)', lineHeight: 1.8, marginBottom: 22 }}>{row.desc}</p>
                <button onClick={() => scrollTo('pricing')} style={{ borderRadius: 40, padding: '10px 20px', fontSize: 13, fontFamily: "'Barlow',sans-serif", color: '#fff', border: 'none', cursor: 'pointer', background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)', transition: 'transform 0.15s, background 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.04)'; e.currentTarget.style.background = 'rgba(255,255,255,0.12)' }}
                  onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.background = 'rgba(255,255,255,0.08)' }}>Get started →</button>
              </div>
            </Reveal>
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
    <Section style={{ padding: 'clamp(60px, 10vw, 128px) 20px' }}>
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
const PRICING_FREE = [
  { text: '10 analyses/month', locked: false },
  { text: 'Area intelligence reports', locked: false },
  { text: 'Neighbourhood scores', locked: false },
  { text: 'Climate & weather data', locked: false },
  { text: 'Risk & hazard overview', locked: false },
]
const PRICING_PRO = [
  { text: 'Unlimited analyses', highlight: false },
  { text: 'Full investment-grade AI analysis', highlight: true },
  { text: 'Hidden risk & hazard detection', highlight: true },
  { text: 'Price trend & market predictions', highlight: true },
  { text: 'Side-by-side area comparison', highlight: false },
  { text: 'All neighbourhood data', highlight: false },
  { text: 'Priority support', highlight: false },
]

const Pricing = memo(function Pricing({ onUpgrade }) {
  return (
    <section id="pricing" style={{ padding: 'clamp(56px, 8vw, 80px) 20px', maxWidth: 1200, margin: '0 auto' }}>
      <Reveal>
        <div className="liquid-glass" style={{ borderRadius: 40, display: 'inline-flex', padding: '5px 14px', fontSize: 11, color: 'rgba(255,255,255,0.5)', fontFamily: "'Barlow',sans-serif", letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 16 }}>Pricing</div>
      </Reveal>
      <h2 style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 'clamp(2rem,5vw,3.5rem)', color: '#fff', marginBottom: 8, lineHeight: 0.9, letterSpacing: '-0.02em' }}>
        <BlurText text="Know before you move." />
      </h2>
      <p style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 15, color: 'rgba(255,255,255,0.45)', marginBottom: 40, lineHeight: 1.6 }}>
        Start free. Upgrade when you need the full picture.
        <span style={{ display: 'block', marginTop: 6, fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>
          Pro costs less than a coffee for every major location decision you make.
        </span>
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 14 }}>

        {/* Free */}
        <Reveal>
          <div className="liquid-glass" style={{ borderRadius: 18, padding: 28 }}>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 24, color: '#fff', marginBottom: 4 }}>Free</div>
              <div style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>Get started instantly</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
              {PRICING_FREE.map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <span style={{ color: '#4ade80', marginTop: 2, fontSize: 16 }}>✓</span>
                  <span style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>{item.text}</span>
                </div>
              ))}
            </div>
            <button onClick={() => scrollTo('hero')} style={{ width: '100%', borderRadius: 40, padding: '10px 20px', fontSize: 13, fontFamily: "'Barlow',sans-serif", color: '#fff', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', background: 'transparent', transition: 'background 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>Get started</button>
          </div>
        </Reveal>

        {/* Pro */}
        <Reveal delay="reveal-d1">
          <div className="liquid-glass-strong" style={{ borderRadius: 18, padding: 28, position: 'relative', border: '1px solid rgba(74,222,128,0.2)' }}>
            <div style={{ position: 'absolute', top: -12, left: 20, background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.3)', borderRadius: 20, padding: '4px 12px', fontSize: 11, color: '#4ade80', fontFamily: "'Barlow',sans-serif", fontWeight: 500 }}>Most popular</div>
            <div style={{ marginBottom: 20, marginTop: 8 }}>
              <div style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 24, color: '#fff', marginBottom: 4 }}>Pro</div>
              <div style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 13, color: 'rgba(255,255,255,0.4)' }}><span style={{ fontSize: 28, color: '#fff' }}>$5</span>/month</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
              {PRICING_PRO.map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <span style={{ color: item.highlight ? '#4ade80' : 'rgba(255,255,255,0.3)', marginTop: 2, fontSize: 16 }}>✓</span>
                  <span style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 13, color: item.highlight ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.5)' }}>{item.text}</span>
                </div>
              ))}
            </div>
            <button onClick={onUpgrade} style={{ width: '100%', borderRadius: 40, padding: '10px 20px', fontSize: 13, fontFamily: "'Barlow',sans-serif", color: '#000', border: 'none', cursor: 'pointer', background: '#4ade80', transition: 'opacity 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}>Upgrade now</button>
          </div>
        </Reveal>
      </div>
    </section>
  )
})

// ─── HOW IT WORKS ────────────────────────────────────────────────────────────
const HowItWorks = memo(function HowItWorks() {
  const steps = [
    { num: '01', title: 'Enter an address', desc: 'Search any neighbourhood in the world.' },
    { num: '02', title: 'We analyze instantly', desc: '15+ data sources aggregated in real-time.' },
    { num: '03', title: 'Get your report', desc: 'Market trends, risks, and neighbourhood scores.' },
  ]
  return (
    <section id="how-it-works" style={{ padding: 'clamp(56px, 8vw, 96px) 24px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <Reveal>
          <div className="liquid-glass" style={{ borderRadius: 40, display: 'inline-flex', padding: '5px 14px', fontSize: 11, color: 'rgba(255,255,255,0.5)', fontFamily: "'Barlow',sans-serif", letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 16 }}>Process</div>
        </Reveal>
        <h2 style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 'clamp(2rem,5vw,3.5rem)', color: '#fff', marginBottom: 'clamp(32px,5vw,56px)', lineHeight: 0.9, letterSpacing: '-0.02em' }}>
          <BlurText text="Three steps to clarity." />
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 24 }} className="how-it-works-grid">
          {steps.map((step, i) => (
            <Reveal key={i} delay={`reveal-d${i % 3 + 1}`}>
              <div style={{ paddingLeft: 16 }}>
                <div style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 'clamp(2.4rem,6vw,3.2rem)', color: 'rgba(255,255,255,0.08)', lineHeight: 1, marginBottom: 8 }}>{step.num}</div>
                <h3 style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 'clamp(1.2rem,2.5vw,1.5rem)', color: '#fff', marginBottom: 8, lineHeight: 1.2 }}>{step.title}</h3>
                <p style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.7 }}>{step.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
})

// ─── MAIN APP ────────────────────────────────────────────────────────────────
export default function App() {
  const [page, setPage] = useState('home')
  const [authOpen, setAuthOpen] = useState(false)
  const [termsOpen, setTermsOpen] = useState(false)
  const [user, setUser] = useState(null)
  const [userRecord, setUserRecord] = useState(null)
  const [analysesLeft, setAnalysesLeft] = useState(FREE_LIMIT)
  const [isInTrial, setIsInTrial] = useState(false)
  const [trialDaysLeft, setTrialDaysLeft] = useState(TRIAL_DAYS)
  const [dashboardData, setDashboardData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [compareAddress, setCompareAddress] = useState(null)
  const [compareResult, setCompareResult] = useState(null)
  const [loadStep, setLoadStep] = useState(0)
  const [showPaywall, setShowPaywall] = useState(false)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser()
        if (authUser) {
          setUser(authUser)
          const { data: record } = await supabase.from('users').select('*').eq('id', authUser.id).single()
          if (record) {
            setUserRecord(record)
            setAnalysesLeft(record.is_pro ? Infinity : Math.max(0, FREE_LIMIT - (record.analyses_used ?? 0)))
            if (record.trial_started_at) {
              const trialStart = new Date(record.trial_started_at)
              const daysUsed = (Date.now() - trialStart.getTime()) / (1000 * 60 * 60 * 24)
              if (daysUsed < 7) {
                setIsInTrial(true)
                setTrialDaysLeft(Math.max(0, Math.ceil(7 - daysUsed)))
              }
            }
          }
        }
      } catch (err) {
        console.error('Auth check failed:', err)
      }
    }
    checkAuth()
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        setUser(null); setUserRecord(null); setAnalysesLeft(FREE_LIMIT)
        setIsInTrial(false); setPage('home')
      } else if (event === 'SIGNED_IN' && session?.user) {
        setUser(session.user)
        const { data: record } = await supabase.from('users').select('*').eq('id', session.user.id).maybeSingle()
        if (record) {
          setUserRecord(record)
          setAnalysesLeft(record.is_pro ? Infinity : Math.max(0, FREE_LIMIT - (record.analyses_used ?? 0)))
          if (record.trial_started_at) {
            const daysUsed = (Date.now() - new Date(record.trial_started_at).getTime()) / (1000 * 60 * 60 * 24)
            if (daysUsed < 7) { setIsInTrial(true); setTrialDaysLeft(Math.max(0, Math.ceil(7 - daysUsed))) }
          }
        }
        setAuthOpen(false)
      }
    })
    return () => subscription?.unsubscribe()
  }, [])

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

  const runPipeline = async ({ street, city, state, country, freeform, knownFacts = {} }) => {
    const isAreaMode = !street?.trim()
    // Pass freeform through to geocoder so it can search any format
    const geocodeInput = { street: street || '', city: city || '', state: state || '', country: country || '', freeform: freeform || '' }
    const geo = await geocodeStructured(geocodeInput)
    setLoadStep(1)

    // After geocoding, use the resolved values for all downstream calls
    // This ensures comps/news/census get real city+country even if user typed freeform
    const resolvedCity    = geo.userCity    || city    || ''
    const resolvedState   = geo.userState   || state   || ''
    const resolvedCountry = geo.userCountry || country || ''
    const resolvedStreet  = geo.userStreet  || street  || ''

    const postcode = geo.address?.postcode ?? ''
    const [weather, climate, neighborhoodScores] = await Promise.all([
      getCurrentWeather(geo.lat, geo.lon),
      getClimateNormals(geo.lat, geo.lon),
      getNeighborhoodScores(geo.lat, geo.lon),
    ])
    setLoadStep(2)
    const [censusData, fmr, floodZone] = await Promise.all([
      getCensusData(resolvedStreet, resolvedCity, resolvedState, resolvedCountry),
      getFairMarketRent(postcode),
      getFloodZone(geo.lat, geo.lon),
    ])
    setLoadStep(3)
    const riskData = await getRiskData({ lat: geo.lat, lon: geo.lon, county: geo.address?.county, state: resolvedState, country: resolvedCountry })
    const [bulkCompsRes, newsRes] = await Promise.allSettled([
      fetch('/api/comps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ city: resolvedCity, state: resolvedState, country: resolvedCountry, lat: geo.lat, lon: geo.lon, mode: 'area' }),
      }).then(r => r.json()).catch(() => null),
      fetch('/api/news', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ city: resolvedCity, state: resolvedState, country: resolvedCountry }),
      }).then(r => r.json()).catch(() => null),
    ])
    const bulkListings = bulkCompsRes.status === 'fulfilled' ? bulkCompsRes.value?.listings || [] : []
    const newsData = newsRes.status === 'fulfilled' ? newsRes.value : null
    const areaMetrics = aggregateListings(bulkListings) || null
    const areaRiskScore = computeRiskScore(areaMetrics, null) || null
    const marketTemperature = getMarketTemperature(areaMetrics) || null
    const realData = { neighborhoodScores, censusData, fmr, floodZone, riskData, areaMetrics, areaRiskScore, marketTemperature, newsData, isAreaMode }
    const ai = await analyzeProperty(geo, weather, climate, knownFacts, realData)
    setLoadStep(4)
    return { geo, weather, climate, ai, knownFacts, realData, isAreaMode }
  }

  const handleAnalyze = async (addressObj) => {
    if (!user) {
      setAuthOpen(true)
      return
    }
    if (analysesLeft <= 0 && !isInTrial && !userRecord?.is_pro) {
      setShowPaywall(true)
      return
    }
    setLoading(true)
    setError(null)
    setLoadStep(0)
    setPage('loading') // immediately hide home page
    try {
      // AddressSearch passes a joined string — pass it straight through as freeform
      // runPipeline / geocodeStructured will handle any format via Nominatim free-form fallback
      const parsed = typeof addressObj === 'string'
        ? { street: '', city: addressObj.trim(), state: '', country: '', freeform: addressObj.trim(), knownFacts: {} }
        : addressObj
      const data = await runPipeline(parsed)
      setDashboardData(data)
      setPage('dashboard')
      // Only decrement for non-trial, non-pro users — server also enforces this
      if (!isInTrial && !userRecord?.is_pro) {
        const newCount = Math.max(0, analysesLeft - 1)
        setAnalysesLeft(newCount)
        await supabase.from('users').update({ analyses_used: (userRecord?.analyses_used ?? 0) + 1 }).eq('id', user.id)
      }
    } catch (err) {
      setPage('home') // go back to home on error
      if (err.message?.includes('limit reached') || err.message?.includes('429')) setShowPaywall(true)
      else setError(err.message || 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  const handleRecalculate = async (corrections) => {
    if (!dashboardData) return
    setLoading(true)
    setError(null)
    try {
      const merged = { ...(dashboardData.knownFacts ?? {}), ...corrections }
      const ai = await analyzeProperty(dashboardData.geo, dashboardData.weather, dashboardData.climate, merged, dashboardData.realData)
      setDashboardData(p => ({ ...p, ai, knownFacts: merged }))
    } catch (err) {
      setError(err.message ?? 'Recalculation failed.')
    } finally {
      setLoading(false)
    }
  }

  const handleCompare = async (addressObj) => {
    if (loading) return
    setLoading(true)
    setError(null)
    setLoadStep(0)
    try {
      const parsed = typeof addressObj === 'string'
        ? { street: '', city: addressObj.trim(), state: '', country: '', knownFacts: {} }
        : addressObj
      const data = await runPipeline(parsed)
      setCompareResult(data)
    } catch (err) {
      if (err.message?.includes('limit reached') || err.message?.includes('429')) setShowPaywall(true)
      else setError(err.message ?? 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

  const handleHome = () => {
    setPage('home')
    setDashboardData(null)
    setCompareAddress(null)
  }

  return (
    <>
      <GlobalBackground />
      <Navbar user={user} userRecord={userRecord} analysesLeft={analysesLeft} isInTrial={isInTrial} trialDaysLeft={trialDaysLeft} onSignOut={handleSignOut} onHome={handleHome} />
      {/* 3 mutually exclusive views: home / loading / dashboard */}
      {!loading && page === 'home' && (
        <>
          <Hero onAnalyze={handleAnalyze} onSignIn={() => setAuthOpen(true)} user={user} loading={loading} />
          <FeaturesChess />
          <FeaturesGrid />
          <HowItWorks />
          <Stats />
          <Testimonials />
          <Pricing onUpgrade={() => setShowPaywall(true)} />
          <FAQ />
        </>
      )}
      {loading && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <LoadingState step={loadStep} />
        </div>
      )}
      {error && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 100, background: 'rgba(248,113,113,0.12)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: 12, padding: '12px 20px' }}>
          <p style={{ fontFamily: "'Barlow',sans-serif", fontSize: 13, color: '#f87171', margin: 0 }}>⚠ {error}</p>
        </div>
      )}
      {!loading && page === 'dashboard' && dashboardData && (
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ maxWidth: 960, margin: '0 auto', padding: 'clamp(80px,12vw,100px) 16px 16px' }}>
            <button onClick={handleHome}
              style={{ borderRadius: 40, padding: '8px 16px', fontSize: 13, fontFamily: "'Barlow',sans-serif", color: 'rgba(255,255,255,0.6)', border: 'none', cursor: 'pointer', background: 'rgba(255,255,255,0.06)', marginBottom: 16 }}>
              ← New search
            </button>
          </div>
          <Suspense fallback={<LoadingState step={0} />}>
            <Dashboard data={dashboardData} onRecalculate={handleRecalculate} />
          </Suspense>
        </div>
      )}
      {compareResult && (
        <CompareView resultA={dashboardData} resultB={compareResult} onBack={() => setCompareResult(null)} onClearB={() => setCompareResult(null)} />
      )}
      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} onSuccess={(u) => { setUser(u); setAuthOpen(false) }} />
      <PaywallModal isOpen={showPaywall} onClose={() => setShowPaywall(false)} onUpgrade={() => { setShowPaywall(false); window.open('https://buy.stripe.com/your-link', '_blank') }} />
      {termsOpen && <TermsModal onClose={() => setTermsOpen(false)} />}
    </>
  )
}
