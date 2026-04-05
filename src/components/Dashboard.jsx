import { useState, useEffect } from 'react'
import SectionCard from './SectionCard'
import StatCard from './StatCard'

// Score label helpers
function scoreLabel(score, type) {
  if (score == null) return ''
  if (type === 'walk') {
    if (score >= 90) return "Walker's Paradise"
    if (score >= 70) return 'Very Walkable'
    if (score >= 50) return 'Somewhat Walkable'
    if (score >= 25) return 'Car-Friendly'
    return 'Car-Dependent'
  }
  if (type === 'transit') {
    if (score >= 90) return "Rider's Paradise"
    if (score >= 70) return 'Excellent Transit'
    if (score >= 50) return 'Good Transit'
    if (score >= 25) return 'Some Transit'
    return 'Minimal Transit'
  }
  if (type === 'school') {
    if (score >= 80) return 'Top-Rated Schools'
    if (score >= 65) return 'Above Average'
    if (score >= 50) return 'Average Schools'
    return 'Below Average'
  }
  if (type === 'safety') {
    if (score >= 80) return 'Very Safe'
    if (score >= 60) return 'Generally Safe'
    if (score >= 40) return 'Moderate Risk'
    return 'Higher Risk'
  }
  return ''
}
function scoreColor(score) {
  if (score == null) return 'rgba(255,255,255,0.3)'
  if (score >= 70) return '#4ade80'
  if (score >= 45) return '#fbbf24'
  return '#f87171'
}
import ScoreRing from './ScoreRing'
import PriceHistoryChart from './PriceHistoryChart'



import { weatherCodeToDescription } from '../lib/weather'
import { getCurrencySymbol, getCurrencyName, fetchExchangeRates, convertCurrency, getCurrencyFromCountry } from '../lib/currency'

