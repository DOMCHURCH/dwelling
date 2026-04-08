import { useState, useEffect, useRef } from 'react'

const CITY_PRICES = {
  'Ottawa': 620000, 'Toronto': 1080000, 'Vancouver': 1320000,
  'Calgary': 630000, 'Edmonton': 430000, 'Montreal': 540000,
  'Hamilton': 710000, 'Waterloo': 700000, 'Victoria': 880000,
  'Halifax': 530000, 'Winnipeg': 360000, 'Saskatoon': 360000,
}

export default function MortgageCalculator({ activeCity }) {
  const [income, setIncome] = useState(120000)
  const [downPct, setDownPct] = useState(20)
  const [rate, setRate] = useState(5.5)
  const matchCity = activeCity ? Object.keys(CITY_PRICES).find(c => activeCity.toLowerCase().includes(c.toLowerCase())) : null
  const [city, setCity] = useState(matchCity || 'Ottawa')
  const prevActiveCity = useRef(activeCity)
  useEffect(() => {
    if (activeCity && activeCity !== prevActiveCity.current) {
      const match = Object.keys(CITY_PRICES).find(c => activeCity.toLowerCase().includes(c.toLowerCase()))
      if (match) setCity(match)
      prevActiveCity.current = activeCity
    }
  }, [activeCity])

  const medianPrice = CITY_PRICES[city] || 600000
  const downPayment = medianPrice * (downPct / 100)
  const principal = medianPrice - downPayment
  const stressRate = Math.max(rate + 2, 5.25) / 100 / 12
  const months = 25 * 12
  const monthlyPayment = principal * (stressRate * Math.pow(1 + stressRate, months)) / (Math.pow(1 + stressRate, months) - 1)
  const maxAffordableMonthly = (income / 12) * 0.32
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
