import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion'
import AddressSearch from './components/AddressSearch'
import LoadingState from './components/LoadingState'
import Dashboard from './components/Dashboard'
import AuthModal from './components/AuthModal'
import PaywallModal from './components/PaywallModal'
import GlobalBackground from './components/GlobalBackground'
import BlurText from './components/BlurText'
import CountUp from './components/CountUp'
import { geocodeStructured } from './lib/nominatim'
import { getCurrentWeather, getClimateNormals } from './lib/weather'
import { analyzeProperty } from './lib/cerebras'
import { getNeighborhoodScores } from './lib/overpass'
import { getCensusData } from './lib/census'
import { getFairMarketRent, getFloodZone } from './lib/hud'
import { supabase } from './lib/supabase'

const FREE_LIMIT = 10

// ─── PARALLAX IMAGE ───────────────────────────────────────────────────────────
// Wraps a section with a full-bleed parallax background image
function ParallaxSection({ src, opacity = 0.3, speed = 0.25, children, style = {}, overlayStyle = {} }) {
  const ref = useRef(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const y = useTransform(scrollYProgress, [0, 1], ['-12%', '12%'])

  return (
    <section ref={ref} style={{ position: 'relative', overflow: 'hidden', ...style }}>
      {/* Parallax image layer */}
      <motion.div
        style={{ position: 'absolute', inset: '-20% 0', y, zIndex: 0, willChange: 'transform' }}
      >
        <img
          src={src}
          alt=""
          style={{ width: '100%', height: '100%', objectFit: 'cover', opacity, display: 'block' }}
          loading="lazy"
        />
      </motion.div>
      {/* Gradient overlay */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 1,
        background: 'linear-gradient(to bottom, #000 0%, transparent 15%, transparent 85%, #000 100%)',
        ...overlayStyle
      }} />
      {/* Content */}
      <div style={{ position: 'relative', zIndex: 2 }}>
        {children}
      </div>
    </section>
  )
}

// ─── TERMS MODAL ──────────────────────────────────────────────────────────────
function TermsModal({ onClose }) {
  const sections = [
    { title: '1. Definitions', body: '"Platform" means the Dwelling website and all associated services. "Company" refers to Dwelling. "User" refers to any individual accessing the Platform.' },
    { title: '2. Services', body: 'The Platform provides automated property intelligence reports based on publicly available data and AI-generated analysis. All Services are provided on an "as-is" basis.' },
    { title: '3. No Professional Advice', body: 'ALL CONTENT IS FOR INFORMATIONAL PURPOSES ONLY. Nothing constitutes financial, real estate, investment, legal, or tax advice. Always consult a qualified licensed professional before making any property-related decision.' },
    { title: '4. Data Accuracy Disclaimer', body: 'The Company makes no warranties regarding accuracy, completeness, or timeliness of any Content. Property valuations are algorithmic estimates only.' },
    { title: '5. User Obligations', body: 'You agree to: (a) use the Platform solely for lawful purposes; (b) not scrape or redistribute Content at scale; (c) not reverse-engineer Platform systems; (d) comply with all applicable laws.' },
    { title: '6. Intellectual Property', body: 'All Platform technology, design, software, and original Content are the exclusive property of the Company.' },
    { title: '7. Limitation of Liability', body: 'TO THE MAXIMUM EXTENT PERMITTED BY LAW, THE COMPANY SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES. TOTAL LIABILITY SHALL NOT EXCEED CAD $100.00.' },
    { title: '8. Indemnification', body: 'You agree to defend and hold harmless the Company from any claims arising from your use of the Platform or decisions made in reliance on Platform outputs.' },
    { title: '9. Privacy', body: 'The Company does not sell personal data to third parties.' },
    { title: '10. Termination', body: 'The Company may suspend or terminate access at any time without notice.' },
    { title: '11. Governing Law', body: 'These Terms are governed by the laws of Ontario, Canada.' },
    { title: '12. Modifications', body: 'The Company may modify these Terms at any time. Continued use constitutes acceptance.' },
  ]
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        onClick={e => e.stopPropagation()}
        className="liquid-glass-strong"
        style={{ borderRadius: 24, maxWidth: 740, width: '100%', height: '85vh', display: 'flex', flexDirection: 'column' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 28px', borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
          <span style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: 22, color: '#ffffff' }}>Terms & Conditions</span>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#ffffff', fontFamily: "'Barlow', sans-serif", fontSize: 12, padding: '6px 14px', cursor: 'pointer' }}>✕ Close</button>
        </div>
        <div style={{ flex: 1, overflowY: 'scroll', padding: '28px' }}>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginBottom: 24, fontFamily: "'Barlow', sans-serif", fontWeight: 300 }}>Last updated: June 2025</p>
          {sections.map(({ title, body }) => (
            <div key={title} style={{ marginBottom: 24 }}>
              <div style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: 17, color: '#ffffff', marginBottom: 8 }}>{title}</div>
              <p style={{ fontFamily: "'Barlow', sans-serif", fontWeight: 300, fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 1.8 }}>{body}</p>
            </div>
          ))}
          <p style={{ fontFamily: "'Barlow', sans-serif", fontWeight: 300, fontSize: 11, color: 'rgba(255,255,255,0.3)', textAlign: 'center', paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            BY USING THE PLATFORM YOU AGREE TO THESE TERMS AND CONDITIONS.
          </p>
        </div>
      </motion.div>
    </div>
  )
}

