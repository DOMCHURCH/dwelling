import { useState } from 'react'

const inputStyle = {
  width: '100%', padding: '12px 16px',
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 12, color: '#ffffff', fontSize: 14,
  outline: 'none', fontFamily: "'Barlow', sans-serif", fontWeight: 300,
  transition: 'border-color 0.15s, background 0.15s',
}
const btn = (valid, loading) => ({
  borderRadius: 40, border: 'none',
  cursor: valid && !loading ? 'pointer' : 'not-allowed',
  fontFamily: "'Barlow', sans-serif", fontWeight: 600,
  background: valid && !loading ? '#ffffff' : 'rgba(255,255,255,0.06)',
  color: valid && !loading ? '#000' : 'rgba(255,255,255,0.3)',
  transition: 'transform 0.15s, background 0.15s',
})
const hover = e => { e.currentTarget.style.transform = 'scale(1.02)' }
const unhover = e => { e.currentTarget.style.transform = '' }

export default function AddressSearch({ onAnalyze, onSearch, loading, compact }) {
  const [city, setCity]       = useState('')
  const [state, setState]     = useState('')
  const [country, setCountry] = useState('')

  const submit = (e) => {
    e.preventDefault()
    if (!city.trim() || !country.trim()) return
    const parts = [city.trim(), state.trim(), country.trim()].filter(Boolean)
    const addressString = parts.join(', ')
    if (onAnalyze) onAnalyze(addressString)
    else if (onSearch) onSearch({ street: '', city: city.trim(), state: state.trim(), country: country.trim(), knownFacts: {} })
  }
  const valid = city.trim() && country.trim()
  const focus = e => { e.target.style.borderColor = 'rgba(255,255,255,0.3)'; e.target.style.background = 'rgba(255,255,255,0.08)' }
  const blur  = e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)';  e.target.style.background = 'rgba(255,255,255,0.05)' }

  if (compact) return (
    <form onSubmit={submit}>
      <div className="liquid-glass" style={{ borderRadius: 16, padding: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {[
          {v:city,    s:setCity,    p:'Neighbourhood or City *', f:2},
          {v:state,   s:setState,   p:'State / Province',        f:1},
          {v:country, s:setCountry, p:'Country *',               f:1},
        ].map(({v,s,p,f}) => (
          <input key={p} value={v} onChange={e=>s(e.target.value)} placeholder={p} disabled={loading}
            style={{...inputStyle,flex:f,minWidth:100,fontSize:13,padding:'10px 12px'}} onFocus={focus} onBlur={blur} />
        ))}
        <button type="submit" disabled={loading||!valid} style={{...btn(valid,loading),padding:'10px 20px',fontSize:13,whiteSpace:'nowrap'}}
          onMouseEnter={hover} onMouseLeave={unhover}>
          {loading ? 'Analyzing...' : 'Search →'}
        </button>
      </div>
    </form>
  )

  return (
    <form onSubmit={submit}>
      <div className="liquid-glass-strong" style={{ borderRadius: 20, padding: 24 }}>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display:'block', fontSize:11, color:'rgba(255,255,255,0.4)', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:6, fontFamily:"'Barlow',sans-serif" }}>
            Neighbourhood or City *
          </label>
          <input value={city} onChange={e=>setCity(e.target.value)}
            placeholder="e.g. Playfair Park, Ottawa  or  Austin  or  Brooklyn"
            disabled={loading} style={inputStyle} onFocus={focus} onBlur={blur} />
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:16 }}>
          <div>
            <label style={{ display:'block', fontSize:11, color:'rgba(255,255,255,0.4)', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:6, fontFamily:"'Barlow',sans-serif" }}>
              State / Province <span style={{opacity:0.5}}>(optional)</span>
            </label>
            <input value={state} onChange={e=>setState(e.target.value)}
              placeholder="e.g. Texas" disabled={loading} style={inputStyle} onFocus={focus} onBlur={blur} />
          </div>
          <div>
            <label style={{ display:'block', fontSize:11, color:'rgba(255,255,255,0.4)', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:6, fontFamily:"'Barlow',sans-serif" }}>
              Country *
            </label>
            <input value={country} onChange={e=>setCountry(e.target.value)}
              placeholder="e.g. United States" disabled={loading} style={inputStyle} onFocus={focus} onBlur={blur} />
          </div>
        </div>
        <button type="submit" disabled={loading||!valid}
          style={{...btn(valid,loading),width:'100%',padding:'14px',fontSize:15}}
          onMouseEnter={hover} onMouseLeave={unhover}>
          {loading ? '⟳ Analyzing...' : '→ Analyze Area'}
        </button>
      </div>
    </form>
  )
}
