import { useState } from 'react'
import SectionCard from './SectionCard'
import StatCard from './StatCard'
import ScoreRing from './ScoreRing'
import PriceHistoryChart from './PriceHistoryChart'
import { weatherCodeToDescription } from '../lib/weather'

const fmt = (n) => (n != null && n !== 0) ? n.toLocaleString('en-US', { maximumFractionDigits: 0 }) : '—'
const fmtUSD = (n) => (n != null && n !== 0) ? `$${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}` : '—'
const pct = (n) => (n != null && n !== 0 && !isNaN(n)) ? `${Math.round(n)}%` : '—'

function Tag({ children, color = 'var(--neon-pink)' }) {
  return (
    <span style={{
      display: 'inline-block',
      padding: '3px 10px',
      borderRadius: 0,
      fontSize: 12,
      background: color === 'green' ? 'var(--green-dim)' : color === 'red' ? 'var(--red-dim)' : 'rgba(255,45,120,0.15)',
      color: color === 'green' ? 'var(--green)' : color === 'red' ? 'var(--red)' : 'var(--neon-pink)',
      fontWeight: 500,
    }}>
      {children}
    </span>
  )
}

function BarMeter({ label, value, max, color = 'var(--neon-pink)' }) {
  const p = Math.min((parseFloat(value) / max) * 100, 100)
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 5 }}>
        <span style={{ color: 'var(--text-2)' }}>{label}</span>
        <span style={{ color: 'var(--text)', fontWeight: 500 }}>{value}</span>
      </div>
      <div style={{ height: 4, background: 'var(--glass-border)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ width: `${p}%`, height: '100%', background: color, borderRadius: 2, transition: 'width 1s ease' }} />
      </div>
    </div>
  )
}

function LinkButton({ href, label, icon }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 7,
        padding: '9px 16px',
        background: 'rgba(0,0,0,0.4)',
        border: '1px solid var(--border-active)',
        borderRadius: '0px',
        color: 'var(--neon-pink)',
        fontSize: 13,
        fontWeight: 500,
        textDecoration: 'none',
        transition: 'background 0.15s',
      }}
      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,45,120,0.15)'}
      onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
    >
      <span style={{ fontSize: 15 }}>{icon}</span>
      {label}
      <span style={{ fontSize: 11, color: 'var(--text-2)' }}>↗</span>
    </a>
  )
}

