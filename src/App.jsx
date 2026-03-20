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

// ─── FADE UP VARIANTS ───────────────────────────────
const fadeUp = {
  initial: { opacity: 0, y: 40 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.7, ease: [0.25, 0.1, 0.25, 1] },
}

// ─── TERMS MODAL ────────────────────────────────────
const TERMS_DATA = [
  { title: '1. Definitions', body: '"Platform" means the Dwelling website and all associated services. "Company" refers to Dwelling. "User" refers to any individual accessing the Platform.' },
  { title: '2. Services', body: 'The Platform provides automated property intelligence reports based on publicly available data and AI-generated analysis. All Services are provided on an "as-is" basis.' },
  { title: '3. No Professional Advice', body: 'ALL CONTENT IS FOR INFORMATIONAL PURPOSES ONLY. Nothing constitutes financial, real estate, investment, legal, medical, or tax advice. Always consult a qualified licensed professional before making any property-related decision.' },
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

function TermsModal({ onClose }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        onClick={e => e.stopPropagation()}
        className="liquid-glass-strong"
        style={{ borderRadius: 24, maxWidth: 720, width: '100%', height: '85vh', display: 'flex', flexDirection: 'column' }}
      >
        <div style={{ padding: '20px 28px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <span style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: 22, color: '#ffffff' }}>Terms & Conditions</span>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#ffffff', fontFamily: "'Barlow', sans-serif", fontSize: 12, padding: '6px 14px', cursor: 'pointer' }}>✕ Close</button>
        </div>
        <div style={{ flex: 1, overflowY: 'scroll', padding: '24px 28px' }}>
          <p style={{ fontFamily: "'Barlow', sans-serif", fontWeight: 300, fontSize: 12, color: 'rgba(255,255,255,0.3)', marginBottom: 24 }}>Last updated: June 2025</p>
          {TERMS_DATA.map(({ title, body }) => (
            <div key={title} style={{ marginBottom: 24 }}>
              <div style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: 16, color: '#ffffff', marginBottom: 8 }}>{title}</div>
              <p style={{ fontFamily: "'Barlow', sans-serif", fontWeight: 300, fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 1.8 }}>{body}</p>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  )
}

// ─── FAQ DATA ────────────────────────────────────────
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
    <section style={{ padding: '96px 24px', maxWidth: 720, margin: '0 auto', position: 'relative', zIndex: 1 }}>
      <motion.div {...fadeUp} style={{ marginBottom: 12 }}>
        <span className="liquid-glass" style={{ borderRadius: 40, display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 16px', marginBottom: 20 }}>
          <span style={{ fontFamily: "'Barlow', sans-serif", fontWeight: 500, fontSize: 12, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.06em' }}>Support</span>
        </span>
      </motion.div>
      <motion.h2 {...fadeUp} transition={{ duration: 0.7, delay: 0.1, ease: [0.25, 0.1, 0.25, 1] }}
        style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: 'clamp(2rem, 5vw, 3rem)', color: '#ffffff', lineHeight: 0.9, marginBottom: 48 }}>
        <BlurText text="Questions, answered." />
      </motion.h2>
      {FAQ_ITEMS.map((item, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: i * 0.05, ease: [0.25, 0.1, 0.25, 1] }}
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
            <motion.span
              animate={{ rotate: open === i ? 45 : 0 }}
              transition={{ duration: 0.2 }}
              style={{ fontFamily: "'Barlow', sans-serif", fontSize: 20, color: 'rgba(255,255,255,0.4)', flexShrink: 0, width: 24, textAlign: 'center', display: 'block' }}
            >+</motion.span>
          </button>
          <AnimatePresence>
            {open === i && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: 'easeInOut' }}
              >
                <div style={{ padding: '0 24px 20px 24px' }}>
                  <p style={{ fontFamily: "'Barlow', sans-serif", fontWeight: 300, fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.8 }}>{item.a}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      ))}
    </section>
  )
}

