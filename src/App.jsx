import { useState, useEffect, useRef, memo, lazy, Suspense } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import AddressSearch from './components/AddressSearch'
import LoadingState from './components/LoadingState'
const Dashboard = lazy(() => import('./components/Dashboard'))
import AuthModal from './components/AuthModal'
import PaywallModal from './components/PaywallModal'
import GlobalBackground from './components/GlobalBackground'
import CompareView from './components/CompareView'
import CountUp from './components/CountUp'
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
      <div onClick={e => e.stopPropagation()}
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
      </div>
    </div>
  )
}

// ─── FAQ ─────────────────────────────────────────────────────────────────────
const FAQ_ITEMS = [
  { q: 'Which cities does Dwelling cover?', a: 'Currently all major Canadian cities — Toronto, Vancouver, Calgary, Ottawa, Montreal, Edmonton, Winnipeg, Halifax, and hundreds more. We started with Canada to build a rock-solid, data-rich pilot before expanding.' },
  { q: 'Where does the data come from?', a: 'Realtor.ca active MLS listings (200+ per city), Statistics Canada price indices, OpenStreetMap walkability and amenities, Open-Meteo climate normals, and our proprietary AI engine for synthesis.' },
  { q: 'What is the Stability Score?', a: 'A 0–100 score computed from real listing data: median days on market, price volatility (coefficient of variation), inventory levels, and percentage of listings sitting >60 days. Higher = more stable.' },
  { q: 'Is Dwelling free to use?', a: 'Free users get 10 analyses per month. Upgrade to Pro for $9/month for unlimited analyses and full investment-grade reports.' },
  { q: 'Can I use the results to make a real estate decision?', a: 'No. All outputs are informational only and do not constitute financial, legal, or real estate advice. Always consult a qualified professional.' },
  { q: 'Does Dwelling store my searches?', a: 'No. Searches are processed in real time and discarded immediately. We store only your usage count to enforce free-tier limits.' },
  { q: 'Why Canada only right now?', a: 'Depth over breadth. Starting with one country lets us build a genuinely reliable product — accurate data partnerships, verified sources, Canada-specific context — before expanding internationally.' },
]