// ─── FAQ ──────────────────────────────────────────────────────────────────────
const FAQ_ITEMS = [
  { q: 'How accurate are the property estimates?', a: 'Estimates are AI-generated using real neighborhood data, census figures, and market trends. They are informational approximations — accuracy varies by location and data availability. Always verify with a licensed appraiser before making financial decisions.' },
  { q: 'Where does the data come from?', a: 'We pull from multiple authoritative sources: OpenStreetMap (neighborhood scores), Open-Meteo (weather/climate), US Census Bureau (tract-level housing data), HUD (fair market rents), FEMA (flood zones), and AI analysis powered by Cerebras.' },
  { q: 'Is Dwelling free to use?', a: 'Free users get 10 analyses per month. Upgrade to Pro for $9/month to get unlimited analyses.' },
  { q: 'Does Dwelling work outside the United States?', a: 'Yes. Dwelling supports addresses globally. Some data sources (Census, HUD, FEMA) are US-specific, so international analyses rely more on AI estimation and OpenStreetMap data.' },
  { q: 'Can I use the results to make a real estate decision?', a: 'No. All outputs are informational only and do not constitute financial, legal, or real estate advice. Always consult a qualified professional before making any property-related decision.' },
  { q: 'Does Dwelling store my address searches?', a: 'We do not store your search history on our servers. Searches are processed in real time and discarded.' },
  { q: 'What is the "Correct AI Estimates" feature?', a: "If you know specific facts about the property — bedrooms, bathrooms, square footage, year built, or purchase price — you can enter them to improve AI accuracy. These confirmed facts override the AI's assumptions." },
  { q: 'Why does the walk score seem off for my address?', a: 'Walk and transit scores are calculated from real OpenStreetMap data within a 2km radius. Scores reflect the actual number of mapped amenities, transit stops, and schools near the address.' },
]