function IncomeSlider({ costOfLiving }) {
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
  const remainingPct = total > 0 ? Math.round((remaining / monthlyIncome) * 100) : 0
  const totalPct = total > 0 ? Math.round((total / monthlyIncome) * 100) : 0

  const toggleMode = (m) => {
    setMode(m)
    setIncome(m === 'monthly' ? 5000 : 60000)
  }

  return (
    <div>
      {/* Toggle */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 20, border: '2px solid rgba(255,255,255,0.2)', borderRadius: '0px', overflow: 'hidden', width: 'fit-content' }}>
        {['monthly', 'yearly'].map(m => (
          <button
            key={m}
            onClick={() => toggleMode(m)}
            style={{
              padding: '7px 18px',
              background: mode === m ? 'var(--neon-pink)' : 'transparent',
              color: mode === m ? 'var(--bg)' : 'var(--text-2)',
              border: 'none',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 500,
              transition: 'all 0.15s',
              textTransform: 'capitalize',
            }}
          >
            {m}
          </button>
        ))}
      </div>

      {/* Slider */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 8 }}>
          <span style={{ color: 'var(--text-2)' }}>Your {mode} income</span>
          <span style={{ color: 'var(--neon-pink)', fontWeight: 500, fontFamily: "'Space Mono', monospace", fontSize: 18 }}>
            {fmtUSD(income)}
          </span>
        </div>
        <input
          type="range"
          min={mode === 'monthly' ? 1000 : 12000}
          max={mode === 'monthly' ? 30000 : 360000}
          step={mode === 'monthly' ? 100 : 1000}
          value={income}
          onChange={e => setIncome(Number(e.target.value))}
          style={{ width: '100%', accentColor: 'var(--neon-pink)' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>
          <span>{fmtUSD(mode === 'monthly' ? 1000 : 12000)}</span>
          <span>{fmtUSD(mode === 'monthly' ? 30000 : 360000)}</span>
        </div>
      </div>

      {/* Income breakdown bar */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ height: 10, borderRadius: 5, overflow: 'hidden', background: 'var(--glass-border)', display: 'flex' }}>
          <div style={{ width: `${Math.min(totalPct, 100)}%`, background: totalPct > 80 ? 'var(--red)' : totalPct > 50 ? 'var(--neon-pink)' : 'var(--green)', transition: 'width 0.4s ease' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginTop: 6 }}>
          <span style={{ color: 'var(--text-2)' }}>
            Cost of living: <span style={{ color: totalPct > 80 ? 'var(--red)' : 'var(--text)', fontWeight: 500 }}>{total > 0 ? `${totalPct}% of income` : '—'}</span>
          </span>
          <span style={{ color: remaining >= 0 ? 'var(--green)' : 'var(--red)', fontWeight: 500 }}>
            {total > 0 ? (remaining >= 0 ? `${fmtUSD(remaining)} left` : `${fmtUSD(Math.abs(remaining))} over budget`) : '—'}
          </span>
        </div>
      </div>

      {/* Category breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 32px', marginBottom: 16 }}>
        {categories.map(({ label, value }) => {
          const catPct = value > 0 ? Math.round((value / monthlyIncome) * 100) : null
          return (
            <div key={label} style={{ padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 3 }}>
                <span style={{ color: 'var(--text-2)' }}>{label}</span>
                <span style={{ fontWeight: 500 }}>{fmtUSD(value)}</span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{catPct != null ? `${catPct}% of ${mode} income` : '—'}</div>
            </div>
          )
        })}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
        <StatCard label="Monthly cost" value={fmtUSD(total)} sub="estimated total" />
        <StatCard label="vs US Average" value={costOfLiving.indexVsUSAverage ? `${costOfLiving.indexVsUSAverage > 0 ? '+' : ''}${costOfLiving.indexVsUSAverage}%` : '—'}
          accent={costOfLiving.indexVsUSAverage > 15 ? 'var(--red)' : costOfLiving.indexVsUSAverage < -15 ? 'var(--green)' : 'var(--text)'} />
      </div>

      <p style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 14 }}>{costOfLiving.summary}</p>
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
    width: "100%", padding: "9px 12px",
    background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)",
    borderRadius: "var(--radius-sm)", color: "var(--text)",
    fontSize: 13, outline: "none",
  }

  return (
    <div style={{
      background: "rgba(0,0,0,0.4)", border: "1px solid var(--border)",
      borderRadius: "var(--radius-lg)", padding: "16px 20px", marginBottom: 16,
    }}>
      <button onClick={() => setOpen(!open)} style={{
        background: "none", border: "none", color: "var(--neon-pink)",
        fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, padding: 0,
      }}>
        <span style={{ fontSize: 16 }}>{open ? "-" : "+"}</span>
        Correct AI estimates to improve accuracy
      </button>
      {open && (
        <div style={{ marginTop: 14 }}>
          <p style={{ fontSize: 12, color: "var(--text-2)", marginBottom: 12 }}>
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
                <div style={{ fontSize: 11, color: "var(--text-2)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 5 }}>{label}</div>
                <input value={value} onChange={e => set(e.target.value)} style={iStyle}
                  onFocus={e => e.target.style.borderColor = "rgba(59,130,246,0.4)"}
                  onBlur={e => e.target.style.borderColor = "var(--glass-border)"} />
              </div>
            ))}
          </div>
          <button onClick={handleRecalculate} style={{
            padding: "10px 24px", background: "var(--neon-pink)", border: "none",
            borderRadius: "var(--radius-sm)", color: "#fff", fontWeight: 500,
            fontSize: 13, cursor: "pointer",
          }}>
            Recalculate with corrections
          </button>
        </div>
      )}
    </div>
  )
}

export default function Dashboard({ data, onRecalculate }) {
  const { geo, weather, climate, ai, knownFacts, realData } = data
  const { propertyEstimate, costOfLiving, neighborhood, investment, floorPlan, localInsights } = ai

  const currentWeather = weather?.current
  const tempC = currentWeather?.temperature_2m
  const tempF = tempC != null ? Math.round(tempC * 9 / 5 + 32) : null
  const weatherDesc = currentWeather ? weatherCodeToDescription(currentWeather.weather_code) : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Address Banner */}
      <div className="fade-up" style={{
        background: 'rgba(0,0,0,0.4)',
        border: '2px solid rgba(255,255,255,0.2)',
        borderRadius: '0px',
        padding: '20px 24px',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
      }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,45,120,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 1C5.24 1 3 3.24 3 6c0 3.75 5 9 5 9s5-5.25 5-9c0-2.76-2.24-5-5-5zm0 6.75A1.75 1.75 0 1 1 8 4.25a1.75 1.75 0 0 1 0 3.5z" fill="var(--neon-pink)" />
          </svg>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 500, fontSize: 15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {geo.displayName.split(',')[0]}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {geo.displayName}
          </div>
        </div>
        {weatherDesc && (
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 20 }}>
              {tempC}°C
              <span style={{ fontSize: 13, color: 'var(--text-3)', marginLeft: 6 }}>/ {tempF}°F</span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-2)' }}>{weatherDesc}</div>
          </div>
        )}
      </div>

      {/* OpenStreetMap Embed */}
      <div className="fade-up" style={{
        background: 'rgba(0,0,0,0.4)',
        border: '2px solid rgba(255,255,255,0.2)',
        borderRadius: '0px',
        overflow: 'hidden',
        height: 280,
      }}>
        <iframe
          title="Property Location"
          width="100%"
          height="100%"
          style={{ border: 0, display: 'block' }}
          loading="lazy"
          src={`https://www.openstreetmap.org/export/embed.html?bbox=${geo.lon - 0.005}%2C${geo.lat - 0.003}%2C${geo.lon + 0.005}%2C${geo.lat + 0.003}&layer=mapnik&marker=${geo.lat}%2C${geo.lon}`}
        />
      </div>

      {/* Share button */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: -8 }}>
        <button
          onClick={() => {
            const addr = [geo.userStreet, geo.userCity, geo.userState, geo.userCountry].filter(Boolean).join(', ')
            const subject = encodeURIComponent(`Property analysis: ${addr}`)
            const body = encodeURIComponent(`Check out this property analysis I found on Dwelling:\n\nhttps://dwelling-homes.netlify.app\n\nAddress: ${addr}\n\nEstimated value: ${fmtUSD(ai.propertyEstimate.estimatedValueUSD)}\nRent estimate: ${fmtUSD(ai.propertyEstimate.rentEstimateMonthlyUSD)}/mo\nInvestment score: ${ai.investment.investmentScore}/100\n\nPowered by Dwelling — Property Intelligence`)
            window.location.href = `mailto:?subject=${subject}&body=${body}`
          }}
          style={{
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '8px 16px',
            background: 'rgba(0,0,0,0.3)',
            border: '2px solid rgba(255,255,255,0.2)',
            borderRadius: 0,
            color: 'var(--text-2)',
            fontSize: 12,
            cursor: 'pointer',
            transition: 'all 0.2s',
            fontFamily: 'DM Sans, sans-serif',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(124,92,252,0.4)'; e.currentTarget.style.color = 'var(--acid-yellow)' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--glass-border)'; e.currentTarget.style.color = 'var(--text-2)' }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
            <polyline points="22,6 12,13 2,6"/>
          </svg>
          Share via email
        </button>
      </div>

      <CorrectionsPanel ai={ai} knownFacts={knownFacts} onRecalculate={onRecalculate} />

      {/* Property Estimate */}
      <SectionCard title="Property Estimate" icon="🏠" delay={50}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 16 }}>
          <StatCard label="Est. Value" value={fmtUSD(propertyEstimate.estimatedValueUSD)} sub="market estimate" accent="var(--neon-pink)" animate />
          <StatCard label="Price / sqft" value={fmtUSD(propertyEstimate.pricePerSqftUSD)} sub="avg for area" />
          <StatCard label="Rent / month" value={fmtUSD(propertyEstimate.rentEstimateMonthlyUSD)} sub="typical rental" accent="var(--green)" animate />
        </div>
        {realData?.censusData && (
          <div style={{ marginBottom: 10, padding: '8px 12px', background: 'rgba(255,45,120,0.08)', border: '1px solid rgba(124,92,252,0.15)', borderRadius: '0px', fontSize: 11, color: 'var(--text-2)' }}>
            Census tract median home value: <span style={{ color: 'var(--acid-yellow)', fontWeight: 600 }}>${realData.censusData.medianHomeValueUSD?.toLocaleString()}</span>
            {realData.censusData.medianGrossRentUSD && <span> · Median rent: <span style={{ color: 'var(--acid-yellow)', fontWeight: 600 }}>${realData.censusData.medianGrossRentUSD?.toLocaleString()}/mo</span></span>}
            <span style={{ color: 'var(--text-3)', marginLeft: 8 }}>· US Census ACS 2022</span>
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <Tag>Confidence: {propertyEstimate.confidenceLevel}</Tag>
          <p style={{ fontSize: 13, color: 'var(--text-2)', flex: 1, minWidth: 200 }}>{propertyEstimate.priceContext}</p>
        </div>
      </SectionCard>

      {/* Cost of Living */}
      <SectionCard title="Cost of Living" icon="💰" delay={100}>
        <IncomeSlider costOfLiving={costOfLiving} />
      </SectionCard>

      {/* Neighborhood + Climate */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(280px, 100%), 1fr))', gap: 16 }}>

        <SectionCard title="Neighborhood" icon="🏘" delay={150}>
          <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: 12 }}>
            <ScoreRing score={realData?.neighborhoodScores?.walkScore ?? neighborhood.walkScore} label="Walk" color="var(--neon-pink)" />
            <ScoreRing score={realData?.neighborhoodScores?.transitScore ?? neighborhood.transitScore} label="Transit" color="var(--acid-yellow)" />
            <ScoreRing score={neighborhood.safetyRating} label="Safety" color="var(--green)" />
            <ScoreRing score={realData?.neighborhoodScores?.schoolScore ?? neighborhood.schoolRating} label="Schools" color="#c07ada" />
          </div>
          {realData?.neighborhoodScores && (
            <div style={{ textAlign: 'center', fontSize: 10, color: 'var(--text-3)', marginBottom: 14, letterSpacing: '0.06em' }}>
              WALK · TRANSIT · SCHOOL SCORES FROM OPENSTREETMAP REAL DATA
            </div>
          )}
          <p style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 14 }}>{neighborhood.character}</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
            {neighborhood.pros.map((p, i) => <Tag key={i} color="green">+ {p}</Tag>)}
            {neighborhood.cons.map((c, i) => <Tag key={i} color="red">− {c}</Tag>)}
          </div>
          <div style={{ fontSize: 13 }}>
            <span style={{ color: 'var(--text-2)' }}>Best for: </span>
            <span style={{ color: 'var(--text)', fontWeight: 500 }}>{neighborhood.bestFor}</span>
          </div>
        </SectionCard>

        <SectionCard title="Climate" icon="🌤" delay={200}>
          {climate && (
            <>
              <BarMeter label="Avg High" value={`${climate.avgHighC}°C`} max={50} color="var(--neon-pink)" />
              <BarMeter label="Avg Low" value={`${climate.avgLowC}°C`} max={50} color="var(--acid-yellow)" />
              <BarMeter label="Avg Daily Precip" value={`${climate.avgPrecipMm}mm`} max={20} color="var(--green)" />
            </>
          )}
          {weather?.daily && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>7-day forecast</div>
              <div style={{ display: 'flex', gap: 6, overflowX: 'auto' }}>
                {weather.daily.time.slice(0, 7).map((day, i) => {
                  const date = new Date(day)
                  const label = i === 0 ? 'Today' : date.toLocaleDateString('en', { weekday: 'short' })
                  return (
                    <div key={i} style={{
                      flex: '0 0 auto',
                      textAlign: 'center',
                      padding: '8px 10px',
                      background: i === 0 ? 'rgba(255,45,120,0.15)' : 'rgba(255,255,255,0.04)',
                      borderRadius: '0px',
                      minWidth: 50,
                    }}>
                      <div style={{ fontSize: 11, color: i === 0 ? 'var(--neon-pink)' : 'var(--text-2)', marginBottom: 4 }}>{label}</div>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{Math.round(weather.daily.temperature_2m_max[i])}°</div>
                      <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{Math.round(weather.daily.temperature_2m_min[i])}°</div>
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
          <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 6 }}>Architectural style</div>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 18, fontStyle: 'italic', color: 'var(--neon-pink)' }}>{floorPlan.architecturalStyle}</div>
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 16 }}>{floorPlan.typicalLayout}</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 20 }}>
          {floorPlan.commonFeatures.map((f, i) => (
            <span key={i} style={{
              padding: '4px 12px',
              background: 'rgba(0,0,0,0.4)',
              border: '2px solid rgba(255,255,255,0.2)',
              borderRadius: 0,
              fontSize: 12,
              color: 'var(--text-2)',
            }}>{f}</span>
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
        <SectionCard title="Flood Risk" icon="🌊" delay={280} className="fade-up">
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <div style={{
              padding: '10px 20px',
              background: realData.floodZone.riskLevel === 'high' ? 'var(--red-dim)' : realData.floodZone.riskLevel === 'moderate' ? 'rgba(251,191,36,0.1)' : 'var(--green-dim)',
              border: '1px solid ' + (realData.floodZone.riskLevel === 'high' ? 'rgba(248,113,113,0.3)' : realData.floodZone.riskLevel === 'moderate' ? 'rgba(251,191,36,0.3)' : 'rgba(52,211,153,0.3)'),
              borderRadius: '0px',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>FEMA Zone</div>
              <div style={{ fontSize: 28, fontWeight: 800, fontFamily: 'Syne, sans-serif', color: realData.floodZone.riskLevel === 'high' ? 'var(--red)' : realData.floodZone.riskLevel === 'moderate' ? 'var(--amber)' : 'var(--green)' }}>
                {realData.floodZone.zone}
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>{realData.floodZone.description}</div>
              <div style={{ fontSize: 12, color: 'var(--text-2)' }}>
                {realData.floodZone.inSpecialFloodHazardArea
                  ? 'This property is in a Special Flood Hazard Area. Flood insurance is typically required.'
                  : 'This property is not in a Special Flood Hazard Area. Standard insurance applies.'}
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 6 }}>Source: FEMA National Flood Hazard Layer</div>
            </div>
          </div>
        </SectionCard>
      )}

      {/* Investment */}
      <SectionCard title="Investment Analysis" icon="📈" delay={300}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 16 }}>
          <StatCard label="Rent Yield" value={`${investment.rentYieldPercent}%`} sub="annual gross" accent="var(--green)" />
          <StatCard label="Investment Score" value={`${investment.investmentScore}/100`} />
          <div style={{ background: 'rgba(0,0,0,0.4)', border: '2px solid rgba(255,255,255,0.2)', borderRadius: '0px', padding: '16px 18px' }}>
            <div style={{ fontSize: 11, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Outlook</div>
            <Tag color={investment.appreciationOutlook === 'bullish' ? 'green' : investment.appreciationOutlook === 'bearish' ? 'red' : 'var(--neon-pink)'}>
              {investment.appreciationOutlook.toUpperCase()}
            </Tag>
          </div>
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 8 }}>{investment.appreciationOutlookText}</p>
        <p style={{ fontSize: 13, color: 'var(--text-2)' }}>{investment.investmentSummary}</p>
      </SectionCard>

      {/* Local Insights */}
      <SectionCard title="Local Insights" icon="🗺" delay={350}>
        <p style={{ fontSize: 14, color: 'var(--text)', marginBottom: 16, fontStyle: 'italic', fontFamily: "'Space Mono', monospace" }}>
          "{localInsights.knownFor}"
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Top Attractions</div>
            {localInsights.topAttractions.map((a, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                <span style={{ color: 'var(--neon-pink)', fontSize: 11, fontWeight: 500 }}>{String(i + 1).padStart(2, '0')}</span>
                {a}
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ padding: '14px 16px', background: 'rgba(255,45,120,0.15)', borderRadius: '0px', borderLeft: '3px solid var(--accent)' }}>
              <div style={{ fontSize: 11, color: 'var(--neon-pink)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Local tip</div>
              <p style={{ fontSize: 13, color: 'var(--text)' }}>{localInsights.localTip}</p>
            </div>
            {localInsights.languageNote && (
              <div style={{ padding: '14px 16px', background: 'rgba(185,138,255,0.1)', borderRadius: '0px', borderLeft: '3px solid var(--blue)' }}>
                <div style={{ fontSize: 11, color: 'var(--acid-yellow)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Language</div>
                <p style={{ fontSize: 13, color: 'var(--text)' }}>{localInsights.languageNote}</p>
              </div>
            )}
          </div>
        </div>
      </SectionCard>

      <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-3)', padding: '8px 0' }}>
        All property estimates and scores are AI-generated approximations for informational purposes only. Not financial or legal advice.
      </p>
    </div>
  )
}