// ─── NAVBAR ──────────────────────────────────────────
function Navbar({ user, userRecord, analysesLeft, onSignOut, onNewSearch, hasResult }) {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', handler)
    return () => window.removeEventListener('scroll', handler)
  }, [])

  const isPro = userRecord?.is_pro
  const lowUsage = typeof analysesLeft === 'number' && analysesLeft <= 3

  return (
    <motion.nav
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
        padding: '16px 24px',
        transition: 'background 0.3s, border-color 0.3s, backdrop-filter 0.3s',
        ...(scrolled ? {
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        } : {}),
      }}
    >
      <div style={{ maxWidth: 1280, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {/* Logo */}
        <button
          onClick={onNewSearch}
          style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: 20, color: '#ffffff', letterSpacing: '-0.01em' }}
        >
          DW<span style={{ opacity: 0.4 }}>.</span>ELLING
        </button>

        {/* Right side */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Usage counter */}
          <motion.div
            className="liquid-glass"
            style={{ borderRadius: 40, padding: '6px 14px' }}
            animate={lowUsage && !isPro ? { borderColor: ['rgba(255,255,255,0.08)', 'rgba(248,113,113,0.5)', 'rgba(255,255,255,0.08)'] } : {}}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <span style={{ fontFamily: "'Barlow', sans-serif", fontWeight: 400, fontSize: 12, color: isPro ? '#fbbf24' : lowUsage ? '#f87171' : 'rgba(255,255,255,0.6)' }}>
              {isPro ? '★ Pro' : `${analysesLeft} / ${FREE_LIMIT} left`}
            </span>
          </motion.div>

          {hasResult && (
            <motion.button
              onClick={onNewSearch}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.97 }}
              className="liquid-glass"
              style={{ borderRadius: 40, padding: '7px 16px', border: 'none', background: 'transparent', color: 'rgba(255,255,255,0.7)', fontFamily: "'Barlow', sans-serif", fontSize: 12, cursor: 'pointer' }}
            >
              ← New Search
            </motion.button>
          )}
          <motion.button
            onClick={onSignOut}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.97 }}
            style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.35)', fontFamily: "'Barlow', sans-serif", fontSize: 12, cursor: 'pointer', padding: '7px 4px', transition: 'color 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.7)'}
            onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.35)'}
          >
            Sign Out
          </motion.button>
        </div>
      </div>
    </motion.nav>
  )
}

