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

// Canada-only pilot — country is hardcoded, not user-entered
export default function AddressSearch({ onSearch, loading, compact }) {
  const [city, setCity]   = useState('')
  const [province, setProvince] = useState('')

  const submit = (e) => {
    e.preventDefault()
    if (!city.trim()) return
    onSearch({ street: '', city: city.trim(), state: province.trim(), country: 'Canada', knownFacts: {} })
  }

  const valid = city.trim()
  const focus = e => { e.target.style.borderColor = 'rgba(255,255,255,0.3)'; e.target.style.background = 'rgba(255,255,255,0.08)' }
  const blur  = e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)';  e.target.style.background = 'rgba(255,255,255,0.05)' }

  const canadaFlag = (
    <span style={{ background: 'rgba(220,38,38,0.15)', border: '1px solid rgba(220,38,38,0.25)', borderRadius: 20, padding: '3px 10px', fontSize: 11, color: 'rgba(255,100,100,0.8)', fontFamily: "'Barlow',sans-serif", fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
      🍁 Canada only
    </span>
  )

  if (compact) return (
    <form onSubmit={submit}>
      <div className="liquid-glass" style={{ borderRadius: 16, padding: 12, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <input value={city} onChange={e => setCity(e.target.value)}
          placeholder="City — e.g. Ottawa, Calgary, Vancouver" disabled={loading}
          style={{ ...inputStyle, flex: 2, minWidth: 160, fontSize: 13, padding: '10px 12px' }} onFocus={focus} onBlur={blur} />
        <input value={province} onChange={e => setProvince(e.target.value)}
          placeholder="Province (optional)" disabled={loading}
          style={{ ...inputStyle, flex: 1, minWidth: 120, fontSize: 13, padding: '10px 12px' }} onFocus={focus} onBlur={blur} />
        <button type="submit" disabled={loading || !valid} style={{ ...btn(valid, loading), padding: '10px 20px', fontSize: 13, whiteSpace: 'nowrap' }}
          onMouseEnter={hover} onMouseLeave={unhover}>
          {loading ? 'Analyzing...' : 'Search →'}
        </button>
      </div>
    </form>
  )

  return (
    <form onSubmit={submit}>
      <div className="liquid-glass-strong" style={{ borderRadius: 20, padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <label style={{ display: 'block', fontSize: 11, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: "'Barlow',sans-serif" }}>
            City *
          </label>
          {canadaFlag}
        </div>
        <input value={city} onChange={e => setCity(e.target.value)}
          placeholder="e.g. Ottawa  or  Calgary  or  Vancouver"
          disabled={loading} style={{ ...inputStyle, marginBottom: 12 }} onFocus={focus} onBlur={blur} />
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 11, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6, fontFamily: "'Barlow',sans-serif" }}>
            Province <span style={{ opacity: 0.5 }}>(optional — helps narrow results)</span>
          </label>
          <input value={province} onChange={e => setProvince(e.target.value)}
            placeholder="e.g. Ontario  or  British Columbia  or  Alberta"
            disabled={loading} style={inputStyle} onFocus={focus} onBlur={blur} />
        </div>
        <button type="submit" disabled={loading || !valid}
          style={{ ...btn(valid, loading), width: '100%', padding: '14px', fontSize: 15 }}
          onMouseEnter={hover} onMouseLeave={unhover}>
          {loading ? '⟳ Analyzing...' : '→ Analyze City'}
        </button>
      </div>
    </form>
  )
}
