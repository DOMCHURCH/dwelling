import { useState, useEffect, useRef, lazy, Suspense } from 'react'
import { getGSAP } from '../hooks/useScrollReveal'
import AddressSearch from './components/AddressSearch'
import LoadingState from './components/LoadingState'
import CountUp from './components/CountUp'
import Navbar from './components/Navbar'
import Hero from './components/Hero'
import Partners from './components/Partners'
import HowItWorks from './components/HowItWorks'
import FeaturesChess from './components/FeaturesChess'
import FeaturesGrid from './components/FeaturesGrid'
import DataPartnerships from './components/DataPartnerships'
import BYOKSection from './components/BYOKSection'
import Stats from './components/Stats'
import Testimonials from './components/Testimonials'
import ProShowcase from './components/ProShowcase'
import Pricing from './components/Pricing'
import FAQ from './components/FAQ'
import MortgageCalculator from './components/MortgageCalculator'
import RentalCalculator from './components/RentalCalculator'
import CTAFooter from './components/CTAFooter'
import TermsModal from './components/TermsModal'
import ApiKeyModal from './components/ApiKeyModal'
import { LOGO } from './lib/appHelpers'
import { DEMO_RESULT } from './lib/demoData'
import { geocodeStructured } from './lib/nominatim'
import { getCurrentWeather, getClimateNormals } from './lib/weather'
import { analyzeProperty } from './lib/cerebras'
import { aggregateListings, computeRiskScore, getMarketTemperature } from './lib/areaAnalysis'
import { getNeighborhoodScores } from './lib/overpass'
import { getCurrentUser, getAuthToken, signOut as localSignOut, getUsage, saveCerebrasKey, getCachedCerebrasKey, loadCerebrasKeyFromServer } from './lib/localAuth'
import { useEngagement } from './lib/useEngagement'
import UserTypeModal, { getUserType, setUserType } from './components/UserTypeModal'
import { useSavedReports } from './lib/useSavedReports'
import SavedReportsModal from './components/SavedReportsModal'
import BrandingModal, { getBrandLogo, getBrandName } from './components/BrandingModal'
import PDFExportModal from './components/PDFExportModal'

// Reload once on chunk fetch failure (stale deployment — old HTML references old hashed filenames)
function lazyWithReload(factory) {
  return lazy(() =>
    factory().catch(() => {
      if (!sessionStorage.getItem('_chunk_reload')) {
        sessionStorage.setItem('_chunk_reload', '1')
        window.location.reload()
      }
      return { default: () => null }
    })
  )
}

const Dashboard = lazyWithReload(() => import('./components/Dashboard'))
const AuthModal = lazyWithReload(() => import('./components/AuthModal'))
const PaywallModal = lazyWithReload(() => import('./components/PaywallModal'))
const CookieBanner = lazyWithReload(() => import('./components/CookieBanner'))
const DeleteAccountModal = lazyWithReload(() => import('./components/DeleteAccountModal'))
const CompareView = lazyWithReload(() => import('./components/CompareView'))

const FREE_LIMIT = 10