// ─── HERO ────────────────────────────────────────────
function Hero({ onSearch, loading }) {
  const { scrollY } = useScroll()
  const bgY = useTransform(scrollY, [0, 600], [0, 180])

  return (
    <section style={{ position: 'relative', minHeight: '100vh', overflow: 'hidden', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {/* Hero background image with parallax */}
      <motion.div
        style={{
          position: 'absolute', inset: '-10%',
          backgroundImage: 'url(/images/hero-neighborhood.png)',
          backgroundSize: 'cover', backgroundPosition: 'center',
          opacity: 0.35,
          y: bgY,
        }}
      />
      {/* Grid overlay */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 1,
        backgroundImage: 'repeating-linear-gradient(rgba(255,255,255,0.04) 0px, rgba(255,255,255,0.04) 1px, transparent 1px, transparent 60px), repeating-linear-gradient(90deg, rgba(255,255,255,0.04) 0px, rgba(255,255,255,0.04) 1px, transparent 1px, transparent 60px)',
      }} />
      {/* Top fade */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 200, background: 'linear-gradient(to bottom, #000, transparent)', zIndex: 2 }} />
      {/* Bottom fade */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 256, background: 'linear-gradient(to top, #000, transparent)', zIndex: 2 }} />

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 10, textAlign: 'center', padding: '128px 24px 96px', maxWidth: 900, margin: '0 auto', width: '100%' }}>
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          style={{ display: 'inline-flex', marginBottom: 32 }}
        >
          <span className="liquid-glass" style={{ borderRadius: 40, display: 'inline-flex', alignItems: 'center', gap: 10, padding: '8px 16px 8px 8px' }}>
            <span style={{ background: '#ffffff', color: '#000', fontFamily: "'Barlow', sans-serif", fontWeight: 600, fontSize: 10, borderRadius: 20, padding: '3px 10px', letterSpacing: '0.04em' }}>AI Powered</span>
            <span style={{ fontFamily: "'Barlow', sans-serif", fontWeight: 300, fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>Know what any home is worth — instantly.</span>
          </span>
        </motion.div>

        {/* Heading */}
        <motion.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: 'clamp(3.5rem, 9vw, 7rem)', color: '#ffffff', lineHeight: 0.87, letterSpacing: '-3px', marginBottom: 32 }}
        >
          <BlurText text="Property Intelligence. Reimagined." />
        </motion.h1>

        {/* Subheading */}
        <motion.p
          initial={{ opacity: 0, filter: 'blur(8px)' }}
          animate={{ opacity: 1, filter: 'blur(0px)' }}
          transition={{ duration: 0.7, delay: 0.8 }}
          style={{ fontFamily: "'Barlow', sans-serif", fontWeight: 300, fontSize: 17, color: 'rgba(255,255,255,0.5)', maxWidth: 580, margin: '0 auto 48px', lineHeight: 1.7 }}
        >
          Enter any address in the world. Get real market data, neighborhood scores, climate analysis, and AI-powered investment insights — instantly.
        </motion.p>

        {/* Search form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1.1 }}
          style={{ maxWidth: 640, margin: '0 auto 24px' }}
        >
          <AddressSearch onSearch={onSearch} loading={loading} />
        </motion.div>

        {/* Stats row */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1.4 }}
          style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}
        >
          {[
            { value: '140M+', label: 'US Properties' },
            { value: '50+', label: 'Countries' },
            { value: '10 free', label: 'Per month' },
            { value: '<30s', label: 'Analysis time' },
          ].map((s) => (
            <div key={s.label} className="liquid-glass" style={{ borderRadius: 40, padding: '8px 18px', textAlign: 'center', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: 16, color: '#ffffff' }}>{s.value}</span>
              <span style={{ fontFamily: "'Barlow', sans-serif", fontWeight: 300, fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{s.label}</span>
            </div>
          ))}
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          style={{ position: 'absolute', bottom: 32, left: '50%', transform: 'translateX(-50%)' }}
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <span style={{ fontFamily: "'Barlow', sans-serif", fontWeight: 300, fontSize: 11, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Scroll to explore</span>
            <svg width="16" height="10" viewBox="0 0 16 10" fill="none"><path d="M1 1l7 7 7-7" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

// ─── HOW IT WORKS ────────────────────────────────────
function HowItWorks() {
  const steps = [
    { num: '01', icon: '📍', title: 'Enter an address', desc: 'Type any address in the world — street, city, country. Dwelling geocodes it and begins data collection instantly.' },
    { num: '02', icon: '⚡', title: 'Data pulls in real time', desc: 'We fetch from OpenStreetMap, US Census, HUD, FEMA, Open-Meteo, and more — all in parallel, all live.' },
    { num: '03', icon: '🧠', title: 'AI builds your report', desc: 'Cerebras LLaMA synthesises the data into a structured intelligence report in under 30 seconds.' },
  ]
  return (
    <section style={{ padding: '128px 24px', position: 'relative', overflow: 'hidden' }}>
      {/* Background image */}
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'url(/images/neighborhood-night.png)', backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.22, animation: 'ken-burns 20s ease-in-out infinite alternate' }} />
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 200, background: 'linear-gradient(to bottom, #000, transparent)' }} />
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 200, background: 'linear-gradient(to top, #000, transparent)' }} />

      <div style={{ maxWidth: 1100, margin: '0 auto', position: 'relative', zIndex: 1 }}>
        <motion.div {...fadeUp} style={{ marginBottom: 12 }}>
          <span className="liquid-glass" style={{ borderRadius: 40, display: 'inline-flex', alignItems: 'center', padding: '6px 16px' }}>
            <span style={{ fontFamily: "'Barlow', sans-serif", fontWeight: 500, fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>How It Works</span>
          </span>
        </motion.div>
        <motion.h2 {...fadeUp} transition={{ duration: 0.7, delay: 0.1, ease: [0.25, 0.1, 0.25, 1] }}
          style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: 'clamp(2rem, 5vw, 3.5rem)', color: '#ffffff', lineHeight: 0.9, marginBottom: 16 }}>
          <BlurText text="Enter an address. Get everything." />
        </motion.h2>
        <motion.p {...fadeUp} transition={{ duration: 0.7, delay: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
          style={{ fontFamily: "'Barlow', sans-serif", fontWeight: 300, fontSize: 15, color: 'rgba(255,255,255,0.45)', maxWidth: 500, marginBottom: 64, lineHeight: 1.8 }}>
          Three steps. Thirty seconds. Everything you need to understand any property in the world.
        </motion.p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
          {steps.map((step, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.12, ease: [0.25, 0.1, 0.25, 1] }}
              whileHover={{ scale: 1.02, y: -4 }}
              className="liquid-glass"
              style={{ borderRadius: 24, padding: 32, cursor: 'default' }}
            >
              <div style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: 56, color: 'rgba(255,255,255,0.07)', marginBottom: 16, lineHeight: 1 }}>{step.num}</div>
              <div className="liquid-glass-strong" style={{ borderRadius: 40, width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16, fontSize: 18 }}>{step.icon}</div>
              <h3 style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: 20, color: '#ffffff', marginBottom: 12 }}>{step.title}</h3>
              <p style={{ fontFamily: "'Barlow', sans-serif", fontWeight: 300, fontSize: 13, color: 'rgba(255,255,255,0.45)', lineHeight: 1.8 }}>{step.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── FEATURES ALTERNATING ────────────────────────────
function FeaturesAlternating() {
  const rows = [
    {
      title: 'Know what a home is really worth.',
      desc: 'AI-powered valuation using real census data, HUD fair market rents, and neighborhood intelligence. No guesswork — just data.',
      image: '/images/house-night.png',
      fromDir: 'right',
    },
    {
      title: 'Neighborhood intelligence that\'s actually real.',
      desc: 'Walk scores, transit access, school proximity, safety indices — all calculated from live OpenStreetMap data within a 2km radius.',
      image: '/images/map-pins.png',
      fromDir: 'left',
    },
    {
      title: 'Investment analysis you can act on.',
      desc: 'Price history trends, rental yield estimates, flood risk, climate projections, and a composite investment score for every property.',
      image: '/images/price-chart.png',
      fromDir: 'right',
    },
  ]

  return (
    <section style={{ padding: '96px 24px', maxWidth: 1100, margin: '0 auto', position: 'relative', zIndex: 1 }}>
      {/* Background texture */}
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'url(/images/architecture-texture.png)', backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.07, borderRadius: 32 }} />

      <motion.div {...fadeUp} style={{ marginBottom: 12 }}>
        <span className="liquid-glass" style={{ borderRadius: 40, display: 'inline-flex', alignItems: 'center', padding: '6px 16px' }}>
          <span style={{ fontFamily: "'Barlow', sans-serif", fontWeight: 500, fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>Features</span>
        </span>
      </motion.div>
      <motion.h2 {...fadeUp} transition={{ duration: 0.7, delay: 0.1, ease: [0.25, 0.1, 0.25, 1] }}
        style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: 'clamp(2rem, 5vw, 3rem)', color: '#ffffff', lineHeight: 0.9, marginBottom: 80 }}>
        <BlurText text="Everything you need. Nothing you don't." />
      </motion.h2>

      {rows.map((row, i) => (
        <div key={i} style={{ display: 'flex', gap: 64, alignItems: 'center', flexDirection: i % 2 === 0 ? 'row' : 'row-reverse', padding: '48px 0', borderBottom: i < rows.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none', flexWrap: 'wrap' }}>
          {/* Text */}
          <motion.div
            initial={{ opacity: 0, x: row.fromDir === 'right' ? -40 : 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, ease: [0.25, 0.1, 0.25, 1] }}
            style={{ flex: '1 1 300px' }}
          >
            <h3 style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: 'clamp(1.6rem, 3vw, 2.2rem)', color: '#ffffff', marginBottom: 16, lineHeight: 1.1 }}>{row.title}</h3>
            <p style={{ fontFamily: "'Barlow', sans-serif", fontWeight: 300, fontSize: 15, color: 'rgba(255,255,255,0.5)', lineHeight: 1.8, marginBottom: 28 }}>{row.desc}</p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.97 }}
              className="liquid-glass-strong"
              style={{ borderRadius: 40, padding: '10px 24px', border: 'none', background: 'transparent', color: '#ffffff', fontFamily: "'Barlow', sans-serif", fontSize: 13, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
            >
              Learn more →
            </motion.button>
          </motion.div>

          {/* Image */}
          <motion.div
            initial={{ opacity: 0, x: row.fromDir === 'right' ? 40 : -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, ease: [0.25, 0.1, 0.25, 1] }}
            style={{ flex: '1 1 300px' }}
          >
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              className="liquid-glass"
              style={{ borderRadius: 20, overflow: 'hidden', aspectRatio: '16/10' }}
            >
              <img src={row.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            </motion.div>
          </motion.div>
        </div>
      ))}
    </section>
  )
}

