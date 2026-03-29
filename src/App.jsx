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
import { getCurrentUser, getAuthToken, signOut as localSignOut, getUsage, saveCerebrasKey, getCachedCerebrasKey } from './lib/localAuth'


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
    { title: '1. Acceptance of Terms', body: 'By creating an account or accessing Dwelling (the "Platform"), you agree to be legally bound by these Terms and Conditions ("Terms"). If you do not agree to all of these Terms, you must not use the Platform. These Terms constitute a binding legal agreement between you ("User") and Dwelling ("Company"). We reserve the right to modify these Terms at any time. Continued use of the Platform after modifications constitutes acceptance of the revised Terms.' },
    { title: '2. No Professional or Financial Advice', body: 'ALL CONTENT PROVIDED BY THE PLATFORM IS FOR INFORMATIONAL AND EDUCATIONAL PURPOSES ONLY. Nothing on the Platform constitutes financial advice, real estate advice, investment advice, legal advice, tax advice, or any other professional advice. You should consult with a qualified and licensed professional before making any financial or real estate decision. The Company is not a licensed real estate brokerage, financial institution, or investment dealer.' },
    { title: '3. Accuracy and Reliability of Data', body: 'THE COMPANY MAKES NO REPRESENTATIONS OR WARRANTIES REGARDING THE ACCURACY, COMPLETENESS, RELIABILITY, OR AVAILABILITY OF ANY DATA, REPORT, SCORE, ESTIMATE, OR ANALYSIS PROVIDED BY THE PLATFORM. Market conditions, property values, and all other data may be inaccurate, incomplete, or outdated. Algorithmic estimates and AI verdicts are approximations only and may differ materially from actual conditions. The Company expressly disclaims all liability arising from reliance on Platform content.' },
    { title: '4. AI-Generated Content Disclaimer', body: 'The Platform uses artificial intelligence to generate reports, analyses, verdicts, and scores. AI-generated content may contain errors, hallucinations, or outdated information. AI verdicts and investment scores are NOT predictive of future market performance. You acknowledge that AI-generated content is experimental and should not be relied upon as a sole basis for any decision. The Company is not liable for any loss resulting from AI-generated content.' },
    { title: '5. Limitation of Liability', body: 'TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL THE COMPANY BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES. THE TOTAL CUMULATIVE LIABILITY OF THE COMPANY TO YOU SHALL NOT EXCEED THE GREATER OF: (A) THE TOTAL AMOUNT PAID BY YOU IN THE THREE MONTHS PRECEDING THE CLAIM; OR (B) TWENTY-FIVE CANADIAN DOLLARS (CAD $25.00).' },
    { title: '6. No Warranty', body: 'THE PLATFORM IS PROVIDED ON AN "AS IS" AND "AS AVAILABLE" BASIS WITHOUT ANY WARRANTIES OF ANY KIND. THE COMPANY EXPRESSLY DISCLAIMS ALL WARRANTIES INCLUDING IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. THE COMPANY DOES NOT WARRANT THAT THE PLATFORM WILL BE UNINTERRUPTED OR ERROR-FREE.' },
    { title: '7. User Obligations and Prohibited Conduct', body: 'You agree to use the Platform only for lawful purposes. You shall not: scrape or systematically extract data without permission; reproduce or sell Platform content; reverse engineer the Platform; impersonate any person or entity; or interfere with Platform integrity. Violation may result in immediate account termination and legal action.' },
    { title: '8. Intellectual Property', body: 'The Platform and all content, features, and functionality are owned by the Company or its licensors and are protected by Canadian and international intellectual property laws. You are granted a limited, non-exclusive, non-transferable, revocable licence to access the Platform for personal non-commercial use only.' },
    { title: '9. Privacy and Data Collection', body: 'By using the Platform, you consent to collection and processing of your email address, account activity, and usage data to provide and improve the Platform. Search queries are processed in real time and not retained beyond report generation. We do not sell your personal information to third parties. Your Cerebras AI API key, if provided, is stored in encrypted form and used solely to forward requests to Cerebras AI on your behalf.' },
    { title: '10. Third-Party Services and Data Sources', body: 'The Platform integrates with third-party providers including Realtor.ca/CREA, Statistics Canada, OpenStreetMap, Open-Meteo, Cerebras AI, Turso, and Vercel. The Company is not responsible for the accuracy or availability of any third-party service. The Company is not affiliated with or endorsed by any of these third parties.' },
    { title: '11. Subscription, Billing, and Refunds', body: 'Paid subscriptions are charged in advance in Canadian dollars. Subscriptions renew automatically unless cancelled. Analysis availability under paid plans is subject to platform capacity and fair use limitations and does not constitute a guarantee of any specific volume. Refund eligibility is at the sole discretion of the Company.' },
    { title: '12. Account Termination', body: 'The Company may suspend or terminate your account at any time, with or without notice, for any reason including breach of these Terms. Upon termination, your right to use the Platform ceases immediately.' },
    { title: '13. Indemnification', body: 'You agree to defend, indemnify, and hold harmless the Company and its officers, directors, employees, and agents from any claims, liabilities, damages, and costs arising from your violation of these Terms or your use of the Platform, including reliance on Platform content for any financial or real estate decision.' },
    { title: '14. Dispute Resolution and Governing Law', body: 'These Terms are governed by the laws of the Province of Ontario and the federal laws of Canada. Disputes shall first be subject to good-faith negotiation, then binding arbitration under the Arbitration Act, 1991 (Ontario) in Ottawa, Ontario. You waive any right to participate in any class action lawsuit or class-wide arbitration against the Company.' },
    { title: '15. Severability and Entire Agreement', body: 'If any provision of these Terms is found invalid or unenforceable, it shall be modified to the minimum extent necessary and the remaining provisions shall continue in force. These Terms constitute the entire agreement between you and the Company regarding the Platform.' },
    { title: '16. Contact Information', body: 'For questions regarding these Terms, contact us at: 01dominique.c@gmail.com with the subject line "Legal Notice — Dwelling." These Terms were last updated on March 28, 2026.' },
  ]
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={e => e.stopPropagation()}
        className="liquid-glass-strong" style={{ borderRadius: 24, maxWidth: 700, width: '100%', height: '82vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 28px', borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
          <div>
            <span style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 22, color: '#fff' }}>Terms & Conditions</span>
            <span style={{ marginLeft: 12, fontFamily: "'Barlow',sans-serif", fontSize: 10, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Last updated: March 28, 2026</span>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff', fontFamily: "'Barlow',sans-serif", fontSize: 12, padding: '6px 14px', cursor: 'pointer' }}>✕ Close</button>
        </div>
        <div style={{ flex: 1, overflowY: 'scroll', padding: '28px' }}>
          <div style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 1.7, marginBottom: 24, padding: '12px 16px', background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.15)', borderRadius: 10 }}>
            ⚠ This document is provided for informational purposes. These Terms govern your use of the Dwelling platform. By using the platform you agree to be bound by them.
          </div>
          {sections.map(({ title, body }) => (
            <div key={title} style={{ marginBottom: 24, paddingBottom: 24, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 16, color: '#fff', marginBottom: 8 }}>{title}</div>
              <p style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 1.85 }}>{body}</p>
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
  { q: 'Is Dwelling free to use?', a: 'Free users get 10 analyses per month. Upgrade to Pro for $19/month (or $152/year — save 33%) for expanded analysis access, full city intelligence, and investment-grade reports. Analysis availability is subject to platform capacity.' },
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
function Navbar({ user, userRecord, analysesLeft, isInTrial, trialDaysLeft, onSignOut, onHome, onOpenKeyModal, hasOwnKey, previewPlan, onTogglePreview }) {
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
              <span className="liquid-glass" style={{ borderRadius: 40, padding: '5px 12px', fontSize: 12, fontFamily: "'Barlow',sans-serif", color: user?.email === '01dominique.c@gmail.com' ? '#a78bfa' : userRecord?.is_pro ? '#fbbf24' : low ? '#f87171' : 'rgba(255,255,255,0.5)' }}>
                {user?.email === '01dominique.c@gmail.com' ? '⚡ Admin' : userRecord?.is_pro ? '★ Pro' : `${analysesLeft} / 10 left`}
              </span>
              {user?.email === '01dominique.c@gmail.com' && (
                <button onClick={onTogglePreview} style={{ background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.25)', cursor: 'pointer', fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 11, color: '#a78bfa', padding: '5px 10px', borderRadius: 20 }}>
                  Preview: {previewPlan === 'pro' ? 'Pro' : 'Free'}
                </button>
              )}
              <button onClick={onOpenKeyModal} title="Use your own Cerebras API key" style={{ background: hasOwnKey ? 'rgba(74,222,128,0.1)' : 'none', border: hasOwnKey ? '1px solid rgba(74,222,128,0.25)' : 'none', cursor: 'pointer', fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 11, color: hasOwnKey ? '#4ade80' : 'rgba(255,255,255,0.35)', padding: '5px 10px', borderRadius: 20, transition: 'color 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.color = hasOwnKey ? '#4ade80' : 'rgba(255,255,255,0.7)'}
                onMouseLeave={e => e.currentTarget.style.color = hasOwnKey ? '#4ade80' : 'rgba(255,255,255,0.35)'}>{hasOwnKey ? '🔑 Own Key' : '🔑 API Key'}</button>
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
    <section id="hero" style={{ position: 'relative', overflow: 'hidden', background: 'transparent', minHeight: 'min(1000px, 100svh)', height: 'auto', isolation: 'isolate', contain: 'layout paint', zIndex: 0 }}>
      <GlobalBackground />
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 350, background: 'linear-gradient(to top, #000 40%, transparent)', zIndex: 2 }} />
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
          {[['100k+','Cities'],['50+','Countries'],['10','Free / Month'],['<30s','Analysis time']].map(([val, lbl]) => (
            <div key={lbl} className="liquid-glass" style={{ borderRadius: 40, padding: '7px 16px', display: 'flex', alignItems: 'center', gap: 7 }}>
              <span style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 17, color: '#fff' }}>{val}</span>
              <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, fontFamily: "'Barlow',sans-serif", fontWeight: 300 }}>{lbl}</span>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 20 }}>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
            <button onClick={onShowDemo} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 13, color: 'rgba(255,255,255,0.4)', textDecoration: 'underline', textUnderlineOffset: 3, padding: '4px 8px', transition: 'color 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.7)'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.4)'}>
              or see a sample report →
            </button>
            <button onClick={() => scrollTo('pricing')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 13, color: 'rgba(255,255,255,0.25)', textDecoration: 'underline', textUnderlineOffset: 3, padding: '4px 8px', transition: 'color 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.55)'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.25)'}>
              view pricing →
            </button>
          </div>
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
    <section style={{ padding: '64px 24px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div className="liquid-glass" style={{ borderRadius: 40, padding: '4px 14px', fontSize: 11, color: 'rgba(255,255,255,0.5)', fontFamily: "'Barlow',sans-serif", letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 28 }}>
          Powered by 16+ official data sources
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 32 }}>
          {partners.map(name => (
            <span key={name} style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 26, color: 'rgba(255,255,255,0.7)', transition: 'color 0.2s', cursor: 'default' }}
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

// ─── HOW IT WORKS ────────────────────────────────────────────────────────────
const HowItWorks = memo(function HowItWorks() {
  const steps = [
    { num: '01', icon: '📍', title: 'Enter any Canadian city', desc: 'Type a city name — no street address needed. Our city dropdown covers every major Canadian market from Halifax to Victoria.' },
    { num: '02', icon: '⚡', title: 'We pull 16+ live data sources', desc: 'MLS listings, days on market, census demographics, climate risk, school ratings, crime data, walkability, and investment signals — all in real time.' },
    { num: '03', icon: '🧠', title: 'AI builds your intelligence report', desc: 'Our AI synthesizes everything into a stability score, AI verdict, investment outlook, school ratings, crime data, and climate risk — in under 30 seconds.' },
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
        <HoverGroup steps={steps} />
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
    { icon: '🔒', title: 'Secure & Private', desc: 'Your searches are never stored. Bank-grade encryption. Searches processed in real time and never retained.' },
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
        <HoverGroupGrid cards={cards} />
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
      desc: 'Transit stops, schools, parks, groceries, and hospitals within 2km radius of your target city.',
      status: 'live',
    },
    {
      icon: '🌤️',
      name: 'Open-Meteo',
      type: 'Climate & Weather',
      desc: 'Current weather + 12-month climate normals for every Canadian city. Refreshed continuously.',
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
      icon: '🏫',
      name: 'Fraser Institute',
      type: 'School Rankings',
      desc: "Annual school performance data from Canada's leading independent research institute. Ratings for 10,000+ Canadian schools across all provinces.",
      status: 'live',
    }
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
        <DataSourcesGrid partners={partners} />
      </div>
    </section>
  )
})

