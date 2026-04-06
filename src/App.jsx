import { useState, useEffect, useRef, memo, lazy, Suspense, forwardRef } from 'react'
import { useScrollReveal, getGSAP } from '../hooks/useScrollReveal'
import AddressSearch from './components/AddressSearch'
import LoadingState from './components/LoadingState'
const Dashboard = lazy(() => import('./components/Dashboard'))
import AuthModal from './components/AuthModal'
import PaywallModal from './components/PaywallModal'
import CookieBanner from './components/CookieBanner'
import DeleteAccountModal from './components/DeleteAccountModal'
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

const HERO_POSTER = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663463031725/5FNF4QVCkxSRz6ba3cCadG/hero-poster-ZHdSBZKm8ENZMaTu9N2eqV.webp'
const LOGO = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663463031725/5FNF4QVCkxSRz6ba3cCadG/dwelling-logo-3AJU9MMgr8YxSGXWKetVFA.webp'

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function scrollTo(id) {
  const el = document.getElementById(id)
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}


const Section = forwardRef(function Section({ children, style = {} }, ref) {
  return (
    <section ref={ref} style={{ position: 'relative', overflow: 'hidden', background: '#000', contain: 'layout', ...style }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'rgba(255,255,255,0.04)' }} />
      <div style={{ position: 'relative', zIndex: 10 }}>{children}</div>
    </section>
  )
})