// ─── FEATURES GRID ───────────────────────────────────
function FeaturesGrid() {
  const cards = [
    { icon: '🌍', title: 'Global Coverage', desc: 'Any address in the world. 50+ countries. Real data wherever you search.' },
    { icon: '📊', title: 'Real Data Sources', desc: 'Census Bureau, HUD, FEMA, OpenStreetMap, Open-Meteo. No made-up numbers.' },
    { icon: '⚡', title: 'Instant Analysis', desc: 'Full property intelligence report generated in under 30 seconds.' },
    { icon: '🔒', title: 'Secure & Private', desc: 'Your searches are never stored. Bank-grade auth with Supabase.' },
  ]
  return (
    <section style={{ padding: '96px 24px', maxWidth: 1100, margin: '0 auto', position: 'relative', zIndex: 1 }}>
      <motion.div {...fadeUp} style={{ marginBottom: 12 }}>
        <span className="liquid-glass" style={{ borderRadius: 40, display: 'inline-flex', padding: '6px 16px' }}>
          <span style={{ fontFamily: "'Barlow', sans-serif", fontWeight: 500, fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>Why Dwelling</span>
        </span>
      </motion.div>
      <motion.h2 {...fadeUp} transition={{ duration: 0.7, delay: 0.1, ease: [0.25, 0.1, 0.25, 1] }}
        style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: 'clamp(2rem, 5vw, 3rem)', color: '#ffffff', lineHeight: 0.9, marginBottom: 48 }}>
        <BlurText text="Built on real data." />
      </motion.h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
        {cards.map((card, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: i * 0.08, ease: [0.25, 0.1, 0.25, 1] }}
            whileHover={{ scale: 1.02, y: -4 }}
            className="liquid-glass"
            style={{ borderRadius: 20, padding: 24 }}
          >
            <div className="liquid-glass-strong" style={{ borderRadius: 40, width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20, fontSize: 18 }}>{card.icon}</div>
            <h3 style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: 18, color: '#ffffff', marginBottom: 8 }}>{card.title}</h3>
            <p style={{ fontFamily: "'Barlow', sans-serif", fontWeight: 300, fontSize: 13, color: 'rgba(255,255,255,0.45)', lineHeight: 1.7 }}>{card.desc}</p>
          </motion.div>
        ))}
      </div>
    </section>
  )
}