function DataSourcesGrid({ partners }) {
  const [hovered, setHovered] = useState(null)
  return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 12 }}>
          {partners.map((p, i) => (
            <div key={i}>
              <div className="liquid-glass"
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
                style={{ borderRadius: 18, padding: 24, height: '100%', cursor: 'default',
                  transition: 'transform 0.4s cubic-bezier(0.34,1.56,0.64,1), opacity 0.35s ease, box-shadow 0.35s ease',
                  transform: hovered === null ? 'scale(1)' : hovered === i ? 'scale(1.04) translateY(-5px)' : 'scale(0.96)',
                  opacity: hovered === null ? (p.status === 'soon' ? 0.7 : 1) : hovered === i ? 1 : 0.35,
                  boxShadow: hovered === i ? '0 20px 60px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.25)' : 'none',
                  zIndex: hovered === i ? 2 : 1, position: 'relative',
                }}>
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
  )
}

// ─── HOVER GROUP — cards pop, siblings dim/shrink ────────────────────────────
function HoverGroup({ steps }) {
  const [hovered, setHovered] = useState(null)
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 14, textAlign: 'left' }}>
      {steps.map((s, i) => (
        <div key={i} className="liquid-glass"
          onMouseEnter={() => setHovered(i)}
          onMouseLeave={() => setHovered(null)}
          style={{
            borderRadius: 20, padding: 28, cursor: 'default',
            transition: 'transform 0.4s cubic-bezier(0.34,1.56,0.64,1), opacity 0.35s ease, box-shadow 0.35s ease',
            transform: hovered === null ? 'scale(1)' : hovered === i ? 'scale(1.05) translateY(-6px)' : 'scale(0.95)',
            opacity: hovered === null ? 1 : hovered === i ? 1 : 0.38,
            boxShadow: hovered === i ? '0 20px 60px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.25)' : 'none',
            zIndex: hovered === i ? 2 : 1, position: 'relative',
          }}>
          <div style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 52, color: 'rgba(255,255,255,0.06)', lineHeight: 1, marginBottom: 14 }}>{s.num}</div>
          <div className="liquid-glass-strong" style={{ borderRadius: '50%', width: 42, height: 42, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14, fontSize: 17 }}>{s.icon}</div>
          <h3 style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 19, color: '#fff', marginBottom: 10 }}>{s.title}</h3>
          <p style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.7 }}>{s.desc}</p>
        </div>
      ))}
    </div>
  )
}