// ─── TERMS MODAL ─────────────────────────────────────────────────────────────
function TermsModal({ onClose }) {
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])
  const sections = [
    { title: '1. Acceptance of Terms and Binding Agreement', body: 'By registering an account, accessing, browsing, or otherwise using the Dwelling platform, its website, mobile applications, or any related service (collectively, the "Platform"), you ("User," "you," or "your") acknowledge that you have read, understood, and agree to be legally bound by these Terms and Conditions ("Terms"). If you do not agree to every provision of these Terms, you must immediately discontinue all use of the Platform. These Terms constitute a legally binding agreement between you and Dwelling ("Company," "we," "us," or "our"). The Company reserves the right to amend, update, or replace these Terms at any time without prior individual notice. Updated Terms will be posted on the Platform with a revised effective date. Your continued access to or use of the Platform following any modification constitutes your unconditional acceptance of the revised Terms.' },
    { title: '2. Eligibility and Account Registration', body: 'The Platform is intended for individuals who are at least 18 years of age and who have the legal capacity to enter into binding contracts under applicable law. By using the Platform you represent and warrant that you meet these requirements. You agree to provide accurate, current, and complete information during registration and to update such information as necessary. You are solely responsible for maintaining the confidentiality of your account credentials and for all activity that occurs under your account. The Company is not liable for any loss or damage arising from your failure to maintain account security. The Company reserves the right to refuse registration or cancel accounts at its sole discretion, including where it suspects fraudulent, abusive, or unauthorized use.' },
    { title: '3. No Professional, Financial, Legal, or Real Estate Advice', body: 'ALL INFORMATION, REPORTS, SCORES, ESTIMATES, ANALYSES, VERDICTS, PROJECTIONS, AND OTHER CONTENT PROVIDED BY THE PLATFORM ARE PROVIDED SOLELY FOR GENERAL INFORMATIONAL AND EDUCATIONAL PURPOSES. NOTHING ON THE PLATFORM CONSTITUTES, OR SHOULD BE CONSTRUED AS, FINANCIAL ADVICE, INVESTMENT ADVICE, REAL ESTATE ADVICE, LEGAL ADVICE, TAX ADVICE, MORTGAGE ADVICE, APPRAISAL SERVICES, OR ANY OTHER FORM OF PROFESSIONAL ADVICE. The Company is not a licensed real estate brokerage, mortgage broker, financial institution, investment dealer, securities adviser, appraiser, or legal practitioner in any jurisdiction. No content on the Platform creates any professional-client relationship of any kind. You should independently verify all Platform content and consult with appropriately licensed and qualified professionals before making any real estate, financial, investment, or other significant decision. Reliance on Platform content without independent professional advice is done entirely at your own risk.' },
    { title: '4. Accuracy, Completeness, and Reliability of Data', body: 'THE COMPANY MAKES NO REPRESENTATIONS, WARRANTIES, OR GUARANTEES OF ANY KIND, EXPRESS OR IMPLIED, REGARDING THE ACCURACY, COMPLETENESS, TIMELINESS, RELIABILITY, SUITABILITY, OR AVAILABILITY OF ANY PLATFORM CONTENT. Real estate markets, property values, rental rates, interest rates, demographic data, risk scores, and all other information are subject to rapid and unpredictable change. Platform content may be based on data from third-party sources outside the Company\'s control and may be inaccurate, incomplete, delayed, or unavailable. Algorithmic valuations, investment scores, stability scores, and market indicators are statistical approximations that may differ materially from actual market conditions or professional appraisals. The Company expressly disclaims all liability of any kind arising from or in connection with reliance on any Platform content.' },
    { title: '5. AI-Generated Content — Special Disclaimer', body: 'The Platform uses large language model artificial intelligence systems to generate reports, city analyses, verdicts, investment summaries, neighbourhood descriptions, risk assessments, and other content. You acknowledge and agree that: (a) AI-generated content is produced algorithmically and may contain factual errors, logical inconsistencies, hallucinations, or outdated information; (b) AI investment scores and outlooks are NOT predictions, forecasts, or guarantees of future real estate performance; (c) AI-generated content reflects the state of training data and available inputs at the time of generation and does not account for all factors relevant to real estate decisions; (d) the Company does not review or verify the accuracy of AI-generated output before it is displayed; (e) AI-generated content should never be the sole or primary basis for any financial or real estate decision; and (f) the Company is not liable for any loss, damage, or harm resulting from use of or reliance on AI-generated content. The use of AI by the Platform is experimental and subject to significant inherent limitations.' },
    { title: '6. Limitation of Liability', body: 'TO THE FULLEST EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL THE COMPANY, ITS OFFICERS, DIRECTORS, SHAREHOLDERS, EMPLOYEES, CONTRACTORS, AGENTS, SUCCESSORS, OR ASSIGNS BE LIABLE FOR ANY: (A) INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, EXEMPLARY, OR PUNITIVE DAMAGES; (B) LOSS OF PROFITS, REVENUE, BUSINESS, GOODWILL, DATA, OR ANTICIPATED SAVINGS; (C) LOSS ARISING FROM REAL ESTATE TRANSACTIONS, INVESTMENT DECISIONS, OR FINANCIAL LOSSES OF ANY KIND; (D) COST OF SUBSTITUTE GOODS OR SERVICES; OR (E) ANY OTHER LOSS OR DAMAGE OF ANY KIND, WHETHER BASED ON CONTRACT, TORT (INCLUDING NEGLIGENCE), STATUTE, OR OTHERWISE, EVEN IF THE COMPANY HAS BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGE. THE TOTAL AGGREGATE LIABILITY OF THE COMPANY FOR ALL CLAIMS SHALL NOT EXCEED THE GREATER OF: (I) THE TOTAL FEES ACTUALLY PAID BY YOU IN THE THREE CALENDAR MONTHS PRECEDING THE EVENT GIVING RISE TO THE CLAIM; OR (II) TWENTY-FIVE CANADIAN DOLLARS (CAD $25.00).' },
    { title: '7. No Warranty', body: 'THE PLATFORM AND ALL PLATFORM CONTENT ARE PROVIDED ON AN "AS IS," "AS AVAILABLE," AND "WITH ALL FAULTS" BASIS. THE COMPANY EXPRESSLY DISCLAIMS ALL WARRANTIES OF ANY KIND, WHETHER EXPRESS, IMPLIED, STATUTORY, OR OTHERWISE, INCLUDING BUT NOT LIMITED TO: IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, AND NON-INFRINGEMENT; WARRANTIES THAT THE PLATFORM WILL MEET YOUR REQUIREMENTS; WARRANTIES THAT THE PLATFORM WILL BE AVAILABLE, UNINTERRUPTED, TIMELY, SECURE, OR ERROR-FREE; AND WARRANTIES REGARDING THE ACCURACY OR RELIABILITY OF ANY INFORMATION OBTAINED THROUGH THE PLATFORM. NO ORAL OR WRITTEN ADVICE OR INFORMATION OBTAINED FROM THE COMPANY CREATES ANY WARRANTY NOT EXPRESSLY STATED IN THESE TERMS.' },
    { title: '8. Subscription, Billing, and Cancellation Policy', body: 'Paid subscriptions ("Pro Plan") are billed in advance on a monthly or annual basis in Canadian dollars (CAD). By subscribing, you authorize the Company to charge your payment method on a recurring basis at the applicable rate until cancelled. ALL SUBSCRIPTION FEES ARE STRICTLY NON-REFUNDABLE. The Company does not offer refunds, credits, or prorated amounts for any reason whatsoever, including but not limited to: partial use of a billing period, dissatisfaction with Platform content, service interruptions, feature changes, or account termination for breach of these Terms. Subscriptions renew automatically at the end of each billing period unless cancelled prior to the renewal date. To cancel, you must do so through your account settings or by contacting the Company at 01dominique.c@gmail.com before the next billing date. Cancellation takes effect at the end of the then-current billing period; you retain Pro access until that date. No partial-period credits are issued upon cancellation. The Company reserves the right to change pricing at any time with no more than thirty (30) days notice; continued use after a price change constitutes acceptance of new pricing. Free-tier usage limits are set at the Company\'s sole discretion and may be changed at any time.' },
    { title: '9. User Obligations and Prohibited Conduct', body: 'You agree to use the Platform only for lawful purposes. You shall not: (a) use the Platform for fraudulent or unauthorized purposes; (b) scrape, harvest, or systematically extract any Platform data without written permission; (c) reproduce, distribute, sublicense, sell, or commercially exploit any Platform content; (d) reverse engineer, decompile, or disassemble the Platform; (e) circumvent any security or access control mechanism; (f) impersonate any person or entity; (g) transmit any virus, malware, or harmful code; (h) attempt unauthorized access to any part of the Platform or its infrastructure; (i) use automated bots or scripts in ways not expressly permitted; or (j) interfere with other users\' enjoyment of the Platform. Violation may result in immediate account termination and pursuit of all available legal remedies.' },
    { title: '10. Intellectual Property Rights', body: 'The Platform and all content, features, functionality, design, code, databases, trademarks, and logos (collectively, "Company IP") are owned by the Company or its licensors and are protected by Canadian and international intellectual property laws. You are granted a limited, personal, non-exclusive, non-transferable, revocable licence to access and use the Platform solely for personal, non-commercial informational purposes, subject to compliance with these Terms. This licence does not include the right to sublicense, sell, modify, create derivative works from, or publicly distribute any Company IP. Unauthorized use of Company IP terminates this licence immediately.' },
    { title: '11. Privacy and Data Handling', body: 'By using the Platform, you consent to the collection, use, storage, and processing of your personal information as described in the Company\'s Privacy Policy. The Company collects your email address, authentication credentials (in hashed form), account activity, and usage counts. Search queries are processed in real time and not retained as personally identifiable records. Your third-party API key, if stored, is encoded and used solely to forward AI inference requests on your behalf. The Company does not sell your personal information. The Company complies with applicable Canadian privacy legislation including PIPEDA and applicable provincial privacy laws.' },
    { title: '12. Third-Party Services and Data Sources', body: 'The Platform relies on third-party data providers and infrastructure services including Statistics Canada, OpenStreetMap contributors, Open-Meteo, Cerebras AI, Turso, Vercel Inc., and real estate data aggregators. The Company does not control, endorse, or guarantee the accuracy or availability of any third-party service. The Company is not affiliated with or officially endorsed by any third-party provider. Interruption or inaccuracy of any third-party service may affect Platform functionality without liability to the Company.' },
    { title: '13. Account Suspension and Termination', body: 'The Company may, at its sole discretion and without notice or liability, suspend or permanently terminate your account for any reason, including breach of these Terms, fraudulent or abusive conduct, non-payment, or any conduct the Company believes may expose it to legal liability. Upon termination: (a) your access to the Platform immediately ceases; (b) you remain liable for all obligations incurred prior to termination; (c) no subscription fees or portion thereof will be refunded; and (d) all provisions of these Terms that by their nature should survive termination shall survive.' },
    { title: '14. Indemnification', body: 'To the fullest extent permitted by law, you agree to defend, indemnify, and hold harmless the Company and its officers, directors, shareholders, employees, contractors, agents, licensors, successors, and assigns from and against any and all claims, liabilities, damages, judgments, losses, costs, expenses, and legal fees arising out of or relating to: (a) your use of the Platform; (b) your violation of these Terms; (c) your violation of any applicable law or third-party right; (d) your reliance on any Platform content for any decision; or (e) any content or information you submit through the Platform.' },
    { title: '15. Dispute Resolution, Arbitration, and Class Action Waiver', body: 'PLEASE READ THIS SECTION CAREFULLY — IT AFFECTS YOUR LEGAL RIGHTS. These Terms are governed exclusively by the laws of the Province of Ontario and the applicable federal laws of Canada, without regard to conflict of law principles. Before initiating formal proceedings, the parties agree to attempt resolution through good-faith negotiation for thirty (30) days following written notice. If unresolved, the Dispute shall be finally resolved by binding arbitration in Ottawa, Ontario under the Arbitration Act, 1991 (Ontario) before a single arbitrator. The arbitrator\'s decision shall be final and binding. YOU AND THE COMPANY EACH WAIVE ANY RIGHT TO A JURY TRIAL. YOU WAIVE ANY RIGHT TO INITIATE OR PARTICIPATE IN ANY CLASS ACTION, COLLECTIVE ACTION, OR REPRESENTATIVE PROCEEDING OF ANY KIND AGAINST THE COMPANY. The Company may seek injunctive or equitable relief in any court of competent jurisdiction to protect its intellectual property or prevent irreparable harm.' },
    { title: '16. Modifications to the Platform', body: 'The Company reserves the right, at its sole discretion, to modify, suspend, or discontinue the Platform or any part thereof at any time, with or without notice; add, remove, or change features or content; change pricing upon reasonable notice; or impose usage limits. The Company shall not be liable for any modification, suspension, or discontinuation of the Platform.' },
    { title: '17. Severability, Waiver, and Entire Agreement', body: 'If any provision of these Terms is held invalid, illegal, or unenforceable, it shall be modified to the minimum extent necessary to make it enforceable, and the remaining provisions shall continue in full force. No waiver by the Company of any breach shall be deemed a waiver of any subsequent breach. These Terms, together with the Privacy Policy and any other policies incorporated herein by reference, constitute the entire agreement between you and the Company regarding the Platform and supersede all prior understandings, agreements, and representations.' },
    { title: '18. Contact and Legal Notices', body: 'For general support: 01dominique.c@gmail.com. For formal legal notices, written notice must be sent to the same address with the subject line "Legal Notice — Dwelling" and must include: your full legal name, account email, a detailed description of the claim, and the relief sought. The Company will acknowledge receipt of formal legal notices within ten (10) business days. These Terms were last updated on March 30, 2026.' },
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
        <div data-lenis-prevent style={{ flex: 1, overflowY: 'scroll', padding: '28px', overscrollBehavior: 'contain' }}>
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
  { q: 'Is Dwelling free to use?', a: 'Free users get 10 analyses per month. Upgrade to Pro for $29/month (or $226/year — save 35%) for expanded analysis access, full city intelligence, and investment-grade reports. Analysis availability is subject to platform capacity.' },
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
          <div key={i} className="liquid-glass how-step" style={{ borderRadius: 18, overflow: 'hidden' }}>
            <button onClick={() => setOpen(open === i ? null : i)}
              style={{ width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', background: 'transparent', border: 'none', cursor: 'pointer' }}>
              <span style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 400, fontSize: 14, color: '#fff', flex: 1, paddingRight: 16 }}>{item.q}</span>
              <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 18, transition: 'transform 0.2s', transform: open === i ? 'rotate(180deg)' : 'none', flexShrink: 0 }}>⌄</span>
            </button>
            <div style={{
              display: 'grid',
              gridTemplateRows: open === i ? '1fr' : '0fr',
              transition: 'grid-template-rows 0.2s ease',
            }}>
              <div style={{ overflow: 'hidden' }}>
                <p style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 1.7, padding: '0 22px 18px' }}>{item.a}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
})

