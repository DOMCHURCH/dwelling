import { useState } from 'react'
import { motion } from 'framer-motion'

const inputStyle = {
  width: '100%',
  padding: '12px 16px',
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 12,
  color: '#ffffff',
  fontSize: 14,
  outline: 'none',
  fontFamily: "'Barlow', sans-serif",
  fontWeight: 300,
  transition: 'border-color 0.2s, background 0.2s',
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
  const focus = e => { e.target.style.borderColor = 'rgba(255,255,255,0.3)'; e.target.style.background = 'rgba(255,255,255,0.08)' }
  const blur = e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.background = 'rgba(255,255,255,0.05)' }

  if (compact) {
    return (
      <form onSubmit={handleSubmit}>
        <div className="liquid-glass" style={{ borderRadius: 16, padding: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[
            { val: street, set: setStreet, ph: 'Street address', flex: 2 },
            { val: city, set: setCity, ph: 'City', flex: 1 },
            { val: state, set: setState, ph: 'State/Province', flex: 1 },
            { val: country, set: setCountry, ph: 'Country', flex: 1 },
          ].map(({ val, set, ph, flex }) => (
            <input
              key={ph}
              value={val}
              onChange={e => set(e.target.value)}
              placeholder={ph}
              disabled={loading}
              style={{ ...inputStyle, flex, minWidth: 100, fontSize: 13, padding: '10px 12px' }}
              onFocus={focus}
              onBlur={blur}
            />
          ))}
          <motion.button
            type="submit"
            disabled={loading || !isValid}
            whileHover={isValid && !loading ? { scale: 1.05 } : {}}
            whileTap={isValid && !loading ? { scale: 0.97 } : {}}
            style={{
              padding: '10px 20px',
              background: isValid && !loading ? '#ffffff' : 'rgba(255,255,255,0.08)',
              border: 'none',
              borderRadius: 10,
              color: isValid && !loading ? '#000' : 'rgba(255,255,255,0.3)',
              fontFamily: "'Barlow', sans-serif",
              fontSize: 13,
              fontWeight: 600,
              cursor: loading || !isValid ? 'not-allowed' : 'pointer',
              whiteSpace: 'nowrap',
              transition: 'background 0.2s, color 0.2s',
            }}
          >
            {loading ? 'Analyzing...' : 'Search →'}
          </motion.button>
        </div>
      </form>
    )
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="liquid-glass-strong" style={{ borderRadius: 20, padding: 24 }}>
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', fontSize: 11, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6, fontFamily: "'Barlow', sans-serif" }}>
            Street address
          </label>
          <input
            value={street}
            onChange={e => setStreet(e.target.value)}
            placeholder="e.g. 123 Maple Street"
            disabled={loading}
            style={inputStyle}
            onFocus={focus}
            onBlur={blur}
          />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div>
            <label style={{ display: 'block', fontSize: 11, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6, fontFamily: "'Barlow', sans-serif" }}>City</label>
            <input value={city} onChange={e => setCity(e.target.value)} placeholder="e.g. Austin" disabled={loading} style={inputStyle} onFocus={focus} onBlur={blur} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6, fontFamily: "'Barlow', sans-serif" }}>
              State / Province <span style={{ opacity: 0.5 }}>(optional)</span>
            </label>
            <input value={state} onChange={e => setState(e.target.value)} placeholder="e.g. Texas" disabled={loading} style={inputStyle} onFocus={focus} onBlur={blur} />
          </div>
        </div>
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontSize: 11, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6, fontFamily: "'Barlow', sans-serif" }}>Country</label>
          <input value={country} onChange={e => setCountry(e.target.value)} placeholder="e.g. United States" disabled={loading} style={inputStyle} onFocus={focus} onBlur={blur} />
        </div>
        <motion.button
          type="submit"
          disabled={loading || !isValid}
          whileHover={isValid && !loading ? { scale: 1.02 } : {}}
          whileTap={isValid && !loading ? { scale: 0.98 } : {}}
          style={{
            width: '100%',
            padding: '14px',
            background: isValid && !loading ? '#ffffff' : 'rgba(255,255,255,0.06)',
            border: 'none',
            borderRadius: 40,
            color: isValid && !loading ? '#000' : 'rgba(255,255,255,0.3)',
            fontFamily: "'Barlow', sans-serif",
            fontWeight: 600,
            fontSize: 15,
            cursor: loading || !isValid ? 'not-allowed' : 'pointer',
            transition: 'background 0.2s, color 0.2s',
          }}
        >
          {loading ? '⟳ Analyzing...' : '→ Analyze Property'}
        </motion.button>
      </div>
    </form>
  )
}