function HoverGroupGrid({ cards }) {
  const [hovered, setHovered] = useState(null)
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 14 }}>
      {cards.map((card, i) => (
        <div key={i} className="liquid-glass"
          onMouseEnter={() => setHovered(i)}
          onMouseLeave={() => setHovered(null)}
          style={{
            borderRadius: 18, padding: 24, cursor: 'default',
            transition: 'transform 0.4s cubic-bezier(0.34,1.56,0.64,1), opacity 0.35s ease, box-shadow 0.35s ease',
            transform: hovered === null ? 'scale(1)' : hovered === i ? 'scale(1.05) translateY(-6px)' : 'scale(0.95)',
            opacity: hovered === null ? 1 : hovered === i ? 1 : 0.38,
            boxShadow: hovered === i ? '0 20px 60px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.25)' : 'none',
            zIndex: hovered === i ? 2 : 1, position: 'relative',
          }}>
          <div className="liquid-glass-strong" style={{ borderRadius: '50%', width: 42, height: 42, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18, fontSize: 17 }}>{card.icon}</div>
          <h3 style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 17, color: '#fff', marginBottom: 7 }}>{card.title}</h3>
          <p style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.7 }}>{card.desc}</p>
        </div>
      ))}
    </div>
  )
}

// ─── STATS ───────────────────────────────────────────────────────────────────
const Stats = memo(function Stats() {
  return (
    <Section style={{ padding: 'clamp(60px, 10vw, 128px) 20px' }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        <div className="liquid-glass" style={{ borderRadius: 26, padding: '44px 28px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 28, textAlign: 'center' }}>
            {[
              { target: 16, suffix: '+', label: 'Data sources per report' },
              { target: 100, suffix: 'k+', label: 'Cities covered' },
              { target: 10, suffix: '', label: 'Free analyses / month' },
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
  '10 analyses/month',
  'Area intelligence reports',
  'Neighbourhood & walkability scores',
  'Climate & weather data',
  'Risk & hazard overview',
]
const PRICING_PRO = [
  { text: 'High-volume analysis access', highlight: false },
  { text: 'Full investment-grade AI analysis', highlight: true },
  { text: 'Hidden risk & hazard detection', highlight: true },
  { text: 'Price trend & market predictions', highlight: true },
  { text: 'Side-by-side area comparison', highlight: false },
  { text: 'All neighbourhood data', highlight: false },
  { text: 'Priority support', highlight: false },
  { text: 'PDF report export (coming soon)', highlight: false },
]

function PricingCard({ plan, price, desc, features, cta, onCta, popular, highlight, priceLabel, annualSavings }) {
  const [hov, setHov] = useState(false)
  return (
    <div
      style={{
        flex: 1, minWidth: 260, maxWidth: 360,
        borderRadius: 24, padding: 32,
        background: popular
          ? 'linear-gradient(135deg, rgba(255,255,255,0.13) 0%, rgba(255,255,255,0.06) 100%)'
          : 'linear-gradient(135deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.03) 100%)',
        border: popular ? '1px solid rgba(255,255,255,0.22)' : '1px solid rgba(255,255,255,0.09)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        boxShadow: popular ? '0 24px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.15)' : '0 8px 32px rgba(0,0,0,0.3)',
        display: 'flex', flexDirection: 'column',
        position: 'relative',
        transform: popular ? 'scale(1.04)' : 'scale(1)',
        transition: 'box-shadow 0.3s ease',
      }}
    >
      {popular && (
        <div style={{
          position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)',
          background: 'linear-gradient(90deg, #38bdf8, #818cf8)',
          borderRadius: 20, padding: '4px 16px',
          fontFamily: "'Barlow',sans-serif", fontWeight: 700, fontSize: 11,
          color: '#000', whiteSpace: 'nowrap', letterSpacing: '0.06em', textTransform: 'uppercase',
        }}>Most Popular</div>
      )}

      {/* Plan name */}
      <div style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 28, color: '#fff', marginBottom: 4 }}>{plan}</div>
      <div style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 13, color: 'rgba(255,255,255,0.45)', marginBottom: 20 }}>{desc}</div>

      {/* Price */}
      <div style={{ marginBottom: 24, paddingBottom: 24, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <span style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 56, color: '#fff', lineHeight: 1 }}>${price}</span>
        <span style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 14, color: 'rgba(255,255,255,0.35)', marginLeft: 6 }}>/month</span>
      </div>

      {/* Features */}
      <div style={{ flex: 1, marginBottom: 24 }}>
        {features.map((f, i) => {
          const text = typeof f === 'string' ? f : f.text
          const hl = typeof f === 'object' && f.highlight
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 11 }}>
              <div style={{
                width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                background: hl ? 'rgba(56,189,248,0.15)' : 'rgba(255,255,255,0.06)',
                border: hl ? '1px solid rgba(56,189,248,0.4)' : '1px solid rgba(255,255,255,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{ fontSize: 10, color: hl ? '#38bdf8' : 'rgba(255,255,255,0.5)' }}>✓</span>
              </div>
              <span style={{
                fontFamily: "'Barlow',sans-serif", fontWeight: hl ? 400 : 300, fontSize: 13,
                color: hl ? '#fff' : 'rgba(255,255,255,0.65)',
              }}>{text}</span>
            </div>
          )
        })}
      </div>

      {/* CTA */}
      <button
        onClick={onCta}
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
        style={{
          width: '100%', borderRadius: 40, padding: '14px',
          fontFamily: "'Barlow',sans-serif", fontWeight: 600, fontSize: 14,
          border: popular ? 'none' : '1px solid rgba(255,255,255,0.15)',
          background: popular
            ? hov ? 'rgba(255,255,255,0.92)' : '#fff'
            : hov ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.06)',
          color: popular ? '#000' : '#fff',
          cursor: 'pointer',
          transition: 'background 0.2s ease, transform 0.15s ease',
          transform: hov ? 'scale(1.01)' : 'scale(1)',
        }}
      >{cta}</button>

      {popular && (
        <div style={{ textAlign: 'center', marginTop: 10 }}>
          <span style={{ fontFamily: "'Barlow',sans-serif", fontSize: 11, color: 'rgba(255,255,255,0.25)', fontWeight: 300 }}>Cancel anytime · Full refund if not satisfied</span>
        </div>
      )}
    </div>
  )
}