// ─── NAVBAR ──────────────────────────────────────────────────────────────────
function Navbar({ user, userRecord, analysesLeft, isInTrial, trialDaysLeft, onSignOut, onHome, onOpenKeyModal, hasOwnKey, previewPlan, onTogglePreview, onDeleteAccount }) {
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
              <span className="liquid-glass" style={{ borderRadius: 40, padding: '5px 12px', fontSize: 12, fontFamily: "'Barlow',sans-serif", color: user?.is_admin ? '#a78bfa' : userRecord?.is_pro ? '#fbbf24' : low ? '#f87171' : 'rgba(255,255,255,0.5)' }}>
                {user?.is_admin ? '⚡ Admin' : userRecord?.is_pro ? '★ Pro' : `${analysesLeft} / 10 left`}
              </span>
              {user?.is_admin && (
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
              <button onClick={onDeleteAccount} title="Delete account" style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 11, color: 'rgba(248,113,113,0.35)', padding: '5px 8px', transition: 'color 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.color = 'rgba(248,113,113,0.8)'}
                onMouseLeave={e => e.currentTarget.style.color = 'rgba(248,113,113,0.35)'}>Delete account</button>
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
function CityscapeSilhouette({ backRef, frontRef }) {
  // SVG cityscape silhouette — dark cutout at bottom of hero
  // Looks like you're looking out over a Canadian city skyline
  return (
    <div style={{
      position: 'absolute',
      bottom: 0, left: 0, right: 0,
      height: '38%',
      pointerEvents: 'none',
    }}>
      <svg
        viewBox="0 0 1440 320"
        preserveAspectRatio="xMidYMax slice"
        xmlns="http://www.w3.org/2000/svg"
        style={{ width: '100%', height: '100%', display: 'block' }}
      >
        {/* Back row — shorter, lighter buildings for depth */}
        <g ref={backRef} fill="#0d1e35">
          <rect x="0"    y="210" width="40"  height="110" />
          <rect x="42"   y="230" width="28"  height="90"  />
          <rect x="72"   y="195" width="50"  height="125" />
          <rect x="124"  y="220" width="32"  height="100" />
          <rect x="158"  y="200" width="60"  height="120" />
          <rect x="220"  y="215" width="35"  height="105" />
          <rect x="257"  y="185" width="55"  height="135" />
          <rect x="314"  y="210" width="40"  height="110" />
          <rect x="356"  y="200" width="48"  height="120" />
          <rect x="406"  y="220" width="30"  height="100" />
          <rect x="438"  y="190" width="62"  height="130" />
          <rect x="502"  y="215" width="38"  height="105" />
          <rect x="542"  y="200" width="44"  height="120" />
          <rect x="588"  y="210" width="50"  height="110" />
          <rect x="640"  y="185" width="58"  height="135" />
          <rect x="700"  y="215" width="34"  height="105" />
          <rect x="736"  y="195" width="52"  height="125" />
          <rect x="790"  y="210" width="40"  height="110" />
          <rect x="832"  y="200" width="48"  height="120" />
          <rect x="882"  y="220" width="30"  height="100" />
          <rect x="914"  y="190" width="60"  height="130" />
          <rect x="976"  y="215" width="36"  height="105" />
          <rect x="1014" y="200" width="44"  height="120" />
          <rect x="1060" y="210" width="50"  height="110" />
          <rect x="1112" y="185" width="56"  height="135" />
          <rect x="1170" y="215" width="34"  height="105" />
          <rect x="1206" y="195" width="52"  height="125" />
          <rect x="1260" y="210" width="40"  height="110" />
          <rect x="1302" y="200" width="48"  height="120" />
          <rect x="1352" y="220" width="30"  height="100" />
          <rect x="1384" y="190" width="56"  height="130" />
        </g>

        {/* Front row — taller, solid black buildings */}
        <g ref={frontRef} fill="#000">
          {/* Far left cluster */}
          <rect x="0"   y="240" width="55"  height="80"  />
          <rect x="57"  y="220" width="38"  height="100" />
          <rect x="97"  y="250" width="25"  height="70"  />

          {/* Left downtown cluster — CN Tower style */}
          <rect x="124" y="180" width="48"  height="140" />
          {/* CN Tower spire */}
          <rect x="144" y="120" width="8"   height="60"  />
          <rect x="140" y="148" width="16"  height="12"  />
          <rect x="137" y="158" width="22"  height="8"   />

          <rect x="174" y="195" width="62"  height="125" />
          <rect x="238" y="210" width="44"  height="110" />
          <rect x="284" y="170" width="70"  height="150" />
          <rect x="356" y="200" width="52"  height="120" />
          <rect x="410" y="215" width="36"  height="105" />

          {/* Center landmark — tallest building */}
          <rect x="448" y="140" width="80"  height="180" />
          {/* Antenna */}
          <rect x="484" y="100" width="6"   height="42"  />
          <rect x="480" y="128" width="14"  height="8"   />

          <rect x="530" y="185" width="55"  height="135" />
          <rect x="587" y="200" width="42"  height="120" />
          <rect x="631" y="175" width="68"  height="145" />

          {/* Right of center cluster */}
          <rect x="701" y="195" width="58"  height="125" />
          <rect x="761" y="210" width="44"  height="110" />
          <rect x="807" y="180" width="72"  height="140" />
          {/* Spire */}
          <rect x="839" y="135" width="7"   height="47"  />

          <rect x="881" y="200" width="50"  height="120" />
          <rect x="933" y="215" width="38"  height="105" />
          <rect x="973" y="170" width="66"  height="150" />

          {/* Right cluster */}
          <rect x="1041" y="190" width="54" height="130" />
          <rect x="1097" y="210" width="40" height="110" />
          <rect x="1139" y="178" width="70" height="142" />
          {/* Small spire */}
          <rect x="1169" y="140" width="8"  height="40"  />
          <rect x="1165" y="162" width="16" height="8"   />

          <rect x="1211" y="198" width="56" height="122" />
          <rect x="1269" y="212" width="42" height="108" />
          <rect x="1313" y="182" width="68" height="138" />

          {/* Far right */}
          <rect x="1383" y="200" width="57" height="120" />

          {/* Ground fill — solid black bar at very bottom */}
          <rect x="0" y="295" width="1440" height="25" />
        </g>

        {/* Window lights — tiny warm dots on buildings */}
        <g fill="rgba(255,220,120,0.25)">
          <rect x="130" y="190" width="3" height="3" />
          <rect x="138" y="190" width="3" height="3" />
          <rect x="130" y="200" width="3" height="3" />
          <rect x="180" y="205" width="3" height="3" />
          <rect x="190" y="215" width="3" height="3" />
          <rect x="295" y="182" width="3" height="3" />
          <rect x="305" y="192" width="3" height="3" />
          <rect x="315" y="182" width="3" height="3" />
          <rect x="458" y="152" width="3" height="3" />
          <rect x="468" y="162" width="3" height="3" />
          <rect x="478" y="152" width="3" height="3" />
          <rect x="458" y="172" width="3" height="3" />
          <rect x="478" y="172" width="3" height="3" />
          <rect x="540" y="195" width="3" height="3" />
          <rect x="550" y="205" width="3" height="3" />
          <rect x="642" y="185" width="3" height="3" />
          <rect x="652" y="195" width="3" height="3" />
          <rect x="662" y="185" width="3" height="3" />
          <rect x="712" y="205" width="3" height="3" />
          <rect x="722" y="215" width="3" height="3" />
          <rect x="818" y="190" width="3" height="3" />
          <rect x="828" y="200" width="3" height="3" />
          <rect x="838" y="190" width="3" height="3" />
          <rect x="984" y="180" width="3" height="3" />
          <rect x="994" y="190" width="3" height="3" />
          <rect x="1004" y="180" width="3" height="3" />
          <rect x="1150" y="188" width="3" height="3" />
          <rect x="1160" y="198" width="3" height="3" />
          <rect x="1170" y="188" width="3" height="3" />
          <rect x="1220" y="208" width="3" height="3" />
          <rect x="1320" y="192" width="3" height="3" />
          <rect x="1330" y="202" width="3" height="3" />
        </g>

        <defs>
          <linearGradient id="skyGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#0a1628" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#050c18" stopOpacity="1" />
          </linearGradient>
          <linearGradient id="groundFade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#000" stopOpacity="0" />
            <stop offset="100%" stopColor="#000" stopOpacity="1" />
          </linearGradient>
        </defs>
        <rect x="0" y="0" width="1440" height="320" fill="url(#skyGradient)" />
        <rect x="0" y="100" width="1440" height="220" fill="url(#groundFade)" />
      </svg>
    </div>
  )
}

function Hero({ onSearch, loading, onShowDemo, user, onOpenAuth }) {
  return (
    <section id="hero" style={{ position: 'relative', overflow: 'hidden', background: '#060d1c', minHeight: 'min(1000px, 100svh)', height: 'auto', zIndex: 0 }}>

      {/* Static city background layers */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'url(/hero-sky.jpg)', backgroundSize: 'cover', backgroundPosition: 'center 60%' }} />
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'url(/hero-near.jpg)', backgroundSize: 'cover', backgroundPosition: 'center 60%' }} />
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '55%', backgroundImage: 'url(/hero-far.webp)', backgroundSize: '80% auto', backgroundPosition: 'center bottom', backgroundRepeat: 'no-repeat', mixBlendMode: 'multiply' }} />
      </div>

      {/* Bottom gradient — fades into page */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 280, background: 'linear-gradient(to top, #000 30%, transparent)', zIndex: 2, pointerEvents: 'none' }} />

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
          {!user && (
            <p style={{ marginTop: 12, fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 13, color: 'rgba(255,255,255,0.45)', textAlign: 'center', lineHeight: 1.6 }}>
              <span onClick={onOpenAuth} style={{ color: '#fff', textDecoration: 'underline', textUnderlineOffset: 3, cursor: 'pointer' }}>Create a free account</span> to run your first search →
            </p>
          )}
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 24, flexWrap: 'wrap', justifyContent: 'center' }}>
          {[['1,737+','Canadian Cities'],['10','Free / Month'],['<30s','Analysis time']].map(([val, lbl]) => (
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
  const sectionRef = useScrollReveal({ y: 24, opacity: 0, duration: 0.8 })
  const partnersRef = useScrollReveal({ y: 0, opacity: 0, duration: 0.6, stagger: 0.07, selector: 'span.partner-name' })
  return (
    <section style={{ padding: '64px 24px' }}>
      <div ref={sectionRef} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div className="liquid-glass" style={{ borderRadius: 40, padding: '4px 14px', fontSize: 11, color: 'rgba(255,255,255,0.5)', fontFamily: "'Barlow',sans-serif", letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 28 }}>
          Powered by 16+ official data sources
        </div>
        <div ref={partnersRef} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 32 }}>
          {partners.map(name => (
            <span key={name} className="partner-name" style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 26, color: 'rgba(255,255,255,0.7)', transition: 'color 0.2s', cursor: 'default' }}
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

// ─── FEATURES ────────────────────────────────────────────────────────────────
const FeaturesChess = memo(function FeaturesChess() {
  const revealRef = useScrollReveal({ y: 0, opacity: 0, duration: 0.6, stagger: 0.12, selector: '.feature-chess-item' })
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
    <section ref={revealRef} id="features" style={{ padding: '96px 24px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div>
          <div className="liquid-glass" style={{ borderRadius: 40, display: 'inline-flex', padding: '5px 14px', fontSize: 11, color: 'rgba(255,255,255,0.5)', fontFamily: "'Barlow',sans-serif", letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 16 }}>Capabilities</div>
        </div>
        <h2 style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 'clamp(2rem,5vw,3.5rem)', color: '#fff', marginBottom: 56, lineHeight: 0.9, letterSpacing: '-0.02em' }}>
          <span style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic' }}>Unrivaled insights. Simplified.</span>
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


// ─── DATA PARTNERSHIPS ───────────────────────────────────────────────────────
const DataPartnerships = memo(function DataPartnerships() {
  const dpRef = useScrollReveal({ y: 28, opacity: 0, duration: 0.7, stagger: 0.1, selector: '.data-source-card' })
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
      <div ref={dpRef} style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div>
          <div className="liquid-glass" style={{ borderRadius: 40, display: 'inline-flex', padding: '5px 14px', fontSize: 11, color: 'rgba(255,255,255,0.5)', fontFamily: "'Barlow',sans-serif", letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 16 }}>Data Sources</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 40 }}>
          <h2 style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 'clamp(2rem,5vw,3.5rem)', color: '#fff', lineHeight: 0.9, letterSpacing: '-0.02em' }}>
            <span style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic' }}>Data you can actually trust.</span>
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
  return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 12 }}>
          {partners.map((p, i) => (
            <div key={i}>
              <div className="liquid-glass"
                style={{ borderRadius: 18, padding: 24, height: '100%', cursor: 'default',
                  opacity: p.status === 'soon' ? 0.7 : 1,
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
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 14, textAlign: 'left' }}>
      {steps.map((s, i) => (
        <div key={i} className="liquid-glass how-step"
          style={{ borderRadius: 20, padding: 28, cursor: 'default' }}>
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
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 14 }}>
      {cards.map((card, i) => (
        <div key={i} className="liquid-glass how-step"
          style={{ borderRadius: 18, padding: 24, cursor: 'default' }}>
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
              { target: 1737, suffix: '+', label: 'Canadian cities covered' },
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
  '10 analyses / month',
  'Area Verdict & Market Intelligence',
  'Cost of Living breakdown',
  'Climate & weather data',
  'Local Market News',
  'Area Market Estimate',
  'Walkability & school scores',
  'Full Neighbourhood detail & safety',
]
const PRICING_PRO = [
  { text: 'Unlimited analyses', highlight: false },
  { text: 'Investment Analysis & score', highlight: true },
  { text: 'Environmental & flood risk detection', highlight: true },
  { text: 'Price history & market projections', highlight: true },
  { text: 'Side-by-side city comparison', highlight: false },
  { text: 'Priority support', highlight: false },
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
          <span style={{ fontFamily: "'Barlow',sans-serif", fontSize: 11, color: 'rgba(255,255,255,0.25)', fontWeight: 300 }}>Cancel anytime · No refunds</span>
        </div>
      )}
    </div>
  )
}

const Pricing = memo(function Pricing({ onUpgrade }) {
  const headRef = useScrollReveal({ y: 28, opacity: 0, duration: 0.85, ease: 'power3.out' })
  const cardsRef = useScrollReveal({ y: 40, opacity: 0, duration: 0.7, stagger: 0.15, selector: '.pricing-card-anim' })
  const [annual, setAnnual] = useState(false)
  const monthlyPrice = 29
  const annualPrice = 226
  const displayPrice = annual ? Math.round(annualPrice / 12) : monthlyPrice
  const displaySuffix = annual ? '/mo · billed yearly' : '/month'

  return (
    <section id="pricing" style={{ position: 'relative', overflow: 'hidden', padding: 'clamp(80px, 10vw, 120px) 20px' }}>
      {/* Video background */}
      <video autoPlay muted loop playsInline
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.1, zIndex: 0, willChange: 'transform' }}>
        <source src="/pricing-bg.webm" type="video/webm" />
      </video>
      {/* Gradient overlays */}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, #000 0%, rgba(0,0,0,0.6) 30%, rgba(0,0,0,0.6) 70%, #000 100%)', zIndex: 1 }} />
      {/* Subtle radial glow */}
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 80% 60% at 50% 50%, rgba(56,189,248,0.07) 0%, transparent 70%)', zIndex: 1 }} />

      <div style={{ position: 'relative', zIndex: 2, maxWidth: 900, margin: '0 auto', textAlign: 'center' }}>
        <div className="liquid-glass" style={{ borderRadius: 40, display: 'inline-flex', padding: '5px 14px', fontSize: 11, color: 'rgba(255,255,255,0.5)', fontFamily: "'Barlow',sans-serif", letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 20 }}>Pricing</div>

        <h2 style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 'clamp(2.2rem,5vw,3.8rem)', color: '#fff', marginBottom: 12, lineHeight: 0.95, letterSpacing: '-0.02em' }}>
          Know before you move.
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
            <span style={{ marginLeft: 6, background: 'rgba(56,189,248,0.15)', border: '1px solid rgba(56,189,248,0.3)', borderRadius: 20, padding: '2px 8px', fontSize: 11, color: '#38bdf8' }}>Save 35%</span>
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
            plan="Pro" price={String(displayPrice)} desc={annual ? "Billed $226/year — cancel anytime" : "Full intelligence for every location decision"}
            priceLabel={annual ? '/mo · billed yearly' : '/month'}
            features={PRICING_PRO}
            cta={annual ? `Get Pro — $226/year →` : "Upgrade to Pro →"}
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
function MortgageCalculator({ activeCity }) {
  const [income, setIncome] = useState(120000)
  const [downPct, setDownPct] = useState(20)
  const [rate, setRate] = useState(5.5)
  const CITY_PRICES_MC = {
    'Ottawa': 620000, 'Toronto': 1080000, 'Vancouver': 1320000,
    'Calgary': 630000, 'Edmonton': 430000, 'Montreal': 540000,
    'Hamilton': 710000, 'Waterloo': 700000, 'Victoria': 880000,
    'Halifax': 530000, 'Winnipeg': 360000, 'Saskatoon': 360000,
  }
  // Auto-select the city the user just searched if it exists in our list
  const matchCity = activeCity ? Object.keys(CITY_PRICES_MC).find(c => activeCity.toLowerCase().includes(c.toLowerCase())) : null
  const [city, setCity] = useState(matchCity || 'Ottawa')
  // Update city when a new analysis runs
  const prevActiveCity = useRef(activeCity)
  useEffect(() => {
    if (activeCity && activeCity !== prevActiveCity.current) {
      const match = Object.keys(CITY_PRICES_MC).find(c => activeCity.toLowerCase().includes(c.toLowerCase()))
      if (match) setCity(match)
      prevActiveCity.current = activeCity
    }
  }, [activeCity])

  const medianPrice = CITY_PRICES_MC[city] || 600000
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
          Can I afford to live there?
        </h2>
        <p style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 15, color: 'rgba(255,255,255,0.4)', marginBottom: 36, lineHeight: 1.7 }}>
          Uses the Canadian mortgage stress test (GDS ratio 32%) to calculate real affordability.
        </p>

        <div className="liquid-glass-strong" style={{ borderRadius: 24, padding: 32 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 20, marginBottom: 28 }}>
            <div>
              <label style={labelStyle}>City</label>
              <select value={city} onChange={e => setCity(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                {Object.keys(CITY_PRICES_MC).map(c => <option key={c} value={c} style={{ background: '#111' }}>{c}</option>)}
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
                onFocus={e => e.target.select()}
                onBlur={e => { if (!e.target.value || income === 0) setIncome(120000) }}
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
              <input type="number" value={rate} onChange={e => setRate(Number(e.target.value))} onFocus={e => e.target.select()} onBlur={e => { if (!e.target.value) setRate(5.5) }} style={inputStyle} step={0.05} min={1} max={12} />
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
function RentalCalculator({ activeCity }) {
  const CITY_DATA_KEYS = ['Ottawa','Toronto','Vancouver','Calgary','Edmonton','Montreal','Hamilton','Waterloo','Victoria','Halifax','Winnipeg','Saskatoon']
  const matchCityR = activeCity ? CITY_DATA_KEYS.find(c => activeCity.toLowerCase().includes(c.toLowerCase())) : null
  const [city, setCity] = useState(matchCityR || 'Ottawa')
  const [downPct, setDownPct] = useState(20)
  const [rate, setRate] = useState(5.5)
  const prevActiveCityR = useRef(activeCity)
  useEffect(() => {
    if (activeCity && activeCity !== prevActiveCityR.current) {
      const match = CITY_DATA_KEYS.find(c => activeCity.toLowerCase().includes(c.toLowerCase()))
      if (match) setCity(match)
      prevActiveCityR.current = activeCity
    }
  }, [activeCity])
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
          Is it worth buying to rent?
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
              <input type="number" value={rate} onChange={e=>setRate(Number(e.target.value))} onFocus={e=>e.target.select()} onBlur={e=>{ if(!e.target.value) setRate(5.5) }} style={inputStyle} step={0.05} min={1} max={12} />
            </div>
            <div>
              <label style={label}>Mgmt fee % / Vacancy %</label>
              <div style={{ display:'flex', gap:8 }}>
                <input type="number" value={mgmt} onChange={e=>setMgmt(Number(e.target.value))} onFocus={e=>e.target.select()} onBlur={e=>{ if(e.target.value==='') setMgmt(8) }} style={{ ...inputStyle, width:'50%' }} min={0} max={20} step={1} />
                <input type="number" value={vacancy} onChange={e=>setVacancy(Number(e.target.value))} onFocus={e=>e.target.select()} onBlur={e=>{ if(e.target.value==='') setVacancy(5) }} style={{ ...inputStyle, width:'50%' }} min={0} max={30} step={1} />
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
  const ctaRef = useScrollReveal({ y: 36, opacity: 0, duration: 1.0, ease: 'power3.out' })
  return (
    <Section>
      <div ref={ctaRef} style={{ maxWidth: 860, margin: '0 auto', textAlign: 'center', padding: 'clamp(60px, 10vw, 128px) 20px 60px' }}>
        <h2 style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 'clamp(2.2rem,6vw,4.5rem)', color: '#fff', lineHeight: 0.9, letterSpacing: '-0.03em', marginBottom: 20 }}>
          <span style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic' }}>Your next area decision starts here.</span>
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
          <div style={{ display: 'flex', gap: 18, alignItems: 'center' }}>
            <a href="mailto:01dominique.c@gmail.com" style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 11, color: 'rgba(255,255,255,0.3)', textDecoration: 'none', transition: 'color 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.6)'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.3)'}>Support</a>
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
  const [paywallTrigger, setPaywallTrigger] = useState('limit') // 'limit' | 'pricing' | 'section' | section name
  const [user, setUser] = useState(null)
  const [userRecord, setUserRecord] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)

  // ── Lenis smooth scroll ──────────────────────────────────────────────────
  useEffect(() => {
    let lenis
    Promise.all([import('lenis'), getGSAP()]).then(([{ default: Lenis }, { gsap }]) => {
      lenis = new Lenis({ lerp: 0.1, smoothWheel: true })
      gsap.ticker.add((time) => { lenis.raf(time * 1000) })
      gsap.ticker.lagSmoothing(0)
    })
    return () => lenis?.destroy()
  }, [])
  const [showDemo, setShowDemo] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [guestResult, setGuestResult] = useState(null) // first search result shown to non-logged-in users
  const [teaserCity, setTeaserCity] = useState(null)
  const [compareResult, setCompareResult] = useState(null)
  const [comparingMode, setComparingMode] = useState(false)
  const [previewPlan, setPreviewPlan] = useState('pro') // 'free' | 'pro'
  const [cerebrasKey, setCerebrasKey] = useState(() => getCachedCerebrasKey())
  const [showKeyModal, setShowKeyModal] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [showDeleteAccount, setShowDeleteAccount] = useState(false)

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
    if (u) {
      setUser(u)
      setUserRecord({ is_pro: u.is_pro, analyses_used: 0 })
      loadUserRecord()
      // Restore key from server on page load
      loadCerebrasKeyFromServer().then(k => { if (k) setCerebrasKey(k) })
    }
    setAuthLoading(false)
  }, [])

  useEffect(() => {
    if (result) {
      const addr = [result.geo.userStreet, result.geo.userCity, result.geo.userCountry].filter(Boolean).join(', ')
      document.title = `${addr} — Dwelling`
    } else document.title = 'Dwelling — Property Intelligence'
  }, [result])

  const handleAuth = async u => {
    const fullUser = getCurrentUser() || u  // JWT decode has is_admin; u is fallback
    setUser(fullUser)
    setUserRecord({ is_pro: fullUser.is_pro, analyses_used: 0 })
    loadUserRecord()
    // Load the key for THIS account from Turso — wait for result BEFORE clearing cached key
    // so there's no window where cerebrasKey is '' and a search fires with no key
    const serverKey = await loadCerebrasKeyFromServer()
    if (serverKey) {
      // User already has a key saved — restore it, clear any stale cached key from another account
      sessionStorage.removeItem('dw_cerebras_key')
      setCerebrasKey(serverKey)
    } else {
      // No key on server — clear any stale cached key from a different account
      sessionStorage.removeItem('dw_cerebras_key')
      setCerebrasKey('')
      // Show onboarding once
      const alreadySeen = sessionStorage.getItem('dw_key_onboarding_seen')
      if (!alreadySeen) {
        setTimeout(() => setShowOnboarding(true), 600)
      }
    }
  }
  const handleSignOut = () => {
    localSignOut()
    // Clear API key from localStorage so it doesn't leak to next account
    sessionStorage.removeItem('dw_cerebras_key')
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
    if (!user) { setShowAuthModal(true); return }
    setLoading(true); setError(null); setResult(null); setLoadStep(0)
    const isAreaMode = !street.trim()
    try {
      const geocodeInput = isAreaMode ? { street: '', city, state, country } : { street, city, state, country }
      const geo = await geocodeStructured(geocodeInput); setLoadStep(1)
      const postcode = geo.address?.postcode ?? ''
      const [weather, climate, neighborhoodScores] = await Promise.all([
        getCurrentWeather(geo.lat, geo.lon),
        getClimateNormals(geo.lat, geo.lon),
        getNeighborhoodScores(geo.lat, geo.lon),
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

      const realData = { neighborhoodScores, censusData, fmr, floodZone, riskData, areaMetrics, areaRiskScore, marketTemperature, newsData, isAreaMode }
      const ai = await analyzeProperty(geo, weather, climate, knownFacts ?? {}, realData, cerebrasKey); setLoadStep(4)
      const reportData = { geo, weather, climate, ai, knownFacts: knownFacts ?? {}, realData, isAreaMode }
      setResult(reportData)
      if (!user) setGuestResult(reportData) // track that guest has used their free search
      setTimeout(() => loadUserRecord(), 800) // wait for Turso write to commit
    } catch (err) {
      if (err.message?.includes('context invalidated')) return
      if (err.message === 'no_key') { setShowKeyModal(true); return }
      if (err.message?.includes('limit reached') || err.message?.includes('429')) { setPaywallTrigger('limit'); setShowPaywall(true) }
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
    if (!user) { setShowAuthModal(true); return }
    setLoading(true); setError(null); setLoadStep(0)
    const isAreaMode = !street.trim()
    try {
      const geocodeInput = isAreaMode ? { street: '', city, state, country } : { street, city, state, country }
      const geo = await geocodeStructured(geocodeInput); setLoadStep(1)
      const postcode = geo.address?.postcode ?? ''
      const [weather, climate, neighborhoodScores] = await Promise.all([
        getCurrentWeather(geo.lat, geo.lon),
        getClimateNormals(geo.lat, geo.lon),
        getNeighborhoodScores(geo.lat, geo.lon),
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
      if (err.message === 'no_key') { setShowKeyModal(true); return }
      if (err.message?.includes('limit reached') || err.message?.includes('429')) { setPaywallTrigger('limit'); setShowPaywall(true) }
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
  if (!user && !showDemo && !guestResult) return <AuthModal onAuth={handleAuth} onDemo={() => setShowDemo(true)} />

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
      {/* Guest signup prompt — shown after first free search */}
      {!user && guestResult && result && (
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 200,
          background: 'linear-gradient(135deg, rgba(15,15,15,0.97), rgba(20,20,30,0.97))',
          borderTop: '1px solid rgba(255,255,255,0.1)',
          backdropFilter: 'blur(20px)',
          padding: '16px 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
        }}>
          <div>
            <div style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 18, color: '#fff', marginBottom: 2 }}>You've used your 1 free report.</div>
            <div style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>Sign up free to get 10 analyses/month — no credit card required.</div>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button onClick={() => { setGuestResult(null); setResult(null) }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'Barlow',sans-serif", fontSize: 13, color: 'rgba(255,255,255,0.3)', padding: '8px 12px' }}>
              Maybe later
            </button>
            <button onClick={() => { setGuestResult(null); setResult(null) }} style={{ background: '#fff', border: 'none', cursor: 'pointer', fontFamily: "'Barlow',sans-serif", fontWeight: 600, fontSize: 13, color: '#000', borderRadius: 40, padding: '10px 24px', transition: 'opacity 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
              Create free account →
            </button>
          </div>
        </div>
      )}
      {showKeyModal && <ApiKeyModal currentKey={cerebrasKey} onSave={k => setCerebrasKey(k)} onClose={() => setShowKeyModal(false)} isOnboarding={false} />}
      {showOnboarding && <ApiKeyModal currentKey={cerebrasKey} onSave={k => setCerebrasKey(k)} onClose={() => setShowOnboarding(false)} isOnboarding={true} />}
      {showPaywall && <PaywallModal trigger={paywallTrigger} onClose={() => setShowPaywall(false)} />}
      {showAuthModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}>
          <AuthModal onAuth={u => { handleAuth(u); setShowAuthModal(false) }} onDemo={() => setShowAuthModal(false)} />
        </div>
      )}
      <Navbar user={user} userRecord={userRecord} analysesLeft={analysesLeft} isInTrial={isInTrial} trialDaysLeft={trialDaysLeft} onSignOut={handleSignOut} onOpenKeyModal={() => setShowKeyModal(true)} hasOwnKey={!!cerebrasKey || !!userRecord?.has_own_key} previewPlan={previewPlan} onTogglePreview={() => setPreviewPlan(p => p === 'pro' ? 'free' : 'pro')}
        onHome={() => { setResult(null); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
        onScrollTo={scrollTo} onDeleteAccount={() => setShowDeleteAccount(true)} />

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
                    const text = `I just ran a Dwelling AI report on ${city}${score ? ` — Score: ${score}/100` : ''}${verdict ? `, Verdict: ${verdict}` : ''}. Free at dwelling.one`
                    if (navigator.share) { navigator.share({ title: `Dwelling: ${city}`, text, url: 'https://dwelling.one' }).catch(() => {}) }
                    else { navigator.clipboard?.writeText(text).then(() => alert('Copied to clipboard!')).catch(() => alert(text)) }
                  }}
                  style={{ borderRadius: 40, padding: '8px 16px', fontSize: 13, fontFamily: "'Barlow',sans-serif", color: 'rgba(255,255,255,0.6)', border: 'none', cursor: 'pointer', background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(12px)', transition: 'opacity 0.15s', display: 'flex', alignItems: 'center', gap: 5 }}
                  onMouseEnter={e => e.currentTarget.style.opacity = '0.75'}
                  onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
                  ↗ Share
                </button>
                {!(userRecord?.is_pro || user?.is_admin) && (
                  <button
                    onClick={() => { setPaywallTrigger('pricing'); setShowPaywall(true) }}
                    style={{ borderRadius: 40, padding: '8px 16px', fontSize: 13, fontFamily: "'Barlow',sans-serif", color: 'rgba(255,255,255,0.3)', border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer', background: 'transparent', transition: 'opacity 0.15s', display: 'flex', alignItems: 'center', gap: 5 }}
                    onMouseEnter={e => e.currentTarget.style.opacity = '0.75'}
                    onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
                    ★ Upgrade to Pro
                  </button>
                )}
              </div>
              {/* Admin plan preview switcher */}
              {user?.is_admin && (
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
          {result && !loading && !compareResult && <Suspense fallback={<LoadingState step={0} />}><Dashboard key={user?.is_admin ? previewPlan : 'fixed'} data={result} onRecalculate={handleRecalculate} previewPlan={user?.is_admin ? previewPlan : userRecord?.is_pro ? 'pro' : 'free'} onUpgrade={(section) => { setPaywallTrigger(section || 'section'); setShowPaywall(true) }} /></Suspense>}
        </div>
      ) : (
        <div style={{ position: 'relative', zIndex: 1 }}>
          <Hero onSearch={handleSearch} loading={loading} onShowDemo={() => setShowDemo(true)} user={user} onOpenAuth={() => setShowAuthModal(true)} />
          <Partners />
          <HowItWorks />
          <FeaturesChess />
          <FeaturesGrid />
          <MortgageCalculator activeCity={result?.geo?.userCity || null} />
          <RentalCalculator activeCity={result?.geo?.userCity || null} />
          <DataPartnerships />
          <Stats />
          <Pricing onUpgrade={() => { setPaywallTrigger('pricing'); setShowPaywall(true) }} />
          <FAQ />
          <CTAFooter
            onTermsClick={() => setShowTerms(true)}
            onScrollToTop={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            onUpgrade={() => { setPaywallTrigger('pricing'); setShowPaywall(true) }}
          />
        </div>
      )}
      {showDeleteAccount && (
        <DeleteAccountModal
          onClose={() => setShowDeleteAccount(false)}
          onDeleted={() => { handleSignOut(); setShowDeleteAccount(false) }}
        />
      )}
      <CookieBanner />
    </div>
  )
}