function FAQ() {
  const [open, setOpen] = useState(null)
  return (
    <section id="faq" style={{ padding: '96px 24px', maxWidth: 800, margin: '0 auto', position: 'relative', zIndex: 1 }}>
      <motion.div initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4 }} style={{ marginBottom: 8 }}>
        <span className="liquid-glass" style={{ borderRadius: 40, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', fontSize: 11, color: 'rgba(255,255,255,0.5)', fontFamily: "'Barlow', sans-serif", fontWeight: 400, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          Support
        </span>
      </motion.div>
      <h2 style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: 'clamp(2rem, 5vw, 3.5rem)', color: '#ffffff', marginBottom: 48, marginTop: 16, lineHeight: 0.9, letterSpacing: '-0.02em' }}>
        <BlurText text="Questions, answered." />
      </h2>
      <div>
        {FAQ_ITEMS.map((item, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: i * 0.04 }}
            className="liquid-glass"
            style={{ borderRadius: 16, marginBottom: 8, overflow: 'hidden' }}
          >
            <button
              onClick={() => setOpen(open === i ? null : i)}
              style={{ width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', background: 'transparent', border: 'none', cursor: 'pointer', gap: 16 }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <span style={{ fontFamily: "'Barlow', sans-serif", fontWeight: 500, fontSize: 14, color: '#ffffff', flex: 1 }}>{item.q}</span>
              <motion.span animate={{ rotate: open === i ? 45 : 0 }} transition={{ duration: 0.2 }} style={{ fontSize: 22, color: 'rgba(255,255,255,0.3)', flexShrink: 0, lineHeight: 1 }}>+</motion.span>
            </button>
            <AnimatePresence>
              {open === i && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <div style={{ padding: '0 24px 20px 24px', paddingRight: 40 }}>
                    <p style={{ fontFamily: "'Barlow', sans-serif", fontWeight: 300, fontSize: 14, color: 'rgba(255,255,255,0.6)', lineHeight: 1.8 }}>{item.a}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>
    </section>
  )
}

// ─── NAVBAR ───────────────────────────────────────────────────────────────────
function Navbar({ user, userRecord, analysesLeft, onSignOut, onHome }) {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  const lowOnCredits = typeof analysesLeft === 'number' && analysesLeft <= 3

  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
      padding: '16px 24px',
      background: scrolled ? 'rgba(0,0,0,0.75)' : 'transparent',
      backdropFilter: scrolled ? 'blur(20px)' : 'none',
      WebkitBackdropFilter: scrolled ? 'blur(20px)' : 'none',
      borderBottom: scrolled ? '1px solid rgba(255,255,255,0.06)' : '1px solid transparent',
      transition: 'background 0.3s, border-color 0.3s',
    }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <button onClick={onHome} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: 22, color: '#ffffff', padding: 0 }}>
          DW<span style={{ opacity: 0.4 }}>.</span>ELLING
        </button>

        <div className="liquid-glass" style={{ borderRadius: 40, padding: '6px', display: 'flex', alignItems: 'center', gap: 2 }}>
          {['Features', 'Pricing', 'FAQ'].map(link => (
            <a key={link} href={`#${link.toLowerCase()}`}
              style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, fontFamily: "'Barlow', sans-serif", fontWeight: 400, padding: '7px 16px', borderRadius: 36, textDecoration: 'none', transition: 'background 0.15s, color 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = '#fff' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.6)' }}
            >{link}</a>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {user && (
            <>
              <motion.span
                animate={lowOnCredits ? { opacity: [1, 0.4, 1] } : {}}
                transition={lowOnCredits ? { duration: 1.5, repeat: Infinity } : {}}
                className="liquid-glass"
                style={{ borderRadius: 40, padding: '5px 12px', fontSize: 12, fontFamily: "'Barlow', sans-serif", color: userRecord?.is_pro ? '#fbbf24' : lowOnCredits ? '#f87171' : 'rgba(255,255,255,0.5)' }}
              >
                {userRecord?.is_pro ? '★ Pro' : `${analysesLeft} / ${FREE_LIMIT} left`}
              </motion.span>
              <button onClick={onSignOut}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'Barlow', sans-serif", fontWeight: 300, fontSize: 12, color: 'rgba(255,255,255,0.3)', padding: '5px 8px', transition: 'color 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.7)'}
                onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.3)'}
              >Sign out</button>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}

// ─── HERO ─────────────────────────────────────────────────────────────────────
function Hero({ onSearch, loading }) {
  const ref = useRef(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })
  const bgY = useTransform(scrollYProgress, [0, 1], ['0%', '30%'])
  const contentY = useTransform(scrollYProgress, [0, 1], ['0%', '15%'])
  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0])

  return (
    <section ref={ref} style={{ minHeight: '100vh', position: 'relative', overflow: 'hidden', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {/* Parallax hero bg */}
      <motion.div style={{ position: 'absolute', inset: '-15% 0', y: bgY, zIndex: 0, willChange: 'transform' }}>
        <img src="/images/hero-neighborhood.png" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.45 }} />
      </motion.div>

      {/* Grid overlay */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 1, backgroundImage: 'repeating-linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), repeating-linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />

      {/* Top + bottom fades */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 220, background: 'linear-gradient(to bottom, #000, transparent)', zIndex: 2 }} />
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 280, background: 'linear-gradient(to top, #000, transparent)', zIndex: 2 }} />

      {/* Content fades out on scroll */}
      <motion.div style={{ position: 'relative', zIndex: 10, y: contentY, opacity, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', maxWidth: 900, margin: '0 auto', padding: '128px 24px 96px', willChange: 'transform, opacity' }}>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="liquid-glass"
          style={{ borderRadius: 40, display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 16px', marginBottom: 32 }}
        >
          <span style={{ background: '#ffffff', color: '#000', fontSize: 11, fontFamily: "'Barlow', sans-serif", fontWeight: 600, borderRadius: 20, padding: '2px 8px' }}>AI Powered</span>
          <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, fontFamily: "'Barlow', sans-serif", fontWeight: 300 }}>Know what any home is worth — instantly.</span>
        </motion.div>

        <h1 style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: 'clamp(3.5rem, 10vw, 6.5rem)', color: '#ffffff', lineHeight: 0.88, letterSpacing: '-0.03em', marginBottom: 32 }}>
          <BlurText text="Property Intelligence. Reimagined." />
        </h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          style={{ color: 'rgba(255,255,255,0.5)', fontSize: 17, fontFamily: "'Barlow', sans-serif", fontWeight: 300, maxWidth: 560, lineHeight: 1.7, marginBottom: 48 }}
        >
          Enter any address in the world. Get real market data, neighborhood scores, climate analysis, and AI-powered investment insights — instantly.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          style={{ width: '100%', maxWidth: 620 }}
        >
          <AddressSearch onSearch={onSearch} loading={loading} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.9 }}
          style={{ display: 'flex', gap: 12, marginTop: 24, flexWrap: 'wrap', justifyContent: 'center' }}
        >
          {[
            { value: '140M+', label: 'US Properties' },
            { value: '50+', label: 'Countries' },
            { value: '10', label: 'Free / Month' },
            { value: '<30s', label: 'Analysis time' },
          ].map(({ value, label }) => (
            <div key={label} className="liquid-glass" style={{ borderRadius: 40, padding: '8px 18px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: 18, color: '#ffffff' }}>{value}</span>
              <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, fontFamily: "'Barlow', sans-serif", fontWeight: 300 }}>{label}</span>
            </div>
          ))}
        </motion.div>

        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          style={{ position: 'absolute', bottom: 32, left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ opacity: 0.3 }}>
            <path d="M8 3v10M3 9l5 5 5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', fontFamily: "'Barlow', sans-serif", letterSpacing: '0.1em', textTransform: 'uppercase' }}>Scroll to explore</span>
        </motion.div>
      </motion.div>
    </section>
  )
}

