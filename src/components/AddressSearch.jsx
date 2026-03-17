import { useState } from 'react'

const inputStyle = {
  width: '100%',
  padding: '11px 14px',
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid var(--glass-border)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--text)',
  fontSize: 14,
  outline: 'none',
  transition: 'border-color 0.2s, background 0.2s',
  backdropFilter: 'blur(8px)',
}

const labelStyle = {
  display: 'block',
  fontSize: 10,
  color: 'var(--text-3)',
  textTransform: 'uppercase',
  letterSpacing: '0.12em',
  marginBottom: 6,
  fontWeight: 500,
}

export default function AddressSearch({ onSearch, loading, compact }) {
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
      street: street.trim(), city: city.trim(),
      state: state.trim(), country: country.trim(),
      knownFacts: {
        beds: beds ? parseInt(beds) : null,
        baths: baths ? parseFloat(baths) : null,
        sqft: sqft ? parseInt(sqft) : null,
        yearBuilt: yearBuilt ? parseInt(yearBuilt) : null,
        purchasePrice: purchasePrice ? parseInt(purchasePrice.replace(/[\s,]/g, '')) : null,
      }
    })
  }

  const isValid = street.trim() && city.trim() && country.trim()
  const focus = e => { e.target.style.borderColor = 'rgba(59,130,246,0.4)'; e.target.style.background = 'rgba(255,255,255,0.06)' }
  const blur = e => { e.target.style.borderColor = 'var(--glass-border)'; e.target.style.background = 'rgba(255,255,255,0.04)' }

  return (
    <form onSubmit={handleSubmit} style={{ width: '100%', maxWidth: compact ? '100%' : 560, margin: '0 auto' }}>
      <div style={{
        background: 'var(--glass)',
        border: '1px solid var(--glass-border)',
        borderRadius: 'var(--radius-lg)',
        padding: '20px',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)',
      }}>
        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>Street address</label>
          <input value={street} onChange={e => setStreet(e.target.value)}
            placeholder="e.g. 123 Maple Street" disabled={loading}
            style={inputStyle} onFocus={focus} onBlur={blur} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
          <div>
            <label style={labelStyle}>City</label>
            <input value={city} onChange={e => setCity(e.target.value)}
              placeholder="e.g. Austin" disabled={loading}
              style={inputStyle} onFocus={focus} onBlur={blur} />
          </div>
          <div>
            <label style={labelStyle}>State / Province <span style={{ opacity: 0.5 }}>(optional)</span></label>
            <input value={state} onChange={e => setState(e.target.value)}
              placeholder="e.g. Texas" disabled={loading}
              style={inputStyle} onFocus={focus} onBlur={blur} />
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Country</label>
          <input value={country} onChange={e => setCountry(e.target.value)}
            placeholder="e.g. United States" disabled={loading}
            style={inputStyle} onFocus={focus} onBlur={blur} />
        </div>

        <button type="button" onClick={() => setShowDetails(!showDetails)} style={{
          background: 'none', border: 'none', color: 'var(--accent)',
          fontSize: 12, cursor: 'pointer', padding: '0 0 14px',
          display: 'flex', alignItems: 'center', gap: 6, opacity: 0.8,
          transition: 'opacity 0.2s',
        }}
          onMouseEnter={e => e.currentTarget.style.opacity = '1'}
          onMouseLeave={e => e.currentTarget.style.opacity = '0.8'}
        >
          <span style={{
            width: 16, height: 16, borderRadius: '50%',
            border: '1px solid rgba(59,130,246,0.4)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11,
          }}>{showDetails ? '−' : '+'}</span>
          {showDetails ? 'Hide known details' : 'Add known property details'} — improves accuracy
        </button>

        {showDetails && (
          <div style={{
            background: 'rgba(59,130,246,0.04)',
            border: '1px solid rgba(59,130,246,0.12)',
            borderRadius: 'var(--radius)',
            padding: '14px',
            marginBottom: 14,
          }}>
            <p style={{ fontSize: 11, color: 'var(--text-2)', marginBottom: 12, lineHeight: 1.6 }}>
              Known facts override AI estimates. Purchase price is the strongest anchor for valuation accuracy.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 10 }}>
              {[
                { label: 'Bedrooms', value: beds, set: setBeds, placeholder: '5' },
                { label: 'Bathrooms', value: baths, set: setBaths, placeholder: '3' },
                { label: 'Sqft', value: sqft, set: setSqft, placeholder: '3250' },
                { label: 'Year built', value: yearBuilt, set: setYearBuilt, placeholder: '2008' },
                { label: 'Purchase price', value: purchasePrice, set: setPurchasePrice, placeholder: '1,100,000' },
              ].map(({ label, value, set, placeholder }) => (
                <div key={label}>
                  <label style={labelStyle}>{label}</label>
                  <input value={value} onChange={e => set(e.target.value)}
                    placeholder={placeholder} disabled={loading}
                    style={{ ...inputStyle, padding: '9px 12px', fontSize: 13 }}
                    onFocus={focus} onBlur={blur} />
                </div>
              ))}
            </div>
          </div>
        )}

        <button type="submit" disabled={loading || !isValid} style={{
          width: '100%', padding: '12px',
          background: isValid && !loading
            ? 'linear-gradient(135deg, var(--accent) 0%, #2563eb 100%)'
            : 'rgba(255,255,255,0.05)',
          border: isValid && !loading ? 'none' : '1px solid var(--glass-border)',
          borderRadius: 'var(--radius-sm)',
          color: isValid && !loading ? '#fff' : 'var(--text-3)',
          fontWeight: 500, fontSize: 14,
          cursor: loading || !isValid ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s',
          letterSpacing: '0.01em',
          boxShadow: isValid && !loading ? '0 4px 16px rgba(59,130,246,0.3)' : 'none',
        }}
          onMouseEnter={e => { if (isValid && !loading) e.currentTarget.style.transform = 'translateY(-1px)' }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)' }}
          onMouseDown={e => { e.currentTarget.style.transform = 'translateY(0) scale(0.99)' }}
          onMouseUp={e => { e.currentTarget.style.transform = 'translateY(-1px)' }}
        >
          {loading ? 'Analyzing...' : 'Analyze property →'}
        </button>
      </div>
    </form>
  )
}