const Pricing = memo(function Pricing({ onUpgrade }) {
  const [annual, setAnnual] = useState(false)
  const monthlyPrice = 19
  const annualPrice = 152
  const displayPrice = annual ? Math.round(annualPrice / 12) : monthlyPrice
  const displaySuffix = annual ? '/mo · billed yearly' : '/month'

  return (
    <section id="pricing" style={{ position: 'relative', overflow: 'hidden', padding: 'clamp(80px, 10vw, 120px) 20px' }}>
      {/* Video background */}
      <video autoPlay muted loop playsInline
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.1, zIndex: 0 }}>
        <source src="/pricing-bg.webm" type="video/webm" />
      </video>
      {/* Gradient overlays */}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, #000 0%, rgba(0,0,0,0.6) 30%, rgba(0,0,0,0.6) 70%, #000 100%)', zIndex: 1 }} />
      {/* Subtle radial glow */}
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 80% 60% at 50% 50%, rgba(56,189,248,0.07) 0%, transparent 70%)', zIndex: 1 }} />

      <div style={{ position: 'relative', zIndex: 2, maxWidth: 900, margin: '0 auto', textAlign: 'center' }}>
        <div className="liquid-glass" style={{ borderRadius: 40, display: 'inline-flex', padding: '5px 14px', fontSize: 11, color: 'rgba(255,255,255,0.5)', fontFamily: "'Barlow',sans-serif", letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 20 }}>Pricing</div>

        <h2 style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 'clamp(2.2rem,5vw,3.8rem)', color: '#fff', marginBottom: 12, lineHeight: 0.95, letterSpacing: '-0.02em' }}>
          "Know before you move.
        </h2>
        <p style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 16, color: 'rgba(255,255,255,0.45)', marginBottom: 56, lineHeight: 1.7, maxWidth: 500, margin: '0 auto 56px' }}>
          Start free. Upgrade when you need the full picture — pro pays for itself the moment it helps you avoid the wrong neighbourhood.
        </p>

        {/* Annual / Monthly toggle */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 40 }}>
          <span style={{ fontFamily: "'Barlow',sans-serif", fontSize: 13, color: annual ? 'rgba(255,255,255,0.35)' : '#fff', fontWeight: 400 }}>Monthly</span>
          <button
            onClick={() => setAnnual(a => !a)}
            style={{
              width: 48, height: 26, borderRadius: 13, border: 'none', cursor: 'pointer', position: 'relative',
              background: annual ? 'linear-gradient(90deg, #38bdf8, #818cf8)' : 'rgba(255,255,255,0.15)',
              transition: 'background 0.25s ease',
            }}
          >
            <div style={{
              position: 'absolute', top: 3, left: annual ? 25 : 3,
              width: 20, height: 20, borderRadius: '50%', background: '#fff',
              transition: 'left 0.25s ease',
            }} />
          </button>
          <span style={{ fontFamily: "'Barlow',sans-serif", fontSize: 13, color: annual ? '#fff' : 'rgba(255,255,255,0.35)', fontWeight: 400 }}>
            Annual
            <span style={{ marginLeft: 6, background: 'rgba(56,189,248,0.15)', border: '1px solid rgba(56,189,248,0.3)', borderRadius: 20, padding: '2px 8px', fontSize: 11, color: '#38bdf8' }}>Save 33%</span>
          </span>
        </div>

        <div style={{ display: 'flex', gap: 20, justifyContent: 'center', flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <PricingCard
            plan="Free" price="0" desc="Good for exploring"
            features={PRICING_FREE}
            cta="Start for free"
            onCta={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            popular={false}
          />
          <PricingCard
            plan="Pro" price={String(displayPrice)} desc={annual ? "Billed $152/year — cancel anytime" : "Full intelligence for every location decision"}
            priceLabel={annual ? '/mo · billed yearly' : '/month'}
            features={PRICING_PRO}
            cta={annual ? `Get Pro — $152/year →` : "Upgrade to Pro →"}
            onCta={onUpgrade}
            popular={true}
            annualSavings={annual}
          />
        </div>
      </div>
    </section>
  )
})



// ─── MORTGAGE CALCULATOR ──────────────────────────────────────────────────────
function MortgageCalculator() {
  const [income, setIncome] = useState(120000)
  const [downPct, setDownPct] = useState(20)
  const [rate, setRate] = useState(5.5)
  const [city, setCity] = useState('Ottawa')

  // Canadian median prices per city (2025 estimates)
  const CITY_PRICES = {
    'Ottawa': 620000, 'Toronto': 1080000, 'Vancouver': 1320000,
    'Calgary': 630000, 'Edmonton': 430000, 'Montreal': 540000,
    'Hamilton': 710000, 'Waterloo': 700000, 'Victoria': 880000,
    'Halifax': 530000, 'Winnipeg': 360000, 'Saskatoon': 360000,
  }

  const medianPrice = CITY_PRICES[city] || 600000
  const downPayment = medianPrice * (downPct / 100)
  const principal = medianPrice - downPayment

  // Canadian mortgage stress test: qualifying rate = rate + 2% or 5.25%, whichever higher
  const stressRate = Math.max(rate + 2, 5.25) / 100 / 12
  const months = 25 * 12
  const monthlyPayment = principal * (stressRate * Math.pow(1 + stressRate, months)) / (Math.pow(1 + stressRate, months) - 1)
  const maxAffordableMonthly = (income / 12) * 0.32 // GDS ratio 32%
  const canAfford = monthlyPayment <= maxAffordableMonthly
  const pct = Math.min(100, Math.round((monthlyPayment / maxAffordableMonthly) * 100))

  const fmt = v => '$' + Math.round(v).toLocaleString('en-CA')

  const inputStyle = {
    background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 10, color: '#fff', padding: '8px 12px', fontSize: 13,
    fontFamily: "'Barlow',sans-serif", outline: 'none', width: '100%',
  }
  const labelStyle = { fontFamily: "'Barlow',sans-serif", fontSize: 11, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6, display: 'block' }

  return (
    <section style={{ padding: 'clamp(60px,8vw,96px) 20px' }}>
      <div style={{ maxWidth: 860, margin: '0 auto' }}>
        <div className="liquid-glass" style={{ borderRadius: 40, display: 'inline-flex', padding: '5px 14px', fontSize: 11, color: 'rgba(255,255,255,0.5)', fontFamily: "'Barlow',sans-serif", letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 16 }}>Affordability</div>
        <h2 style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 'clamp(2rem,5vw,3.5rem)', color: '#fff', marginBottom: 10, lineHeight: 0.9, letterSpacing: '-0.02em' }}>
          "Can I afford to live there?
        </h2>
        <p style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 15, color: 'rgba(255,255,255,0.4)', marginBottom: 36, lineHeight: 1.7 }}>
          Uses the Canadian mortgage stress test (GDS ratio 32%) to calculate real affordability.
        </p>

        <div className="liquid-glass-strong" style={{ borderRadius: 24, padding: 32 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 20, marginBottom: 28 }}>
            <div>
              <label style={labelStyle}>City</label>
              <select value={city} onChange={e => setCity(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                {Object.keys(CITY_PRICES).map(c => <option key={c} value={c} style={{ background: '#111' }}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Household Income / yr</label>
              <input
                type="text"
                value={income === 0 ? '' : income.toLocaleString('en-CA')}
                onChange={e => {
                  const raw = e.target.value.replace(/,/g, '').replace(/[^0-9]/g, '')
                  const num = parseInt(raw) || 0
                  if (num <= 50000000) setIncome(num)
                }}
                placeholder="e.g. 120,000"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Down Payment — {downPct}%</label>
              <input type="range" value={downPct} onChange={e => setDownPct(Number(e.target.value))} min={5} max={50} step={1}
                style={{ width: '100%', accentColor: '#38bdf8', marginTop: 8 }} />
            </div>
            <div>
              <label style={labelStyle}>Rate % (5yr fixed)</label>
              <input type="number" value={rate} onChange={e => setRate(Number(e.target.value))} style={inputStyle} step={0.05} min={1} max={12} />
            </div>
          </div>

          {/* Result bar */}
          <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 16, padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
              <div>
                <div style={{ fontFamily: "'Barlow',sans-serif", fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Median home in {city}</div>
                <div style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 28, color: '#fff' }}>{fmt(medianPrice)}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: "'Barlow',sans-serif", fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Stress-test payment</div>
                <div style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 28, color: canAfford ? '#4ade80' : '#f87171' }}>{fmt(monthlyPayment)}/mo</div>
              </div>
            </div>

            {/* Progress bar */}
            <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 8, height: 8, marginBottom: 10, overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 8, width: `${pct}%`,
                background: pct < 70 ? '#4ade80' : pct < 90 ? '#fbbf24' : '#f87171',
                transition: 'width 0.4s ease, background 0.4s ease',
              }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontFamily: "'Barlow',sans-serif", fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
                {fmt(downPayment)} down · {fmt(principal)} mortgage · 25yr am
              </span>
              <span style={{ fontFamily: "'Barlow',sans-serif", fontSize: 12, fontWeight: 500, color: canAfford ? '#4ade80' : '#f87171' }}>
                {canAfford ? `✓ Affordable (${pct}% of limit)` : `✗ Over budget by ${fmt(monthlyPayment - maxAffordableMonthly)}/mo`}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}


