import { useState, useEffect, useRef, memo, lazy, Suspense } from 'react'
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
import { getCurrentUser, getAuthToken, signOut as localSignOut, getUsage, saveCerebrasKey, getCachedCerebrasKey, loadCerebrasKeyFromServer } from './lib/localAuth'

const FREE_LIMIT = 10
const TRIAL_DAYS = 7
const LOGO = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663463031725/5FNF4QVCkxSRz6ba3cCadG/dwelling-logo-3AJU9MMgr8YxSGXWKetVFA.webp'

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function scrollTo(id) {
  const el = document.getElementById(id)
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function Section({ children, style = {} }) {
  return (
    <section style={{ position: 'relative', overflow: 'hidden', background: 'transparent', contain: 'layout', ...style }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'rgba(255,255,255,0.04)' }} />
      <div style={{ position: 'relative', zIndex: 10 }}>{children}</div>
    </section>
  )
}

// ─── TERMS MODAL ─────────────────────────────────────────────────────────────
function TermsModal({ onClose }) {
  const sections = [
    { title: '1. Acceptance of Terms', body: 'By using Dwelling, you agree to these terms...' },
    { title: '2. No Advice', body: 'Dwelling provides information, not professional advice...' }
  ]
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)' }} />
      <div className="liquid-glass-strong" style={{ position: 'relative', width: '100%', maxWidth: 700, maxHeight: '85vh', borderRadius: 24, padding: 0, display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '24px 32px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: 24, margin: 0 }}>Terms & Conditions</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 24, cursor: 'pointer', opacity: 0.5 }}>×</button>
        </div>
        <div style={{ padding: 32, overflowY: 'auto', flex: 1 }}>
          {sections.map((s, i) => (
            <div key={i} style={{ marginBottom: 32 }}>
              <h3 style={{ fontSize: 18, color: '#fff', marginBottom: 12 }}>{s.title}</h3>
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', lineHeight: 1.7 }}>{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── CITYSCAPE SILHOUETTE ────────────────────────────────────────────────────
function CityscapeSilhouette() {
  return (
    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '38%', zIndex: 4, pointerEvents: 'none' }}>
      <svg viewBox="0 0 1440 320" preserveAspectRatio="xMidYMax slice" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%', display: 'block' }}>
        <g fill="rgba(0,0,0,0.55)">
          <rect x="0" y="210" width="40" height="110" /><rect x="42" y="230" width="28" height="90" />
          <rect x="72" y="195" width="50" height="125" /><rect x="124" y="220" width="32" height="100" />
          <rect x="158" y="200" width="60" height="120" /><rect x="220" y="215" width="35" height="105" />
          <rect x="257" y="185" width="55" height="135" /><rect x="314" y="210" width="40" height="110" />
        </g>
        <g fill="#000">
          <rect x="0" y="240" width="55" height="80" /><rect x="57" y="220" width="38" height="100" />
          <rect x="124" y="180" width="48" height="140" /><rect x="135" y="120" width="2" height="60" />
        </g>
        <defs>
          <linearGradient id="groundFade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#000" stopOpacity="0" />
            <stop offset="100%" stopColor="#000" stopOpacity="1" />
          </linearGradient>
        </defs>
        <rect x="0" y="100" width="1440" height="220" fill="url(#groundFade)" />
      </svg>
    </div>
  )
}

// ─── HERO ────────────────────────────────────────────────────────────────────
function Hero({ onSearch, loading, onShowDemo }) {
  return (
    <section id="hero" style={{ position: 'relative', overflow: 'hidden', background: 'transparent', minHeight: 'min(1000px, 100svh)', height: 'auto', zIndex: 1 }}>
      <GlobalBackground />
      <CityscapeSilhouette />
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 350, background: 'linear-gradient(to top, #000 40%, transparent)', zIndex: 3 }} />
      <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', maxWidth: 900, margin: '0 auto', padding: 'clamp(100px, 20vw, 150px) 20px 80px' }}>
        <div className="liquid-glass" style={{ borderRadius: 40, display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 16px', marginBottom: 28 }}>
          <span style={{ background: '#fff', color: '#000', fontSize: 11, fontFamily: "'Barlow',sans-serif", fontWeight: 600, borderRadius: 20, padding: '2px 8px' }}>New</span>
          <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, fontFamily: "'Barlow',sans-serif", fontWeight: 300 }}>Introducing AI-powered area intelligence.</span>
        </div>
        <h1 style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 'clamp(3rem,9vw,6rem)', color: '#fff', lineHeight: 0.88, letterSpacing: '-0.03em', marginBottom: 28 }}>
          Know Your Neighbourhood Before You Buy.
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 16, fontFamily: "'Barlow',sans-serif", fontWeight: 300, maxWidth: 540, lineHeight: 1.7, marginBottom: 40 }}>
          Climate risk. School ratings. Crime data. Investment score. AI verdict. — One search, 30 seconds, any Canadian city.
        </p>
        <div style={{ width: '100%', maxWidth: 600 }}>
          <AddressSearch onSearch={onSearch} loading={loading} />
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 24, flexWrap: 'wrap', justifyContent: 'center' }}>
          {[['1,737+','Canadian Cities'],['10','Free / Month'],['<30s','Analysis time']].map(([val, lbl]) => (
            <div key={lbl} className="liquid-glass" style={{ borderRadius: 40, padding: '7px 16px', display: 'flex', alignItems: 'center', gap: 7 }}>
              <span style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 17, color: '#fff' }}>{val}</span>
              <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, fontFamily: "'Barlow',sans-serif", fontWeight: 300 }}>{lbl}</span>
            </div>
          ))}
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
  const partners = ['Realtor.ca', 'StatCan', 'Open-Meteo', 'OpenStreetMap', 'Fraser Institute', 'Dwelling AI']
  return (
    <section style={{ padding: '64px 24px', background: 'transparent' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div className="liquid-glass" style={{ borderRadius: 40, padding: '4px 14px', fontSize: 11, color: 'rgba(255,255,255,0.5)', fontFamily: "'Barlow',sans-serif", letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 28 }}>
          Powered by 16+ official data sources
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 32 }}>
          {partners.map(name => (
            <span key={name} className="partner-name" style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 26, color: 'rgba(255,255,255,0.7)', transition: 'color 0.2s', cursor: 'default' }}
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
    { num: '01', icon: '📍', title: 'Enter any Canadian city', desc: 'Type a city name — no street address needed.' },
    { num: '02', icon: '⚡', title: 'We pull live data', desc: 'MLS listings, demographics, climate risk, and more.' },
    { num: '03', icon: '🧠', title: 'AI builds report', desc: 'AI synthesizes everything into a clear verdict in seconds.' },
  ]
  return (
    <Section style={{ minHeight: 'auto', padding: 'clamp(60px, 10vw, 128px) 20px', background: 'transparent' }}>
      <div style={{ maxWidth: 900, margin: '0 auto', textAlign: 'center' }} id="how-it-works">
        <div>
          <div className="liquid-glass" style={{ borderRadius: 40, display: 'inline-flex', padding: '5px 14px', fontSize: 11, color: 'rgba(255,255,255,0.5)', fontFamily: "'Barlow',sans-serif", letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 16 }}>How It Works</div>
          <h2 style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 'clamp(2rem,5vw,3.5rem)', color: '#fff', marginBottom: 56 }}>Analyze. Understand. Decide.</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 24 }}>
          {steps.map(s => (
            <div key={s.num} className="liquid-glass" style={{ borderRadius: 24, padding: 32, textAlign: 'left' }}>
              <div style={{ fontSize: 32, marginBottom: 20 }}>{s.icon}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginBottom: 8 }}>{s.num}</div>
              <h3 style={{ fontSize: 20, marginBottom: 12 }}>{s.title}</h3>
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }}>{s.desc}</p>
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
    { title: 'City stability scored.', desc: 'We aggregate 200+ listings and compute a real stability score.' },
    { title: 'Neighbourhood intelligence.', desc: 'Walkability, schools, flood risk, and air quality.' },
    { title: 'One score. Clear decision.', desc: 'We produce a single Investment Score and Market Verdict.' },
  ]
  return (
    <section id="features" style={{ padding: '96px 24px', background: 'transparent' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <h2 style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 'clamp(2rem,5vw,3.5rem)', color: '#fff', marginBottom: 56 }}>Unrivaled insights. Simplified.</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 48 }}>
          {features.map((f, i) => (
            <div key={i} className="liquid-glass" style={{ borderRadius: 24, padding: 40 }}>
              <h3 style={{ fontSize: 24, marginBottom: 16 }}>{f.title}</h3>
              <p style={{ color: 'rgba(255,255,255,0.5)', lineHeight: 1.7 }}>{f.desc}</p>
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
    <Section style={{ padding: 'clamp(60px, 10vw, 128px) 20px', background: 'transparent' }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        <div className="liquid-glass" style={{ borderRadius: 26, padding: '44px 28px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 28, textAlign: 'center' }}>
            {[
              { target: 16, suffix: '+', label: 'Data sources' },
              { target: 1737, suffix: '+', label: 'Cities covered' },
              { target: 10, suffix: '', label: 'Free / month' },
              { target: 30, prefix: '<', suffix: 's', label: 'Analysis time' },
            ].map(({ target, suffix, prefix, label }) => (
              <div key={label}>
                <div style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 'clamp(2.2rem,5vw,3.8rem)', color: '#fff' }}>
                  <CountUp target={target} suffix={suffix} prefix={prefix || ''} />
                </div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 7 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Section>
  )
})

// ─── PRICING ─────────────────────────────────────────────────────────────────
const Pricing = memo(function Pricing({ annual, setAnnual, onSelect }) {
  return (
    <section id="pricing" style={{ padding: '80px 24px', background: 'transparent' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', textAlign: 'center' }}>
        <h2 style={{ fontSize: 'clamp(2.5rem,6vw,4rem)', marginBottom: 24 }}>Simple, transparent pricing.</h2>
        <div style={{ display: 'flex', gap: 24, justifyContent: 'center' }}>
          <div className="liquid-glass-strong" style={{ borderRadius: 24, padding: 40, width: '100%', maxWidth: 400 }}>
            <h3 style={{ fontSize: 24, marginBottom: 8 }}>Pro Plan</h3>
            <div style={{ fontSize: 48, marginBottom: 24 }}>$25<span style={{ fontSize: 16, opacity: 0.5 }}>/mo</span></div>
            <button onClick={() => onSelect('pro')} style={{ width: '100%', padding: '16px', borderRadius: 40, background: '#fff', color: '#000', border: 'none', fontWeight: 600, cursor: 'pointer' }}>Get Pro Access</button>
          </div>
        </div>
      </div>
    </section>
  )
})

// ─── FOOTER ──────────────────────────────────────────────────────────────────
function CTAFooter({ onScrollToTop }) {
  return (
    <Section style={{ padding: '80px 24px', textAlign: 'center' }}>
      <h2 style={{ fontSize: 'clamp(2rem,5vw,3.5rem)', marginBottom: 24 }}>Your next area decision starts here.</h2>
      <button onClick={onScrollToTop} style={{ padding: '16px 32px', borderRadius: 40, background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', cursor: 'pointer' }}>Start for free →</button>
      <div style={{ marginTop: 64, opacity: 0.3, fontSize: 12 }}>© 2024 Dwelling AI. All rights reserved.</div>
    </Section>
  )
}

// ─── MAIN APP ────────────────────────────────────────────────────────────────
export default function App() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [showAuth, setShowAuth] = useState(false)
  const [showPaywall, setShowPaywall] = useState(false)
  const [annual, setAnnual] = useState(false)
  const [user, setUser] = useState(null)

  useEffect(() => {
    setUser(getCurrentUser())
  }, [])

  const handleSearch = async (city) => {
    setLoading(true)
    // Mock search logic
    setTimeout(() => {
      setResult({ city })
      setLoading(false)
    }, 1500)
  }

  if (result) {
    return (
      <Suspense fallback={<LoadingState />}>
        <Dashboard result={result} onBack={() => setResult(null)} />
      </Suspense>
    )
  }

  return (
    <div style={{ background: '#000', minHeight: '100vh' }}>
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, padding: '20px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backdropFilter: 'blur(10px)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={() => window.location.reload()}>
          <img src={LOGO} alt="Logo" style={{ width: 32, height: 32 }} />
          <span style={{ fontFamily: "'Instrument Serif',serif", fontSize: 22, color: '#fff', fontStyle: 'italic' }}>Dwelling</span>
        </div>
        <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
          <button onClick={() => scrollTo('pricing')} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', fontSize: 14 }}>Pricing</button>
          <button onClick={() => setShowAuth(true)} style={{ background: '#fff', color: '#000', border: 'none', padding: '8px 20px', borderRadius: 40, fontWeight: 500, cursor: 'pointer', fontSize: 14 }}>Sign In</button>
        </div>
      </nav>

      <Hero onSearch={handleSearch} loading={loading} />
      <Partners />
      <HowItWorks />
      <FeaturesChess />
      <Stats />
      <Pricing annual={annual} setAnnual={setAnnual} onSelect={() => setShowPaywall(true)} />
      <CTAFooter onScrollToTop={() => window.scrollTo({ top: 0, behavior: 'smooth' })} />

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
      {showPaywall && <PaywallModal onClose={() => setShowPaywall(false)} />}
    </div>
  )
}