// ─── HOW IT WORKS ─────────────────────────────────────────────────────────────
function HowItWorks() {
  const steps = [
    { num: '01', icon: '📍', title: 'Enter an address', desc: 'Any address in the world. Street, city, country — that is all you need to get started.' },
    { num: '02', icon: '⚡', title: 'We fetch real data', desc: 'Census data, HUD rent estimates, FEMA flood zones, OpenStreetMap scores, live weather — all pulled in real time.' },
    { num: '03', icon: '🧠', title: 'AI builds your report', desc: 'Cerebras Llama synthesizes everything into a complete property intelligence report in under 30 seconds.' },
  ]

  return (
    <ParallaxSection src="/images/neighborhood-night.png" opacity={0.22} style={{ padding: '96px 0' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px' }}>
        <motion.div initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4 }} style={{ marginBottom: 8 }}>
          <span className="liquid-glass" style={{ borderRadius: 40, display: 'inline-flex', padding: '6px 14px', fontSize: 11, color: 'rgba(255,255,255,0.5)', fontFamily: "'Barlow', sans-serif", letterSpacing: '0.08em', textTransform: 'uppercase' }}>How it works</span>
        </motion.div>
        <h2 style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: 'clamp(2rem, 5vw, 3.5rem)', color: '#ffffff', marginBottom: 12, marginTop: 16, lineHeight: 0.9, letterSpacing: '-0.02em' }}>
          <BlurText text="Enter an address. Get everything." />
        </h2>
        <motion.p initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.15 }}
          style={{ color: 'rgba(255,255,255,0.5)', fontSize: 15, fontFamily: "'Barlow', sans-serif", fontWeight: 300, maxWidth: 480, lineHeight: 1.7, marginBottom: 64 }}>
          No account upgrades required. Just enter an address and get a full property intelligence report in seconds.
        </motion.p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
          {steps.map((step, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              whileHover={{ scale: 1.02, y: -4 }}
              className="liquid-glass"
              style={{ borderRadius: 20, padding: 32 }}
            >
              <div style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: 64, color: 'rgba(255,255,255,0.07)', lineHeight: 1, marginBottom: 16 }}>{step.num}</div>
              <div className="liquid-glass-strong" style={{ borderRadius: '50%', width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16, fontSize: 18 }}>{step.icon}</div>
              <h3 style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: 20, color: '#ffffff', marginBottom: 12 }}>{step.title}</h3>
              <p style={{ fontFamily: "'Barlow', sans-serif", fontWeight: 300, fontSize: 14, color: 'rgba(255,255,255,0.5)', lineHeight: 1.7 }}>{step.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </ParallaxSection>
  )
}

