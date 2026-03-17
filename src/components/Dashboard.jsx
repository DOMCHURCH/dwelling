import { useState } from 'react'
import SectionCard from './SectionCard'
import StatCard from './StatCard'
import ScoreRing from './ScoreRing'
import { weatherCodeToDescription } from '../lib/weather'

const fmt = (n) => n?.toLocaleString('en-US', { maximumFractionDigits: 0 }) ?? '—'
const fmtUSD = (n) => n != null ? `$${fmt(n)}` : '—'
const pct = (n) => n != null ? `${Math.round(n)}%` : '—'

function Tag({ children, color = 'var(--accent)' }) {
  return (
    <span style={{
      display: 'inline-block',
      padding: '3px 10px',
      borderRadius: 20,
      fontSize: 12,
      background: color === 'green' ? 'var(--green-dim)' : color === 'red' ? 'var(--red-dim)' : 'var(--accent-dim)',
      color: color === 'green' ? 'var(--green)' : color === 'red' ? 'var(--red)' : 'var(--accent)',
      fontWeight: 500,
    }}>
      {children}
    </span>
  )
}

function BarMeter({ label, value, max, color = 'var(--accent)' }) {
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
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid var(--border-active)',
        borderRadius: 'var(--radius-sm)',
        color: 'var(--accent)',
        fontSize: 13,
        fontWeight: 500,
        textDecoration: 'none',
        transition: 'background 0.15s',
      }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--accent-dim)'}
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
  const remainingPct = Math.round((remaining / monthlyIncome) * 100)
  const totalPct = Math.round((total / monthlyIncome) * 100)

  const toggleMode = (m) => {
    setMode(m)
    setIncome(m === 'monthly' ? 5000 : 60000)
  }

  return (
    <div>
      {/* Toggle */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 20, border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden', width: 'fit-content' }}>
        {['monthly', 'yearly'].map(m => (
          <button
            key={m}
            onClick={() => toggleMode(m)}
            style={{
              padding: '7px 18px',
              background: mode === m ? 'var(--accent)' : 'transparent',
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
          <span style={{ color: 'var(--accent)', fontWeight: 500, fontFamily: "'Playfair Display', serif", fontSize: 18 }}>
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
          style={{ width: '100%', accentColor: 'var(--accent)' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>
          <span>{fmtUSD(mode === 'monthly' ? 1000 : 12000)}</span>
          <span>{fmtUSD(mode === 'monthly' ? 30000 : 360000)}</span>
        </div>
      </div>

      {/* Income breakdown bar */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ height: 10, borderRadius: 5, overflow: 'hidden', background: 'var(--glass-border)', display: 'flex' }}>
          <div style={{ width: `${Math.min(totalPct, 100)}%`, background: totalPct > 80 ? 'var(--red)' : totalPct > 50 ? 'var(--accent)' : 'var(--green)', transition: 'width 0.4s ease' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginTop: 6 }}>
          <span style={{ color: 'var(--text-2)' }}>
            Cost of living: <span style={{ color: totalPct > 80 ? 'var(--red)' : 'var(--text)', fontWeight: 500 }}>{totalPct}% of income</span>
          </span>
          <span style={{ color: remaining >= 0 ? 'var(--green)' : 'var(--red)', fontWeight: 500 }}>
            {remaining >= 0 ? `${fmtUSD(remaining)} left` : `${fmtUSD(Math.abs(remaining))} over budget`}
          </span>
        </div>
      </div>

      {/* Category breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 32px', marginBottom: 16 }}>
        {categories.map(({ label, value }) => {
          const catPct = Math.round((value / monthlyIncome) * 100)
          return (
            <div key={label} style={{ padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 3 }}>
                <span style={{ color: 'var(--text-2)' }}>{label}</span>
                <span style={{ fontWeight: 500 }}>{fmtUSD(value)}</span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{catPct}% of {mode} income</div>
            </div>
          )
        })}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
        <StatCard label="Monthly cost" value={fmtUSD(total)} sub="estimated total" />
        <StatCard label="vs US Average" value={`${costOfLiving.indexVsUSAverage > 0 ? '+' : ''}${costOfLiving.indexVsUSAverage}%`}
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
      background: "rgba(255,255,255,0.025)", border: "1px solid var(--border)",
      borderRadius: "var(--radius-lg)", padding: "16px 20px", marginBottom: 16,
    }}>
      <button onClick={() => setOpen(!open)} style={{
        background: "none", border: "none", color: "var(--accent)",
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
            padding: "10px 24px", background: "var(--accent)", border: "none",
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
  const { geo, weather, climate, ai, knownFacts } = data
  const { propertyEstimate, costOfLiving, neighborhood, investment, floorPlan, localInsights } = ai

  const currentWeather = weather?.current
  const tempC = currentWeather?.temperature_2m
  const tempF = tempC != null ? Math.round(tempC * 9 / 5 + 32) : null
  const weatherDesc = currentWeather ? weatherCodeToDescription(currentWeather.weather_code) : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Address Banner */}
      <div className="fade-up" style={{
        background: 'rgba(255,255,255,0.025)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: '20px 24px',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
      }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--accent-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 1C5.24 1 3 3.24 3 6c0 3.75 5 9 5 9s5-5.25 5-9c0-2.76-2.24-5-5-5zm0 6.75A1.75 1.75 0 1 1 8 4.25a1.75 1.75 0 0 1 0 3.5z" fill="var(--accent)" />
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
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 20 }}>
              {tempC}°C
              <span style={{ fontSize: 13, color: 'var(--text-3)', marginLeft: 6 }}>/ {tempF}°F</span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-2)' }}>{weatherDesc}</div>
          </div>
        )}
      </div>

      {/* Google Maps Embed */}
      <div className="fade-up" style={{
        background: 'rgba(255,255,255,0.025)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        height: 280,
      }}>
        <iframe
          title="Property Location"
          width="100%"
          height="100%"
          style={{ border: 0, display: 'block' }}
          loading="lazy"
          allowFullScreen
          src={`https://maps.google.com/maps?q=${encodeURIComponent([geo.userStreet, geo.userCity, geo.userState, geo.userCountry].filter(Boolean).join(', '))}&output=embed&z=16`}
        />
      </div>

      <CorrectionsPanel ai={ai} knownFacts={knownFacts} onRecalculate={onRecalculate} />

      {/* Property Estimate */}
      <SectionCard title="Property Estimate" icon="🏠" delay={50}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 16 }}>
          <StatCard label="Est. Value" value={fmtUSD(propertyEstimate.estimatedValueUSD)} sub="market estimate" accent="var(--accent)" />
          <StatCard label="Price / sqft" value={fmtUSD(propertyEstimate.pricePerSqftUSD)} sub="avg for area" />
          <StatCard label="Rent / month" value={fmtUSD(propertyEstimate.rentEstimateMonthlyUSD)} sub="typical rental" accent="var(--green)" />
        </div>
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>

        <SectionCard title="Neighborhood" icon="🏘" delay={150}>
          <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: 20 }}>
            <ScoreRing score={neighborhood.walkScore} label="Walk" color="var(--accent)" />
            <ScoreRing score={neighborhood.transitScore} label="Transit" color="var(--accent-2)" />
            <ScoreRing score={neighborhood.safetyRating} label="Safety" color="var(--green)" />
            <ScoreRing score={neighborhood.schoolRating} label="Schools" color="#c07ada" />
          </div>
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
              <BarMeter label="Avg High" value={`${climate.avgHighC}°C`} max={50} color="var(--accent)" />
              <BarMeter label="Avg Low" value={`${climate.avgLowC}°C`} max={50} color="var(--accent-2)" />
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
                      background: i === 0 ? 'var(--accent-dim)' : 'rgba(255,255,255,0.04)',
                      borderRadius: 'var(--radius-sm)',
                      minWidth: 50,
                    }}>
                      <div style={{ fontSize: 11, color: i === 0 ? 'var(--accent)' : 'var(--text-2)', marginBottom: 4 }}>{label}</div>
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
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontStyle: 'italic', color: 'var(--accent)' }}>{floorPlan.architecturalStyle}</div>
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 16 }}>{floorPlan.typicalLayout}</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 20 }}>
          {floorPlan.commonFeatures.map((f, i) => (
            <span key={i} style={{
              padding: '4px 12px',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid var(--border)',
              borderRadius: 20,
              fontSize: 12,
              color: 'var(--text-2)',
            }}>{f}</span>
          ))}
        </div>


      </SectionCard>

      {/* Investment */}
      <SectionCard title="Investment Analysis" icon="📈" delay={300}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 16 }}>
          <StatCard label="Rent Yield" value={`${investment.rentYieldPercent}%`} sub="annual gross" accent="var(--green)" />
          <StatCard label="Investment Score" value={`${investment.investmentScore}/100`} />
          <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '16px 18px' }}>
            <div style={{ fontSize: 11, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Outlook</div>
            <Tag color={investment.appreciationOutlook === 'bullish' ? 'green' : investment.appreciationOutlook === 'bearish' ? 'red' : 'var(--accent)'}>
              {investment.appreciationOutlook.toUpperCase()}
            </Tag>
          </div>
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 8 }}>{investment.appreciationOutlookText}</p>
        <p style={{ fontSize: 13, color: 'var(--text-2)' }}>{investment.investmentSummary}</p>
      </SectionCard>

      {/* Local Insights */}
      <SectionCard title="Local Insights" icon="🗺" delay={350}>
        <p style={{ fontSize: 14, color: 'var(--text)', marginBottom: 16, fontStyle: 'italic', fontFamily: "'Playfair Display', serif" }}>
          "{localInsights.knownFor}"
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Top Attractions</div>
            {localInsights.topAttractions.map((a, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                <span style={{ color: 'var(--accent)', fontSize: 11, fontWeight: 500 }}>{String(i + 1).padStart(2, '0')}</span>
                {a}
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ padding: '14px 16px', background: 'var(--accent-dim)', borderRadius: 'var(--radius)', borderLeft: '3px solid var(--accent)' }}>
              <div style={{ fontSize: 11, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Local tip</div>
              <p style={{ fontSize: 13, color: 'var(--text)' }}>{localInsights.localTip}</p>
            </div>
            {localInsights.languageNote && (
              <div style={{ padding: '14px 16px', background: 'rgba(185,138,255,0.1)', borderRadius: 'var(--radius)', borderLeft: '3px solid var(--blue)' }}>
                <div style={{ fontSize: 11, color: 'var(--accent-2)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Language</div>
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
