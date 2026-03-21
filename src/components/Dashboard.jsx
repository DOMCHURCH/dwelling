import { useState, useEffect } from 'react'
import SectionCard from './SectionCard'
import StatCard from './StatCard'
import ScoreRing from './ScoreRing'
import PriceHistoryChart from './PriceHistoryChart'

// ─── STREET VIEW IMAGE ────────────────────────────────────────────────────────
// Uses Mapillary (free, no key needed for embed) + fallback to OSM static map
// For best results with real street-level photos, add a Google Maps API key
// to VITE_GOOGLE_MAPS_KEY in Vercel env vars — then Google Street View activates.
function StreetViewImage({ lat, lon, address }) {
  const googleKey = import.meta.env.VITE_GOOGLE_MAPS_KEY

  // Determine initial source — if no google key, go straight to mapillary
  const [source, setSource] = useState(googleKey ? 'google' : 'mapillary')

  const googleUrl = googleKey
    ? `https://maps.googleapis.com/maps/api/streetview?size=800x400&location=${lat},${lon}&fov=90&pitch=0&key=${googleKey}`
    : null

  const mapillaryUrl = `https://www.mapillary.com/embed?map_style=Mapillary%20dark&image_key=latest&style=classic&traffic_sign_layer=false&map_layer=false&lat=${lat}&lng=${lon}&z=17&menu=false`

  return (
    <div style={{ marginBottom: 16, borderRadius: 16, overflow: 'hidden', position: 'relative', background: 'rgba(255,255,255,0.03)' }}>
      <div style={{ position: 'absolute', top: 10, left: 12, zIndex: 2 }}>
        <span className="liquid-glass" style={{ borderRadius: 20, padding: '4px 10px', fontSize: 11, color: 'rgba(255,255,255,0.5)', fontFamily: "'Barlow',sans-serif", letterSpacing: '0.06em' }}>
          📸 Street View
        </span>
      </div>

      {source === 'google' && googleUrl ? (
        <img
          src={googleUrl}
          alt={`Street view of ${address}`}
          onError={() => setSource('mapillary')}
          style={{ width: '100%', height: 240, objectFit: 'cover', display: 'block', filter: 'brightness(0.85)' }}
        />
      ) : source === 'mapillary' ? (
        <iframe
          src={mapillaryUrl}
          style={{ width: '100%', height: 240, border: 'none', display: 'block' }}
          title="Street view"
          allowFullScreen
          onLoad={() => {}}
          onError={() => setSource('fallback')}
        />
      ) : (
        <div style={{ width: '100%', height: 240, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
          <span style={{ fontSize: 32 }}>🏠</span>
          <span style={{ fontFamily: "'Barlow',sans-serif", fontSize: 12, color: 'rgba(255,255,255,0.3)', fontWeight: 300 }}>Street view not available for this address</span>
          <a
            href={`https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat},${lon}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontFamily: "'Barlow',sans-serif", fontSize: 12, color: 'rgba(255,255,255,0.5)' }}
          >
            Open in Google Maps ↗
          </a>
        </div>
      )}

      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(transparent, rgba(0,0,0,0.75))', padding: '28px 14px 10px' }}>
        <p style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 12, color: 'rgba(255,255,255,0.7)', margin: 0 }}>{address}</p>
      </div>
    </div>
  )
}

import { weatherCodeToDescription } from '../lib/weather'
import { getCurrencySymbol, getCurrencyName, fetchExchangeRates, convertCurrency, getCurrencyFromCountry } from '../lib/currency'

const fmt = (n) => (n != null && n !== 0) ? n.toLocaleString('en-US', { maximumFractionDigits: 0 }) : '—'
const fmtUSD = (n, sym) => (n != null && n !== 0) ? `${sym || '$'}${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}` : '—'
const pct = (n) => (n != null && n !== 0 && !isNaN(n)) ? `${Math.round(n)}%` : '—'

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
        <input type="range" min={mode === 'monthly' ? 1000 : 12000} max={mode === 'monthly' ? 30000 : 360000} step={mode === 'monthly' ? 100 : 1000}
          value={income} onChange={e => setIncome(Number(e.target.value))} style={{ width: '100%', accentColor: 'rgba(255,255,255,0.7)' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 4 }}>
          <span>{fmtUSD(mode === 'monthly' ? 1000 : 12000, sym)}</span>
          <span>{fmtUSD(mode === 'monthly' ? 30000 : 360000, sym)}</span>
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
        <StatCard label="vs US Average" value={costOfLiving.indexVsUSAverage ? `${costOfLiving.indexVsUSAverage > 0 ? '+' : ''}${costOfLiving.indexVsUSAverage}%` : '—'}
          accent={costOfLiving.indexVsUSAverage > 15 ? '#f87171' : costOfLiving.indexVsUSAverage < -15 ? '#4ade80' : '#ffffff'} />
      </div>
      <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 14, fontFamily: "'Barlow', sans-serif", fontWeight: 300, lineHeight: 1.7 }}>{costOfLiving.summary}</p>
    </div>
  )
}

function CorrectionsPanel({ ai, knownFacts = {}, onRecalculate }) {
  const [beds, setBeds] = useState(knownFacts.beds ?? ai.floorPlan.typicalBedrooms ?? "")
  const [baths, setBaths] = useState(knownFacts.baths ?? ai.floorPlan.typicalBathrooms ?? "")
  const [sqft, setSqft] = useState(knownFacts.sqft ?? ai.floorPlan.typicalSqft ?? "")
  const [yearBuilt, setYearBuilt] = useState(knownFacts.yearBuilt ?? "")
  const [purchasePrice, setPurchasePrice] = useState(knownFacts.purchasePrice ?? "")
  const [open, setOpen] = useState(false)

  const handleRecalculate = () => {
    onRecalculate({
      beds: beds ? parseInt(beds) : null,
      baths: baths ? parseFloat(baths) : null,
      sqft: sqft ? parseInt(sqft) : null,
      yearBuilt: yearBuilt ? parseInt(yearBuilt) : null,
      purchasePrice: purchasePrice ? parseInt(String(purchasePrice).replace(/,/g, "")) : null,
    })
    setOpen(false)
  }

  const iStyle = {
    width: "100%", padding: "10px 14px",
    background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 10, color: "#ffffff", fontSize: 13, outline: "none",
    fontFamily: "'Barlow', sans-serif", fontWeight: 300,
    transition: "border-color 0.2s",
  }

  return (
    <div className="liquid-glass" style={{ borderRadius: 16, padding: "16px 20px", marginBottom: 16 }}>
      <button onClick={() => setOpen(!open)} style={{
        background: "none", border: "none", color: "rgba(255,255,255,0.6)",
        fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, padding: 0,
        fontFamily: "'Barlow', sans-serif", fontWeight: 300,
      }}>
        <span style={{ fontSize: 18, color: 'rgba(255,255,255,0.3)' }}>{open ? "−" : "+"}</span>
        Correct AI estimates to improve accuracy
      </button>
      {open && (
        <div style={{ marginTop: 16 }}>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 14, fontFamily: "'Barlow', sans-serif", fontWeight: 300 }}>
            Enter the actual values you know. These override AI guesses and trigger a recalculation.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10, marginBottom: 14 }}>
            {[
              { label: "Bedrooms", value: beds, set: setBeds },
              { label: "Bathrooms", value: baths, set: setBaths },
              { label: "Sqft", value: sqft, set: setSqft },
              { label: "Year built", value: yearBuilt, set: setYearBuilt },
              { label: "Purchase price ($)", value: purchasePrice, set: setPurchasePrice },
            ].map(({ label, value, set }) => (
              <div key={label}>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6, fontFamily: "'Barlow', sans-serif" }}>{label}</div>
                <input value={value} onChange={e => set(e.target.value)} style={iStyle}
                  onFocus={e => e.target.style.borderColor = "rgba(255,255,255,0.3)"}
                  onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.1)"} />
              </div>
            ))}
          </div>
          <button onClick={handleRecalculate}
            style={{ padding: "10px 24px", background: "#ffffff", border: "none", borderRadius: 40, color: "#000", fontWeight: 600, fontSize: 13, cursor: "pointer", fontFamily: "'Barlow', sans-serif", transition: "transform 0.15s" }}
            onMouseEnter={e=>e.currentTarget.style.transform='scale(1.02)'}
            onMouseLeave={e=>e.currentTarget.style.transform=''}>
            Recalculate with corrections
          </button>
        </div>
      )}
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

export default function Dashboard({ data, onRecalculate }) {
  const { geo, weather, climate, ai, knownFacts, realData, isAreaMode } = data
  const { areaMetrics, areaRiskScore, marketTemperature, newsData } = realData || {}
  const { propertyEstimate, costOfLiving, neighborhood, investment, floorPlan, localInsights, areaIntelligence } = ai
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Address Banner */}
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
          title="Property Location"
          width="100%"
          height="100%"
          style={{ border: 0, display: 'block', filter: 'invert(90%) hue-rotate(180deg)' }}
          loading="lazy"
          src={`https://www.openstreetmap.org/export/embed.html?bbox=${geo.lon - 0.005}%2C${geo.lat - 0.003}%2C${geo.lon + 0.005}%2C${geo.lat + 0.003}&layer=mapnik&marker=${geo.lat}%2C${geo.lon}`}
        />
      </div>

      {/* Street View Image */}
      <StreetViewImage lat={geo.lat} lon={geo.lon} address={[geo.userStreet, geo.userCity, geo.userState, geo.userCountry].filter(Boolean).join(', ')} />

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
            {(areaIntelligence.upsides || []).map((u, i) => (
              <span key={i} style={{ fontSize: 11, color: '#4ade80', background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)', borderRadius: 20, padding: '4px 12px', fontFamily: "'Barlow', sans-serif" }}>+ {u}</span>
            ))}
            {(areaIntelligence.risks || []).map((r, i) => (
              <span key={i} style={{ fontSize: 11, color: '#f87171', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: 20, padding: '4px 12px', fontFamily: "'Barlow', sans-serif" }}>− {r}</span>
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
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>Market Temp</div>
                <div style={{ fontSize: 20, fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', color: marketTemperature?.color || '#ffffff', marginTop: 4 }}>{marketTemperature?.label || '—'}</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 4, fontFamily: "'Barlow', sans-serif" }}>Based on {areaMetrics.count} active listings</div>
              </div>
            </div>
          )}

          {/* Price Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 8, marginBottom: 14 }}>
            {[
              { label: 'Median Price', value: `${sym}${Math.round(areaMetrics.medianPrice / 1000)}k` },
              { label: 'Avg Price', value: `${sym}${Math.round(areaMetrics.avgPrice / 1000)}k` },
              { label: 'Median DOM', value: areaMetrics.medianDOM != null ? `${areaMetrics.medianDOM} days` : 'N/A' },
              { label: 'Price/sqft', value: areaMetrics.medianPPSF ? `${sym}${areaMetrics.medianPPSF}` : 'N/A' },
            ].map(({ label, value }) => (
              <div key={label} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: '10px 12px', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>{label}</div>
                <div style={{ fontSize: 16, fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', color: '#ffffff' }}>{value}</div>
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
              Price range: {sym}{Math.round((areaMetrics.priceRange?.low || 0) / 1000)}k – {sym}{Math.round((areaMetrics.priceRange?.high || 0) / 1000)}k
            </div>
          </div>

          {/* Risk factors */}
          {areaRiskScore?.factors?.length > 0 && (
            <div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Risk Factors</div>
              {areaRiskScore.factors.filter(f => f.impact !== 0).map((f, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
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
            {newsData.articles.slice(0, 5).map((article, i) => (
              <a key={i} href={article.url} target="_blank" rel="noopener noreferrer"
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

      <SectionCard title="Property Estimate" icon="🏠" delay={50}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 16 }}>
          <StatCard label="Est. Value" value={fmtUSD(convert(propertyEstimate.estimatedValueUSD), sym)} sub="market estimate" accent="#ffffff" animate />
          <StatCard label="Price / sqft" value={fmtUSD(convert(propertyEstimate.pricePerSqftUSD), sym)} sub="avg for area" />
          <StatCard label="Rent / month" value={fmtUSD(convert(propertyEstimate.rentEstimateMonthlyUSD), sym)} sub="typical rental" accent="#4ade80" animate />
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
          <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: 14 }}>
            <ScoreRing score={realData?.neighborhoodScores?.walkScore ?? neighborhood.walkScore} label="Walk" color="rgba(255,255,255,0.9)" />
            <ScoreRing score={realData?.neighborhoodScores?.transitScore ?? neighborhood.transitScore} label="Transit" color="rgba(255,255,255,0.65)" />
            <ScoreRing score={neighborhood.safetyRating} label="Safety" color="#4ade80" />
            <ScoreRing score={realData?.neighborhoodScores?.schoolScore ?? neighborhood.schoolRating} label="Schools" color="rgba(196,181,253,0.9)" />
          </div>
          {realData?.neighborhoodScores && (
            <div style={{ textAlign: 'center', fontSize: 10, color: 'rgba(255,255,255,0.3)', marginBottom: 14, letterSpacing: '0.06em', fontFamily: "'Barlow', sans-serif" }}>
              WALK · TRANSIT · SCHOOL SCORES FROM OPENSTREETMAP REAL DATA
            </div>
          )}
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 14, fontFamily: "'Barlow', sans-serif", fontWeight: 300, lineHeight: 1.7 }}>{neighborhood.character}</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
            {neighborhood.pros.map((p, i) => <Tag key={i} color="green">+ {p}</Tag>)}
            {neighborhood.cons.map((c, i) => <Tag key={i} color="red">− {c}</Tag>)}
          </div>
          <div style={{ fontSize: 13, fontFamily: "'Barlow', sans-serif", fontWeight: 300 }}>
            <span style={{ color: 'rgba(255,255,255,0.4)' }}>Best for: </span>
            <span style={{ color: '#ffffff', fontWeight: 400 }}>{neighborhood.bestFor}</span>
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
                    <div key={i} className={i === 0 ? 'liquid-glass-strong' : 'liquid-glass'}
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

      {/* Floor Plan */}
      <SectionCard title="Floor Plan & Architecture" icon="📐" delay={250}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12, marginBottom: 16 }}>
          <StatCard label="Typical Size" value={`${fmt(floorPlan.typicalSqft)} sqft`} />
          <StatCard label="Bedrooms" value={floorPlan.typicalBedrooms} />
          <StatCard label="Bathrooms" value={floorPlan.typicalBathrooms} />
          <StatCard label="Built Era" value={floorPlan.builtEra} />
        </div>
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 6, fontFamily: "'Barlow', sans-serif", fontWeight: 300 }}>Architectural style</div>
          <div style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: 22, color: '#ffffff' }}>{floorPlan.architecturalStyle}</div>
        </div>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 16, fontFamily: "'Barlow', sans-serif", fontWeight: 300, lineHeight: 1.7 }}>{floorPlan.typicalLayout}</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 20 }}>
          {floorPlan.commonFeatures.map((f, i) => (
            <span key={i} className="liquid-glass" style={{ padding: '4px 14px', borderRadius: 40, fontSize: 12, color: 'rgba(255,255,255,0.6)', fontFamily: "'Barlow', sans-serif", fontWeight: 300 }}>{f}</span>
          ))}
        </div>
      </SectionCard>

      {/* Price History */}
      {ai.priceHistory && (
        <SectionCard title="Price History & Projection" icon="📊" delay={275}>
          <PriceHistoryChart priceHistory={ai.priceHistory} />
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

      {/* Investment */}
      <SectionCard title="Investment Analysis" icon="📈" delay={300}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 16 }}>
          <StatCard label="Rent Yield" value={`${investment.rentYieldPercent}%`} sub="annual gross" accent="#4ade80" />
          <StatCard label="Investment Score" value={`${investment.investmentScore}/100`} />
          <div className="liquid-glass" style={{ borderRadius: 14, padding: '16px' }}>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10, fontFamily: "'Barlow', sans-serif" }}>Outlook</div>
            <Tag color={investment.appreciationOutlook === 'bullish' ? 'green' : investment.appreciationOutlook === 'bearish' ? 'red' : 'default'}>
              {investment.appreciationOutlook.toUpperCase()}
            </Tag>
          </div>
        </div>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 8, fontFamily: "'Barlow', sans-serif", fontWeight: 300, lineHeight: 1.7 }}>{investment.appreciationOutlookText}</p>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', fontFamily: "'Barlow', sans-serif", fontWeight: 300, lineHeight: 1.7 }}>{investment.investmentSummary}</p>
      </SectionCard>

      {/* Local Insights */}
      <SectionCard title="Local Insights" icon="🗺" delay={350}>
        <p style={{ fontSize: 15, color: '#ffffff', marginBottom: 16, fontFamily: "'Instrument Serif', serif", fontStyle: 'italic' }}>"{localInsights.knownFor}"</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
          <div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12, fontFamily: "'Barlow', sans-serif" }}>Top Attractions</div>
            {localInsights.topAttractions.map((a, i) => (
              <div key={i} className="liquid-glass" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 12, marginBottom: 6, fontSize: 13 }}>
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