// ─── FEATURE ROWS ─────────────────────────────────────────────────────────────
function FeatureRows() {
  const rows = [
    {
      title: 'Know what a home is really worth.',
      desc: 'AI-powered estimates grounded in census tract data, HUD fair market rents, and real neighborhood context. Not just a number — full price context with confidence levels.',
      img: '/images/house-night.png',
      reverse: false,
    },
    {
      title: "Neighborhood intelligence that's actually real.",
      desc: 'Walk scores, transit scores, school ratings — all derived from real OpenStreetMap data within a 2km radius. Not estimated. Actually counted.',
      img: '/images/map-pins.png',
      reverse: true,
    },
    {
      title: 'Investment analysis you can act on.',
      desc: 'Rent yield, appreciation outlook, investment score — synthesized from price history, neighborhood trends, and market context. Clear. Honest. Actionable.',
      img: '/images/price-chart.png',
      reverse: false,
    },
  ]

  return (
    <ParallaxSection src="/images/architecture-texture.png" opacity={0.06} id="features" style={{ padding: '64px 0' }}
      overlayStyle={{ background: 'linear-gradient(to bottom, #000 0%, transparent 8%, transparent 92%, #000 100%)' }}
    >
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px' }}>
        <motion.div initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4 }} style={{ marginBottom: 8 }}>
          <span className="liquid-glass" style={{ borderRadius: 40, display: 'inline-flex', padding: '6px 14px', fontSize: 11, color: 'rgba(255,255,255,0.5)', fontFamily: "'Barlow', sans-serif", letterSpacing: '0.08em', textTransform: 'uppercase' }}>Features</span>
        </motion.div>
        <h2 style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: 'clamp(2rem, 5vw, 3.5rem)', color: '#ffffff', marginBottom: 64, marginTop: 16, lineHeight: 0.9, letterSpacing: '-0.02em' }}>
          <BlurText text="Intelligence at every layer." />
        </h2>

        {rows.map((row, i) => (
          <div key={i} style={{
            display: 'flex',
            flexDirection: row.reverse ? 'row-reverse' : 'row',
            gap: 64, alignItems: 'center',
            paddingBottom: 64, paddingTop: i > 0 ? 64 : 0,
            borderBottom: i < rows.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
            flexWrap: 'wrap',
          }}>
            <motion.div
              initial={{ opacity: 0, x: row.reverse ? 40 : -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              style={{ flex: '1 1 280px' }}
            >
              <h3 style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: 'clamp(1.5rem, 3vw, 2rem)', color: '#ffffff', marginBottom: 16, lineHeight: 1.1 }}>{row.title}</h3>
              <p style={{ fontFamily: "'Barlow', sans-serif", fontWeight: 300, fontSize: 15, color: 'rgba(255,255,255,0.5)', lineHeight: 1.8, marginBottom: 24 }}>{row.desc}</p>
              <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }} className="liquid-glass-strong"
                style={{ borderRadius: 40, padding: '11px 22px', fontSize: 13, fontFamily: "'Barlow', sans-serif", color: '#ffffff', border: 'none', cursor: 'pointer' }}>
                Learn more →
              </motion.button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: row.reverse ? -40 : 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              style={{ flex: '1 1 280px' }}
            >
              <div className="liquid-glass" style={{ borderRadius: 20, overflow: 'hidden', aspectRatio: '4/3', position: 'relative' }}>
                <motion.img
                  src={row.img}
                  alt=""
                  whileInView={{ scale: [1.05, 1] }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8 }}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
                {i === 1 && <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 50% 50%, rgba(99,160,255,0.15) 0%, transparent 60%)', animation: 'glow-pulse 2.5s ease-in-out infinite', pointerEvents: 'none' }} />}
                {i === 2 && <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.05) 50%, transparent 100%)', backgroundSize: '200% 100%', animation: 'shimmer 2.5s linear infinite', pointerEvents: 'none' }} />}
              </div>
            </motion.div>
          </div>
        ))}
      </div>
    </ParallaxSection>
  )
}

// ─── FEATURES GRID ────────────────────────────────────────────────────────────
function FeaturesGrid() {
  const cards = [
    { icon: '🌍', title: 'Global Coverage', desc: 'Any address in the world. 50+ countries. Real data wherever you search.' },
    { icon: '📊', title: 'Real Data Sources', desc: 'Census Bureau, HUD, FEMA, OpenStreetMap, Open-Meteo. No made-up numbers.' },
    { icon: '⚡', title: 'Instant Analysis', desc: 'Full property intelligence report generated in under 30 seconds.' },
    { icon: '🔒', title: 'Secure & Private', desc: 'Your searches are never stored. Bank-grade auth with Supabase.' },
  ]
  return (
    <section style={{ padding: '96px 24px', maxWidth: 1100, margin: '0 auto', position: 'relative', zIndex: 1 }}>
      <motion.div initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} style={{ marginBottom: 8 }}>
        <span className="liquid-glass" style={{ borderRadius: 40, display: 'inline-flex', padding: '6px 14px', fontSize: 11, color: 'rgba(255,255,255,0.5)', fontFamily: "'Barlow', sans-serif", letterSpacing: '0.08em', textTransform: 'uppercase' }}>Built different</span>
      </motion.div>
      <h2 style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: 'clamp(2rem, 5vw, 3.5rem)', color: '#ffffff', marginBottom: 48, marginTop: 16, lineHeight: 0.9, letterSpacing: '-0.02em' }}>
        <BlurText text="Why Dwelling works." />
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
        {cards.map((card, i) => (
          <motion.div key={i}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: i * 0.07 }}
            whileHover={{ scale: 1.02, y: -4 }}
            className="liquid-glass"
            style={{ borderRadius: 20, padding: 24 }}
          >
            <div className="liquid-glass-strong" style={{ borderRadius: '50%', width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20, fontSize: 18 }}>{card.icon}</div>
            <h3 style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: 18, color: '#ffffff', marginBottom: 8 }}>{card.title}</h3>
            <p style={{ fontFamily: "'Barlow', sans-serif", fontWeight: 300, fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.7 }}>{card.desc}</p>
          </motion.div>
        ))}
      </div>
    </section>
  )
}