const FAQ = memo(function FAQ() {
  const [open, setOpen] = useState(null)
  return (
    <section id="faq" style={{ padding: 'clamp(56px, 8vw, 96px) 20px', maxWidth: 780, margin: '0 auto' }}>
      <div>
        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 40, display: 'inline-flex', padding: '5px 14px', fontSize: 11, color: 'rgba(255,255,255,0.5)', fontFamily: "'Barlow',sans-serif", letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 16 }}>Support</div>
      </div>
      <h2 style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 'clamp(2rem,5vw,3.5rem)', color: '#fff', marginBottom: 40, lineHeight: 0.9, letterSpacing: '-0.02em' }}>
        Questions, answered.
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
                {userRecord?.is_pro ? '★ Pro' : isInTrial ? `⚡ Trial · ${trialDaysLeft}d left` : `${analysesLeft} / 10 left`}
              </span>
              <button onClick={onSignOut} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 12, color: 'rgba(255,255,255,0.35)', padding: '5px 8px', transition: 'color 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.7)'}
                onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.35)'}>Sign out</button>
            </>
          ) : (
            <button onClick={onHome} style={{ background: '#fff', color: '#000', border: 'none', cursor: 'pointer', fontFamily: "'Barlow',sans-serif", fontWeight: 600, fontSize: 13, borderRadius: 40, padding: '8px 18px', display: 'flex', alignItems: 'center', gap: 6, transition: 'transform 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
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
    <section id="hero" style={{ position: 'relative', overflow: 'hidden', background: 'transparent', minHeight: 'min(1000px, 100svh)', height: 'auto' }}>
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 350, background: 'linear-gradient(to top, #000 40%, transparent)', zIndex: 2 }} />
      <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', maxWidth: 900, margin: '0 auto', padding: 'clamp(100px, 20vw, 150px) 20px 80px' }}>
        <div className="liquid-glass" style={{ borderRadius: 40, display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 16px', marginBottom: 28 }}>
          <span style={{ background: '#fff', color: '#000', fontSize: 11, fontFamily: "'Barlow',sans-serif", fontWeight: 600, borderRadius: 20, padding: '2px 8px' }}>New</span>
          <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, fontFamily: "'Barlow',sans-serif", fontWeight: 300 }}>Introducing AI-powered area intelligence.</span>
        </div>
        <h1 style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 'clamp(3rem,9vw,6rem)', color: '#fff', lineHeight: 0.88, letterSpacing: '-0.03em', marginBottom: 28 }}>
          Know Any City Before You Move.
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 16, fontFamily: "'Barlow',sans-serif", fontWeight: 300, maxWidth: 540, lineHeight: 1.7, marginBottom: 40 }}>
          Type any Canadian city. Get a stability score, market temperature, AI verdict, and local news — all in seconds.
        </p>
        <div style={{ width: '100%', maxWidth: 600 }}>
          <AddressSearch onSearch={onSearch} loading={loading} />
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 24, flexWrap: 'wrap', justifyContent: 'center' }}>
          {[['100k+','Cities'],['50+','Countries'],['10','Free / Month'],['<30s','Analysis time']].map(([val, lbl]) => (
            <div key={lbl} className="liquid-glass" style={{ borderRadius: 40, padding: '7px 16px', display: 'flex', alignItems: 'center', gap: 7 }}>
              <span style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 17, color: '#fff' }}>{val}</span>
              <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, fontFamily: "'Barlow',sans-serif", fontWeight: 300 }}>{lbl}</span>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 20 }}>
          <button onClick={onShowDemo} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 13, color: 'rgba(255,255,255,0.4)', textDecoration: 'underline', textUnderlineOffset: 3, padding: '4px 8px', transition: 'color 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.7)'}
            onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.4)'}>
            or see a sample report →
          </button>
        </div>
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
  const partners = ['Realtor.ca', 'StatCan', 'Open-Meteo', 'OpenStreetMap', 'FEMA', 'Dwelling AI']
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
    { num: '03', icon: '🧠', title: 'AI builds your area report', desc: 'Our AI engine synthesizes everything into a stability score, market verdict, price trends, and investment outlook in under 30 seconds.' },
  ]
  return (
    <Section style={{ minHeight: 'auto', padding: 'clamp(60px, 10vw, 128px) 20px' }}>
      <div style={{ maxWidth: 900, margin: '0 auto', textAlign: 'center' }} id="how-it-works">
        <div className="liquid-glass" style={{ borderRadius: 40, display: 'inline-flex', padding: '5px 14px', fontSize: 11, color: 'rgba(255,255,255,0.5)', fontFamily: "'Barlow',sans-serif", letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 16 }}>How It Works</div>
        <h2 style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 'clamp(2rem,5vw,3.5rem)', color: '#fff', marginBottom: 12, lineHeight: 0.9, letterSpacing: '-0.02em' }}>
          <span style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic' }}>"Analyze. Understand. Decide.</span>
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 15, fontFamily: "'Barlow',sans-serif", fontWeight: 300, maxWidth: 500, lineHeight: 1.7, marginBottom: 56, margin: '0 auto 56px' }}>
          Enter any city or neighbourhood. Our AI instantly processes listing data, demographics, risk scores, and market trends.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 14, textAlign: 'left' }}>
          {steps.map((s, i) => (
            <div key={i} className="liquid-glass" style={{ borderRadius: 20, padding: 28, transition: 'transform 0.2s', cursor: 'default' }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
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
  const features = [
    {
      title: 'City stability scored. Not guessed.',
      desc: 'We aggregate 200+ active Realtor.ca listings per Canadian city and compute a real stability score — median price, days on market, price volatility, inventory level. Concrete data sourced directly from MLS.',
      stats: [
        { val: '200+', label: 'Listings analyzed' },
        { val: '<30s', label: 'Analysis time' },
        { val: '100%', label: 'Real MLS data' },
      ],
    },
    {
      title: 'Neighbourhood intelligence — actually real.',
      desc: 'Walkability, transit stops, schools, flood risk, air quality, seismic risk — all derived from OpenStreetMap, StatCan, and USGS within 2km of your target city.',
      stats: [
        { val: '15+', label: 'Data sources' },
        { val: 'StatCan', label: 'Demographics' },
        { val: 'Live', label: 'Market feeds' },
      ],
    },
    {
      title: 'One score. Clear decision.',
      desc: 'Following the best-practice recommendation to turn raw indicators into clear, actionable scores — we produce a single Investment Score and Market Verdict so you know exactly what you’re looking at.',
      stats: [
        { val: '5', label: 'Verdict levels' },
        { val: '0–100', label: 'Stability score' },
        { val: 'AI', label: 'Synthesized verdict' },
      ],
    },
  ]
  return (
    <section id="features" style={{ padding: '96px 24px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div>
          <div className="liquid-glass" style={{ borderRadius: 40, display: 'inline-flex', padding: '5px 14px', fontSize: 11, color: 'rgba(255,255,255,0.5)', fontFamily: "'Barlow',sans-serif", letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 16 }}>Capabilities</div>
        </div>
        <h2 style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 'clamp(2rem,5vw,3.5rem)', color: '#fff', marginBottom: 56, lineHeight: 0.9, letterSpacing: '-0.02em' }}>
          <span style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic' }}>"Unrivaled insights. Simplified.</span>
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {features.map((f, i) => (
            <div key={i} style={{ paddingBottom: 48, paddingTop: i > 0 ? 48 : 0, borderBottom: i < features.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, alignItems: 'center' }}>
                <div>
                  <div>
                    <h3 style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 'clamp(1.4rem,3vw,1.9rem)', color: '#fff', marginBottom: 14, lineHeight: 1.1 }}>{f.title}</h3>
                    <p style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 14, color: 'rgba(255,255,255,0.5)', lineHeight: 1.8, marginBottom: 22 }}>{f.desc}</p>
                    <button onClick={() => scrollTo('pricing')} style={{ borderRadius: 40, padding: '10px 20px', fontSize: 13, fontFamily: "'Barlow',sans-serif", color: '#fff', border: 'none', cursor: 'pointer', background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)', transition: 'transform 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
                      onMouseLeave={e => e.currentTarget.style.opacity = '1'}>Get started →</button>
                  </div>
                </div>
                <div>
                  <div className="liquid-glass" style={{ borderRadius: 18, padding: 32, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                    {f.stats.map((s, j) => (
                      <div key={j} style={{ textAlign: 'center' }}>
                        <div style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 'clamp(1.4rem,2.5vw,2rem)', color: '#fff', lineHeight: 1, marginBottom: 6 }}>{s.val}</div>
                        <div style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 11, color: 'rgba(255,255,255,0.35)', lineHeight: 1.4 }}>{s.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
})

const FeaturesGrid = memo(function FeaturesGrid() {
  const cards = [
    { icon: '🍁', title: 'Canada-First', desc: 'Built specifically for Canadian cities. Realtor.ca MLS data, Statistics Canada demographics, and Canadian market context baked in.' },
    { icon: '📊', title: 'Real MLS Data', desc: 'Active listings from Realtor.ca, StatCan NHPI price indices, and Open-Meteo climate normals. No made-up numbers.' },
    { icon: '⚡', title: 'Instant Analysis', desc: 'Full city intelligence report in under 30 seconds — stability score, verdict, market temperature, investment outlook.' },
    { icon: '🔒', title: 'Secure & Private', desc: 'Your searches are never stored. Bank-grade auth with Supabase. Searches processed in real time and discarded.' },
  ]
  return (
    <section style={{ padding: '80px 24px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div>
          <div className="liquid-glass" style={{ borderRadius: 40, display: 'inline-flex', padding: '5px 14px', fontSize: 11, color: 'rgba(255,255,255,0.5)', fontFamily: "'Barlow',sans-serif", letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 16 }}>Why Dwelling</div>
        </div>
        <h2 style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 'clamp(2rem,5vw,3.5rem)', color: '#fff', marginBottom: 40, lineHeight: 0.9, letterSpacing: '-0.02em' }}>
          <span style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic' }}>"The difference is intelligence.</span>
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 14 }}>
          {cards.map((card, i) => (
            <div key={i}>
              <div className="liquid-glass" style={{ borderRadius: 18, padding: 24, transition: 'transform 0.2s', cursor: 'default' }}
                onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
                onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
                <div className="liquid-glass-strong" style={{ borderRadius: '50%', width: 42, height: 42, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18, fontSize: 17 }}>{card.icon}</div>
                <h3 style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 17, color: '#fff', marginBottom: 7 }}>{card.title}</h3>
                <p style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.7 }}>{card.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
})


// ─── DATA PARTNERSHIPS ───────────────────────────────────────────────────────
const DataPartnerships = memo(function DataPartnerships() {
  const partners = [
    {
      icon: '🏛️',
      name: 'Realtor.ca / CREA',
      type: 'MLS Data',
      desc: 'Active listings across Canada sourced from Realtor.ca — 200+ listings per city, refreshed continuously to reflect current market conditions.',
      status: 'live',
    },
    {
      icon: '📊',
      name: 'Statistics Canada',
      type: 'Price Indices',
      desc: 'New Housing Price Index (NHPI) by CMA — 27 major Canadian cities, quarterly data for time-adjusting prices.',
      status: 'live',
    },
    {
      icon: '🗺️',
      name: 'OpenStreetMap / Overpass',
      type: 'Walkability & Amenities',
      desc: 'Transit stops, schools, parks, groceries, hospitals within 2km radius. Cached and queried via 3 Overpass mirrors.',
      status: 'live',
    },
    {
      icon: '🌤️',
      name: 'Open-Meteo',
      type: 'Climate & Weather',
      desc: 'Current weather + 12-month climate normals. 300,000 req/month free — no API key needed.',
      status: 'live',
    },
    {
      icon: '🤖',
      name: 'Dwelling AI Engine',
      type: 'Proprietary AI',
      desc: 'Our proprietary AI engine synthesizes all data sources into a single city verdict, investment score, and market analysis — designed specifically for Canadian real estate.',
      status: 'live',
    },
    {
      icon: '📋',
      name: 'Notarial Values & Permits',
      type: 'Coming Soon',
      desc: 'Partnership discussions underway with provincial data providers for notarial sale values and building permits — exclusive data that reduces AI estimation reliance.',
      status: 'soon',
    },
  ]

  return (
    <section style={{ padding: '80px 24px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div>
          <div className="liquid-glass" style={{ borderRadius: 40, display: 'inline-flex', padding: '5px 14px', fontSize: 11, color: 'rgba(255,255,255,0.5)', fontFamily: "'Barlow',sans-serif", letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 16 }}>Data Sources</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 40 }}>
          <h2 style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 'clamp(2rem,5vw,3.5rem)', color: '#fff', lineHeight: 0.9, letterSpacing: '-0.02em' }}>
            <span style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic' }}>"Data you can actually trust.</span>
          </h2>
          <p style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 14, color: 'rgba(255,255,255,0.4)', maxWidth: 340, lineHeight: 1.7 }}>
            Every data point is sourced from official providers, real MLS feeds, or government agencies — not scraped blogs or AI guesses.
          </p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 12 }}>
          {partners.map((p, i) => (
            <div key={i}>
              <div className="liquid-glass" style={{ borderRadius: 18, padding: 24, height: '100%', opacity: p.status === 'soon' ? 0.7 : 1, transition: 'transform 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
                onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div className="liquid-glass-strong" style={{ borderRadius: 10, width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>{p.icon}</div>
                    <div>
                      <div style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 500, fontSize: 14, color: '#fff', lineHeight: 1.2 }}>{p.name}</div>
                      <div style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>{p.type}</div>
                    </div>
                  </div>
                  <div style={{
                    borderRadius: 20, padding: '3px 10px', fontSize: 10,
                    fontFamily: "'Barlow',sans-serif", fontWeight: 600, flexShrink: 0,
                    background: p.status === 'live' ? 'rgba(74,222,128,0.12)' : 'rgba(255,255,255,0.06)',
                    border: `1px solid ${p.status === 'live' ? 'rgba(74,222,128,0.25)' : 'rgba(255,255,255,0.1)'}`,
                    color: p.status === 'live' ? '#4ade80' : 'rgba(255,255,255,0.4)',
                  }}>
                    {p.status === 'live' ? '● Live' : '◌ Soon'}
                  </div>
                </div>
                <p style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.7 }}>{p.desc}</p>
              </div>
            </div>
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
      <div>
        <div className="liquid-glass" style={{ borderRadius: 40, display: 'inline-flex', padding: '5px 14px', fontSize: 11, color: 'rgba(255,255,255,0.5)', fontFamily: "'Barlow',sans-serif", letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 16 }}>Pricing</div>
      </div>
      <h2 style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 'clamp(2rem,5vw,3.5rem)', color: '#fff', marginBottom: 8, lineHeight: 0.9, letterSpacing: '-0.02em' }}>
        <span style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic' }}>"Know before you move.</span>
      </h2>
      <p style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 15, color: 'rgba(255,255,255,0.45)', marginBottom: 40, lineHeight: 1.6 }}>
        Start free. Upgrade when you need the full picture.
        <span style={{ display: 'block', marginTop: 6, fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>
          Pro costs less than a coffee for every major location decision you make.
        </span>
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 14 }}>

        {/* Free */}
        <div className="liquid-glass" style={{ borderRadius: 18, padding: 28, display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 21, color: '#fff', marginBottom: 4 }}>Free</div>
          <div style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 12, color: 'rgba(255,255,255,0.35)', marginBottom: 14 }}>Good for exploring</div>
          <div style={{ marginBottom: 20, paddingBottom: 20, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <span style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 44, color: '#fff' }}>$0</span>
            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 15, fontFamily: "'Barlow',sans-serif", fontWeight: 300 }}>/month</span>
          </div>
          <div style={{ flex: 1, marginBottom: 24 }}>
            {PRICING_FREE.map(f => (
              <div key={f.text} style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 10, opacity: f.locked ? 0.35 : 1 }}>
                <span style={{ fontSize: 12, color: f.locked ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.4)' }}>{f.locked ? '🔒' : '✓'}</span>
                <span style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 13, color: f.locked ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.6)', textDecoration: f.locked ? 'line-through' : 'none' }}>{f.text}</span>
              </div>
            ))}
          </div>
          <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} style={{ width: '100%', borderRadius: 40, padding: '12px', fontFamily: "'Barlow',sans-serif", fontWeight: 600, fontSize: 13, background: 'rgba(255,255,255,0.08)', color: '#fff', border: 'none', cursor: 'pointer', transition: 'transform 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}>Start for free</button>
        </div>

        {/* Pro Monthly */}
        <div className="liquid-glass-strong" style={{ borderRadius: 18, padding: 28, border: '1px solid rgba(255,255,255,0.2)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <div style={{ background: '#fff', color: '#000', fontFamily: "'Barlow',sans-serif", fontWeight: 600, fontSize: 10, borderRadius: 20, padding: '3px 10px' }}>Most Popular</div>
          </div>
          <div style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 21, color: '#fff', marginBottom: 4 }}>Pro</div>
          <div style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 14 }}>Full intelligence for every location decision</div>
          <div style={{ marginBottom: 20, paddingBottom: 20, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <span style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 44, color: '#fff' }}>$5</span>
            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 15, fontFamily: "'Barlow',sans-serif", fontWeight: 300 }}>/month</span>
          </div>
          <div style={{ flex: 1, marginBottom: 16 }}>
            {PRICING_PRO.map(f => (
              <div key={f.text} style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 10 }}>
                <span style={{ fontSize: 12, color: f.highlight ? '#4ade80' : '#fff' }}>✓</span>
                <span style={{ fontFamily: "'Barlow',sans-serif", fontWeight: f.highlight ? 400 : 300, fontSize: 13, color: f.highlight ? '#fff' : 'rgba(255,255,255,0.8)' }}>{f.text}</span>
              </div>
            ))}
          </div>
          <div style={{ marginBottom: 16, padding: '10px 14px', background: 'rgba(74,222,128,0.06)', borderRadius: 10, border: '1px solid rgba(74,222,128,0.15)' }}>
            <span style={{ fontFamily: "'Barlow',sans-serif", fontSize: 11, color: 'rgba(74,222,128,0.8)', fontWeight: 300 }}>✓ Cancel anytime · No commitment</span>
          </div>
          <button onClick={onUpgrade} style={{ width: '100%', borderRadius: 40, padding: '13px', fontFamily: "'Barlow',sans-serif", fontWeight: 600, fontSize: 13, background: '#fff', color: '#000', border: 'none', cursor: 'pointer', transition: 'transform 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}>Upgrade to Pro — $5/month →</button>
          <div style={{ textAlign: 'center', marginTop: 8 }}>
            <span style={{ fontFamily: "'Barlow',sans-serif", fontSize: 11, color: 'rgba(255,255,255,0.25)', fontWeight: 300 }}>Cancel anytime · Full refund if not satisfied</span>
          </div>
        </div>



      </div>
    </section>
  )
})