// ─── STATS ───────────────────────────────────────────
function Stats() {
  const stats = [
    { target: 140, suffix: 'M+', label: 'US Properties' },
    { target: 50, suffix: '+', label: 'Countries' },
    { target: 10, suffix: '', label: 'Free / Month' },
    { target: 30, prefix: '<', suffix: 's', label: 'Seconds avg' },
  ]
  return (
    <section style={{ padding: '96px 24px', maxWidth: 1000, margin: '0 auto', position: 'relative', zIndex: 1 }}>
      {/* Glow */}
      <motion.div
        style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)', filter: 'blur(40px)', pointerEvents: 'none' }}
        animate={{ opacity: [0.4, 0.8, 0.4] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7 }}
        className="liquid-glass-strong"
        style={{ borderRadius: 28, padding: '64px 48px', position: 'relative', zIndex: 1 }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 32, textAlign: 'center' }}>
          {stats.map((s, i) => (
            <div key={i}>
              <div style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: 'clamp(2.5rem, 5vw, 3.5rem)', color: '#ffffff', lineHeight: 1, marginBottom: 8 }}>
                <CountUp target={s.target} suffix={s.suffix} prefix={s.prefix ?? ''} />
              </div>
              <div style={{ fontFamily: "'Barlow', sans-serif", fontWeight: 300, fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </motion.div>
    </section>
  )
}

// ─── PRICING ─────────────────────────────────────────
function Pricing() {
  const freeFeatures = ['10 analyses/month', 'All data sources', 'AI property analysis', 'Neighborhood scores', 'Climate data']
  const proFeatures = ['Unlimited analyses', 'All data sources', 'AI property analysis', 'Neighborhood scores', 'Climate data', 'Priority support', 'Export reports']
  return (
    <section style={{ padding: '96px 24px', maxWidth: 800, margin: '0 auto', position: 'relative', zIndex: 1 }}>
      <motion.div {...fadeUp} style={{ marginBottom: 12 }}>
        <span className="liquid-glass" style={{ borderRadius: 40, display: 'inline-flex', padding: '6px 16px' }}>
          <span style={{ fontFamily: "'Barlow', sans-serif", fontWeight: 500, fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>Pricing</span>
        </span>
      </motion.div>
      <motion.h2 {...fadeUp} transition={{ duration: 0.7, delay: 0.1, ease: [0.25, 0.1, 0.25, 1] }}
        style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: 'clamp(2rem, 5vw, 3rem)', color: '#ffffff', lineHeight: 0.9, marginBottom: 48 }}>
        <BlurText text="Simple. Transparent. Fair." />
      </motion.h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
        {/* Free */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="liquid-glass"
          style={{ borderRadius: 24, padding: 32 }}
        >
          <div style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: 22, color: '#ffffff', marginBottom: 4 }}>Free</div>
          <div style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: 48, color: '#ffffff', lineHeight: 1, marginBottom: 4 }}>
            $0<span style={{ fontFamily: "'Barlow', sans-serif", fontStyle: 'normal', fontSize: 16, color: 'rgba(255,255,255,0.4)', fontWeight: 300 }}>/month</span>
          </div>
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', margin: '20px 0' }} />
          {freeFeatures.map(f => (
            <div key={f} style={{ fontFamily: "'Barlow', sans-serif", fontWeight: 300, fontSize: 13, color: 'rgba(255,255,255,0.6)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ opacity: 0.5 }}>✓</span> {f}
            </div>
          ))}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.97 }}
            className="liquid-glass-strong"
            style={{ width: '100%', marginTop: 24, padding: '12px', border: 'none', borderRadius: 40, color: '#ffffff', fontFamily: "'Barlow', sans-serif", fontSize: 13, fontWeight: 500, cursor: 'pointer', background: 'transparent' }}
          >
            Get started free
          </motion.button>
        </motion.div>

        {/* Pro */}
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="liquid-glass-strong"
          style={{ borderRadius: 24, padding: 32, border: '1px solid rgba(255,255,255,0.18)', transform: 'scale(1.02)' }}
        >
          <div style={{ display: 'inline-block', background: '#ffffff', color: '#000', fontFamily: "'Barlow', sans-serif", fontWeight: 600, fontSize: 10, borderRadius: 20, padding: '3px 12px', marginBottom: 12, letterSpacing: '0.06em' }}>Most Popular</div>
          <div style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: 22, color: '#ffffff', marginBottom: 4 }}>Pro</div>
          <div style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: 48, color: '#ffffff', lineHeight: 1, marginBottom: 4 }}>
            $9<span style={{ fontFamily: "'Barlow', sans-serif", fontStyle: 'normal', fontSize: 16, color: 'rgba(255,255,255,0.4)', fontWeight: 300 }}>/month</span>
          </div>
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', margin: '20px 0' }} />
          {proFeatures.map(f => (
            <div key={f} style={{ fontFamily: "'Barlow', sans-serif", fontWeight: 300, fontSize: 13, color: '#ffffff', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ opacity: 0.7 }}>✓</span> {f}
            </div>
          ))}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.97 }}
            style={{ width: '100%', marginTop: 24, padding: '12px', border: 'none', borderRadius: 40, background: '#ffffff', color: '#000', fontFamily: "'Barlow', sans-serif", fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
          >
            Upgrade to Pro →
          </motion.button>
        </motion.div>
      </div>
    </section>
  )
}

