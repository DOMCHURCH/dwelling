import { useState, useEffect, useRef } from 'react'

const CITY_DATA_KEYS = ['Ottawa','Toronto','Vancouver','Calgary','Edmonton','Montreal','Hamilton','Waterloo','Victoria','Halifax','Winnipeg','Saskatoon']
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

export default function RentalCalculator({ activeCity }) {
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
  const [mgmt, setMgmt] = useState(8)
  const [vacancy, setVacancy] = useState(5)

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
  const tax = price * 0.012 / 12
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