// ─── CTA + FOOTER ────────────────────────────────────────────────────────────
function CTAFooter({ onTermsClick, onScrollToTop, onUpgrade }) {
  return (
    <Section>
      <div style={{ maxWidth: 860, margin: '0 auto', textAlign: 'center', padding: 'clamp(60px, 10vw, 128px) 20px 60px' }}>
        <h2 style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 'clamp(2.2rem,6vw,4.5rem)', color: '#fff', lineHeight: 0.9, letterSpacing: '-0.03em', marginBottom: 20 }}>
          <span style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic' }}>"Your next area decision starts here.</span>
        </h2>
        <p style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 16, color: 'rgba(255,255,255,0.5)', marginBottom: 28, lineHeight: 1.7 }}>
          Free to start. Instant results. No credit card required.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 28 }}>
          {[
            { quote: 'I was about to buy in a neighborhood that looked perfect on Zillow. Dwelling showed me the flood zone risk I completely missed. Saved me from a potential disaster.', name: 'Marcus T.', detail: 'First-time buyer, Austin TX' },
            { quote: 'I had 2 weeks to decide between Toronto, Vancouver, and Calgary. Dwelling let me run full analysis on each in one afternoon. The market intel alone justified the upgrade.', name: 'Priya M.', detail: 'Relocating to Canada' },
          ].map(t => (
            <div key={t.name} className="liquid-glass" style={{ borderRadius: 14, padding: '14px 18px', maxWidth: 260, textAlign: 'left' }}>
              <p style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 13, color: 'rgba(255,255,255,0.7)', fontStyle: 'italic', lineHeight: 1.5, marginBottom: 8 }}>"{t.quote}"</p>
              <div style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 400, fontSize: 12, color: '#fff' }}>{t.name}</div>
              <div style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{t.detail}</div>
            </div>
          ))}
        </div>
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
  climate: {
    avgHighC: 11, avgLowC: -1, avgPrecipMm: 2.8,
  },
  knownFacts: {},
  realData: {
    isAreaMode: true,
    areaMetrics: {
      medianPrice: 649000, avgPrice: 712000,
      priceRange: { low: 389000, high: 980000 },
      medianDOM: 22, count: 214,
      priceVolatility: 0.18,
      slowListingPct: 14, fastListingPct: 31,
    },
    areaRiskScore: {
      score: 68,
      label: 'Transitional Market',
      color: '#fbbf24',
      emoji: '🟡',
      factors: [
        { label: 'Stable pricing', impact: 0, icon: '✅' },
        { label: 'Normal market pace (22 days)', impact: 0, icon: '✅' },
        { label: '31% of homes sell in <2 weeks', impact: 5, icon: '🚀' },
      ],
    },
    marketTemperature: { label: 'Balanced Market', color: '#a78bfa' },
    neighborhoodScores: {
      walkScore: 72, transitScore: 65, schoolScore: 81,
      walkability: 72, transit: 65, schools: 81, parks: 78, groceries: 84,
    },
    censusData: { medianHouseholdIncome: 94000, medianHomeValueUSD: 620000, medianGrossRentUSD: 1820, ownerPct: 61, renterPct: 39 },
    fmr: { twoBed: 1820 },
    floodZone: { zone: 'X', description: 'Minimal flood risk' },
    riskData: {
      overall: { score: 3.2, label: 'Low' },
      hazards: {
        riverine_flooding: { score: 1.1, label: 'Low' },
        wildfire: { score: 0.6, label: 'Low' },
        earthquake: { score: 0.4, label: 'Low' },
        strong_wind: { score: 2.8, label: 'Low' },
      },
      airQuality: { pm25Percentile: 28 },
      ejscreen: { dieselPctile: 15, pm25Pctile: 28 },
    },
    newsData: {
      city: 'Ottawa',
      articles: [
        { title: 'Ottawa condo market softens as inventory rises in 2025', source: 'Ottawa Citizen', url: '#', date: '2025-02-10' },
        { title: 'Centretown sees renewed buyer interest after rate cuts', source: 'CBC Ottawa', url: '#', date: '2025-01-28' },
        { title: 'Gatineau vs Ottawa: where first-time buyers are actually buying', source: 'Ottawa Citizen', url: '#', date: '2025-01-15' },
      ],
    },
  },
  ai: {
    areaIntelligence: {
      verdict: 'Good',
      verdictReason: 'Stable government employment base, reasonable prices, and low natural risk make Ottawa a reliable long-term market.',
      stabilityScore: 68,
      marketConditions: 'Ottawa is a balanced market as of early 2025. The government employment base provides a meaningful price floor — federal job stability insulates the market from the volatility seen in Toronto or Vancouver. Median days on market sits at 22, and 31% of listings move within 14 days, signalling genuine buyer demand without the frenzy of a hot market.',
      priceTrend: 'Prices are flat to modestly down (-2 to -4%) from their 2022 peak, partially recovered through 2024. The $649,000 median reflects a market that corrected without collapsing. Condos have softened more than detached homes, where supply remains tight.',
      investmentOutlook: 'Moderate long-term upside. Immigration-driven population growth and persistent new construction shortfall support prices over a 3-5 year horizon.',
      risks: ['Federal public sector dependency — government restructuring could reduce demand', 'Mortgage renewals at higher rates through 2025-2026', 'Condo market softer than detached homes'],
      upsides: ['Stable government employment base provides price floor', 'Strong school ratings across central neighbourhoods', 'Lower volatility than Toronto or Vancouver', 'Growing tech sector diversifying beyond government'],
      liveability: 'High. Walkability scores of 72 in central neighbourhoods, strong parks and greenspace.',
      bestFor: 'Government employees, families prioritising school quality, risk-averse investors',
    },
    propertyEstimate: {
      estimatedValueUSD: 649000,
      pricePerSqftUSD: 412,
      rentEstimateMonthlyUSD: 1820,
      confidenceLevel: 'medium',
      confidenceScore: 62,
      compsUsed: 214,
      priceRange: { low: 520000, high: 780000 },
      priceContext: 'Based on 214 active listings in the Ottawa area. Median price of CA$649,000 reflects a stable market that corrected from its 2022 peak.',
    },
    costOfLiving: {
      monthlyBudgetUSD: 3200,
      groceriesMonthlyUSD: 480,
      transportMonthlyUSD: 160,
      utilitiesMonthlyUSD: 220,
      diningOutMonthlyUSD: 340,
      indexVsUSAverage: 108,
      summary: 'Ottawa is moderately expensive — roughly 8% above the US average. Housing dominates the budget, with groceries and utilities at near-average levels.',
    },
    neighborhood: {
      walkScore: 72,
      transitScore: 65,
      safetyRating: 74,
      schoolRating: 81,
      character: 'A stable, bilingual capital city with a strong government employment base and growing tech sector. Central neighbourhoods are walkable and family-friendly, with the Glebe and Westboro being the most sought-after.',
      pros: ['Strong schools', 'Safe neighbourhoods', 'Rideau Canal'],
      cons: ['Cold winters', 'Government-dependent economy'],
      bestFor: 'Families, government employees, risk-averse buyers',
    },
    investment: {
      rentYieldPercent: 3.4,
      investmentScore: 64,
      appreciationOutlook: 'neutral',
      appreciationOutlookText: 'Moderate long-term appreciation expected as rates stabilise and supply remains constrained.',
      investmentSummary: 'Solid long-term hold. Not a high-growth market but one of the most stable in Canada. Best for buy-and-hold rather than flipping.',
    },
    localInsights: {
      knownFor: 'A federal government town with a growing private sector and genuinely liveable neighbourhoods.',
      topAttractions: ['Rideau Canal (skating in winter, cycling in summer)', 'ByWard Market', 'Parliament Hill', 'Gatineau Park'],
      localTip: 'The Glebe and Westboro command premium prices but hold value well. Vanier and Hintonburg offer better entry prices with improving amenities.',
      languageNote: 'Bilingual city — French services widely available, especially in Gatineau across the river.',
    },
    priceHistory: {
      currency: 'CAD',
      currencySymbol: 'CA$',
      marketNote: 'Ottawa prices surged through 2021-2022 driven by pandemic demand and low rates, then corrected 12-15% through 2023. The market has stabilised in 2024-2025 with modest recovery, and modest appreciation is expected through 2026-2027.',
      data: [
        { year: 2019, value: 430000, type: 'historical' },
        { year: 2020, value: 480000, type: 'historical' },
        { year: 2021, value: 580000, type: 'historical' },
        { year: 2022, value: 740000, type: 'historical' },
        { year: 2023, value: 650000, type: 'historical' },
        { year: 2024, value: 635000, type: 'historical' },
        { year: 2025, value: 649000, type: 'historical' },
        { year: 2026, value: 672000, type: 'projected' },
        { year: 2027, value: 695000, type: 'projected' },
      ],
    },
    riskData: null,
    floorPlan: { typicalSqft: 1450, typicalBeds: 3, typicalBaths: 2 },
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
  const [teaserCity, setTeaserCity] = useState(null)
  const [compareResult, setCompareResult] = useState(null)
  const [comparingMode, setComparingMode] = useState(false)
  const [previewPlan, setPreviewPlan] = useState('pro') // 'free' | 'pro'
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

  const handleSearch = async ({ street, city, state, country: _country, knownFacts }) => {
    const country = 'Canada' // Canada-only pilot
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

      const bulkListings = bulkCompsRes.status === 'fulfilled' ? bulkCompsRes.value?.listings || bulkCompsRes.value?.comps || [] : []
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

  const handleCompareSearch = async ({ street, city, state, country }) => {
    if (loading) return
    setLoading(true); setError(null); setLoadStep(0)
    const isAreaMode = !street.trim()
    try {
      const geocodeInput = isAreaMode ? { street: '', city, state, country } : { street, city, state, country }
      const geo = await geocodeStructured(geocodeInput); setLoadStep(1)
      const postcode = geo.address?.postcode ?? ''
      const [weather, climate, neighborhoodScores] = await Promise.all([getCurrentWeather(geo.lat, geo.lon), getClimateNormals(geo.lat, geo.lon), getNeighborhoodScores(geo.lat, geo.lon)]); setLoadStep(2)
      const [censusData, fmr, floodZone] = await Promise.all([getCensusData(street, city, state, country), getFairMarketRent(postcode), getFloodZone(geo.lat, geo.lon)]); setLoadStep(3)
      const riskData = await fetch('/api/risk', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lat: geo.lat, lon: geo.lon, county: geo.address?.county, state, country }) }).then(r => r.ok ? r.json() : null).catch(() => null)
      const [bulkCompsRes, newsRes] = await Promise.allSettled([
        fetch('/api/comps', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ city, state, country, mode: 'area' }) }).then(r => r.json()).catch(() => null),
        fetch('/api/news', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ city, state, country }) }).then(r => r.json()).catch(() => null),
      ])
      const bulkListings = bulkCompsRes.status === 'fulfilled' ? bulkCompsRes.value?.listings || bulkCompsRes.value?.comps || [] : []
      const newsData = newsRes.status === 'fulfilled' ? newsRes.value : null
      const areaMetrics = aggregateListings(bulkListings) || null
      const areaRiskScore = computeRiskScore(areaMetrics, null) || null
      const marketTemperature = getMarketTemperature(areaMetrics) || null
      const realData = { neighborhoodScores, censusData, fmr, floodZone, riskData, areaMetrics, areaRiskScore, marketTemperature, newsData, isAreaMode }
      const ai = await analyzeProperty(geo, weather, climate, {}, realData); setLoadStep(4)
      setCompareResult({ geo, weather, climate, ai, knownFacts: {}, realData, isAreaMode })
      setComparingMode(false)
    } catch (err) {
      if (err.message?.includes('limit reached') || err.message?.includes('429')) setShowPaywall(true)
      else setError(err.message ?? 'Something went wrong.')
    } finally { setLoading(false) }
  }

  const trialDaysLeft = userRecord?.trial_started_at
    ? Math.max(0, TRIAL_DAYS - Math.floor((Date.now() - new Date(userRecord.trial_started_at).getTime()) / (1000 * 60 * 60 * 24)))
    : null
  const isInTrial = trialDaysLeft !== null && trialDaysLeft > 0 && !userRecord?.is_pro
  const analysesLeft = userRecord ? (userRecord.is_pro ? '∞' : isInTrial ? '∞' : Math.max(0, FREE_LIMIT - (userRecord.analyses_used ?? 0))) : '...'

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
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, padding: '12px 16px', background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
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
            onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
            Sign up free →
          </button>
        </div>
      </nav>
      <div style={{ maxWidth: 960, margin: '0 auto', padding: 'clamp(80px, 12vw, 100px) 16px 60px', width: '100%', position: 'relative', zIndex: 1 }}>
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
      {showPaywall && <PaywallModal onClose={() => setShowPaywall(false)} onUpgrade={() => alert('Stripe coming soon! Full refund guaranteed if not satisfied.')} />}
      <Navbar user={user} userRecord={userRecord} analysesLeft={analysesLeft} isInTrial={isInTrial} trialDaysLeft={trialDaysLeft} onSignOut={handleSignOut}
        onHome={() => { setResult(null); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
        onScrollTo={scrollTo} />

      {(result || loading) ? (
        <div style={{ maxWidth: compareResult ? 1200 : 960, margin: '0 auto', padding: 'clamp(80px, 12vw, 100px) 16px 60px', width: '100%', position: 'relative', zIndex: 1 }}>
          {!loading && result && !compareResult && !comparingMode && (
            <div style={{ marginBottom: 22 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
                <button onClick={() => { setResult(null); setCompareResult(null); setComparingMode(false) }}
                  style={{ borderRadius: 40, padding: '8px 16px', fontSize: 13, fontFamily: "'Barlow',sans-serif", color: 'rgba(255,255,255,0.6)', border: 'none', cursor: 'pointer', background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(12px)', transition: 'transform 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
                  onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
                  ← New search
                </button>
                <button onClick={() => setComparingMode(true)}
                  style={{ borderRadius: 40, padding: '8px 16px', fontSize: 13, fontFamily: "'Barlow',sans-serif", color: '#fff', border: '1px solid rgba(255,255,255,0.15)', cursor: 'pointer', background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(12px)', transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 6 }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.09)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)' }}>
                  ⚖️ Compare with another area
                </button>
              </div>
              {/* Admin plan preview switcher */}
              {user?.email === '01dominique.c@gmail.com' && (
                <div className="liquid-glass" style={{ borderRadius: 14, padding: '10px 14px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: "'Barlow',sans-serif", fontSize: 11, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>👁 Preview as:</span>
                  {[['free', 'Free'], ['pro', 'Pro']].map(([val, label]) => (
                    <button key={val} onClick={() => setPreviewPlan(val)}
                      style={{ borderRadius: 40, padding: '5px 14px', fontSize: 12, fontFamily: "'Barlow',sans-serif", fontWeight: previewPlan === val ? 600 : 300, border: 'none', cursor: 'pointer', background: previewPlan === val ? '#fff' : 'rgba(255,255,255,0.06)', color: previewPlan === val ? '#000' : 'rgba(255,255,255,0.5)', transition: 'all 0.15s' }}>
                      {label}
                    </button>
                  ))}
                  <span style={{ fontFamily: "'Barlow',sans-serif", fontSize: 11, color: 'rgba(255,255,255,0.2)', marginLeft: 'auto' }}>Admin only</span>
                </div>
              )}
              <AddressSearch onSearch={handleSearch} loading={loading} compact />
            </div>
          )}
          {!loading && comparingMode && (
            <div style={{ marginBottom: 22 }}>
              <div className="liquid-glass" style={{ borderRadius: 14, padding: '14px 18px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 16 }}>⚖️</span>
                <span style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>
                  Search a second area to compare against <span style={{ color: '#fff' }}>{result?.geo?.displayName?.split(',')[0]}</span>
                </span>
                <button onClick={() => setComparingMode(false)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}>×</button>
              </div>
              <AddressSearch onSearch={handleCompareSearch} loading={loading} compact />
            </div>
          )}
          {loading && <LoadingState step={loadStep} />}
          {error && (
            <div className="liquid-glass" style={{ borderRadius: 12, padding: '12px 18px', border: '1px solid rgba(248,113,113,0.3)', background: 'rgba(248,113,113,0.08)', marginBottom: 14 }}>
              <p style={{ fontFamily: "'Barlow',sans-serif", fontSize: 13, color: '#f87171' }}>⚠ {error}</p>
            </div>
          )}
          {result && !loading && compareResult && (
            <CompareView
              resultA={result}
              resultB={compareResult}
              onBack={() => setCompareResult(null)}
              onClearB={() => { setCompareResult(null); setComparingMode(true) }}
            />
          )}
          {result && !loading && !compareResult && <Suspense fallback={<LoadingState step={0} />}><Dashboard data={result} onRecalculate={handleRecalculate} previewPlan={user?.email === '01dominique.c@gmail.com' ? previewPlan : 'pro'} /></Suspense>}
        </div>
      ) : (
        <div style={{ position: 'relative', zIndex: 1 }}>
          <Hero onSearch={handleSearch} loading={loading} onShowDemo={() => setShowDemo(true)} />
          <Partners />
          <HowItWorks />
          <FeaturesChess />
          <FeaturesGrid />
          <DataPartnerships />
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
