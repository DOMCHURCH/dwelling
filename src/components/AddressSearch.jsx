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
  fontFamily: 'DM Sans, sans-serif',
}

const labelStyle = {
  display: 'block',
  fontSize: 10,
  color: 'var(--text-3)',
  textTransform: 'uppercase',
  letterSpacing: '0.12em',
  marginBottom: 6,
  fontWeight: 500,
  fontFamily: 'DM Sans, sans-serif',
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
  const focus = e => { e.target.style.borderColor = 'rgba(124,92,252,0.5)'; e.target.style.background = 'rgba(124,92,252,0.06)' }
  const blur = e => { e.target.style.borderColor = 'var(--glass-border)'; e.target.style.background = 'rgba(255,255,255,0.04)' }

  if (compact) {
    return (
      <form onSubmit={handleSubmit}>
        <div style={{
          display: 'flex', gap: 10, flexWrap: 'wrap',
          background: 'var(--glass)',
          border: '1px solid var(--glass-border)',
          borderRadius: 'var(--radius-lg)',
          padding: '14px 16px',
        }}>
          {[
            { val: street, set: setStreet, ph: 'Street address', flex: 2 },
            { val: city, set: setCity, ph: 'City', flex: 1 },
            { val: state, set: setState, ph: 'State/Province', flex: 1 },
            { val: country, set: setCountry, ph: 'Country', flex: 1 },
          ].map(({ val, set, ph, flex }) => (
            <input key={ph} value={val} onChange={e => set(e.target.value)}
              placeholder={ph} disabled={loading}
              style={{ ...inputStyle, flex, minWidth: 100 }}
              onFocus={focus} onBlur={blur} />
          ))}
          <button type="submit" disabled={loading || !isValid} style={{
            padding: '11px 22px',
            background: isValid && !loading ? 'var(--accent)' : 'rgba(255,255,255,0.05)',
            border: 'none', borderRadius: 'var(--radius-sm)',
            color: isValid && !loading ? '#fff' : 'var(--text-3)',
            fontWeight: 500, fontSize: 13,
            cursor: loading || !isValid ? 'not-allowed' : 'pointer',
            whiteSpace: 'nowrap',
            boxShadow: isValid && !loading ? '0 0 20px var(--accent-glow)' : 'none',
            transition: 'all 0.2s',
            fontFamily: 'DM Sans, sans-serif',
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
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid var(--glass-border)',
        borderRadius: 'var(--radius-lg)',
        padding: '24px',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)',
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
            <label style={labelStyle}>State / Province <span style={{ opacity: 0.4 }}>(optional)</span></label>
            <input value={state} onChange={e => setState(e.target.value)}
              placeholder="e.g. Texas" disabled={loading}
              style={inputStyle} onFocus={focus} onBlur={blur} />
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Country</label>
          <input value={country} onChange={e => setCountry(e.target.value)}
            placeholder="e.g. United States" disabled={loading}
            style={inputStyle} onFocus={focus} onBlur={blur} />
        </div>

        <button type="button" onClick={() => setShowDetails(!showDetails)} style={{
          background: 'none', border: 'none', color: 'var(--accent-2)',
          fontSize: 12, cursor: 'pointer', padding: '0 0 16px',
          display: 'flex', alignItems: 'center', gap: 7,
          fontFamily: 'DM Sans, sans-serif',
          opacity: 0.75, transition: 'opacity 0.2s',
        }}
          onMouseEnter={e => e.currentTarget.style.opacity = '1'}
          onMouseLeave={e => e.currentTarget.style.opacity = '0.75'}
        >
          <span style={{
            width: 18, height: 18, borderRadius: '50%',
            border: '1px solid rgba(185,138,255,0.4)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 12,
          }}>{showDetails ? '−' : '+'}</span>
          {showDetails ? 'Hide details' : 'Add known property details'} — improves accuracy
        </button>

        {showDetails && (
          <div style={{
            background: 'rgba(124,92,252,0.05)',
            border: '1px solid rgba(124,92,252,0.15)',
            borderRadius: 'var(--radius)',
            padding: '14px', marginBottom: 16,
          }}>
            <p style={{ fontSize: 11, color: 'var(--text-2)', marginBottom: 12, lineHeight: 1.6 }}>
              Known facts override AI estimates. Purchase price is the strongest anchor for valuation.
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
          width: '100%', padding: '13px',
          background: isValid && !loading
            ? 'linear-gradient(135deg, var(--accent) 0%, #5b3de8 100%)'
            : 'rgba(255,255,255,0.04)',
          border: isValid && !loading ? 'none' : '1px solid var(--glass-border)',
          borderRadius: 'var(--radius-sm)',
          color: isValid && !loading ? '#fff' : 'var(--text-3)',
          fontWeight: 600, fontSize: 14,
          cursor: loading || !isValid ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s',
          letterSpacing: '0.01em',
          fontFamily: 'DM Sans, sans-serif',
          boxShadow: isValid && !loading ? '0 8px 24px rgba(124,92,252,0.4)' : 'none',
        }}
          onMouseEnter={e => { if (isValid && !loading) e.currentTarget.style.transform = 'translateY(-1px)' }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)' }}
        >
          {loading ? 'Analyzing...' : 'Analyze property →'}
        </button>
      </div>
    </form>
  )
}