// ─── STATS ────────────────────────────────────────────────────────────────────
function Stats() {
  return (
    <section style={{ padding: '96px 24px', maxWidth: 960, margin: '0 auto', position: 'relative', zIndex: 1 }}>
      <motion.div animate={{ opacity: [0.4, 0.8, 0.4] }} transition={{ duration: 4, repeat: Infinity }}
        style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)', filter: 'blur(40px)', pointerEvents: 'none' }} />
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="liquid-glass-strong"
        style={{ borderRadius: 28, padding: '48px 32px', position: 'relative', zIndex: 1 }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 32, textAlign: 'center' }}>
          {[
            { target: 140, suffix: 'M+', label: 'US Properties' },
            { target: 50, suffix: '+', label: 'Countries' },
            { target: 10, suffix: '', label: 'Free / Month' },
            { target: 30, prefix: '<', suffix: 's', label: 'Avg analysis time' },
          ].map(({ target, suffix, prefix, label }) => (
            <div key={label}>
              <div style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: 'clamp(2.5rem, 5vw, 4rem)', color: '#ffffff', lineHeight: 1 }}>
                <CountUp target={target} suffix={suffix} prefix={prefix || ''} />
              </div>
              <div style={{ fontFamily: "'Barlow', sans-serif", fontWeight: 300, fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 8 }}>{label}</div>
            </div>
          ))}
        </div>
      </motion.div>
    </section>
  )
}

// ─── PRICING ──────────────────────────────────────────────────────────────────
function Pricing() {
  const freeFeatures = ['10 analyses/month', 'All data sources', 'AI property analysis', 'Neighborhood scores', 'Climate & weather']
  const proFeatures = ['Unlimited analyses', 'All data sources', 'AI property analysis', 'Neighborhood scores', 'Climate & weather', 'Priority support', 'Early access to new features']

  return (
    <section id="pricing" style={{ padding: '96px 24px', maxWidth: 900, margin: '0 auto', position: 'relative', zIndex: 1 }}>
      <motion.div initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} style={{ marginBottom: 8 }}>
        <span className="liquid-glass" style={{ borderRadius: 40, display: 'inline-flex', padding: '6px 14px', fontSize: 11, color: 'rgba(255,255,255,0.5)', fontFamily: "'Barlow', sans-serif", letterSpacing: '0.08em', textTransform: 'uppercase' }}>Pricing</span>
      </motion.div>
      <h2 style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: 'clamp(2rem, 5vw, 3.5rem)', color: '#ffffff', marginBottom: 48, marginTop: 16, lineHeight: 0.9, letterSpacing: '-0.02em' }}>
        <BlurText text="Simple. Transparent. Fair." />
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
        <motion.div initial={{ opacity: 0, x: -24 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }} className="liquid-glass" style={{ borderRadius: 20, padding: 32 }}>
          <div style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: 22, color: '#ffffff', marginBottom: 16 }}>Free</div>
          <div style={{ marginBottom: 24, paddingBottom: 24, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <span style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: 48, color: '#ffffff' }}>$0</span>
            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 16, fontFamily: "'Barlow', sans-serif", fontWeight: 300 }}>/month</span>
          </div>
          <div style={{ marginBottom: 28 }}>
            {freeFeatures.map(f => (
              <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>✓</span>
                <span style={{ fontFamily: "'Barlow', sans-serif", fontWeight: 300, fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>{f}</span>
              </div>
            ))}
          </div>
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="liquid-glass-strong" style={{ width: '100%', padding: '13px', borderRadius: 40, border: 'none', color: '#ffffff', fontFamily: "'Barlow', sans-serif", fontWeight: 500, fontSize: 14, cursor: 'pointer' }}>
            Get started free
          </motion.button>
        </motion.div>

        <motion.div initial={{ opacity: 0, x: 24 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }} className="liquid-glass-strong" style={{ borderRadius: 20, padding: 32, border: '1px solid rgba(255,255,255,0.2)' }}>
          <div style={{ display: 'inline-block', background: '#ffffff', color: '#000', fontFamily: "'Barlow', sans-serif", fontWeight: 600, fontSize: 11, borderRadius: 20, padding: '3px 12px', marginBottom: 12 }}>Most Popular</div>
          <div style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: 22, color: '#ffffff', marginBottom: 16 }}>Pro</div>
          <div style={{ marginBottom: 24, paddingBottom: 24, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <span style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: 48, color: '#ffffff' }}>$9</span>
            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 16, fontFamily: "'Barlow', sans-serif", fontWeight: 300 }}>/month</span>
          </div>
          <div style={{ marginBottom: 28 }}>
            {proFeatures.map(f => (
              <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <span style={{ color: '#ffffff', fontSize: 13 }}>✓</span>
                <span style={{ fontFamily: "'Barlow', sans-serif", fontWeight: 300, fontSize: 13, color: '#ffffff' }}>{f}</span>
              </div>
            ))}
          </div>
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} style={{ width: '100%', padding: '13px', borderRadius: 40, border: 'none', background: '#ffffff', color: '#000', fontFamily: "'Barlow', sans-serif", fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
            Upgrade to Pro →
          </motion.button>
        </motion.div>
      </div>
    </section>
  )
}

