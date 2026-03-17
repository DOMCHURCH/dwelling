import { useState } from 'react'

const inputStyle = {
  width: '100%',
  padding: '12px 14px',
  background: 'var(--bg-input)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--text)',
  fontSize: 14,
  outline: 'none',
  transition: 'border-color 0.2s',
}

const labelStyle = {
  display: 'block',
  fontSize: 11,
  color: 'var(--muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  marginBottom: 6,
}

export default function AddressSearch({ onSearch, loading }) {
  const [street, setStreet] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [country, setCountry] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!street.trim() || !city.trim() || !country.trim()) return
    onSearch({ street: street.trim(), city: city.trim(), state: state.trim(), country: country.trim() })
  }

  const isValid = street.trim() && city.trim() && country.trim()

  return (
    <form onSubmit={handleSubmit} style={{ width: '100%', maxWidth: 600, margin: '0 auto' }}>
      {/* Street address — full width */}
      <div style={{ marginBottom: 10 }}>
        <label style={labelStyle}>Street address</label>
        <input
          value={street}
          onChange={e => setStreet(e.target.value)}
          placeholder="e.g. 473 Thessaly Circle"
          disabled={loading}
          style={inputStyle}
          onFocus={e => e.target.style.borderColor = 'var(--border-active)'}
          onBlur={e => e.target.style.borderColor = 'var(--border)'}
        />
      </div>

      {/* City + State/Province side by side */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
        <div>
          <label style={labelStyle}>City</label>
          <input
            value={city}
            onChange={e => setCity(e.target.value)}
            placeholder="e.g. Englewood"
            disabled={loading}
            style={inputStyle}
            onFocus={e => e.target.style.borderColor = 'var(--border-active)'}
            onBlur={e => e.target.style.borderColor = 'var(--border)'}
          />
        </div>
        <div>
          <label style={labelStyle}>State / Province <span style={{ color: 'var(--hint)' }}>(optional)</span></label>
          <input
            value={state}
            onChange={e => setState(e.target.value)}
            placeholder="e.g. Colorado"
            disabled={loading}
            style={inputStyle}
            onFocus={e => e.target.style.borderColor = 'var(--border-active)'}
            onBlur={e => e.target.style.borderColor = 'var(--border)'}
          />
        </div>
      </div>

      {/* Country + Submit */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10 }}>
        <div>
          <label style={labelStyle}>Country</label>
          <input
            value={country}
            onChange={e => setCountry(e.target.value)}
            placeholder="e.g. United States"
            disabled={loading}
            style={inputStyle}
            onFocus={e => e.target.style.borderColor = 'var(--border-active)'}
            onBlur={e => e.target.style.borderColor = 'var(--border)'}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
          <button
            type="submit"
            disabled={loading || !isValid}
            style={{
              padding: '12px 28px',
              background: isValid && !loading ? 'var(--accent)' : 'var(--bg-input)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              color: isValid && !loading ? '#0a0a08' : 'var(--hint)',
              fontWeight: 500,
              fontSize: 14,
              cursor: loading || !isValid ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              whiteSpace: 'nowrap',
              letterSpacing: '0.02em',
              height: 44,
            }}
            onMouseDown={e => { if (isValid && !loading) e.currentTarget.style.transform = 'scale(0.97)' }}
            onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
          >
            {loading ? 'Analyzing...' : 'Analyze →'}
          </button>
        </div>
      </div>

      {!isValid && (street || city) && (
        <p style={{ fontSize: 12, color: 'var(--hint)', marginTop: 8, textAlign: 'left' }}>
          Street, city, and country are required.
        </p>
      )}
    </form>
  )
}