export default function App() {
  const [loading, setLoading] = useState(false)
  const [loadStep, setLoadStep] = useState(0)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [showTerms, setShowTerms] = useState(false)
  const [showPaywall, setShowPaywall] = useState(false)
  const [paywallTrigger, setPaywallTrigger] = useState('limit')
  const [user, setUser] = useState(null)
  const [userRecord, setUserRecord] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)

  // ── Lenis smooth scroll ──────────────────────────────────────────────────
  useEffect(() => {
    let lenis
    Promise.all([import('lenis'), getGSAP()]).then(([{ default: Lenis }, { gsap }]) => {
      lenis = new Lenis({ lerp: 0.12, smoothWheel: true })
      gsap.ticker.add((time) => { lenis.raf(time * 1000) })
      gsap.ticker.lagSmoothing(0)
    })
    return () => lenis?.destroy()
  }, [])

  const [showDemo, setShowDemo] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(() => !!new URLSearchParams(window.location.search).get('reset_token'))
  const [guestResult, setGuestResult] = useState(null)
  const [compareResult, setCompareResult] = useState(null)
  const [comparingMode, setComparingMode] = useState(false)
  const [previewPlan, setPreviewPlan] = useState('pro')
  const [cerebrasKey, setCerebrasKey] = useState(() => getCachedCerebrasKey())
  const [showKeyModal, setShowKeyModal] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [showDeleteAccount, setShowDeleteAccount] = useState(false)
  const [showUserTypeModal, setShowUserTypeModal] = useState(false)
  const [userType, setUserTypeState] = useState(() => getUserType())
  const [showSavedReports, setShowSavedReports] = useState(false)
  const [showBranding, setShowBranding] = useState(false)
  const [showPDFExport, setShowPDFExport] = useState(false)
  const [compareResultC, setCompareResultC] = useState(null)
  const [comparingModeC, setComparingModeC] = useState(false)
  const { saved: savedReports, saveReport, deleteReport, isReportSaved } = useSavedReports()

  // Prevent duplicate in-flight searches for the same normalised address
  const pendingSearchKeyRef = useRef(null)

  // Engagement tracking (analytics only — does not gate the paywall)
  const { trackEvent, reset: resetEngagement } = useEngagement({ enabled: !!result })

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
      loadCerebrasKeyFromServer().then(k => { if (k) setCerebrasKey(k) })
    }
    setAuthLoading(false)
  }, [])

  // Verify Stripe checkout success on return from Stripe
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const checkoutStatus = params.get('checkout')
    const sessionId = params.get('session_id')
    if (checkoutStatus === 'success' && sessionId) {
      window.history.replaceState({}, '', window.location.pathname)
      getAuthToken().then(async token => {
        if (!token) return
        try {
          const res = await fetch('/api/auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ action: 'verify-checkout', sessionId }),
          })
          if (res.ok) {
            const data = await res.json()
            if (data.success) {
              await loadUserRecord()
              const updated = getCurrentUser()
              if (updated) setUser({ ...updated, is_pro: true })
            }
          }
        } catch {}
      })
    }
  }, [])

  useEffect(() => {
    if (result) {
      const addr = [result.geo.userStreet, result.geo.userCity, result.geo.userCountry].filter(Boolean).join(', ')
      document.title = `${addr} — Dwelling`
    } else document.title = 'Dwelling — Property Intelligence'
  }, [result])

  const handleAuth = async u => {
    const fullUser = getCurrentUser() || u
    setUser(fullUser)
    setUserRecord({ is_pro: fullUser.is_pro, analyses_used: 0 })
    loadUserRecord()
    // Show user type modal on first login if not yet answered
    if (!getUserType()) setTimeout(() => setShowUserTypeModal(true), 1200)
    const serverKey = await loadCerebrasKeyFromServer()
    if (serverKey) {
      sessionStorage.removeItem('dw_cerebras_key')
      setCerebrasKey(serverKey)
    } else {
      sessionStorage.removeItem('dw_cerebras_key')
      setCerebrasKey('')
      const alreadySeen = sessionStorage.getItem('dw_key_onboarding_seen')
      if (!alreadySeen) {
        setTimeout(() => setShowOnboarding(true), 600)
      }
    }
  }

  const handleSignOut = () => {
    localSignOut()
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
    const country = 'Canada'
    if (loading) return
    if (!user) { setShowAuthModal(true); return }
    // Deduplicate: ignore if exact same search is already running
    const searchKey = `${street.trim().toLowerCase()}|${city.trim().toLowerCase()}|${state}`
    if (pendingSearchKeyRef.current === searchKey) return
    pendingSearchKeyRef.current = searchKey
    setLoading(true); setError(null); setResult(null); setLoadStep(0)
    const isAreaMode = !street.trim()
    try {
      const geocodeInput = isAreaMode ? { street: '', city, state, country } : { street, city, state, country }
      const geo = await geocodeStructured(geocodeInput); setLoadStep(1)
      const [weather, climate, neighborhoodScores] = await Promise.all([
        getCurrentWeather(geo.lat, geo.lon),
        getClimateNormals(geo.lat, geo.lon),
        getNeighborhoodScores(geo.lat, geo.lon),
      ]); setLoadStep(2)
      setLoadStep(3)
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
      const compsSource = bulkCompsRes.status === 'fulfilled' ? (bulkCompsRes.value?.source || null) : null
      const areaMetrics = aggregateListings(bulkListings) || null
      const areaRiskScore = computeRiskScore(areaMetrics, null) || null
      const marketTemperature = getMarketTemperature(areaMetrics) || null

      const realData = { neighborhoodScores, riskData, areaMetrics, areaRiskScore, marketTemperature, newsData, isAreaMode, compsSource }
      const ai = await analyzeProperty(geo, weather, climate, knownFacts ?? {}, realData, cerebrasKey); setLoadStep(4)
      const reportData = { geo, weather, climate, ai, knownFacts: knownFacts ?? {}, realData, isAreaMode }
      setResult(reportData)
      if (!user) setGuestResult(reportData)
      resetEngagement()
      // Show user type modal once, after first successful report
      if (!getUserType()) setTimeout(() => setShowUserTypeModal(true), 1800)
      setTimeout(() => loadUserRecord(), 800)
    } catch (err) {
      if (err.message === 'no_key') { setShowKeyModal(true); return }
      if (err.message?.includes('limit reached') || err.message?.includes('429')) { setPaywallTrigger('limit'); setShowPaywall(true); return }
      if (err.message?.includes('Not authenticated') || err.message?.includes('Session expired') || err.message?.includes('sign in')) {
        setShowAuthModal(true); return
      }
      if (err.message?.includes('context invalidated') || err.message?.includes('unmounted')) return
      setError(err.message ?? 'Something went wrong.')
    } finally { setLoading(false); pendingSearchKeyRef.current = null }
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
      const [weather, climate, neighborhoodScores] = await Promise.all([
        getCurrentWeather(geo.lat, geo.lon),
        getClimateNormals(geo.lat, geo.lon),
        getNeighborhoodScores(geo.lat, geo.lon),
      ]); setLoadStep(2)
      setLoadStep(3)
      const riskData = await fetch('/api/risk', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lat: geo.lat, lon: geo.lon, county: geo.address?.county, state, country }) }).then(r => r.ok ? r.json() : null).catch(() => null)
      const [bulkCompsRes, newsRes] = await Promise.allSettled([
        fetch('/api/comps', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ city, state, country, mode: 'area' }) }).then(r => r.json()).catch(() => null),
        fetch('/api/news', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ city, state, country }) }).then(r => r.json()).catch(() => null),
      ])
      const bulkListings = bulkCompsRes.status === 'fulfilled' ? bulkCompsRes.value?.listings || bulkCompsRes.value?.comps || [] : []
      const newsData = newsRes.status === 'fulfilled' ? newsRes.value : null
      const compsSource = bulkCompsRes.status === 'fulfilled' ? (bulkCompsRes.value?.source || null) : null
      const areaMetrics = aggregateListings(bulkListings) || null
      const areaRiskScore = computeRiskScore(areaMetrics, null) || null
      const marketTemperature = getMarketTemperature(areaMetrics) || null
      const realData = { neighborhoodScores, riskData, areaMetrics, areaRiskScore, marketTemperature, newsData, isAreaMode, compsSource }
      const ai = await analyzeProperty(geo, weather, climate, {}, realData, cerebrasKey); setLoadStep(4)
      setCompareResult({ geo, weather, climate, ai, knownFacts: {}, realData, isAreaMode })
      setComparingMode(false)
      setTimeout(() => loadUserRecord(), 800)
    } catch (err) {
      if (err.message === 'no_key') { setShowKeyModal(true); return }
      if (err.message?.includes('limit reached') || err.message?.includes('429')) { setPaywallTrigger('limit'); setShowPaywall(true) }
      else setError(err.message ?? 'Something went wrong.')
    } finally { setLoading(false) }
  }

  const handleCompareCSearch = async ({ street, city, state, country }) => {
    if (loading) return
    setLoading(true); setError(null); setLoadStep(0)
    const isAreaMode = !street.trim()
    try {
      const { geocodeStructured } = await import('./lib/nominatim')
      const { getCurrentWeather, getClimateNormals } = await import('./lib/weather')
      const { analyzeProperty } = await import('./lib/cerebras')
      const { aggregateListings, computeRiskScore, getMarketTemperature } = await import('./lib/areaAnalysis')
      const { getNeighborhoodScores } = await import('./lib/overpass')
      const geocodeInput = isAreaMode ? { street: '', city, state, country } : { street, city, state, country }
      const geo = await geocodeStructured(geocodeInput); setLoadStep(1)
      const [weather, climate, neighborhoodScores] = await Promise.all([getCurrentWeather(geo.lat, geo.lon), getClimateNormals(geo.lat, geo.lon), getNeighborhoodScores(geo.lat, geo.lon)]); setLoadStep(2)
      setLoadStep(3)
      const riskData = await fetch('/api/risk', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lat: geo.lat, lon: geo.lon, county: geo.address?.county, state, country }) }).then(r => r.ok ? r.json() : null).catch(() => null)
      const [bulkCompsRes, newsRes] = await Promise.allSettled([
        fetch('/api/comps', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ city, state, country, mode: 'area' }) }).then(r => r.json()).catch(() => null),
        fetch('/api/news', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ city, state, country }) }).then(r => r.json()).catch(() => null),
      ])
      const bulkListings = bulkCompsRes.status === 'fulfilled' ? bulkCompsRes.value?.listings || bulkCompsRes.value?.comps || [] : []
      const newsData = newsRes.status === 'fulfilled' ? newsRes.value : null
      const compsSource = bulkCompsRes.status === 'fulfilled' ? (bulkCompsRes.value?.source || null) : null
      const areaMetrics = aggregateListings(bulkListings) || null
      const areaRiskScore = computeRiskScore(areaMetrics, null) || null
      const marketTemperature = getMarketTemperature(areaMetrics) || null
      const realData = { neighborhoodScores, riskData, areaMetrics, areaRiskScore, marketTemperature, newsData, isAreaMode, compsSource }
      const ai = await analyzeProperty(geo, weather, climate, {}, realData, cerebrasKey); setLoadStep(4)
      setCompareResultC({ geo, weather, climate, ai, knownFacts: {}, realData, isAreaMode })
      setComparingModeC(false)
    } catch (err) {
      if (err.message === 'no_key') { setShowKeyModal(true); return }
      setError(err.message ?? 'Something went wrong.')
    } finally { setLoading(false) }
  }

  const handleDownloadPDF = () => window.print()

  const effectivePlan = user?.is_admin ? previewPlan : (userRecord?.is_pro ? 'pro' : 'free')
  const isPro = effectivePlan === 'pro' || effectivePlan === 'business'
  const isBusiness = effectivePlan === 'business'

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
      {showPaywall && <Suspense fallback={null}><PaywallModal trigger={paywallTrigger} onClose={() => setShowPaywall(false)} /></Suspense>}
      {showAuthModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}>
          <Suspense fallback={null}><AuthModal onAuth={u => { handleAuth(u); setShowAuthModal(false) }} onDemo={() => setShowAuthModal(false)} /></Suspense>
        </div>
      )}
      <Navbar user={user} userRecord={userRecord} analysesLeft={analysesLeft} isInTrial={isInTrial} trialDaysLeft={trialDaysLeft} onSignOut={handleSignOut} onOpenKeyModal={() => setShowKeyModal(true)} hasOwnKey={!!cerebrasKey || !!userRecord?.has_own_key} previewPlan={previewPlan} onTogglePreview={() => setPreviewPlan(p => p === 'pro' ? 'free' : 'pro')}
        onHome={() => { setResult(null); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
        onOpenAuth={() => setShowAuthModal(true)}
        onDeleteAccount={() => setShowDeleteAccount(true)} />

      {(result || loading || error) ? (
        <div style={{ maxWidth: compareResult ? 1200 : 960, margin: '0 auto', padding: 'clamp(80px, 12vw, 100px) 16px 60px', width: '100%', position: 'relative', zIndex: 1 }}>
          {!loading && result && !compareResult && !comparingMode && (
            <div style={{ marginBottom: 22 }} className="no-print">
              {/* Print-only header — hidden on screen */}
              <div id="print-header" style={{ display: 'none', alignItems: 'center', justifyContent: 'space-between', padding: '0 0 16px', borderBottom: '1px solid rgba(255,255,255,0.15)', marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {getBrandLogo() ? <img src={getBrandLogo()} alt="Logo" style={{ height: 32, objectFit: 'contain' }} /> : <img src="https://d2xsxph8kpxj0f.cloudfront.net/310519663463031725/5FNF4QVCkxSRz6ba3cCadG/dwelling-logo-3AJU9MMgr8YxSGXWKetVFA.webp" alt="Dwelling" style={{ width: 28, height: 28, borderRadius: 6 }} />}
                  <span style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 18, color: '#fff' }}>{getBrandName() || 'Dwelling'}</span>
                </div>
                <div style={{ fontFamily: "'Barlow',sans-serif", fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
                  {result?.geo?.displayName} · {new Date().toLocaleDateString('en', { year: 'numeric', month: 'long', day: 'numeric' })}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
                <button onClick={() => { setResult(null); setCompareResult(null); setCompareResultC(null); setComparingMode(false) }}
                  style={{ borderRadius: 40, padding: '8px 16px', fontSize: 13, fontFamily: "'Barlow',sans-serif", color: 'rgba(255,255,255,0.6)', border: 'none', cursor: 'pointer', background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(12px)', transition: 'opacity 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
                  onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
                  ← New search
                </button>
                <button onClick={() => setComparingMode(true)}
                  style={{ borderRadius: 40, padding: '8px 16px', fontSize: 13, fontFamily: "'Barlow',sans-serif", color: '#fff', border: '1px solid rgba(255,255,255,0.15)', cursor: 'pointer', background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(12px)', transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 6 }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.09)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)' }}>
                  ⚖️ Compare
                </button>

                {/* Pro: Save Report */}
                {isPro && (
                  <button onClick={() => { saveReport(result); }}
                    style={{ borderRadius: 40, padding: '8px 16px', fontSize: 13, fontFamily: "'Barlow',sans-serif", color: isReportSaved(result) ? '#4ade80' : 'rgba(255,255,255,0.6)', border: 'none', cursor: 'pointer', background: 'rgba(255,255,255,0.06)', transition: 'opacity 0.15s', display: 'flex', alignItems: 'center', gap: 5 }}
                    onMouseEnter={e => e.currentTarget.style.opacity = '0.75'}
                    onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                    title="Save this report">
                    {isReportSaved(result) ? '★ Saved' : '☆ Save'}
                  </button>
                )}

                {/* Pro: Saved reports list */}
                {isPro && savedReports.length > 0 && (
                  <button onClick={() => setShowSavedReports(true)}
                    style={{ borderRadius: 40, padding: '8px 16px', fontSize: 13, fontFamily: "'Barlow',sans-serif", color: 'rgba(255,255,255,0.5)', border: 'none', cursor: 'pointer', background: 'rgba(255,255,255,0.04)', transition: 'opacity 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.opacity = '0.75'}
                    onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
                    📂 {savedReports.length}
                  </button>
                )}

                {/* Pro: PDF Export */}
                {isPro && (
                  <button onClick={() => setShowPDFExport(true)}
                    style={{ borderRadius: 40, padding: '8px 16px', fontSize: 13, fontFamily: "'Barlow',sans-serif", color: 'rgba(255,255,255,0.6)', border: 'none', cursor: 'pointer', background: 'rgba(255,255,255,0.06)', transition: 'opacity 0.15s', display: 'flex', alignItems: 'center', gap: 5 }}
                    onMouseEnter={e => e.currentTarget.style.opacity = '0.75'}
                    onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                    title="Export clean PDF report">
                    📄 PDF
                  </button>
                )}

                {/* Business: Branding */}
                {isBusiness && (
                  <button onClick={() => setShowBranding(true)}
                    style={{ borderRadius: 40, padding: '8px 16px', fontSize: 13, fontFamily: "'Barlow',sans-serif", color: 'rgba(251,191,36,0.7)', border: '1px solid rgba(251,191,36,0.2)', cursor: 'pointer', background: 'rgba(251,191,36,0.06)', transition: 'opacity 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.opacity = '0.75'}
                    onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
                    🏢 Brand
                  </button>
                )}

                {/* Share */}
                <button
                  onClick={() => {
                    const city = result?.geo?.displayName?.split(',')[0] || 'this city'
                    const score = result?.realData?.areaRiskScore?.score || ''
                    const verdict = result?.ai?.areaIntelligence?.verdict || ''
                    const text = `${city} — Dwelling AI Report${score ? ` · Score: ${score}/100` : ''}${verdict ? ` · ${verdict}` : ''}\ndwelling.one`
                    if (navigator.share) navigator.share({ title: `Dwelling: ${city}`, text, url: 'https://dwelling.one' }).catch(() => {})
                    else navigator.clipboard?.writeText(text).then(() => {}).catch(() => {})
                  }}
                  style={{ borderRadius: 40, padding: '8px 16px', fontSize: 13, fontFamily: "'Barlow',sans-serif", color: 'rgba(255,255,255,0.6)', border: 'none', cursor: 'pointer', background: 'rgba(255,255,255,0.06)', transition: 'opacity 0.15s', display: 'flex', alignItems: 'center', gap: 5 }}
                  onMouseEnter={e => e.currentTarget.style.opacity = '0.75'}
                  onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
                  ↗ Share
                </button>

                {!isPro && (
                  <button onClick={() => { setPaywallTrigger('pricing'); setShowPaywall(true) }}
                    style={{ borderRadius: 40, padding: '8px 16px', fontSize: 13, fontFamily: "'Barlow',sans-serif", color: 'rgba(255,255,255,0.3)', border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer', background: 'transparent', transition: 'opacity 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.opacity = '0.75'}
                    onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
                    ★ Upgrade to Pro
                  </button>
                )}
              </div>
              {user?.is_admin && (
                <div className="liquid-glass" style={{ borderRadius: 14, padding: '10px 14px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: "'Barlow',sans-serif", fontSize: 11, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>👁 Preview as:</span>
                  {[['free', 'Free'], ['pro', 'Pro'], ['business', 'Business']].map(([val, label]) => (
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
          {!loading && comparingModeC && (
            <div style={{ marginBottom: 22 }}>
              <div className="liquid-glass" style={{ borderRadius: 14, padding: '14px 18px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 16 }}>🅲</span>
                <span style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>
                  Search a third area to compare against <span style={{ color: '#fff' }}>{compareResult?.geo?.displayName?.split(',')[0]}</span>
                </span>
                <button onClick={() => setComparingModeC(false)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}>×</button>
              </div>
              <AddressSearch onSearch={handleCompareCSearch} loading={loading} compact />
            </div>
          )}
          {loading && <LoadingState step={loadStep} />}
          {error && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, padding: '40px 16px' }}>
              <div className="liquid-glass" style={{ borderRadius: 12, padding: '14px 20px', border: '1px solid rgba(248,113,113,0.3)', background: 'rgba(248,113,113,0.08)', width: '100%', maxWidth: 500 }}>
                <p style={{ fontFamily: "'Barlow',sans-serif", fontSize: 13, color: '#f87171' }}>⚠ {error}</p>
              </div>
              <button onClick={() => { setError(null); setResult(null) }}
                style={{ background: 'rgba(255,255,255,0.08)', border: 'none', cursor: 'pointer', borderRadius: 40, padding: '9px 20px', fontFamily: "'Barlow',sans-serif", fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>
                ← Back to search
              </button>
            </div>
          )}
          {result && !loading && compareResult && (
            <Suspense fallback={null}><CompareView
              resultA={result}
              resultB={compareResult}
              resultC={compareResultC}
              onBack={() => { setCompareResult(null); setCompareResultC(null); setComparingModeC(false) }}
              onClearB={() => { setCompareResult(null); setComparingMode(true) }}
              onAddC={isPro ? () => setComparingModeC(true) : undefined}
              onClearC={() => { setCompareResultC(null); setComparingModeC(true) }}
            /></Suspense>
          )}
          {result && !loading && !compareResult && <Suspense fallback={<LoadingState step={0} />}><Dashboard key={user?.is_admin ? previewPlan : 'fixed'} data={result} onRecalculate={handleRecalculate} previewPlan={user?.is_admin ? previewPlan : userRecord?.is_pro ? 'pro' : 'free'}
            onUpgrade={(section) => { setPaywallTrigger(section || 'section'); setShowPaywall(true) }}
            onLockedInteraction={(section, type) => {
              trackEvent(type === 'click' ? 'lockedClick' : 'lockedHover', { section })
              if (type === 'click') { setPaywallTrigger(section); setShowPaywall(true) }
            }}
          /></Suspense>}
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
          <BYOKSection />
          <Stats />
          <Testimonials />
          <ProShowcase onUpgrade={() => { setPaywallTrigger('pricing'); setShowPaywall(true) }} />
          <Pricing onUpgrade={() => { setPaywallTrigger('pricing'); setShowPaywall(true) }} />
          <FAQ />
          <CTAFooter
            onScrollToTop={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            onUpgrade={() => { setPaywallTrigger('pricing'); setShowPaywall(true) }}
          />
        </div>
      )}
      {showSavedReports && (
        <SavedReportsModal
          saved={savedReports}
          onLoad={r => { setResult(r); setShowSavedReports(false) }}
          onDelete={deleteReport}
          onClose={() => setShowSavedReports(false)}
        />
      )}
      {showBranding && <BrandingModal onClose={() => setShowBranding(false)} />}
      {showPDFExport && result && (
        <PDFExportModal result={result} onClose={() => setShowPDFExport(false)} />
      )}
      {showDeleteAccount && (
        <Suspense fallback={null}><DeleteAccountModal
          onClose={() => setShowDeleteAccount(false)}
          onDeleted={() => { handleSignOut(); setShowDeleteAccount(false) }}
        /></Suspense>
      )}
      <Suspense fallback={null}><CookieBanner /></Suspense>
      {showUserTypeModal && (
        <UserTypeModal
          onSelect={type => { setUserTypeState(type); setShowUserTypeModal(false) }}
          onSkip={() => { setUserType('explorer'); setShowUserTypeModal(false) }}
        />
      )}
    </div>
  )
}