// ─── RENTAL YIELD CALCULATOR ──────────────────────────────────────────────────
function RentalCalculator() {
  const [city, setCity] = useState('Ottawa')
  const [downPct, setDownPct] = useState(20)
  const [rate, setRate] = useState(5.5)
  const [mgmt, setMgmt] = useState(8) // property mgmt %
  const [vacancy, setVacancy] = useState(5) // vacancy %

  const CITY_DATA = {
    'Ottawa':    { price: 620000,  rent: 2100 },
    'Toronto':   { price: 1080000, rent: 2600 },
    'Vancouver': { price: 1320000, rent: 2900 },
    'Calgary':   { price: 630000,  rent: 2000 },
    'Edmonton':  { price: 430000,  rent: 1650 },
    'Montreal':  { price: 540000,  rent: 1800 },
    'Hamilton':  { price: 710000,  rent: 2000 },
    'Waterloo':  { price: 700000,  rent: 2000 },
    'Victoria':  { price: 880000,  rent: 2400 },
    'Halifax':   { price: 530000,  rent: 1900 },
    'Winnipeg':  { price: 360000,  rent: 1500 },
    'Saskatoon': { price: 360000,  rent: 1450 },
  }

  const { price, rent } = CITY_DATA[city] || { price: 600000, rent: 1900 }
  const down = price * (downPct / 100)
  const principal = price - down
  const monthlyRate = rate / 100 / 12
  const months = 25 * 12
  const mortgage = principal * (monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1)
  const annualRent = rent * 12
  const grossYield = ((annualRent / price) * 100).toFixed(2)
  const effectiveRent = rent * (1 - vacancy / 100)
  const mgmtFee = effectiveRent * (mgmt / 100)
  const tax = price * 0.012 / 12 // ~1.2% property tax annual
  const insurance = price * 0.005 / 12
  const maintenance = price * 0.01 / 12
  const totalExpenses = mortgage + mgmtFee + tax + insurance + maintenance
  const cashflow = effectiveRent - totalExpenses
  const netYield = (((effectiveRent - mgmtFee - tax - insurance - maintenance) * 12 / price) * 100).toFixed(2)

  const fmt = v => '$' + Math.round(Math.abs(v)).toLocaleString('en-CA')
  const inputStyle = { background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:10, color:'#fff', padding:'8px 12px', fontSize:13, fontFamily:"'Barlow',sans-serif", outline:'none', width:'100%', boxSizing:'border-box' }
  const label = { display:'block', fontFamily:"'Barlow',sans-serif", fontSize:11, color:'rgba(255,255,255,0.4)', letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:6 }

  return (
    <section style={{ padding:'clamp(60px,8vw,96px) 20px' }}>
      <div style={{ maxWidth:860, margin:'0 auto' }}>
        <div className="liquid-glass" style={{ borderRadius:40, display:'inline-flex', padding:'5px 14px', fontSize:11, color:'rgba(255,255,255,0.5)', fontFamily:"'Barlow',sans-serif", letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:16 }}>Investment</div>
        <h2 style={{ fontFamily:"'Instrument Serif',serif", fontStyle:'italic', fontSize:'clamp(2rem,5vw,3.5rem)', color:'#fff', marginBottom:10, lineHeight:0.9, letterSpacing:'-0.02em' }}>
          "Is it worth buying to rent?
        </h2>
        <p style={{ fontFamily:"'Barlow',sans-serif", fontWeight:300, fontSize:15, color:'rgba(255,255,255,0.4)', marginBottom:36, lineHeight:1.7 }}>
          Estimates gross yield, net yield, and monthly cash flow after mortgage, tax, insurance, and maintenance.
        </p>

        <div className="liquid-glass-strong" style={{ borderRadius:24, padding:32 }}>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:20, marginBottom:28 }}>
            <div>
              <label style={label}>City</label>
              <select value={city} onChange={e=>setCity(e.target.value)} style={{ ...inputStyle, cursor:'pointer' }}>
                {Object.keys(CITY_DATA).map(c=><option key={c} value={c} style={{ background:'#111' }}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={label}>Down — {downPct}%</label>
              <input type="range" value={downPct} onChange={e=>setDownPct(Number(e.target.value))} min={5} max={60} step={5} style={{ width:'100%', accentColor:'#38bdf8', marginTop:8 }} />
            </div>
            <div>
              <label style={label}>Rate % (5yr)</label>
              <input type="number" value={rate} onChange={e=>setRate(Number(e.target.value))} style={inputStyle} step={0.05} min={1} max={12} />
            </div>
            <div>
              <label style={label}>Mgmt fee % / Vacancy %</label>
              <div style={{ display:'flex', gap:8 }}>
                <input type="number" value={mgmt} onChange={e=>setMgmt(Number(e.target.value))} style={{ ...inputStyle, width:'50%' }} min={0} max={20} step={1} />
                <input type="number" value={vacancy} onChange={e=>setVacancy(Number(e.target.value))} style={{ ...inputStyle, width:'50%' }} min={0} max={30} step={1} />
              </div>
            </div>
          </div>

          {/* Results */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:12, marginBottom:20 }}>
            {[
              { label:'Median Price', val:fmt(price), color:'#fff' },
              { label:'Est. Monthly Rent', val:fmt(rent), color:'#fff' },
              { label:'Gross Yield', val:`${grossYield}%`, color: parseFloat(grossYield) >= 5 ? '#4ade80' : parseFloat(grossYield) >= 3.5 ? '#fbbf24' : '#f87171' },
              { label:'Net Yield', val:`${netYield}%`, color: parseFloat(netYield) >= 3 ? '#4ade80' : parseFloat(netYield) >= 1.5 ? '#fbbf24' : '#f87171' },
            ].map(({label:l,val,color})=>(
              <div key={l} style={{ background:'rgba(255,255,255,0.04)', borderRadius:14, padding:'14px 16px' }}>
                <div style={{ fontFamily:"'Barlow',sans-serif", fontSize:10, color:'rgba(255,255,255,0.35)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:6 }}>{l}</div>
                <div style={{ fontFamily:"'Instrument Serif',serif", fontStyle:'italic', fontSize:26, color, lineHeight:1 }}>{val}</div>
              </div>
            ))}
          </div>

          {/* Monthly cash flow breakdown */}
          <div style={{ background:'rgba(255,255,255,0.03)', borderRadius:14, padding:'16px 20px' }}>
            <div style={{ fontFamily:"'Barlow',sans-serif", fontSize:10, color:'rgba(255,255,255,0.35)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:12 }}>Monthly Breakdown</div>
            {[
              { label:'Effective rent', val:`+${fmt(effectiveRent)}`, pos:true },
              { label:`Mortgage (${fmt(down)} down, 25yr)`, val:`−${fmt(mortgage)}`, pos:false },
              { label:'Property tax (est.)', val:`−${fmt(tax)}`, pos:false },
              { label:`Mgmt fee (${mgmt}%)`, val:`−${fmt(mgmtFee)}`, pos:false },
              { label:'Insurance + maintenance', val:`−${fmt(insurance+maintenance)}`, pos:false },
            ].map(({label:l,val,pos})=>(
              <div key={l} style={{ display:'flex', justifyContent:'space-between', marginBottom:6, paddingBottom:6, borderBottom:'1px solid rgba(255,255,255,0.04)' }}>
                <span style={{ fontFamily:"'Barlow',sans-serif", fontWeight:300, fontSize:12, color:'rgba(255,255,255,0.5)' }}>{l}</span>
                <span style={{ fontFamily:"'Barlow',sans-serif", fontWeight:400, fontSize:12, color: pos ? '#4ade80' : 'rgba(255,255,255,0.6)' }}>{val}</span>
              </div>
            ))}
            <div style={{ display:'flex', justifyContent:'space-between', marginTop:8 }}>
              <span style={{ fontFamily:"'Barlow',sans-serif", fontWeight:600, fontSize:13, color:'#fff' }}>Monthly Cash Flow</span>
              <span style={{ fontFamily:"'Instrument Serif',serif", fontStyle:'italic', fontSize:20, color: cashflow >= 0 ? '#4ade80' : '#f87171' }}>
                {cashflow >= 0 ? '+' : '−'}{fmt(cashflow)}/mo
              </span>
            </div>
          </div>

          <p style={{ fontFamily:"'Barlow',sans-serif", fontWeight:300, fontSize:11, color:'rgba(255,255,255,0.2)', marginTop:14, lineHeight:1.6 }}>
            Estimates only. Does not constitute financial advice. Consult a licensed financial advisor before making investment decisions. Actual returns may vary significantly.
          </p>
        </div>
      </div>
    </section>
  )
}

// ─── ANIMATED TESTIMONIALS ────────────────────────────────────────────────────
const TESTIMONIALS = [
  {
    id: 1,
    quote: "I was about to buy in the wrong neighbourhood — everything looked great online. Dwelling flagged the flood zone risk and showed listings sitting 40+ days. Saved me from a disaster.",
    name: "Marcus T.",
    role: "First-time buyer",
    location: "Hamilton, ON",
    avatar: "MT",
    stars: 5,
  },
  {
    id: 2,
    quote: "Had 2 weeks to pick between Toronto, Ottawa, and Calgary. Ran all three in one afternoon. The stability scores made the decision obvious. We moved to Calgary and couldn't be happier.",
    name: "Priya M.",
    role: "Relocating for work",
    location: "Calgary, AB",
    avatar: "PM",
    stars: 5,
  },
  {
    id: 3,
    quote: "I use it before every client showing now. The investment score and market temperature data gives me something concrete to discuss beyond just price per sqft.",
    name: "Daniel R.",
    role: "Real estate investor",
    location: "Vancouver, BC",
    avatar: "DR",
    stars: 5,
  },
]

function AnimatedTestimonials() {
  const [active, setActive] = useState(0)
  const [animating, setAnimating] = useState(false)

  useEffect(() => {
    const iv = setInterval(() => {
      setAnimating(true)
      setTimeout(() => {
        setActive(i => (i + 1) % TESTIMONIALS.length)
        setAnimating(false)
      }, 300)
    }, 5500)
    return () => clearInterval(iv)
  }, [])

  const t = TESTIMONIALS[active]

  return (
    <div style={{ maxWidth: 680, margin: '0 auto 36px', position: 'relative' }}>
      {/* Card */}
      <div className="liquid-glass-strong" style={{
        borderRadius: 20, padding: '32px 36px',
        border: '1px solid rgba(255,255,255,0.1)',
        transition: 'opacity 0.3s ease, transform 0.3s ease',
        opacity: animating ? 0 : 1,
        transform: animating ? 'translateY(8px)' : 'translateY(0)',
      }}>
        {/* Stars */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
          {Array(t.stars).fill(0).map((_, i) => (
            <span key={i} style={{ color: '#fbbf24', fontSize: 14 }}>★</span>
          ))}
        </div>

        {/* Quote */}
        <p style={{
          fontFamily: "'Instrument Serif',serif", fontStyle: 'italic',
          fontSize: 'clamp(1rem,2.2vw,1.2rem)', color: 'rgba(255,255,255,0.88)',
          lineHeight: 1.65, marginBottom: 24,
        }}>
          "{t.quote}"
        </p>

        {/* Divider */}
        <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1) 50%, transparent)', marginBottom: 20 }} />

        {/* Author */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 42, height: 42, borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(56,189,248,0.3), rgba(129,140,248,0.3))',
            border: '1px solid rgba(255,255,255,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: "'Barlow',sans-serif", fontWeight: 600, fontSize: 13, color: '#fff', flexShrink: 0,
          }}>{t.avatar}</div>
          <div>
            <div style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 500, fontSize: 14, color: '#fff' }}>{t.name}</div>
            <div style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{t.role} · {t.location}</div>
          </div>
        </div>
      </div>

      {/* Dot indicators */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 20 }}>
        {TESTIMONIALS.map((_, i) => (
          <button
            key={i}
            onClick={() => { setAnimating(true); setTimeout(() => { setActive(i); setAnimating(false) }, 300) }}
            style={{
              height: 8, borderRadius: 4, border: 'none', cursor: 'pointer',
              background: i === active ? '#fff' : 'rgba(255,255,255,0.2)',
              width: i === active ? 28 : 8,
              transition: 'width 0.3s ease, background 0.3s ease',
              padding: 0,
            }}
          />
        ))}
      </div>
    </div>
  )
}

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
        <AnimatedTestimonials />
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