const fmt = (n) => (n != null && n !== 0) ? n.toLocaleString('en-US', { maximumFractionDigits: 0 }) : '—'
const fmtUSD = (n, sym) => (n != null && n !== 0) ? `${sym || '$'}${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}` : '—'
const pct = (n) => (n != null && n !== 0 && !isNaN(n)) ? `${Math.round(n)}%` : '—'
// Compact price formatter: $1.5M / $630K / $9,500
function fmtCompact(n, sym = '$') {
  if (n == null || n === 0) return '—'
  if (n >= 1_000_000) {
    const m = n / 1_000_000
    return `${sym}${m % 1 === 0 ? m.toFixed(0) : m.toFixed(1)}M`
  }
  if (n >= 1_000) return `${sym}${Math.round(n / 1_000)}K`
  return `${sym}${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
}

function Tag({ children, color = 'default' }) {
  const bg = color === 'green' ? 'rgba(74,222,128,0.12)' : color === 'red' ? 'rgba(248,113,113,0.12)' : 'rgba(255,255,255,0.08)'
  const fg = color === 'green' ? '#4ade80' : color === 'red' ? '#f87171' : 'rgba(255,255,255,0.6)'
  return (
    <span className="liquid-glass" style={{
      display: 'inline-block', padding: '4px 12px', borderRadius: 40,
      fontSize: 12, background: bg, color: fg, fontFamily: "'Barlow', sans-serif", fontWeight: 400,
    }}>
      {children}
    </span>
  )
}

function BarMeter({ label, value, max, color = 'rgba(255,255,255,0.6)' }) {
  const p = Math.min((parseFloat(value) / max) * 100, 100)
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
        <span style={{ color: 'rgba(255,255,255,0.5)', fontFamily: "'Barlow', sans-serif", fontWeight: 300 }}>{label}</span>
        <span style={{ color: '#ffffff', fontFamily: "'Barlow', sans-serif", fontWeight: 400 }}>{value}</span>
      </div>
      <div style={{ height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ width: `${p}%`, height: '100%', background: '#ffffff', borderRadius: 2, opacity: 0.5, transition: 'width 1s ease' }} />
      </div>
    </div>
  )
}

function LinkButton({ href, label, icon }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer"
      className="liquid-glass"
      style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 16px', borderRadius: 40, color: 'rgba(255,255,255,0.7)', fontSize: 13, fontFamily: "'Barlow', sans-serif", fontWeight: 300, textDecoration: 'none', transition: 'background 0.15s' }}
      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
      onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
    >
      <span style={{ fontSize: 15 }}>{icon}</span>
      {label}
      <span style={{ fontSize: 11, opacity: 0.4 }}>↗</span>
    </a>
  )
}

function IncomeSlider({ costOfLiving, sym }) {
  const [mode, setMode] = useState('monthly')
  const [income, setIncome] = useState(mode === 'monthly' ? 5000 : 60000)

  const monthlyIncome = mode === 'monthly' ? income : Math.round(income / 12)
  const total = costOfLiving.monthlyBudgetUSD

  const categories = [
    { label: 'Groceries', value: costOfLiving.groceriesMonthlyUSD },
    { label: 'Transport', value: costOfLiving.transportMonthlyUSD },
    { label: 'Utilities', value: costOfLiving.utilitiesMonthlyUSD },
    { label: 'Dining out', value: costOfLiving.diningOutMonthlyUSD },
  ]

  const remaining = monthlyIncome - total
  const totalPct = total > 0 ? Math.round((total / monthlyIncome) * 100) : 0

  const toggleMode = (m) => { setMode(m); setIncome(m === 'monthly' ? 5000 : 60000) }

  return (
    <div>
      <div className="liquid-glass" style={{ borderRadius: 40, padding: 4, display: 'flex', marginBottom: 20, width: 'fit-content' }}>
        {['monthly', 'yearly'].map(m => (
          <button key={m} onClick={() => toggleMode(m)} style={{
            padding: '7px 18px', borderRadius: 36,
            background: mode === m ? '#ffffff' : 'transparent',
            color: mode === m ? '#000' : 'rgba(255,255,255,0.4)',
            border: 'none', cursor: 'pointer', fontSize: 13,
            fontFamily: "'Barlow', sans-serif", fontWeight: 400,
            transition: 'all 0.2s', textTransform: 'capitalize',
          }}>{m}</button>
        ))}
      </div>

      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 8 }}>
          <span style={{ color: 'rgba(255,255,255,0.5)', fontFamily: "'Barlow', sans-serif", fontWeight: 300 }}>Your {mode} income</span>
          <span style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: 20, color: '#ffffff' }}>{fmtUSD(income, sym)}</span>
        </div>
        <input type="range" min={mode === 'monthly' ? 1000 : 12000} max={mode === 'monthly' ? 100000 : 1200000} step={mode === 'monthly' ? 500 : 6000}
          value={income} onChange={e => setIncome(Number(e.target.value))} style={{ width: '100%', accentColor: 'rgba(255,255,255,0.7)' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 4 }}>
          <span>{fmtUSD(mode === 'monthly' ? 1000 : 12000, sym)}</span>
          <span>{fmtUSD(mode === 'monthly' ? 100000 : 1200000, sym)}</span>
        </div>
      </div>

      <div style={{ marginBottom: 20 }}>
        <div style={{ height: 6, borderRadius: 3, overflow: 'hidden', background: 'rgba(255,255,255,0.06)' }}>
          <div style={{ width: `${Math.min(totalPct, 100)}%`, height: '100%', background: totalPct > 80 ? '#f87171' : totalPct > 50 ? 'rgba(255,255,255,0.6)' : '#4ade80', borderRadius: 3, transition: 'width 0.4s ease' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginTop: 6 }}>
          <span style={{ color: 'rgba(255,255,255,0.5)', fontFamily: "'Barlow', sans-serif", fontWeight: 300 }}>
            Cost of living: <span style={{ color: totalPct > 80 ? '#f87171' : '#ffffff', fontWeight: 400 }}>{total > 0 ? `${totalPct}% of income` : '—'}</span>
          </span>
          <span style={{ color: remaining >= 0 ? '#4ade80' : '#f87171', fontFamily: "'Barlow', sans-serif", fontWeight: 400 }}>
            {total > 0 ? (remaining >= 0 ? `${fmtUSD(remaining, sym)} left` : `${fmtUSD(Math.abs(remaining), sym)} over`) : '—'}
          </span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 24px', marginBottom: 16 }}>
        {categories.map(({ label, value }) => {
          const catPct = value > 0 ? Math.round((value / monthlyIncome) * 100) : null
          return (
            <div key={label} style={{ padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 3 }}>
                <span style={{ color: 'rgba(255,255,255,0.5)', fontFamily: "'Barlow', sans-serif", fontWeight: 300 }}>{label}</span>
                <span style={{ color: '#ffffff', fontFamily: "'Barlow', sans-serif", fontWeight: 400 }}>{fmtUSD(value, sym)}</span>
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', fontFamily: "'Barlow', sans-serif" }}>{catPct != null ? `${catPct}% of ${mode} income` : '—'}</div>
            </div>
          )
        })}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
        <StatCard label="Monthly cost" value={fmtUSD(total, sym)} sub="estimated total" />
        <StatCard label="vs US Average" value={costOfLiving.indexVsUSAverage ? `${costOfLiving.indexVsUSAverage > 0 ? '+' : ''}${Math.round(costOfLiving.indexVsUSAverage)}%` : '—'}
          accent={costOfLiving.indexVsUSAverage > 15 ? '#f87171' : costOfLiving.indexVsUSAverage < -15 ? '#4ade80' : '#ffffff'} />
      </div>
      <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 14, fontFamily: "'Barlow', sans-serif", fontWeight: 300, lineHeight: 1.7 }}>{costOfLiving.summary}</p>
    </div>
  )
}



// Popular currencies for the converter
const DISPLAY_CURRENCIES = [
  { code: 'USD', label: 'US Dollar' }, { code: 'CAD', label: 'Canadian Dollar' },
  { code: 'GBP', label: 'British Pound' }, { code: 'EUR', label: 'Euro' },
  { code: 'AUD', label: 'Australian Dollar' }, { code: 'JPY', label: 'Japanese Yen' },
  { code: 'CHF', label: 'Swiss Franc' }, { code: 'INR', label: 'Indian Rupee' },
  { code: 'MXN', label: 'Mexican Peso' }, { code: 'BRL', label: 'Brazilian Real' },
  { code: 'KRW', label: 'South Korean Won' }, { code: 'CNY', label: 'Chinese Yuan' },
  { code: 'SGD', label: 'Singapore Dollar' }, { code: 'NZD', label: 'New Zealand Dollar' },
  { code: 'ZAR', label: 'South African Rand' }, { code: 'AED', label: 'UAE Dirham' },
]

export default function Dashboard({ data, onRecalculate, previewPlan = 'pro', onUpgrade }) {
  const { geo, weather, climate, ai, knownFacts, realData, isAreaMode } = data
  const { areaMetrics, areaRiskScore, marketTemperature, newsData } = realData || {}
  const { propertyEstimate, costOfLiving, neighborhood, investment, localInsights, areaIntelligence, riskData: aiRiskData } = ai
  const risk = realData.riskData || aiRiskData
  // Currency converter
  const nativeCurrency = ai.priceHistory?.currency || getCurrencyFromCountry(geo.userCountry || '') || 'USD'
  const [displayCurrency, setDisplayCurrency] = useState(nativeCurrency)
  const [exchangeRates, setExchangeRates] = useState(null)
  const [ratesLoading, setRatesLoading] = useState(false)

  useEffect(() => {
    setRatesLoading(true)
    fetchExchangeRates('USD').then(rates => {
      setExchangeRates(rates)
      setRatesLoading(false)
    }).catch(() => setRatesLoading(false))
  }, [])

  const convert = (amount) => {
    if (!amount || !exchangeRates) return amount
    if (nativeCurrency === displayCurrency) return amount
    const nativeToUSD = 1 / (exchangeRates[nativeCurrency] || 1)
    const usdToDisplay = exchangeRates[displayCurrency] || 1
    return Math.round(amount * nativeToUSD * usdToDisplay)
  }

  const sym = getCurrencySymbol(displayCurrency)

  const currentWeather = weather?.current
  const tempC = currentWeather?.temperature_2m
  const tempF = tempC != null ? Math.round(tempC * 9 / 5 + 32) : null
  const weatherDesc = currentWeather ? weatherCodeToDescription(currentWeather.weather_code) : null

  // Plan-based visibility helper
  const isLocked = (feature) => {
    if (previewPlan === 'pro') return false
    // Free: investment, risk, pricehistory locked. neighborhood shows basic scores only (neighborhooddetail locked)
    const freeHidden = ['investment', 'risk', 'pricehistory', 'costoflivingdetail', 'neighborhooddetail']
    return freeHidden.includes(feature)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Plan preview banner — only shown when admin is previewing free */}
      {previewPlan === 'free' && (
        <div style={{ borderRadius: 14, padding: '12px 18px', background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 14 }}>⚠️</span>
          <span style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 13, color: 'rgba(251,191,36,0.9)' }}>
            Previewing <strong>Free plan</strong> — basic neighbourhood scores visible; full neighbourhood detail, investment analysis, risk, and price history are Pro only.
          </span>
        </div>
      )}

      {/* Area Banner */}
      <div className="liquid-glass" style={{ borderRadius: 20, padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 1C5.24 1 3 3.24 3 6c0 3.75 5 9 5 9s5-5.25 5-9c0-2.76-2.24-5-5-5zm0 6.75A1.75 1.75 0 1 1 8 4.25a1.75 1.75 0 0 1 0 3.5z" fill="rgba(255,255,255,0.7)" />
          </svg>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: 17, color: '#ffffff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {geo.displayName.split(',')[0]}
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2, fontFamily: "'Barlow', sans-serif", fontWeight: 300, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {geo.displayName}
          </div>
        </div>
        {weatherDesc && (
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: 22, color: '#ffffff' }}>
              {tempC}°C
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginLeft: 6 }}>/ {tempF}°F</span>
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', fontFamily: "'Barlow', sans-serif", fontWeight: 300 }}>{weatherDesc}</div>
          </div>
        )}
      </div>

      {/* Map */}
      <div className="liquid-glass" style={{ borderRadius: 20, overflow: 'hidden', height: 280 }}>
          <iframe
            title="Area Location"
          width="100%"
          height="100%"
          style={{ border: 0, display: 'block', filter: 'invert(90%) hue-rotate(180deg)' }}
          loading="lazy"
          src={`https://www.openstreetmap.org/export/embed.html?bbox=${geo.lon - 0.005}%2C${geo.lat - 0.003}%2C${geo.lon + 0.005}%2C${geo.lat + 0.003}&layer=mapnik&marker=${geo.lat}%2C${geo.lon}`}
        />
      </div>



      {/* Currency Converter */}
      <div className="liquid-glass" style={{ borderRadius: 16, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <span style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 12, color: 'rgba(255,255,255,0.5)', whiteSpace: 'nowrap' }}>💱 Display prices in</span>
        <select value={displayCurrency} onChange={e => setDisplayCurrency(e.target.value)}
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff', fontFamily: "'Barlow',sans-serif", fontSize: 13, padding: '6px 10px', cursor: 'pointer', outline: 'none', flex: 1, minWidth: 160, maxWidth: 220 }}>
          {DISPLAY_CURRENCIES.map(c => (
            <option key={c.code} value={c.code} style={{ background: '#111' }}>
              {getCurrencySymbol(c.code)} {c.code} — {c.label}
            </option>
          ))}
        </select>
        {displayCurrency !== nativeCurrency && !ratesLoading && exchangeRates && (
          <span style={{ fontFamily: "'Barlow',sans-serif", fontSize: 11, color: 'rgba(255,255,255,0.35)', whiteSpace: 'nowrap' }}>
            1 {nativeCurrency} = {getCurrencySymbol(displayCurrency)}{((exchangeRates[displayCurrency] || 1) / (exchangeRates[nativeCurrency] || 1)).toFixed(4)} {displayCurrency}
          </span>
        )}
        {displayCurrency !== nativeCurrency && (
          <button onClick={() => setDisplayCurrency(nativeCurrency)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', fontSize: 11, fontFamily: "'Barlow',sans-serif", cursor: 'pointer', padding: 0 }}>
            Reset to {nativeCurrency}
          </button>
        )}
      </div>


      {/* Property Estimate */}


      {/* Area Verdict — top-level summary for area mode */}
      {areaIntelligence && (
        <SectionCard title="Area Verdict" icon="🎯" delay={40}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 14, flexWrap: 'wrap' }}>
            <div style={{
              padding: '10px 24px', borderRadius: 40,
              background: areaIntelligence.verdict === 'Excellent' ? 'rgba(74,222,128,0.15)' :
                         areaIntelligence.verdict === 'Good' ? 'rgba(74,222,128,0.08)' :
                         areaIntelligence.verdict === 'Caution' ? 'rgba(251,191,36,0.1)' :
                         areaIntelligence.verdict === 'Avoid' ? 'rgba(248,113,113,0.1)' : 'rgba(255,255,255,0.06)',
              border: `1px solid ${areaIntelligence.verdict === 'Excellent' || areaIntelligence.verdict === 'Good' ? 'rgba(74,222,128,0.3)' : areaIntelligence.verdict === 'Caution' ? 'rgba(251,191,36,0.3)' : areaIntelligence.verdict === 'Avoid' ? 'rgba(248,113,113,0.3)' : 'rgba(255,255,255,0.1)'}`,
            }}>
              <span style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: 22,
                color: areaIntelligence.verdict === 'Excellent' || areaIntelligence.verdict === 'Good' ? '#4ade80' :
                       areaIntelligence.verdict === 'Caution' ? '#fbbf24' :
                       areaIntelligence.verdict === 'Avoid' ? '#f87171' : '#ffffff' }}>
                {areaIntelligence.verdict}
              </span>
            </div>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', fontFamily: "'Barlow', sans-serif", fontWeight: 300, lineHeight: 1.6, flex: 1, margin: 0 }}>
              {areaIntelligence.verdictReason}
            </p>
          </div>
          {areaIntelligence.marketConditions && (
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', fontFamily: "'Barlow', sans-serif", fontWeight: 300, lineHeight: 1.7, marginBottom: 10 }}>
              {areaIntelligence.marketConditions}
            </p>
          )}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
            {(areaIntelligence.upsides || []).map((u) => (
              <span key={u} style={{ fontSize: 11, color: '#4ade80', background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)', borderRadius: 20, padding: '4px 12px', fontFamily: "'Barlow', sans-serif" }}>+ {u}</span>
            ))}
            {(areaIntelligence.risks || []).map((r) => (
              <span key={r} style={{ fontSize: 11, color: '#f87171', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: 20, padding: '4px 12px', fontFamily: "'Barlow', sans-serif" }}>− {r}</span>
            ))}
          </div>
          {areaIntelligence.bestFor && (
            <div style={{ marginTop: 12, fontSize: 12, color: 'rgba(255,255,255,0.35)', fontFamily: "'Barlow', sans-serif", fontStyle: 'italic' }}>
              Best for: {areaIntelligence.bestFor}
            </div>
          )}
        </SectionCard>
      )}

      {/* Area Intelligence — shown when no street address was given */}
      {areaMetrics && (
        <SectionCard title="Market Intelligence" icon="📊" delay={45}>
          {/* Risk Score */}
          {areaRiskScore && (
            <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 140, background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: '14px 16px', border: `1px solid ${areaRiskScore.color}30` }}>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>Stability Score</div>
                <div style={{ fontSize: 36, fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', color: areaRiskScore.color, lineHeight: 1 }}>{areaRiskScore.score}</div>
                <div style={{ fontSize: 11, color: areaRiskScore.color, marginTop: 4, fontFamily: "'Barlow', sans-serif" }}>{areaRiskScore.emoji} {areaRiskScore.label}</div>
              </div>
              <div style={{ flex: 1, minWidth: 140, background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: '14px 16px', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>Market Temperature</div>
                <div style={{ fontSize: 18, fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', color: marketTemperature?.color || '#ffffff', marginBottom: 8 }}>{marketTemperature?.label || '—'}</div>
                {/* Gauge bar */}
                <div style={{ position: 'relative', height: 6, background: 'rgba(255,255,255,0.07)', borderRadius: 6, overflow: 'hidden', marginBottom: 6 }}>
                  <div style={{
                    position: 'absolute', left: 0, top: 0, height: '100%', borderRadius: 6,
                    width: marketTemperature?.label?.toLowerCase().includes('hot') || marketTemperature?.label?.toLowerCase().includes('seller') ? '85%'
                      : marketTemperature?.label?.toLowerCase().includes('cold') || marketTemperature?.label?.toLowerCase().includes('buyer') ? '20%' : '50%',
                    background: marketTemperature?.color || 'rgba(255,255,255,0.4)',
                    transition: 'width 0.8s ease',
                  }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', fontFamily: "'Barlow',sans-serif" }}>Buyer</span>
                  <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', fontFamily: "'Barlow',sans-serif" }}>Balanced</span>
                  <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', fontFamily: "'Barlow',sans-serif" }}>Seller</span>
                </div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', marginTop: 6, fontFamily: "'Barlow', sans-serif" }}>{areaMetrics.count} active listings</div>
              </div>
            </div>
          )}

          {/* Price Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 8, marginBottom: 14 }}>
            {[
              { label: 'Median Price', value: fmtCompact(areaMetrics.medianPrice, sym) },
              { label: 'Avg Price', value: fmtCompact(areaMetrics.avgPrice, sym) },
              { label: 'Median DOM', value: areaMetrics.medianDOM != null ? `${areaMetrics.medianDOM} days` : 'N/A', sub: areaMetrics.medianDOM != null ? (() => { const diff = Math.round(((33 - areaMetrics.medianDOM) / 33) * 100); return areaMetrics.medianDOM < 21 ? `⚡ ${Math.abs(diff)}% faster than avg` : areaMetrics.medianDOM < 35 ? `≈ Near national avg (33d)` : `⏱ ${Math.abs(diff)}% slower than avg` })() : null },
              { label: 'Price/sqft', value: areaMetrics.medianPPSF ? `${sym}${areaMetrics.medianPPSF}` : 'N/A' },
            ].map(({ label, value, sub }) => (
              <div key={label} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: '10px 12px', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>{label}</div>
                <div style={{ fontSize: 16, fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', color: '#ffffff' }}>{value}</div>
                {sub && <div style={{ fontSize: 9, color: sub.includes('⚡') ? '#f87171' : sub.includes('⏱') ? '#fbbf24' : '#4ade80', marginTop: 3, fontFamily: "'Barlow',sans-serif" }}>{sub}</div>}
              </div>
            ))}
          </div>

          {/* Market signals */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
            {areaMetrics.fastListingPct > 20 && (
              <div style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: 20, padding: '4px 12px', fontSize: 11, color: '#f87171', fontFamily: "'Barlow', sans-serif" }}>
                🔥 {areaMetrics.fastListingPct}% sell in &lt;2 weeks
              </div>
            )}
            {areaMetrics.slowListingPct > 25 && (
              <div style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: 20, padding: '4px 12px', fontSize: 11, color: '#fbbf24', fontFamily: "'Barlow', sans-serif" }}>
                ⏱ {areaMetrics.slowListingPct}% stale (&gt;60 days)
              </div>
            )}
            <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: '4px 12px', fontSize: 11, color: 'rgba(255,255,255,0.5)', fontFamily: "'Barlow', sans-serif" }}>
              Price range: {fmtCompact(areaMetrics.priceRange?.low || 0, sym)} – {fmtCompact(areaMetrics.priceRange?.high || 0, sym)}
            </div>
          </div>

          {/* Risk factors */}
          {areaRiskScore?.factors?.length > 0 && (
            <div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Risk Factors</div>
              {areaRiskScore.factors.filter(f => f.impact !== 0).map((f) => (
                <div key={f.icon} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                  <span style={{ fontSize: 12 }}>{f.icon}</span>
                  <span style={{ fontSize: 11, color: f.impact < 0 ? '#f87171' : '#4ade80', fontFamily: "'Barlow', sans-serif", flex: 1 }}>{f.label}</span>
                  <span style={{ fontSize: 10, color: f.impact < 0 ? '#f87171' : '#4ade80', fontFamily: "'Barlow', sans-serif" }}>{f.impact > 0 ? '+' : ''}{f.impact}</span>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      )}

      {/* Local News */}
      {newsData?.articles?.length > 0 && (
        <SectionCard title="Local Market News" icon="📰" delay={48}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {newsData.articles.slice(0, 5).map((article) => (
              <a key={article.url} href={article.url} target="_blank" rel="noopener noreferrer"
                style={{ display: 'flex', gap: 10, padding: '10px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.06)', textDecoration: 'none', transition: 'background 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}>
                <div style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }}>📄</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, color: '#ffffff', fontFamily: "'Barlow', sans-serif", fontWeight: 400, lineHeight: 1.4, marginBottom: 3, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                    {article.title}
                  </div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', fontFamily: "'Barlow', sans-serif" }}>
                    {article.source || 'News'} · {article.date ? new Date(article.date).toLocaleDateString() : ''}
                  </div>
                </div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', flexShrink: 0, alignSelf: 'center' }}>↗</div>
              </a>
            ))}
          </div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', marginTop: 10, fontFamily: "'Barlow', sans-serif" }}>Source: Google News · Housing market stories for {newsData.city}</div>
        </SectionCard>
      )}

      <SectionCard title="Area Market Estimate" icon="🏠" delay={50}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 16 }}>
          <StatCard label="Median Value" value={fmtUSD(convert(propertyEstimate.estimatedValueUSD), sym)} sub="area average" accent="#ffffff" animate />
          <StatCard label="Price / sqft" value={fmtUSD(convert(propertyEstimate.pricePerSqftUSD), sym)} sub="area average" />
          <StatCard label="Rent / month" value={fmtUSD(convert(propertyEstimate.rentEstimateMonthlyUSD), sym)} sub="area average" accent="#4ade80" animate />
        </div>
        {realData?.censusData && (
          <div className="liquid-glass" style={{ borderRadius: 12, marginBottom: 12, padding: '10px 14px', fontSize: 11, color: 'rgba(255,255,255,0.5)', fontFamily: "'Barlow', sans-serif", fontWeight: 300 }}>
            Census tract median home value: <span style={{ color: '#ffffff', fontWeight: 400 }}>${realData.censusData.medianHomeValueUSD?.toLocaleString()}</span>
            {realData.censusData.medianGrossRentUSD && <span> · Median rent: <span style={{ color: '#ffffff', fontWeight: 400 }}>${realData.censusData.medianGrossRentUSD?.toLocaleString()}/mo</span></span>}
            <span style={{ color: 'rgba(255,255,255,0.3)', marginLeft: 8 }}>· US Census ACS 2022</span>
          </div>
        )}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
          <Tag color={propertyEstimate.confidenceLevel === 'high' ? 'green' : propertyEstimate.confidenceLevel === 'low' ? 'red' : 'default'}>
            {propertyEstimate.confidenceScore != null ? `${propertyEstimate.confidenceScore}/100 confidence` : `Confidence: ${propertyEstimate.confidenceLevel}`}
          </Tag>
          {propertyEstimate.compsUsed > 0 && (
            <Tag>📊 {propertyEstimate.compsUsed} comp{propertyEstimate.compsUsed === 1 ? '' : 's'} analyzed</Tag>
          )}
          {propertyEstimate.priceRange && (
            <Tag>Range: {fmtUSD(convert(propertyEstimate.priceRange.low), sym)} – {fmtUSD(convert(propertyEstimate.priceRange.high), sym)}</Tag>
          )}
        </div>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', fontFamily: "'Barlow', sans-serif", fontWeight: 300, lineHeight: 1.7 }}>{propertyEstimate.priceContext}</p>
      </SectionCard>

      {/* Cost of Living */}
      <SectionCard title="Cost of Living" icon="💰" delay={100}>
        <IncomeSlider costOfLiving={costOfLiving} sym={sym} />
      </SectionCard>

      {/* Neighborhood + Climate */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(280px, 100%), 1fr))', gap: 16 }}>
        <SectionCard title="Neighborhood" icon="🏘" delay={150}>
          <div style={{ position: 'relative' }}>
            {/* Walk + School scores always visible for free */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 14 }}>
              {[
                { score: realData?.neighborhoodScores?.walkScore ?? neighborhood.walkScore, label: 'Walk', type: 'walk' },
                { score: realData?.neighborhoodScores?.transitScore ?? neighborhood.transitScore, label: 'Transit', type: 'transit' },
                { score: neighborhood.safetyRating, label: 'Safety', type: 'safety' },
                { score: realData?.neighborhoodScores?.schoolScore ?? neighborhood.schoolRating, label: 'Schools', type: 'school' },
              ].map(({ score, label, type }) => (
                <div key={label} style={{ textAlign: 'center' }}>
                  <ScoreRing score={score} label={label} color={scoreColor(score)} />
                  <div style={{ fontFamily: "'Barlow',sans-serif", fontSize: 9, color: scoreColor(score), marginTop: 4, lineHeight: 1.3 }}>{scoreLabel(score, type)}</div>
                </div>
              ))}
            </div>
            {realData?.neighborhoodScores && (
              <div style={{ textAlign: 'center', fontSize: 10, color: 'rgba(255,255,255,0.3)', marginBottom: 14, letterSpacing: '0.06em', fontFamily: "'Barlow', sans-serif" }}>
                WALK · TRANSIT · SCHOOL SCORES FROM OPENSTREETMAP REAL DATA
              </div>
            )}
            {/* Full detail — locked for free */}
            <div>
              {isLocked('neighborhooddetail') ? (
                <div onClick={() => onUpgrade('neighborhood')} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 16px', background: 'rgba(0,0,0,0.4)', borderRadius: 12, gap: 8, cursor: 'pointer' }}>
                  <span style={{ fontSize: 22 }}>🔒</span>
                  <div style={{ textAlign: 'center', padding: '0 16px' }}>
                    <div style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 15, color: '#fff', marginBottom: 4 }}>Full Neighbourhood Detail</div>
                    <div style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 12, lineHeight: 1.5 }}>Character, pros & cons, best-for breakdown — Pro only.</div>
                    <div style={{ display: 'inline-block', background: '#fff', color: '#000', borderRadius: 40, padding: '6px 16px', fontFamily: "'Barlow',sans-serif", fontWeight: 600, fontSize: 12 }}>Upgrade to Pro →</div>
                  </div>
                </div>
              ) : (neighborhood.character || neighborhood.pros?.length) ? (
                <div>
                  <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 14, fontFamily: "'Barlow', sans-serif", fontWeight: 300, lineHeight: 1.7 }}>{neighborhood.character}</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
                    {(neighborhood.pros || []).map((p) => <Tag key={p} color="green">+ {p}</Tag>)}
                    {(neighborhood.cons || []).map((c) => <Tag key={c} color="red">− {c}</Tag>)}
                  </div>
                  <div style={{ fontSize: 13, fontFamily: "'Barlow', sans-serif", fontWeight: 300 }}>
                    <span style={{ color: 'rgba(255,255,255,0.4)' }}>Best for: </span>
                    <span style={{ color: '#ffffff', fontWeight: 400 }}>{neighborhood.bestFor}</span>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Climate" icon="🌤" delay={200}>
          {climate && (
            <>
              <BarMeter label="Avg High" value={`${climate.avgHighC}°C`} max={50} />
              <BarMeter label="Avg Low" value={`${climate.avgLowC}°C`} max={50} />
              <BarMeter label="Avg Daily Precip" value={`${climate.avgPrecipMm}mm`} max={20} />
            </>
          )}
          {weather?.daily && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10, fontFamily: "'Barlow', sans-serif" }}>7-day forecast</div>
              <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4 }}>
                {weather.daily.time.slice(0, 7).map((day, i) => {
                  const date = new Date(day)
                  const label = i === 0 ? 'Today' : date.toLocaleDateString('en', { weekday: 'short' })
                  return (
                    <div key={day} className={i === 0 ? 'liquid-glass-strong' : 'liquid-glass'}
                      style={{ flex: '0 0 auto', textAlign: 'center', padding: '8px 12px', borderRadius: 12, minWidth: 54 }}>
                      <div style={{ fontSize: 10, color: i === 0 ? '#ffffff' : 'rgba(255,255,255,0.4)', marginBottom: 5, fontFamily: "'Barlow', sans-serif" }}>{label}</div>
                      <div style={{ fontSize: 14, fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', color: '#ffffff' }}>{Math.round(weather.daily.temperature_2m_max[i])}°</div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontFamily: "'Barlow', sans-serif" }}>{Math.round(weather.daily.temperature_2m_min[i])}°</div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </SectionCard>
      </div>



      {/* Price History */}
      {(isLocked('pricehistory') || ai.priceHistory) && (
        <SectionCard title="Price History & Projection" icon="📊" delay={275}>
          {isLocked('pricehistory') ? (
            <div onClick={() => onUpgrade('pricehistory')} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 16px', gap: 10, cursor: 'pointer' }}>
              <span style={{ fontSize: 28 }}>🔒</span>
              <div style={{ textAlign: 'center', padding: '0 16px' }}>
                <div style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 17, color: '#fff', marginBottom: 6 }}>Price History & Projections</div>
                <div style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 12, color: 'rgba(255,255,255,0.55)', marginBottom: 14, lineHeight: 1.5 }}>Market trends & price projections are Pro only.</div>
                <div style={{ display: 'inline-block', background: '#fff', color: '#000', borderRadius: 40, padding: '8px 20px', fontFamily: "'Barlow',sans-serif", fontWeight: 600, fontSize: 13 }}>Upgrade to Pro →</div>
              </div>
            </div>
          ) : (
            <PriceHistoryChart priceHistory={ai.priceHistory} />
          )}
        </SectionCard>
      )}

      {/* Flood Zone */}
      {realData?.floodZone && (
        <SectionCard title="Flood Risk" icon="🌊" delay={280}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <div className="liquid-glass" style={{
              borderRadius: 14, padding: '12px 20px', textAlign: 'center',
              background: realData.floodZone.riskLevel === 'high' ? 'rgba(248,113,113,0.1)' : realData.floodZone.riskLevel === 'moderate' ? 'rgba(251,191,36,0.08)' : 'rgba(74,222,128,0.08)',
            }}>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4, fontFamily: "'Barlow', sans-serif" }}>FEMA Zone</div>
              <div style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: 30, color: realData.floodZone.riskLevel === 'high' ? '#f87171' : realData.floodZone.riskLevel === 'moderate' ? '#fbbf24' : '#4ade80' }}>
                {realData.floodZone.zone}
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, color: '#ffffff', marginBottom: 4, fontFamily: "'Barlow', sans-serif", fontWeight: 400 }}>{realData.floodZone.description}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', fontFamily: "'Barlow', sans-serif", fontWeight: 300 }}>
                {realData.floodZone.inSpecialFloodHazardArea
                  ? 'This property is in a Special Flood Hazard Area. Flood insurance is typically required.'
                  : 'This property is not in a Special Flood Hazard Area. Standard insurance applies.'}
              </div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', marginTop: 6, fontFamily: "'Barlow', sans-serif" }}>Source: FEMA National Flood Hazard Layer</div>
            </div>
          </div>
        </SectionCard>
      )}

      {/* Environmental Risk */}
      {(isLocked('risk') || risk) && (
        <SectionCard title="Environmental Risk" icon="🛡" delay={290} className="gsap-reveal-risk">
          {isLocked('risk') ? (
            <div onClick={() => onUpgrade('risk')} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 16px', gap: 10, cursor: 'pointer' }}>
              <span style={{ fontSize: 28 }}>🔒</span>
              <div style={{ textAlign: 'center', padding: '0 16px' }}>
                <div style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 17, color: '#fff', marginBottom: 6 }}>Environmental & Flood Risk</div>
                <div style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 12, color: 'rgba(255,255,255,0.55)', marginBottom: 14, lineHeight: 1.5 }}>Detailed risk & hazard data are Pro only.</div>
                <div style={{ display: 'inline-block', background: '#fff', color: '#000', borderRadius: 40, padding: '8px 20px', fontFamily: "'Barlow',sans-serif", fontWeight: 600, fontSize: 13 }}>Upgrade to Pro →</div>
              </div>
            </div>
          ) : (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 16 }}>
                {[
                  { label: 'Flood', value: risk.detailedRisk?.floodRisk || 'Low', icon: '🌊' },
                  { label: 'Fire', value: risk.detailedRisk?.fireRisk || 'Low', icon: '🔥' },
                  { label: 'Seismic', value: risk.detailedRisk?.seismicRisk || 'Low', icon: '🌍' },
                  { label: 'Pollution', value: risk.detailedRisk?.pollutionRisk || 'Low', icon: '💨' },
                  { label: 'Noise', value: risk.detailedRisk?.noiseRisk || 'Moderate', icon: '🔊' },
                  { label: 'Crime', value: risk.detailedRisk?.crimeRisk || 'Low-Moderate', icon: '👮' },
                ].map((r) => (
                  <div key={r.label} className="liquid-glass" style={{ borderRadius: 14, padding: '12px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <span style={{ fontSize: 12 }}>{r.icon}</span>
                      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: "'Barlow', sans-serif" }}>{r.label}</div>
                    </div>
                    <div style={{ fontSize: 15, color: '#ffffff', fontFamily: "'Instrument Serif', serif", fontStyle: 'italic' }}>{r.value}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 16 }}>
                {risk.nationalRiskIndex && (
                  <div className="liquid-glass" style={{ borderRadius: 14, padding: '14px 16px' }}>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6, fontFamily: "'Barlow', sans-serif" }}>Community Risk</div>
                    <div style={{ fontSize: 18, color: '#ffffff', fontFamily: "'Instrument Serif', serif", fontStyle: 'italic' }}>{risk.nationalRiskIndex.overallRiskRating}</div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 4, fontFamily: "'Barlow', sans-serif" }}>FEMA National Risk Index</div>
                  </div>
                )}
                {risk.epaHazards && (
                  <div className="liquid-glass" style={{ borderRadius: 14, padding: '14px 16px' }}>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6, fontFamily: "'Barlow', sans-serif" }}>Air Quality</div>
                    <div style={{ fontSize: 18, color: '#ffffff', fontFamily: "'Instrument Serif', serif", fontStyle: 'italic' }}>{risk.epaHazards.airQualityRating || 'Moderate'}</div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 4, fontFamily: "'Barlow', sans-serif" }}>EPA EJScreen Percentile: {risk.epaHazards.airQualityPM25Percentile || 50}th</div>
                  </div>
                )}
              </div>
              {risk.nationalRiskIndex?.topRisks?.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {risk.nationalRiskIndex.topRisks.map((r) => (
                    <Tag key={r.name} color="red">⚠️ {r.name}</Tag>
                  ))}
                </div>
              )}
              {!risk.isUS && (
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 12, fontFamily: "'Barlow', sans-serif", fontStyle: 'italic' }}>
                  Note: FEMA and EPA data are currently limited to US locations. Seismic risk is global.
                </div>
              )}
            </div>
          )}
        </SectionCard>
      )}

      {/* Investment */}
      <SectionCard title="Investment Analysis" icon="📈" delay={300}>
        {isLocked('investment') ? (
          <div onClick={() => onUpgrade('investment')} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 16px', gap: 10, cursor: 'pointer' }}>
            <span style={{ fontSize: 28 }}>🔒</span>
            <div style={{ textAlign: 'center', padding: '0 16px' }}>
              <div style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 17, color: '#fff', marginBottom: 6 }}>Investment Analysis</div>
              <div style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 12, color: 'rgba(255,255,255,0.55)', marginBottom: 14, lineHeight: 1.5 }}>Rent yield, investment score & outlook are Pro only.</div>
              <div style={{ display: 'inline-block', background: '#fff', color: '#000', borderRadius: 40, padding: '8px 20px', fontFamily: "'Barlow',sans-serif", fontWeight: 600, fontSize: 13 }}>Upgrade to Pro →</div>
            </div>
          </div>
        ) : investment ? (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 16 }}>
              <StatCard label="Rent Yield" value={`${investment.rentYieldPercent}%`} sub="annual gross" accent="#4ade80" />
              <StatCard label="Investment Score" value={`${investment.investmentScore}/100`} />
              <div className="liquid-glass" style={{ borderRadius: 14, padding: '16px' }}>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10, fontFamily: "'Barlow', sans-serif" }}>Outlook</div>
                <Tag color={investment.appreciationOutlook === 'bullish' ? 'green' : investment.appreciationOutlook === 'bearish' ? 'red' : 'default'}>
                  {(investment.appreciationOutlook || 'neutral').toUpperCase()}
                </Tag>
              </div>
            </div>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 8, fontFamily: "'Barlow', sans-serif", fontWeight: 300, lineHeight: 1.7 }}>{investment.appreciationOutlookText}</p>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', fontFamily: "'Barlow', sans-serif", fontWeight: 300, lineHeight: 1.7 }}>{investment.investmentSummary}</p>
          </div>
        ) : null}
      </SectionCard>



      {/* Local Insights */}
      <SectionCard title="Local Insights" icon="🗺" delay={350}>
        <p style={{ fontSize: 15, color: '#ffffff', marginBottom: 16, fontFamily: "'Instrument Serif', serif", fontStyle: 'italic' }}>"{localInsights.knownFor}"</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
          <div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12, fontFamily: "'Barlow', sans-serif" }}>Top Attractions</div>
            {localInsights.topAttractions.map((a, i) => (
              <div key={a.name || i} className="liquid-glass" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 12, marginBottom: 6, fontSize: 13 }}>
                <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, fontFamily: "'Instrument Serif', serif", fontStyle: 'italic' }}>{String(i + 1).padStart(2, '0')}</span>
                <span style={{ color: 'rgba(255,255,255,0.7)', fontFamily: "'Barlow', sans-serif", fontWeight: 300 }}>{a}</span>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="liquid-glass-strong" style={{ borderRadius: 14, padding: '14px 16px' }}>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6, fontFamily: "'Barlow', sans-serif" }}>Local tip</div>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', fontFamily: "'Barlow', sans-serif", fontWeight: 300, lineHeight: 1.7 }}>{localInsights.localTip}</p>
            </div>
            {localInsights.languageNote && (
              <div className="liquid-glass" style={{ borderRadius: 14, padding: '14px 16px' }}>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6, fontFamily: "'Barlow', sans-serif" }}>Language</div>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', fontFamily: "'Barlow', sans-serif", fontWeight: 300, lineHeight: 1.7 }}>{localInsights.languageNote}</p>
              </div>
            )}
          </div>
        </div>
      </SectionCard>

      <p style={{ textAlign: 'center', fontSize: 12, color: 'rgba(255,255,255,0.25)', padding: '8px 0', fontFamily: "'Barlow', sans-serif", fontWeight: 300 }}>
        All property estimates and scores are AI-generated approximations for informational purposes only. Not financial or legal advice.
      </p>
    </div>
  )
}
