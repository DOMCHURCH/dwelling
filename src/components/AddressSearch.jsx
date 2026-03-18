import { useState } from 'react'

const inputStyle = {
  width: '100%',
  padding: '14px 16px',
  background: 'var(--obsidian)',
  border: '2px solid var(--white)',
  color: 'var(--white)',
  fontSize: 14,
  outline: 'none',
  fontFamily: "'Space Mono', monospace",
  transition: 'border-color 0.1s, box-shadow 0.1s',
  borderRadius: 0,
}

const labelStyle = {
  display: 'block',
  fontSize: 10,
  color: 'var(--text-3)',
  textTransform: 'uppercase',
  letterSpacing: '0.15em',
  marginBottom: 6,
  fontFamily: "'Space Mono', monospace",
}

export default function AddressSearch({ onSearch, loading, compact }) {
  const [street, setStreet] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [country, setCountry] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!street.trim() || !city.trim() || !country.trim()) return
    onSearch({ street: street.trim(), city: city.trim(), state: state.trim(), country: country.trim(), knownFacts: {} })
  }

  const isValid = street.trim() && city.trim() && country.trim()
  const focus = e => { e.target.style.borderColor = 'var(--neon-pink)'; e.target.style.boxShadow = '0 0 0 3px rgba(255,45,120,0.2)' }
  const blur = e => { e.target.style.borderColor = 'var(--white)'; e.target.style.boxShadow = 'none' }

  if (compact) {
    return (
      <form onSubmit={handleSubmit}>
        <div style={{
          display: 'flex', gap: 8, flexWrap: 'wrap',
          border: '2px solid var(--white)',
          padding: '12px',
          background: 'var(--emerald-dark)',
        }}>
          {[
            { val: street, set: setStreet, ph: 'Street address', flex: 2 },
            { val: city, set: setCity, ph: 'City', flex: 1 },
            { val: state, set: setState, ph: 'State/Province', flex: 1 },
            { val: country, set: setCountry, ph: 'Country', flex: 1 },
          ].map(({ val, set, ph, flex }) => (
            <input key={ph} value={val} onChange={e => set(e.target.value)}
              placeholder={ph} disabled={loading}
              style={{ ...inputStyle, flex, minWidth: 100, fontSize: 13, padding: '10px 12px' }}
              onFocus={focus} onBlur={blur} />
          ))}
          <button type="submit" disabled={loading || !isValid} style={{
            padding: '10px 20px',
            background: isValid && !loading ? 'var(--neon-pink)' : 'rgba(255,255,255,0.1)',
            border: '2px solid ' + (isValid && !loading ? 'var(--neon-pink)' : 'var(--text-3)'),
            color: isValid && !loading ? 'var(--white)' : 'var(--text-3)',
            fontFamily: "'Space Mono', monospace",
            fontSize: 11, fontWeight: 700,
            cursor: loading || !isValid ? 'not-allowed' : 'crosshair',
            textTransform: 'uppercase', letterSpacing: '0.1em',
            transition: 'all 0.1s',
            whiteSpace: 'nowrap',
          }}>
            {loading ? 'Analyzing...' : 'Search →'}
          </button>
        </div>
      </form>
    )
  }

  return (
    <form onSubmit={handleSubmit}>
      <div style={{
        border: '2px solid var(--white)',
        padding: '24px',
        background: 'rgba(0,0,0,0.4)',
        boxShadow: '6px 6px 0px var(--acid-yellow)',
        position: 'relative',
      }}>
        {/* Corner label */}
        <div style={{
          position: 'absolute', top: -14, left: 20,
          background: 'var(--neon-pink)',
          padding: '2px 12px',
          fontFamily: "'Space Mono', monospace",
          fontSize: 10, fontWeight: 700,
          color: 'var(--white)',
          textTransform: 'uppercase',
          letterSpacing: '0.15em',
        }}>Enter Address</div>

        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>Street address</label>
          <input value={street} onChange={e => setStreet(e.target.value)}
            placeholder="e.g. 123 Maple Street" disabled={loading}
            style={inputStyle} onFocus={focus} onBlur={blur} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div>
            <label style={labelStyle}>City</label>
            <input value={city} onChange={e => setCity(e.target.value)}
              placeholder="e.g. Austin" disabled={loading}
              style={inputStyle} onFocus={focus} onBlur={blur} />
          </div>
          <div>
            <label style={labelStyle}>State / Province <span style={{ opacity: 0.4 }}>(optional)</span></label>
            <input value={state} onChange={e => setState(e.target.value)}
              placeholder="e.g. Texas" disabled={loading}
              style={inputStyle} onFocus={focus} onBlur={blur} />
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>Country</label>
          <input value={country} onChange={e => setCountry(e.target.value)}
            placeholder="e.g. United States" disabled={loading}
            style={inputStyle} onFocus={focus} onBlur={blur} />
        </div>

        <button type="submit" disabled={loading || !isValid} style={{
          width: '100%', padding: '16px',
          background: isValid && !loading ? 'var(--neon-pink)' : 'rgba(255,255,255,0.05)',
          border: '2px solid ' + (isValid && !loading ? 'var(--neon-pink)' : 'rgba(255,255,255,0.2)'),
          color: isValid && !loading ? 'var(--white)' : 'var(--text-3)',
          fontFamily: "'Space Mono', monospace",
          fontWeight: 700, fontSize: 14,
          cursor: loading || !isValid ? 'not-allowed' : 'crosshair',
          textTransform: 'uppercase', letterSpacing: '0.15em',
          transition: 'all 0.1s',
          boxShadow: isValid && !loading ? '4px 4px 0px var(--acid-yellow)' : 'none',
        }}
          onMouseEnter={e => { if (isValid && !loading) { e.currentTarget.style.transform = 'translate(-2px,-2px)'; e.currentTarget.style.boxShadow = '6px 6px 0px var(--acid-yellow)' }}}
          onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = isValid && !loading ? '4px 4px 0px var(--acid-yellow)' : 'none' }}
          onMouseDown={e => { e.currentTarget.style.transform = 'translate(2px,2px)'; e.currentTarget.style.boxShadow = '2px 2px 0px var(--acid-yellow)' }}
          onMouseUp={e => { e.currentTarget.style.transform = 'translate(-2px,-2px)'; e.currentTarget.style.boxShadow = '6px 6px 0px var(--acid-yellow)' }}
        >
          {loading ? '⟳ Analyzing...' : '→ Analyze Property'}
        </button>
      </div>
    </form>
  )
}