// ─── CTA + FOOTER ─────────────────────────────────────────────────────────────
function CTAFooter({ onTermsClick }) {
  return (
    <ParallaxSection src="/images/city-silhouette.png" opacity={0.3}
      style={{ padding: '96px 0 0' }}
      overlayStyle={{ background: 'linear-gradient(to bottom, #000 0%, transparent 20%, #000 100%)' }}
    >
      <div style={{ maxWidth: 900, margin: '0 auto', textAlign: 'center', padding: '0 24px 96px', position: 'relative', zIndex: 1 }}>
        <motion.div animate={{ opacity: [0.4, 0.7, 0.4] }} transition={{ duration: 5, repeat: Infinity }}
          style={{ position: 'absolute', top: '-10%', left: '50%', transform: 'translateX(-50%)', width: 700, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(168,85,247,0.07) 0%, transparent 65%)', filter: 'blur(40px)', pointerEvents: 'none' }} />
        <h2 style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: 'clamp(2.5rem, 7vw, 5rem)', color: '#ffffff', lineHeight: 0.9, letterSpacing: '-0.03em', marginBottom: 24 }}>
          <BlurText text="Your next property search starts here." />
        </h2>
        <p style={{ fontFamily: "'Barlow', sans-serif", fontWeight: 300, fontSize: 17, color: 'rgba(255,255,255,0.5)', marginBottom: 40, lineHeight: 1.7 }}>
          Free to start. Instant results. No credit card required.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }} className="liquid-glass-strong"
            style={{ borderRadius: 40, padding: '14px 32px', fontFamily: "'Barlow', sans-serif", fontSize: 14, color: '#ffffff', border: 'none', cursor: 'pointer' }}>
            Start for free →
          </motion.button>
          <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
            style={{ borderRadius: 40, padding: '14px 32px', fontFamily: "'Barlow', sans-serif", fontWeight: 600, fontSize: 14, background: '#ffffff', color: '#000', border: 'none', cursor: 'pointer' }}>
            See pricing
          </motion.button>
        </div>
      </div>

      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '28px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: 18, color: 'rgba(255,255,255,0.5)' }}>DW<span style={{ opacity: 0.4 }}>.</span>ELLING</div>
          <span style={{ fontFamily: "'Barlow', sans-serif", fontWeight: 300, fontSize: 12, color: 'rgba(255,255,255,0.25)' }}>© 2025 Dwelling. All rights reserved.</span>
          <div style={{ display: 'flex', gap: 20 }}>
            <button onClick={onTermsClick} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'Barlow', sans-serif", fontWeight: 300, fontSize: 12, color: 'rgba(255,255,255,0.3)', textDecoration: 'underline', padding: 0 }}
              onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.6)'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.3)'}>Terms & Conditions</button>
            <span style={{ fontFamily: "'Barlow', sans-serif", fontWeight: 300, fontSize: 12, color: 'rgba(255,255,255,0.25)' }}>Not financial advice</span>
          </div>
        </div>
      </footer>
    </ParallaxSection>
  )
}

