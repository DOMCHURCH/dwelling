import SectionCard from './SectionCard'
import StatCard from './StatCard'
import ScoreRing from './ScoreRing'
import { weatherCodeToDescription } from '../lib/weather'

const fmt = (n) => n?.toLocaleString('en-US', { maximumFractionDigits: 0 }) ?? '—'
const fmtUSD = (n) => n != null ? `$${fmt(n)}` : '—'

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
  const pct = Math.min((value / max) * 100, 100)
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 5 }}>
        <span style={{ color: 'var(--muted)' }}>{label}</span>
        <span style={{ color: 'var(--text)', fontWeight: 500 }}>{value}</span>
      </div>
      <div style={{ height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 2, transition: 'width 1s ease' }} />
      </div>
    </div>
  )
}

export default function Dashboard({ data }) {
  const { geo, weather, climate, ai } = data
  const { propertyEstimate, costOfLiving, neighborhood, investment, floorPlan, localInsights } = ai

  const currentWeather = weather?.current
  const tempC = currentWeather?.temperature_2m
  const tempF = tempC != null ? Math.round(tempC * 9/5 + 32) : null
  const weatherDesc = currentWeather ? weatherCodeToDescription(currentWeather.weather_code) : null

  const outlookColor = investment.appreciationOutlook === 'bullish' ? 'green' :
                       investment.appreciationOutlook === 'bearish' ? 'red' : 'var(--accent)'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Address Banner */}
      <div className="fade-up" style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: '20px 24px',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
      }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--accent-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 1C5.24 1 3 3.24 3 6c0 3.75 5 9 5 9s5-5.25 5-9c0-2.76-2.24-5-5-5zm0 6.75A1.75 1.75 0 1 1 8 4.25a1.75 1.75 0 0 1 0 3.5z" fill="var(--accent)"/>
          </svg>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 500, fontSize: 15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {geo.displayName.split(',')[0]}
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {geo.displayName}
          </div>
        </div>
        {weatherDesc && (
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 20 }}>
              {tempC}°C
              <span style={{ fontSize: 13, color: 'var(--hint)', marginLeft: 6 }}>/ {tempF}°F</span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>{weatherDesc}</div>
          </div>
        )}
      </div>

      {/* Property Estimate */}
      <SectionCard title="Property Estimate" icon="🏠" delay={50}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 16 }}>
          <StatCard label="Est. Value" value={fmtUSD(propertyEstimate.estimatedValueUSD)} sub="market estimate" accent="var(--accent)" />
          <StatCard label="Price / sqft" value={fmtUSD(propertyEstimate.pricePerSqftUSD)} sub="avg for area" />
          <StatCard label="Rent / month" value={fmtUSD(propertyEstimate.rentEstimateMonthlyUSD)} sub="typical rental" accent="var(--green)" />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <Tag>Confidence: {propertyEstimate.confidenceLevel}</Tag>
          <p style={{ fontSize: 13, color: 'var(--muted)', flex: 1, minWidth: 200 }}>{propertyEstimate.priceContext}</p>
        </div>
      </SectionCard>

      {/* Cost of Living */}
      <SectionCard title="Cost of Living" icon="💰" delay={100}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 16 }}>
          <StatCard label="Monthly Budget" value={fmtUSD(costOfLiving.monthlyBudgetUSD)} sub="single person" />
          <StatCard label="vs US Average" value={`${costOfLiving.indexVsUSAverage > 0 ? '+' : ''}${costOfLiving.indexVsUSAverage}%`}
            accent={costOfLiving.indexVsUSAverage > 15 ? 'var(--red)' : costOfLiving.indexVsUSAverage < -15 ? 'var(--green)' : 'var(--text)'} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 32px', marginBottom: 16 }}>
          {[
            ['Groceries', fmtUSD(costOfLiving.groceriesMonthlyUSD)],
            ['Transport', fmtUSD(costOfLiving.transportMonthlyUSD)],
            ['Utilities', fmtUSD(costOfLiving.utilitiesMonthlyUSD)],
            ['Dining out', fmtUSD(costOfLiving.diningOutMonthlyUSD)],
          ].map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 14 }}>
              <span style={{ color: 'var(--muted)' }}>{k}</span>
              <span style={{ fontWeight: 500 }}>{v}</span>
            </div>
          ))}
        </div>
        <p style={{ fontSize: 13, color: 'var(--muted)' }}>{costOfLiving.summary}</p>
      </SectionCard>

      {/* Neighborhood + Climate side by side */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>

        {/* Neighborhood */}
        <SectionCard title="Neighborhood" icon="🏘" delay={150}>
          <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: 20 }}>
            <ScoreRing score={neighborhood.walkScore} label="Walk" color="var(--accent)" />
            <ScoreRing score={neighborhood.transitScore} label="Transit" color="var(--blue)" />
            <ScoreRing score={neighborhood.safetyRating * 10} label="Safety" color="var(--green)" />
            <ScoreRing score={neighborhood.schoolRating * 10} label="Schools" color="#c07ada" />
          </div>
          <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 14 }}>{neighborhood.character}</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
            {neighborhood.pros.map((p, i) => <Tag key={i} color="green">+ {p}</Tag>)}
            {neighborhood.cons.map((c, i) => <Tag key={i} color="red">− {c}</Tag>)}
          </div>
          <div style={{ fontSize: 13 }}>
            <span style={{ color: 'var(--muted)' }}>Best for: </span>
            <span style={{ color: 'var(--text)', fontWeight: 500 }}>{neighborhood.bestFor}</span>
          </div>
        </SectionCard>

        {/* Climate */}
        <SectionCard title="Climate" icon="🌤" delay={200}>
          {climate && (
            <>
              <BarMeter label="Avg High" value={`${climate.avgHighC}°C`} max={50} color="var(--accent)" />
              <BarMeter label="Avg Low" value={`${climate.avgLowC}°C`} max={50} color="var(--blue)" />
              <BarMeter label="Avg Daily Precip" value={`${climate.avgPrecipMm}mm`} max={20} color="var(--green)" />
            </>
          )}
          {weather?.daily && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 11, color: 'var(--hint)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>7-day forecast</div>
              <div style={{ display: 'flex', gap: 6, overflowX: 'auto' }}>
                {weather.daily.time.slice(0, 7).map((day, i) => {
                  const date = new Date(day)
                  const label = i === 0 ? 'Today' : date.toLocaleDateString('en', { weekday: 'short' })
                  return (
                    <div key={i} style={{
                      flex: '0 0 auto',
                      textAlign: 'center',
                      padding: '8px 10px',
                      background: i === 0 ? 'var(--accent-dim)' : 'var(--bg-input)',
                      borderRadius: 'var(--radius-sm)',
                      minWidth: 50,
                    }}>
                      <div style={{ fontSize: 11, color: i === 0 ? 'var(--accent)' : 'var(--muted)', marginBottom: 4 }}>{label}</div>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{Math.round(weather.daily.temperature_2m_max[i])}°</div>
                      <div style={{ fontSize: 11, color: 'var(--hint)' }}>{Math.round(weather.daily.temperature_2m_min[i])}°</div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </SectionCard>
      </div>

      {/* Floor Plan */}
      <SectionCard title="Typical Floor Plan & Architecture" icon="📐" delay={250}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12, marginBottom: 16 }}>
          <StatCard label="Typical Size" value={`${fmt(floorPlan.typicalSqft)} sqft`} />
          <StatCard label="Bedrooms" value={floorPlan.typicalBedrooms} />
          <StatCard label="Bathrooms" value={floorPlan.typicalBathrooms} />
          <StatCard label="Built Era" value={floorPlan.builtEra} />
        </div>
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>Architectural style</div>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontStyle: 'italic', color: 'var(--accent)' }}>{floorPlan.architecturalStyle}</div>
        </div>
        <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 14 }}>{floorPlan.typicalLayout}</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {floorPlan.commonFeatures.map((f, i) => (
            <span key={i} style={{
              padding: '4px 12px',
              background: 'var(--bg-input)',
              border: '1px solid var(--border)',
              borderRadius: 20,
              fontSize: 12,
              color: 'var(--muted)',
            }}>{f}</span>
          ))}
        </div>
      </SectionCard>

      {/* Investment */}
      <SectionCard title="Investment Analysis" icon="📈" delay={300}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 16 }}>
          <StatCard label="Rent Yield" value={`${investment.rentYieldPercent}%`} sub="annual gross" accent="var(--green)" />
          <StatCard label="Investment Score" value={`${investment.investmentScore}/100`} />
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '16px 18px' }}>
            <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Outlook</div>
            <Tag color={investment.appreciationOutlook === 'bullish' ? 'green' : investment.appreciationOutlook === 'bearish' ? 'red' : 'var(--accent)'}>
              {investment.appreciationOutlook.toUpperCase()}
            </Tag>
          </div>
        </div>
        <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 8 }}>{investment.appreciationOutlookText}</p>
        <p style={{ fontSize: 13, color: 'var(--muted)' }}>{investment.investmentSummary}</p>
      </SectionCard>

      {/* Local Insights */}
      <SectionCard title="Local Insights" icon="🗺" delay={350}>
        <p style={{ fontSize: 14, color: 'var(--text)', marginBottom: 16, fontStyle: 'italic', fontFamily: "'Playfair Display', serif" }}>
          "{localInsights.knownFor}"
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--hint)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Top Attractions</div>
            {localInsights.topAttractions.map((a, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                <span style={{ color: 'var(--accent)', fontSize: 11, fontWeight: 500 }}>{String(i+1).padStart(2,'0')}</span>
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
              <div style={{ padding: '14px 16px', background: 'var(--blue-dim)', borderRadius: 'var(--radius)', borderLeft: '3px solid var(--blue)' }}>
                <div style={{ fontSize: 11, color: 'var(--blue)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Language</div>
                <p style={{ fontSize: 13, color: 'var(--text)' }}>{localInsights.languageNote}</p>
              </div>
            )}
          </div>
        </div>
      </SectionCard>

      {/* Footer disclaimer */}
      <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--hint)', padding: '8px 0' }}>
        All property estimates and scores are AI-generated approximations for informational purposes only. Not financial or legal advice.
      </p>
    </div>
  )
}
