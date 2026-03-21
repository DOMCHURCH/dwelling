import { useState, useEffect, useRef, memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import AddressSearch from './components/AddressSearch'
import LoadingState from './components/LoadingState'
import Dashboard from './components/Dashboard'
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
import { IMG } from './images'

const FREE_LIMIT = 10

// Image paths — served as static files from /public, browser handles
// lazy loading, caching, and async decoding natively.
// IMG imported from images.js

// ─── SECTION BACKGROUND ──────────────────────────────────────────────────────
// Static positioned background — no JS, no repaints on scroll.
// translateZ(0) promotes to GPU compositor layer once, stays there.
const SectionBg = memo(function SectionBg({ src, opacity = 0.22 }) {
  return (
    <>
      <div style={{
        position: 'absolute', inset: 0, zIndex: 0,
        backgroundImage: `url(${src})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        opacity,
        transform: 'translateZ(0)',
        WebkitTransform: 'translateZ(0)',
      }} />
      <div style={{
        position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none',
        background: 'linear-gradient(to bottom,#000 0%,transparent 14%,transparent 86%,#000 100%)',
      }} />
    </>
  )
})

// ─── REVEAL ──────────────────────────────────────────────────────────────────
// CSS class toggle via IntersectionObserver. Zero per-frame JS.
function Reveal({ children, className = '', delay = '', style = {} }) {
  const [ref, inView] = useInView()
  return (
    <div ref={ref} className={`reveal ${delay} ${inView ? 'in-view' : ''} ${className}`} style={style}>
      {children}
    </div>
  )
}
function RevealLeft({ children, delay = '', style = {} }) {
  const [ref, inView] = useInView()
  return (
    <div ref={ref} className={`reveal-left ${delay} ${inView ? 'in-view' : ''}`} style={style}>
      {children}
    </div>
  )
}
function RevealRight({ children, delay = '', style = {} }) {
  const [ref, inView] = useInView()
  return (
    <div ref={ref} className={`reveal-right ${delay} ${inView ? 'in-view' : ''}`} style={style}>
      {children}
    </div>
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

function FAQ() {
  const [open, setOpen] = useState(null)
  return (
    <section id="faq" style={{ padding: '96px 24px', maxWidth: 780, margin: '0 auto', position: 'relative', zIndex: 1 }}>
      <Reveal>
        <span className="liquid-glass" style={{ borderRadius: 40, display: 'inline-flex', padding: '6px 14px', fontSize: 11, color: 'rgba(255,255,255,0.5)', fontFamily: "'Barlow',sans-serif", letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 16 }}>Support</span>
      </Reveal>
      <h2 style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 'clamp(2rem,5vw,3.5rem)', color: '#fff', marginBottom: 40, lineHeight: 0.9, letterSpacing: '-0.02em' }}>
        <BlurText text="Questions, answered." />
      </h2>
      {FAQ_ITEMS.map((item, i) => (
        <Reveal key={i} delay={`reveal-d${Math.min(i % 3 + 1, 3)}`}>
          <div className="liquid-glass" style={{ borderRadius: 16, marginBottom: 8, overflow: 'hidden' }}>
            <button onClick={() => setOpen(open === i ? null : i)}
              style={{ width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', background: 'transparent', border: 'none', cursor: 'pointer', gap: 16 }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <span style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 500, fontSize: 14, color: '#fff', flex: 1 }}>{item.q}</span>
              <span style={{ fontSize: 20, color: 'rgba(255,255,255,0.3)', flexShrink: 0, transition: 'transform 0.15s', transform: open === i ? 'rotate(45deg)' : 'none' }}>+</span>
            </button>
            <AnimatePresence>
              {open === i && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.18 }}>
                  <p style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 14, color: 'rgba(255,255,255,0.6)', lineHeight: 1.8, padding: '0 22px 18px' }}>{item.a}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </Reveal>
      ))}
    </section>
  )
}

// ─── NAVBAR ──────────────────────────────────────────────────────────────────
function Navbar({ user, userRecord, analysesLeft, onSignOut, onHome, onScrollTo }) {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', h, { passive: true })
    return () => window.removeEventListener('scroll', h)
  }, [])
  const low = typeof analysesLeft === 'number' && analysesLeft <= 3
  return (
    <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, padding: '14px 24px', background: scrolled ? 'rgba(0,0,0,0.8)' : 'transparent', backdropFilter: scrolled ? 'blur(16px)' : 'none', WebkitBackdropFilter: scrolled ? 'blur(16px)' : 'none', borderBottom: scrolled ? '1px solid rgba(255,255,255,0.06)' : '1px solid transparent', transition: 'background 0.25s, border-color 0.25s' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <button onClick={onHome} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 22, color: '#fff', padding: 0 }}>
          DW<span style={{ opacity: 0.4 }}>.</span>ELLING
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {user && (
            <>
              <span className="liquid-glass" style={{ borderRadius: 40, padding: '5px 12px', fontSize: 12, fontFamily: "'Barlow',sans-serif", color: userRecord?.is_pro ? '#fbbf24' : low ? '#f87171' : 'rgba(255,255,255,0.5)' }}>
                {userRecord?.is_pro ? '★ Pro' : `${analysesLeft} / ${FREE_LIMIT} left`}
              </span>
              <button onClick={onSignOut} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 12, color: 'rgba(255,255,255,0.3)', padding: '5px 8px', transition: 'color 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.7)'}
                onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.3)'}>
                Sign out
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}

// ─── HERO ────────────────────────────────────────────────────────────────────
function Hero({ onSearch, loading, onScrollTo }) {
  return (
    <section style={{ minHeight: '100vh', position: 'relative', overflow: 'hidden', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {/* Single GPU layer for hero bg. Loading eager — above fold. */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0, transform: 'translateZ(0)', WebkitTransform: 'translateZ(0)' }}>
        <img src={IMG.hero} alt="" width="1920" height="1080"
          style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.42, display: 'block' }}
          loading="eager" decoding="async" fetchPriority="high"
        />
      </div>
      <div style={{ position: 'absolute', inset: 0, zIndex: 1, backgroundImage: 'repeating-linear-gradient(rgba(255,255,255,0.025) 1px,transparent 1px),repeating-linear-gradient(90deg,rgba(255,255,255,0.025) 1px,transparent 1px)', backgroundSize: '60px 60px' }} />
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 220, background: 'linear-gradient(to bottom,#000,transparent)', zIndex: 2 }} />
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 300, background: 'linear-gradient(to top,#000,transparent)', zIndex: 2 }} />

      <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', maxWidth: 900, margin: '0 auto', padding: '128px 24px 96px' }}>
        {/* Simple CSS fade-in on mount — no framer hooks */}
        <div style={{}}>
          <div className="liquid-glass" style={{ borderRadius: 40, display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 16px', marginBottom: 28 }}>
            <span style={{ background: '#fff', color: '#000', fontSize: 11, fontFamily: "'Barlow',sans-serif", fontWeight: 600, borderRadius: 20, padding: '2px 8px' }}>AI Powered</span>
            <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, fontFamily: "'Barlow',sans-serif", fontWeight: 300 }}>Know what any home is worth — instantly.</span>
          </div>
        </div>

        <h1 style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 'clamp(3rem,9vw,6rem)', color: '#fff', lineHeight: 0.88, letterSpacing: '-0.03em', marginBottom: 28 }}>
          <BlurText text="Property Intelligence. Reimagined." />
        </h1>

        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 16, fontFamily: "'Barlow',sans-serif", fontWeight: 300, maxWidth: 540, lineHeight: 1.7, marginBottom: 40 }}>
          Enter any address in the world. Get real market data, neighborhood scores, climate analysis, and AI-powered investment insights — instantly.
        </p>

        <div style={{ width: '100%', maxWidth: 600 }}>
          <AddressSearch onSearch={onSearch} loading={loading} />
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 20, flexWrap: 'wrap', justifyContent: 'center' }}>
          {[['140M+','US Properties'],['50+','Countries'],['10','Free / Month'],['<30s','Analysis time']].map(([val, lbl]) => (
            <div key={lbl} className="liquid-glass" style={{ borderRadius: 40, padding: '7px 16px', display: 'flex', alignItems: 'center', gap: 7 }}>
              <span style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 17, color: '#fff' }}>{val}</span>
              <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, fontFamily: "'Barlow',sans-serif", fontWeight: 300 }}>{lbl}</span>
            </div>
          ))}
        </div>

        <div style={{ position: 'absolute', bottom: 28, left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, cursor: 'pointer' }} onClick={() => onScrollTo('how-it-works')}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ opacity: 0.3 }}>
            <path d="M8 3v10M3 9l5 5 5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', fontFamily: "'Barlow',sans-serif", letterSpacing: '0.12em', textTransform: 'uppercase' }}>Scroll</span>
        </div>
      </div>
    </section>
  )
}

// ─── HOW IT WORKS ────────────────────────────────────────────────────────────
function HowItWorks() {
  const steps = [
    { num: '01', icon: '📍', title: 'Enter an address', desc: 'Any address in the world. Street, city, country — that is all you need.' },
    { num: '02', icon: '⚡', title: 'We fetch real data', desc: 'Census data, HUD rent estimates, FEMA flood zones, OpenStreetMap scores, live weather — all in real time.' },
    { num: '03', icon: '🧠', title: 'AI builds your report', desc: 'Cerebras Llama synthesizes everything into a full property intelligence report in under 30 seconds.' },
  ]
  return (
    <section id="how-it-works" style={{ padding: '96px 0', position: 'relative', overflow: 'hidden', isolation: 'isolate' }}>
      <SectionBg src={IMG.neighborhood} opacity={0.2} />
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px', position: 'relative', zIndex: 2 }}>
        <Reveal>
          <span className="liquid-glass" style={{ borderRadius: 40, display: 'inline-flex', padding: '6px 14px', fontSize: 11, color: 'rgba(255,255,255,0.5)', fontFamily: "'Barlow',sans-serif", letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 16 }}>How it works</span>
        </Reveal>
        <h2 style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 'clamp(2rem,5vw,3.5rem)', color: '#fff', marginBottom: 12, lineHeight: 0.9, letterSpacing: '-0.02em' }}>
          <BlurText text="Enter an address. Get everything." />
        </h2>
        <Reveal>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 15, fontFamily: "'Barlow',sans-serif", fontWeight: 300, maxWidth: 460, lineHeight: 1.7, marginBottom: 56 }}>
            Just enter an address and get a full property intelligence report in seconds.
          </p>
        </Reveal>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(250px,1fr))', gap: 14 }}>
          {steps.map((s, i) => (
            <Reveal key={i} delay={`reveal-d${i + 1}`}>
              <div className="liquid-glass" style={{ borderRadius: 20, padding: 28, transition: 'transform 0.2s, box-shadow 0.2s', cursor: 'default' }}
                onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02) translateY(-3px)'}
                onMouseLeave={e => e.currentTarget.style.transform = ''}>
                <div style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 56, color: 'rgba(255,255,255,0.06)', lineHeight: 1, marginBottom: 14 }}>{s.num}</div>
                <div className="liquid-glass-strong" style={{ borderRadius: '50%', width: 42, height: 42, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14, fontSize: 17 }}>{s.icon}</div>
                <h3 style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 19, color: '#fff', marginBottom: 10 }}>{s.title}</h3>
                <p style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.7 }}>{s.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── FEATURE ROWS ────────────────────────────────────────────────────────────
function FeatureRows({ onScrollTo }) {
  const rows = [
    { title: 'Know what a home is really worth.', desc: 'AI-powered estimates grounded in census tract data, HUD fair market rents, and real neighborhood context. Not just a number — full price context with confidence levels.', img: IMG.house, reverse: false },
    { title: "Neighborhood intelligence that's actually real.", desc: 'Walk scores, transit scores, school ratings — all derived from real OpenStreetMap data within a 2km radius. Not estimated. Actually counted.', img: IMG.mapPins, reverse: true, glow: true },
    { title: 'Investment analysis you can act on.', desc: 'Rent yield, appreciation outlook, investment score — synthesized from price history, neighborhood trends, and market context. Clear. Honest. Actionable.', img: IMG.priceChart, reverse: false, shimmer: true },
  ]
  return (
    <section id="features" style={{ padding: '64px 0', position: 'relative', overflow: 'hidden', isolation: 'isolate' }}>
      <SectionBg src={IMG.texture} opacity={0.05} />
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px', position: 'relative', zIndex: 2 }}>
        <Reveal>
          <span className="liquid-glass" style={{ borderRadius: 40, display: 'inline-flex', padding: '6px 14px', fontSize: 11, color: 'rgba(255,255,255,0.5)', fontFamily: "'Barlow',sans-serif", letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 16 }}>Features</span>
        </Reveal>
        <h2 style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 'clamp(2rem,5vw,3.5rem)', color: '#fff', marginBottom: 56, lineHeight: 0.9, letterSpacing: '-0.02em' }}>
          <BlurText text="Intelligence at every layer." />
        </h2>
        {rows.map((row, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: row.reverse ? 'row-reverse' : 'row', gap: 56, alignItems: 'center', paddingBottom: 56, paddingTop: i > 0 ? 56 : 0, borderBottom: i < rows.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none', flexWrap: 'wrap' }}>
            <RevealLeft style={{ flex: '1 1 260px' }}>
              <h3 style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 'clamp(1.4rem,3vw,1.9rem)', color: '#fff', marginBottom: 14, lineHeight: 1.1 }}>{row.title}</h3>
              <p style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 14, color: 'rgba(255,255,255,0.5)', lineHeight: 1.8, marginBottom: 22 }}>{row.desc}</p>
              <button onClick={() => onScrollTo('pricing')}
                style={{ borderRadius: 40, padding: '10px 20px', fontSize: 13, fontFamily: "'Barlow',sans-serif", color: '#fff', border: 'none', cursor: 'pointer', transition: 'transform 0.15s, opacity 0.15s', background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)' }}
                onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.04)'}
                onMouseLeave={e => e.currentTarget.style.transform = ''}>
                Get started →
              </button>
            </RevealLeft>
            <RevealRight style={{ flex: '1 1 260px' }}>
              <div className="liquid-glass" style={{ borderRadius: 18, overflow: 'hidden', aspectRatio: '4/3', position: 'relative' }}>
                <img src={row.img} alt="" loading="lazy" decoding="async"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                
                
              </div>
            </RevealRight>
          </div>
        ))}
      </div>
    </section>
  )
}

// ─── FEATURES GRID ───────────────────────────────────────────────────────────
function FeaturesGrid() {
  const cards = [
    { icon: '🌍', title: 'Global Coverage', desc: 'Any address in the world. 50+ countries. Real data wherever you search.' },
    { icon: '📊', title: 'Real Data Sources', desc: 'Census Bureau, HUD, FEMA, OpenStreetMap, Open-Meteo. No made-up numbers.' },
    { icon: '⚡', title: 'Instant Analysis', desc: 'Full property intelligence report in under 30 seconds.' },
    { icon: '🔒', title: 'Secure & Private', desc: 'Your searches are never stored. Bank-grade auth with Supabase.' },
  ]
  return (
    <section style={{ padding: '80px 24px', maxWidth: 1100, margin: '0 auto', position: 'relative', zIndex: 1 }}>
      <Reveal>
        <span className="liquid-glass" style={{ borderRadius: 40, display: 'inline-flex', padding: '6px 14px', fontSize: 11, color: 'rgba(255,255,255,0.5)', fontFamily: "'Barlow',sans-serif", letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 16 }}>Built different</span>
      </Reveal>
      <h2 style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 'clamp(2rem,5vw,3.5rem)', color: '#fff', marginBottom: 40, lineHeight: 0.9, letterSpacing: '-0.02em' }}>
        <BlurText text="Why Dwelling works." />
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 14 }}>
        {cards.map((card, i) => (
          <Reveal key={i} delay={`reveal-d${i % 3 + 1}`}>
            <div className="liquid-glass" style={{ borderRadius: 18, padding: 22, transition: 'transform 0.2s', cursor: 'default' }}
              onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02) translateY(-3px)'}
              onMouseLeave={e => e.currentTarget.style.transform = ''}>
              <div className="liquid-glass-strong" style={{ borderRadius: '50%', width: 42, height: 42, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18, fontSize: 17 }}>{card.icon}</div>
              <h3 style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 17, color: '#fff', marginBottom: 7 }}>{card.title}</h3>
              <p style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.7 }}>{card.desc}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  )
}

// ─── STATS ───────────────────────────────────────────────────────────────────
function Stats() {
  return (
    <section style={{ padding: '80px 24px', maxWidth: 940, margin: '0 auto', position: 'relative', zIndex: 1 }}>
      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 560, height: 560, borderRadius: '50%', background: 'radial-gradient(circle,rgba(99,102,241,0.07) 0%,transparent 65%)', pointerEvents: 'none' }} />
      <Reveal>
        <div className="liquid-glass-strong" style={{ borderRadius: 26, padding: '44px 28px', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 28, textAlign: 'center' }}>
            {[
              { target: 140, suffix: 'M+', label: 'US Properties' },
              { target: 50, suffix: '+', label: 'Countries' },
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
      </Reveal>
    </section>
  )
}

// ─── PRICING ─────────────────────────────────────────────────────────────────
function Pricing({ onUpgrade }) {
  const free = ['10 analyses/month','All data sources','AI property analysis','Neighborhood scores','Climate & weather']
  const pro = ['Unlimited analyses','All data sources','AI property analysis','Neighborhood scores','Climate & weather','Priority support','Early feature access']
  const btnBase = { borderRadius: 40, border: 'none', fontFamily: "'Barlow',sans-serif", fontWeight: 600, fontSize: 13, cursor: 'pointer', transition: 'transform 0.15s, opacity 0.15s' }
  return (
    <section id="pricing" style={{ padding: '80px 24px', maxWidth: 880, margin: '0 auto', position: 'relative', zIndex: 1 }}>
      <Reveal>
        <span className="liquid-glass" style={{ borderRadius: 40, display: 'inline-flex', padding: '6px 14px', fontSize: 11, color: 'rgba(255,255,255,0.5)', fontFamily: "'Barlow',sans-serif", letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 16 }}>Pricing</span>
      </Reveal>
      <h2 style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 'clamp(2rem,5vw,3.5rem)', color: '#fff', marginBottom: 40, lineHeight: 0.9, letterSpacing: '-0.02em' }}>
        <BlurText text="Simple. Transparent. Fair." />
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(270px,1fr))', gap: 14 }}>
        <RevealLeft>
          <div className="liquid-glass" style={{ borderRadius: 18, padding: 28 }}>
            <div style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 21, color: '#fff', marginBottom: 14 }}>Free</div>
            <div style={{ marginBottom: 20, paddingBottom: 20, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <span style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 44, color: '#fff' }}>$0</span>
              <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 15, fontFamily: "'Barlow',sans-serif", fontWeight: 300 }}>/month</span>
            </div>
            <div style={{ marginBottom: 24 }}>{free.map(f => <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 10 }}><span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>✓</span><span style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>{f}</span></div>)}</div>
            <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              style={{ ...btnBase, width: '100%', padding: '12px', background: 'rgba(255,255,255,0.08)', color: '#fff', backdropFilter: 'blur(12px)' }}
              onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'}
              onMouseLeave={e => e.currentTarget.style.transform = ''}>
              Start for free
            </button>
          </div>
        </RevealLeft>
        <RevealRight>
          <div className="liquid-glass-strong" style={{ borderRadius: 18, padding: 28, border: '1px solid rgba(255,255,255,0.2)' }}>
            <div style={{ display: 'inline-block', background: '#fff', color: '#000', fontFamily: "'Barlow',sans-serif", fontWeight: 600, fontSize: 10, borderRadius: 20, padding: '3px 10px', marginBottom: 10 }}>Most Popular</div>
            <div style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 21, color: '#fff', marginBottom: 14 }}>Pro</div>
            <div style={{ marginBottom: 20, paddingBottom: 20, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <span style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 44, color: '#fff' }}>$9</span>
              <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 15, fontFamily: "'Barlow',sans-serif", fontWeight: 300 }}>/month</span>
            </div>
            <div style={{ marginBottom: 24 }}>{pro.map(f => <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 10 }}><span style={{ color: '#fff', fontSize: 12 }}>✓</span><span style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 13, color: '#fff' }}>{f}</span></div>)}</div>
            <button onClick={onUpgrade}
              style={{ ...btnBase, width: '100%', padding: '12px', background: '#fff', color: '#000' }}
              onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'}
              onMouseLeave={e => e.currentTarget.style.transform = ''}>
              Upgrade to Pro →
            </button>
          </div>
        </RevealRight>
      </div>
    </section>
  )
}

// ─── CTA + FOOTER ────────────────────────────────────────────────────────────
function CTAFooter({ onTermsClick, onScrollToTop, onUpgrade }) {
  return (
    <section style={{ padding: '96px 0 0', position: 'relative', overflow: 'hidden', isolation: 'isolate' }}>
      <SectionBg src={IMG.city} opacity={0.28} />
      <div style={{ maxWidth: 860, margin: '0 auto', textAlign: 'center', padding: '0 24px 80px', position: 'relative', zIndex: 2 }}>
        <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: 600, height: 400, borderRadius: '50%', background: 'radial-gradient(circle,rgba(168,85,247,0.07) 0%,transparent 65%)', pointerEvents: 'none' }} />
        <Reveal>
          <h2 style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 'clamp(2.2rem,6vw,4.5rem)', color: '#fff', lineHeight: 0.9, letterSpacing: '-0.03em', marginBottom: 20 }}>
            <BlurText text="Your next property search starts here." />
          </h2>
          <p style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 16, color: 'rgba(255,255,255,0.5)', marginBottom: 36, lineHeight: 1.7 }}>
            Free to start. Instant results. No credit card required.
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={onScrollToTop}
              style={{ borderRadius: 40, padding: '13px 28px', fontFamily: "'Barlow',sans-serif", fontSize: 14, color: '#fff', border: 'none', cursor: 'pointer', background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)', transition: 'transform 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.04)'}
              onMouseLeave={e => e.currentTarget.style.transform = ''}>
              Start for free →
            </button>
            <button onClick={onUpgrade}
              style={{ borderRadius: 40, padding: '13px 28px', fontFamily: "'Barlow',sans-serif", fontWeight: 600, fontSize: 14, background: '#fff', color: '#000', border: 'none', cursor: 'pointer', transition: 'transform 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.04)'}
              onMouseLeave={e => e.currentTarget.style.transform = ''}>
              Upgrade to Pro
            </button>
          </div>
        </Reveal>
      </div>
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '24px', position: 'relative', zIndex: 2 }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
          <div style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 17, color: 'rgba(255,255,255,0.4)' }}>DW<span style={{ opacity: 0.4 }}>.</span>ELLING</div>
          <span style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>© 2025 Dwelling. All rights reserved.</span>
          <div style={{ display: 'flex', gap: 18 }}>
            <button onClick={onTermsClick} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 11, color: 'rgba(255,255,255,0.3)', textDecoration: 'underline', padding: 0, transition: 'color 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.6)'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.3)'}>Terms & Conditions</button>
            <span style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>Not financial advice</span>
          </div>
        </div>
      </footer>
    </section>
  )
}

// ─── APP ─────────────────────────────────────────────────────────────────────
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

      // Area intelligence: fetch bulk listings + local news in parallel
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
      const areaMetrics = aggregateListings(bulkListings)
      const areaRiskScore = computeRiskScore(areaMetrics, null)
      const marketTemperature = getMarketTemperature(areaMetrics)

      const realData = { neighborhoodScores, censusData, fmr, floodZone, riskData, areaMetrics, areaRiskScore, marketTemperature, newsData, isAreaMode }
      const ai = await analyzeProperty(geo, weather, climate, knownFacts ?? {}, realData); setLoadStep(4)
      setResult({ geo, weather, climate, ai, knownFacts: knownFacts ?? {}, realData, isAreaMode })
    } catch (err) {
      console.error(err)
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

  if (!user) return <AuthModal onAuth={handleAuth} />

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
          {result && !loading && <Dashboard data={result} onRecalculate={handleRecalculate} />}
        </div>
      ) : (
        <div style={{ position: 'relative', zIndex: 1 }}>
          <Hero onSearch={handleSearch} loading={loading} onScrollTo={scrollTo} />
          <HowItWorks />
          <FeatureRows onScrollTo={scrollTo} />
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
