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
  const [showDetails, setShowDetails] = useState(false)
  const [beds, setBeds] = useState('')
  const [baths, setBaths] = useState('')
  const [sqft, setSqft] = useState('')
  const [yearBuilt, setYearBuilt] = useState('')
  const [purchasePrice, setPurchasePrice] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!street.trim() || !city.trim() || !country.trim()) return
    onSearch({
      street: street.trim(),
      city: city.trim(),
      state: state.trim(),
      country: country.trim(),
      knownFacts: {
        beds: beds ? parseInt(beds) : null,
        baths: baths ? parseFloat(baths) : null,
        sqft: sqft ? parseInt(sqft) : null,
        yearBuilt: yearBuilt ? parseInt(yearBuilt) : null,
        purchasePrice: purchasePrice ? parseInt(purchasePrice.replace(/,/g, '')) : null,
      }
    })
  }

  const isValid = street.trim() && city.trim() && country.trim()

  const focus = e => e.target.style.borderColor = 'var(--border-active)'
  const blur = e => e.target.style.borderColor = 'var(--border)'

  return (
    <form onSubmit={handleSubmit} style={{ width: '100%', maxWidth: 600, margin: '0 auto' }}>
      <div style={{ marginBottom: 10 }}>
        <label style={labelStyle}>Street address</label>
        <input value={street} onChange={e => setStreet(e.target.value)}
          placeholder="e.g. 473 Thessaly Circle" disabled={loading}
          style={inputStyle} onFocus={focus} onBlur={blur} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
        <div>
          <label style={labelStyle}>City</label>
          <input value={city} onChange={e => setCity(e.target.value)}
            placeholder="e.g. Englewood" disabled={loading}
            style={inputStyle} onFocus={focus} onBlur={blur} />
        </div>
        <div>
          <label style={labelStyle}>State / Province <span style={{ color: 'var(--hint)' }}>(optional)</span></label>
          <input value={state} onChange={e => setState(e.target.value)}
            placeholder="e.g. Colorado" disabled={loading}
            style={inputStyle} onFocus={focus} onBlur={blur} />
        </div>
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={labelStyle}>Country</label>
        <input value={country} onChange={e => setCountry(e.target.value)}
          placeholder="e.g. United States" disabled={loading}
          style={inputStyle} onFocus={focus} onBlur={blur} />
      </div>

      {/* Toggle for known property details */}
      <button type="button" onClick={() => setShowDetails(!showDetails)} style={{
        background: 'none', border: 'none', color: 'var(--accent)', fontSize: 13,
        cursor: 'pointer', padding: '0 0 12px', display: 'flex', alignItems: 'center', gap: 6,
      }}>
        <span style={{ fontSize: 16 }}>{showDetails ? '−' : '+'}</span>
        {showDetails ? 'Hide' : 'Add known property details'} (improves accuracy)
      </button>

      {showDetails && (
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          padding: '16px',
          marginBottom: 12,
        }}>
          <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 14 }}>
            Known facts override AI estimates — the more you provide, the more accurate the report.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10 }}>
            {[
              { label: 'Bedrooms', value: beds, set: setBeds, placeholder: 'e.g. 5', type: 'number' },
              { label: 'Bathrooms', value: baths, set: setBaths, placeholder: 'e.g. 3', type: 'number' },
              { label: 'Sqft', value: sqft, set: setSqft, placeholder: 'e.g. 3250', type: 'number' },
              { label: 'Year built', value: yearBuilt, set: setYearBuilt, placeholder: 'e.g. 2008', type: 'number' },
              { label: 'Purchase price ($)', value: purchasePrice, set: setPurchasePrice, placeholder: 'e.g. 1100000', type: 'text' },
            ].map(({ label, value, set, placeholder, type }) => (
              <div key={label}>
                <label style={labelStyle}>{label}</label>
                <input value={value} onChange={e => set(e.target.value)}
                  placeholder={placeholder} type={type} disabled={loading}
                  style={{ ...inputStyle, padding: '10px 12px' }}
                  onFocus={focus} onBlur={blur} />
              </div>
            ))}
          </div>
        </div>
      )}

      <button type="submit" disabled={loading || !isValid} style={{
        width: '100%',
        padding: '13px',
        background: isValid && !loading ? 'var(--accent)' : 'var(--bg-input)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-sm)',
        color: isValid && !loading ? '#0a0a08' : 'var(--hint)',
        fontWeight: 500, fontSize: 15,
        cursor: loading || !isValid ? 'not-allowed' : 'pointer',
        transition: 'all 0.2s', letterSpacing: '0.02em',
      }}>
        {loading ? 'Analyzing...' : 'Analyze →'}
      </button>

      {!isValid && (street || city) && (
        <p style={{ fontSize: 12, color: 'var(--hint)', marginTop: 8 }}>
          Street, city, and country are required.
        </p>
      )}
    </form>
  )
}