// ─── APP ──────────────────────────────────────────────────────────────────────
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

  const subscribeToUserRecord = (userId) => {
    if (realtimeRef.current) supabase.removeChannel(realtimeRef.current)
    const channel = supabase.channel(`user-${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users', filter: `id=eq.${userId}` },
        (payload) => { if (payload.new) setUserRecord(payload.new) })
      .subscribe()
    realtimeRef.current = channel
  }

  const loadUserRecord = async (userId) => {
    const { data } = await supabase.from('users').select('*').eq('id', userId).maybeSingle()
    if (data) { setUserRecord(data) } else {
      let attempts = 0
      const interval = setInterval(async () => {
        attempts++
        const { data: r } = await supabase.from('users').select('*').eq('id', userId).maybeSingle()
        if (r) { setUserRecord(r); clearInterval(interval) }
        if (attempts >= 10) clearInterval(interval)
      }, 600)
    }
    subscribeToUserRecord(userId)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) { setUser(session.user); loadUserRecord(session.user.id) }
      setAuthLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) { setUser(session.user); loadUserRecord(session.user.id) }
      else { setUser(null); setUserRecord(null); if (realtimeRef.current) supabase.removeChannel(realtimeRef.current) }
    })
    return () => { subscription.unsubscribe(); if (realtimeRef.current) supabase.removeChannel(realtimeRef.current) }
  }, [])

  useEffect(() => {
    if (result) {
      const addr = [result.geo.userStreet, result.geo.userCity, result.geo.userCountry].filter(Boolean).join(', ')
      document.title = `${addr} — Dwelling`
    } else { document.title = 'Dwelling — Property Intelligence' }
  }, [result])

  const handleAuth = (u) => { setUser(u); loadUserRecord(u.id) }
  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setUser(null); setUserRecord(null); setResult(null)
    if (realtimeRef.current) supabase.removeChannel(realtimeRef.current)
  }

  const handleSearch = async ({ street, city, state, country, knownFacts }) => {
    if (loading) return
    setLoading(true); setError(null); setResult(null); setLoadStep(0)
    try {
      const geo = await geocodeStructured({ street, city, state, country })
      setLoadStep(1)
      const postcode = geo.address?.postcode ?? ''
      const [weather, climate, neighborhoodScores] = await Promise.all([getCurrentWeather(geo.lat, geo.lon), getClimateNormals(geo.lat, geo.lon), getNeighborhoodScores(geo.lat, geo.lon)])
      setLoadStep(2)
      const [censusData, fmr, floodZone] = await Promise.all([getCensusData(street, city, state, country), getFairMarketRent(postcode), getFloodZone(geo.lat, geo.lon)])
      setLoadStep(3)
      const realData = { neighborhoodScores, censusData, fmr, floodZone }
      const ai = await analyzeProperty(geo, weather, climate, knownFacts ?? {}, realData)
      setLoadStep(4)
      setResult({ geo, weather, climate, ai, knownFacts: knownFacts ?? {}, realData })
    } catch (err) {
      console.error(err)
      if (err.message?.includes('Extension context invalidated') || err.message?.includes('context invalidated')) return
      if (err.message?.includes('limit reached') || err.message?.includes('429')) setShowPaywall(true)
      else setError(err.message ?? 'Something went wrong.')
    } finally { setLoading(false) }
  }

  const handleRecalculate = async (corrections) => {
    if (!result) return
    setLoading(true); setError(null)
    try {
      const mergedFacts = { ...(result.knownFacts ?? {}), ...corrections }
      const ai = await analyzeProperty(result.geo, result.weather, result.climate, mergedFacts, result.realData)
      setResult(prev => ({ ...prev, ai, knownFacts: mergedFacts }))
    } catch (err) { setError(err.message ?? 'Recalculation failed.') }
    finally { setLoading(false) }
  }

  const analysesLeft = userRecord ? (userRecord.is_pro ? '∞' : Math.max(0, FREE_LIMIT - (userRecord.analyses_used ?? 0))) : '...'

  if (authLoading) return (
    <div style={{ minHeight: '100vh', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 2, repeat: Infinity }}
        style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: 28, color: '#ffffff' }}>
        DW<span style={{ opacity: 0.4 }}>.</span>ELLING
      </motion.div>
    </div>
  )

  if (!user) return <AuthModal onAuth={handleAuth} />

  return (
    <div style={{ minHeight: '100vh', background: '#000', display: 'flex', flexDirection: 'column' }}>
      <GlobalBackground />
      {showTerms && <TermsModal onClose={() => setShowTerms(false)} />}
      {showPaywall && <PaywallModal onClose={() => setShowPaywall(false)} onUpgrade={() => alert('Stripe coming soon!')} />}

      <Navbar user={user} userRecord={userRecord} analysesLeft={analysesLeft} onSignOut={handleSignOut} onHome={() => setResult(null)} />

      {(result || loading) ? (
        <div style={{ maxWidth: 960, margin: '0 auto', padding: '100px 24px 80px', width: '100%', position: 'relative', zIndex: 1 }}>
          {!loading && result && (
            <div style={{ marginBottom: 24 }}>
              <div style={{ marginBottom: 16 }}>
                <motion.button onClick={() => setResult(null)} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }} className="liquid-glass"
                  style={{ borderRadius: 40, padding: '8px 16px', fontSize: 13, fontFamily: "'Barlow', sans-serif", color: 'rgba(255,255,255,0.6)', border: 'none', cursor: 'pointer' }}>
                  ← New search
                </motion.button>
              </div>
              <AddressSearch onSearch={handleSearch} loading={loading} compact />
            </div>
          )}
          {loading && <LoadingState step={loadStep} />}
          {error && (
            <div className="liquid-glass" style={{ borderRadius: 14, padding: '14px 20px', border: '1px solid rgba(248,113,113,0.3)', background: 'rgba(248,113,113,0.08)', marginBottom: 16 }}>
              <p style={{ fontFamily: "'Barlow', sans-serif", fontSize: 13, color: '#f87171' }}>⚠ {error}</p>
            </div>
          )}
          {result && !loading && <Dashboard data={result} onRecalculate={handleRecalculate} />}
        </div>
      ) : (
        <div style={{ position: 'relative', zIndex: 1 }}>
          <Hero onSearch={handleSearch} loading={loading} />
          <HowItWorks />
          <FeatureRows />
          <FeaturesGrid />
          <Stats />
          <Pricing />
          <FAQ />
          <CTAFooter onTermsClick={() => setShowTerms(true)} />
        </div>
      )}
    </div>
  )
}