// ─── CTA FOOTER ──────────────────────────────────────
function CTAFooter({ onTermsClick }) {
  return (
    <section style={{ padding: '128px 24px 64px', position: 'relative', overflow: 'hidden', textAlign: 'center' }}>
      {/* City silhouette bg */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundImage: 'url(/images/city-silhouette.png)', backgroundSize: 'cover', backgroundPosition: 'center bottom', opacity: 0.3, height: '70%' }}>
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 300, background: 'linear-gradient(to top, #000, transparent)' }} />
      </div>

      {/* Glow */}
      <motion.div
        style={{ position: 'absolute', top: '30%', left: '50%', transform: 'translateX(-50%)', width: 700, height: 700, borderRadius: '50%', background: 'radial-gradient(circle, rgba(168,85,247,0.06) 0%, transparent 70%)', filter: 'blur(40px)', pointerEvents: 'none' }}
        animate={{ opacity: [0.4, 0.8, 0.4] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 800, margin: '0 auto' }}>
        <motion.h2 {...fadeUp}
          style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: 'clamp(2.5rem, 7vw, 5rem)', color: '#ffffff', lineHeight: 0.9, marginBottom: 24 }}>
          <BlurText text="Your next property search starts here." />
        </motion.h2>
        <motion.p {...fadeUp} transition={{ duration: 0.7, delay: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
          style={{ fontFamily: "'Barlow', sans-serif", fontWeight: 300, fontSize: 17, color: 'rgba(255,255,255,0.45)', marginBottom: 40, lineHeight: 1.7 }}>
          Free to start. No credit card required.
        </motion.p>
        <motion.div {...fadeUp} transition={{ duration: 0.7, delay: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
          style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 128 }}>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.97 }}
            className="liquid-glass-strong"
            style={{ borderRadius: 40, padding: '14px 32px', border: 'none', background: 'transparent', color: '#ffffff', fontFamily: "'Barlow', sans-serif", fontSize: 14, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
          >
            📍 Search any address
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.97 }}
            style={{ borderRadius: 40, padding: '14px 32px', border: 'none', background: '#ffffff', color: '#000', fontFamily: "'Barlow', sans-serif", fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
          >
            Upgrade to Pro →
          </motion.button>
        </motion.div>

        {/* Footer */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <span style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: 18, color: 'rgba(255,255,255,0.5)' }}>DW<span style={{ opacity: 0.4 }}>.</span>ELLING</span>
          <span style={{ fontFamily: "'Barlow', sans-serif", fontWeight: 300, fontSize: 12, color: 'rgba(255,255,255,0.25)' }}>© 2025 Dwelling. All rights reserved.</span>
          <div style={{ display: 'flex', gap: 20 }}>
            <button onClick={onTermsClick} style={{ background: 'transparent', border: 'none', fontFamily: "'Barlow', sans-serif", fontWeight: 300, fontSize: 12, color: 'rgba(255,255,255,0.3)', cursor: 'pointer', transition: 'color 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.6)'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.3)'}
            >
              Terms & Conditions
            </button>
            <span style={{ fontFamily: "'Barlow', sans-serif", fontWeight: 300, fontSize: 12, color: 'rgba(255,255,255,0.25)' }}>Not financial advice</span>
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── MAIN APP ────────────────────────────────────────
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
    const channel = supabase
      .channel(`user-${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users', filter: `id=eq.${userId}` },
        (payload) => { if (payload.new) setUserRecord(payload.new) }
      ).subscribe()
    realtimeRef.current = channel
  }

  const loadUserRecord = async (userId) => {
    const { data } = await supabase.from('users').select('*').eq('id', userId).maybeSingle()
    if (data) {
      setUserRecord(data)
    } else {
      let attempts = 0
      const interval = setInterval(async () => {
        attempts++
        const { data: retryData } = await supabase.from('users').select('*').eq('id', userId).maybeSingle()
        if (retryData) { setUserRecord(retryData); clearInterval(interval) }
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
    } else {
      document.title = 'Dwelling — Property Intelligence'
    }
  }, [result])

  const handleAuth = (authedUser) => { setUser(authedUser); loadUserRecord(authedUser.id) }
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
      const [weather, climate, neighborhoodScores] = await Promise.all([
        getCurrentWeather(geo.lat, geo.lon),
        getClimateNormals(geo.lat, geo.lon),
        getNeighborhoodScores(geo.lat, geo.lon),
      ])
      setLoadStep(2)
      const [censusData, fmr, floodZone] = await Promise.all([
        getCensusData(street, city, state, country),
        getFairMarketRent(postcode),
        getFloodZone(geo.lat, geo.lon),
      ])
      setLoadStep(3)
      const realData = { neighborhoodScores, censusData, fmr, floodZone }
      const ai = await analyzeProperty(geo, weather, climate, knownFacts ?? {}, realData)
      setLoadStep(4)
      setResult({ geo, weather, climate, ai, knownFacts: knownFacts ?? {}, realData })
    } catch (err) {
      console.error(err)
      if (err.message?.includes('Extension context invalidated') || err.message?.includes('context invalidated')) return
      if (err.message?.includes('limit reached') || err.message?.includes('429')) {
        setShowPaywall(true)
      } else {
        setError(err.message ?? 'Something went wrong.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleRecalculate = async (corrections) => {
    if (!result) return
    setLoading(true); setError(null)
    try {
      const mergedFacts = { ...(result.knownFacts ?? {}), ...corrections }
      const ai = await analyzeProperty(result.geo, result.weather, result.climate, mergedFacts, result.realData)
      setResult(prev => ({ ...prev, ai, knownFacts: mergedFacts }))
    } catch (err) {
      setError(err.message ?? 'Recalculation failed.')
    } finally {
      setLoading(false)
    }
  }

  const analysesLeft = userRecord
    ? userRecord.is_pro ? '∞' : Math.max(0, FREE_LIMIT - (userRecord.analyses_used ?? 0))
    : '...'

  // Auth loading
  if (authLoading) return (
    <div style={{ minHeight: '100vh', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <motion.div
        animate={{ opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 2, repeat: Infinity }}
        style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: 28, color: '#ffffff' }}
      >
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

      <Navbar
        user={user}
        userRecord={userRecord}
        analysesLeft={analysesLeft}
        onSignOut={handleSignOut}
        onNewSearch={() => setResult(null)}
        hasResult={!!result}
      />

      {/* Landing page (no result) */}
      {!result && !loading && (
        <main style={{ position: 'relative', zIndex: 1 }}>
          <Hero onSearch={handleSearch} loading={loading} />
          <HowItWorks />
          <FeaturesAlternating />
          <FeaturesGrid />
          <Stats />
          <Pricing />
          <FAQ />
          <CTAFooter onTermsClick={() => setShowTerms(true)} />
        </main>
      )}

      {/* Loading state */}
      {loading && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', zIndex: 1, paddingTop: 80 }}>
          <LoadingState step={loadStep} />
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div style={{ maxWidth: 800, margin: '100px auto 0', padding: '0 24px', position: 'relative', zIndex: 1 }}>
          <div className="liquid-glass" style={{ borderRadius: 16, padding: '16px 20px', border: '1px solid rgba(248,113,113,0.3)', background: 'rgba(248,113,113,0.08)' }}>
            <p style={{ fontFamily: "'Barlow', sans-serif", fontWeight: 400, fontSize: 13, color: '#f87171' }}>⚠ {error}</p>
          </div>
        </div>
      )}

      {/* Dashboard */}
      {result && !loading && (
        <div style={{ maxWidth: 1000, margin: '0 auto', padding: '100px 24px 80px', width: '100%', position: 'relative', zIndex: 1 }}>
          <div style={{ marginBottom: 24 }}>
            <AddressSearch onSearch={handleSearch} loading={loading} compact />
          </div>
          <Dashboard data={result} onRecalculate={handleRecalculate} />
        </div>
      )}
    </div>
  )
}