// ─── API KEY MODAL ────────────────────────────────────────────────────────────
function ApiKeyModal({ currentKey, onSave, onClose, isOnboarding = false }) {
  const [key, setKey] = useState(currentKey || '')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [step, setStep] = useState(isOnboarding ? 'explain' : 'enter') // 'explain' | 'enter'

  const inp = {
    width: '100%', padding: '13px 16px', boxSizing: 'border-box',
    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 12, color: '#fff', fontSize: 14, outline: 'none',
    fontFamily: "'Barlow',sans-serif", fontWeight: 300,
  }

  const save = async () => {
    const trimmed = key.trim()
    setSaving(true); setSaveError(null)
    try {
      await saveCerebrasKey(trimmed)
      onSave(trimmed)
      onClose()
    } catch {
      setSaveError('Failed to save. Try again.')
    } finally { setSaving(false) }
  }

  const skipAndClose = () => {
    // Mark as seen so it doesn't show again this session
    sessionStorage.setItem('dw_key_onboarding_seen', '1')
    onClose()
  }

  return (
    <div style={{ position:'fixed', inset:0, zIndex:1200, background:'rgba(0,0,0,0.92)', backdropFilter:'blur(12px)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div className="liquid-glass-strong" style={{ borderRadius:24, maxWidth:520, width:'100%', padding:36, animation:'fadeUp 0.3s ease' }}>

        {step === 'explain' ? (
          <>
            {/* Onboarding explanation screen */}
            <div style={{ textAlign:'center', marginBottom:28 }}>
              <div style={{ fontSize:48, marginBottom:16 }}>🔑</div>
              <div style={{ fontFamily:"'Instrument Serif',serif", fontStyle:'italic', fontSize:26, color:'#fff', marginBottom:10 }}>
                One quick setup step
              </div>
              <p style={{ fontFamily:"'Barlow',sans-serif", fontWeight:300, fontSize:14, color:'rgba(255,255,255,0.55)', lineHeight:1.75 }}>
                Dwelling uses Cerebras AI to generate your reports. You'll need a free Cerebras API key to run analyses — it takes about 60 seconds to get one.
              </p>
            </div>

            {/* Why box */}
            <div className="liquid-glass" style={{ borderRadius:16, padding:'18px 20px', marginBottom:24 }}>
              <div style={{ fontFamily:"'Barlow',sans-serif", fontWeight:500, fontSize:13, color:'#fff', marginBottom:10 }}>Why do I need this?</div>
              {[
                ['⚡', 'Your key = your quota. Free Cerebras accounts get 1M tokens/minute — plenty for hundreds of analyses.'],
                ['🔒', 'Your key is stored securely in your account and never shared or logged.'],
                ['🆓', 'Cerebras is completely free to sign up. No credit card required.'],
              ].map(([icon, text]) => (
                <div key={text} style={{ display:'flex', gap:10, marginBottom:8, alignItems:'flex-start' }}>
                  <span style={{ fontSize:15, flexShrink:0 }}>{icon}</span>
                  <span style={{ fontFamily:"'Barlow',sans-serif", fontWeight:300, fontSize:13, color:'rgba(255,255,255,0.6)', lineHeight:1.6 }}>{text}</span>
                </div>
              ))}
            </div>

            <div style={{ display:'flex', gap:10, flexDirection:'column' }}>
              <a
                href="https://cloud.cerebras.ai"
                target="_blank"
                rel="noreferrer"
                onClick={() => setTimeout(() => setStep('enter'), 800)}
                style={{ display:'block', width:'100%', padding:'14px', background:'#fff', border:'none', borderRadius:40, color:'#000', fontFamily:"'Barlow',sans-serif", fontWeight:600, fontSize:14, cursor:'pointer', textDecoration:'none', textAlign:'center', boxSizing:'border-box' }}
              >
                Get my free Cerebras key →
              </a>
              <button
                onClick={() => setStep('enter')}
                style={{ width:'100%', padding:'12px', background:'rgba(255,255,255,0.06)', border:'none', borderRadius:40, color:'rgba(255,255,255,0.6)', fontFamily:"'Barlow',sans-serif", fontSize:13, cursor:'pointer' }}
              >
                I already have a key
              </button>
              <button
                onClick={skipAndClose}
                style={{ background:'none', border:'none', color:'rgba(255,255,255,0.25)', fontFamily:"'Barlow',sans-serif", fontSize:12, cursor:'pointer', padding:'4px' }}
              >
                Skip for now — I'll add it later from the 🔑 button
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Key entry screen */}
            {isOnboarding && (
              <button onClick={() => setStep('explain')} style={{ background:'none', border:'none', color:'rgba(255,255,255,0.3)', fontFamily:"'Barlow',sans-serif", fontSize:12, cursor:'pointer', padding:'0 0 20px 0', display:'block' }}>
                ← Back
              </button>
            )}
            <div style={{ fontFamily:"'Instrument Serif',serif", fontStyle:'italic', fontSize:22, color:'#fff', marginBottom:6 }}>
              {isOnboarding ? 'Paste your Cerebras key' : 'Your Cerebras API Key'}
            </div>
            <p style={{ fontFamily:"'Barlow',sans-serif", fontWeight:300, fontSize:13, color:'rgba(255,255,255,0.45)', lineHeight:1.7, marginBottom:20 }}>
              {isOnboarding
                ? 'Find it at cloud.cerebras.ai → API Keys → Create new key. It starts with "csk-".'
                : <>Use your own key for expanded analysis access. Get one free at <a href="https://cloud.cerebras.ai" target="_blank" rel="noreferrer" style={{ color:'rgba(255,255,255,0.7)' }}>cloud.cerebras.ai</a>.</>
              }
            </p>

            <div style={{ marginBottom:16 }}>
              <label style={{ display:'block', fontSize:11, color:'rgba(255,255,255,0.4)', marginBottom:6, fontFamily:"'Barlow',sans-serif", letterSpacing:'0.08em', textTransform:'uppercase' }}>API Key</label>
              <input
                autoFocus
                type="password" value={key} onChange={e => setKey(e.target.value)}
                placeholder="csk-..."
                style={inp}
                onFocus={e => { e.target.style.borderColor='rgba(255,255,255,0.3)'; e.target.style.background='rgba(255,255,255,0.08)' }}
                onBlur={e => { e.target.style.borderColor='rgba(255,255,255,0.1)'; e.target.style.background='rgba(255,255,255,0.05)' }}
                onKeyDown={e => e.key === 'Enter' && key.trim() && save()}
              />
            </div>

            {saveError && <p style={{ color:'#f87171', fontFamily:"'Barlow',sans-serif", fontSize:12, marginBottom:12 }}>⚠ {saveError}</p>}

            <div style={{ display:'flex', gap:10 }}>
              <button onClick={save} disabled={saving || !key.trim()} style={{
                flex:1, padding:'13px', border:'none', borderRadius:40, fontFamily:"'Barlow',sans-serif", fontWeight:600, fontSize:14,
                background: saving || !key.trim() ? 'rgba(255,255,255,0.08)' : '#fff',
                color: saving || !key.trim() ? 'rgba(255,255,255,0.25)' : '#000',
                cursor: saving || !key.trim() ? 'not-allowed' : 'pointer',
              }}>
                {saving ? 'Saving...' : 'Save & Start Analyzing →'}
              </button>
              {!isOnboarding && (
                <button onClick={onClose} style={{ padding:'13px 20px', background:'rgba(255,255,255,0.06)', border:'none', borderRadius:40, color:'rgba(255,255,255,0.5)', fontFamily:"'Barlow',sans-serif", fontSize:14, cursor:'pointer' }}>Cancel</button>
              )}
            </div>

            {isOnboarding && (
              <button onClick={skipAndClose} style={{ display:'block', width:'100%', marginTop:10, background:'none', border:'none', color:'rgba(255,255,255,0.2)', fontFamily:"'Barlow',sans-serif", fontSize:12, cursor:'pointer', padding:'4px' }}>
                Skip — I'll add it later
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
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
  const [cerebrasKey, setCerebrasKey] = useState(() => getCachedCerebrasKey())
  const [showKeyModal, setShowKeyModal] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)

  const scrollTo = (id) => {
    const el = document.getElementById(id)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    else window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const loadUserRecord = async () => {
    try {
      const usage = await getUsage()
      setUserRecord(prev => ({ ...(prev || {}), ...usage }))
    } catch {}
  }

  useEffect(() => {
    const u = getCurrentUser()
    if (u) { setUser(u); setUserRecord({ is_pro: u.is_pro, analyses_used: 0 }); loadUserRecord() }
    setAuthLoading(false)
  }, [])

  useEffect(() => {
    if (result) {
      const addr = [result.geo.userStreet, result.geo.userCity, result.geo.userCountry].filter(Boolean).join(', ')
      document.title = `${addr} — Dwelling`
    } else document.title = 'Dwelling — Property Intelligence'
  }, [result])

  const handleAuth = u => {
    setUser(u)
    setUserRecord({ is_pro: u.is_pro, analyses_used: 0 })
    // Clear any previously cached key from a different account
    localStorage.removeItem('dw_cerebras_key')
    setCerebrasKey('')
    // Load usage from server (token is already set in localStorage by signIn/signUp)
    loadUserRecord()
    // Show onboarding once per session if they haven't seen it
    const alreadySeen = sessionStorage.getItem('dw_key_onboarding_seen')
    if (!alreadySeen) {
      setTimeout(() => setShowOnboarding(true), 800)
    }
  }
  const handleSignOut = () => {
    localSignOut()
    // Clear API key from localStorage so it doesn't leak to next account
    localStorage.removeItem('dw_cerebras_key')
    setCerebrasKey('')
    setUser(null); setUserRecord(null); setResult(null)
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
      const [weather, climate, neighborhoodScores, walkScoreData] = await Promise.all([
        getCurrentWeather(geo.lat, geo.lon),
        getClimateNormals(geo.lat, geo.lon),
        getNeighborhoodScores(geo.lat, geo.lon),
        fetch('/api/walkscore', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lat: geo.lat, lon: geo.lon, address: `${city}, ${state || ''}, Canada` }) }).then(r => r.ok ? r.json() : null).catch(() => null),
      ]); setLoadStep(2)
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

      const realData = { neighborhoodScores, censusData, fmr, floodZone, riskData, areaMetrics, areaRiskScore, marketTemperature, newsData, isAreaMode, walkScoreData }
      const ai = await analyzeProperty(geo, weather, climate, knownFacts ?? {}, realData, cerebrasKey); setLoadStep(4)
      setResult({ geo, weather, climate, ai, knownFacts: knownFacts ?? {}, realData, isAreaMode })
      setTimeout(() => loadUserRecord(), 800) // wait for Turso write to commit
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
      const ai = await analyzeProperty(result.geo, result.weather, result.climate, merged, result.realData, cerebrasKey)
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
      const [weather, climate, neighborhoodScores, walkScoreData] = await Promise.all([
        getCurrentWeather(geo.lat, geo.lon),
        getClimateNormals(geo.lat, geo.lon),
        getNeighborhoodScores(geo.lat, geo.lon),
        fetch('/api/walkscore', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lat: geo.lat, lon: geo.lon, address: `${city}, ${state || ''}, Canada` }) }).then(r => r.ok ? r.json() : null).catch(() => null),
      ]); setLoadStep(2)
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
      const ai = await analyzeProperty(geo, weather, climate, {}, realData, cerebrasKey); setLoadStep(4)
      setCompareResult({ geo, weather, climate, ai, knownFacts: {}, realData, isAreaMode })
      setComparingMode(false)
      setTimeout(() => loadUserRecord(), 800) // wait for Turso write to commit
    } catch (err) {
      if (err.message?.includes('limit reached') || err.message?.includes('429')) setShowPaywall(true)
      else setError(err.message ?? 'Something went wrong.')
    } finally { setLoading(false) }
  }

  const trialDaysLeft = null
  const isInTrial = false
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
        {showTerms && <TermsModal onClose={() => setShowTerms(false)} />}
      {showKeyModal && <ApiKeyModal currentKey={cerebrasKey} onSave={k => setCerebrasKey(k)} onClose={() => setShowKeyModal(false)} isOnboarding={false} />}
      {showOnboarding && <ApiKeyModal currentKey={cerebrasKey} onSave={k => setCerebrasKey(k)} onClose={() => setShowOnboarding(false)} isOnboarding={true} />}
      {showPaywall && <PaywallModal onClose={() => setShowPaywall(false)} onUpgrade={() => { window.location.href = 'mailto:01dominique.c@gmail.com?subject=Dwelling Pro Upgrade&body=Hi, I want to upgrade to Dwelling Pro ($19/month). Please send payment details.' }} />}
      <Navbar user={user} userRecord={userRecord} analysesLeft={analysesLeft} isInTrial={isInTrial} trialDaysLeft={trialDaysLeft} onSignOut={handleSignOut} onOpenKeyModal={() => setShowKeyModal(true)} hasOwnKey={!!cerebrasKey || !!userRecord?.has_own_key} previewPlan={previewPlan} onTogglePreview={() => setPreviewPlan(p => p === 'pro' ? 'free' : 'pro')}
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
                  ⚖️ Compare areas
                </button>
                <button
                  onClick={() => {
                    const city = result?.geo?.userCity || 'this city'
                    const score = result?.ai?.stabilityScore || result?.ai?.overallScore || ''
                    const verdict = result?.ai?.verdict || result?.ai?.marketVerdict || ''
                    const text = `I just ran a Dwelling AI report on ${city}${score ? ` — Score: ${score}/100` : ''}${verdict ? `, Verdict: ${verdict}` : ''}. Free at dwelling-three.vercel.app`
                    if (navigator.share) { navigator.share({ title: `Dwelling: ${city}`, text, url: 'https://dwelling-three.vercel.app' }).catch(() => {}) }
                    else { navigator.clipboard?.writeText(text).then(() => alert('Copied to clipboard!')).catch(() => alert(text)) }
                  }}
                  style={{ borderRadius: 40, padding: '8px 16px', fontSize: 13, fontFamily: "'Barlow',sans-serif", color: 'rgba(255,255,255,0.6)', border: 'none', cursor: 'pointer', background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(12px)', transition: 'opacity 0.15s', display: 'flex', alignItems: 'center', gap: 5 }}
                  onMouseEnter={e => e.currentTarget.style.opacity = '0.75'}
                  onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
                  ↗ Share
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
          <MortgageCalculator />
          <RentalCalculator />
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
