import { useState } from 'react'
import AddressSearch from './components/AddressSearch'
import LoadingState from './components/LoadingState'
import Dashboard from './components/Dashboard'
import { geocodeStructured } from './lib/nominatim'
import { getCurrentWeather, getClimateNormals } from './lib/weather'
import { analyzeProperty } from './lib/groq'

export default function App() {
  const [loading, setLoading] = useState(false)
  const [loadStep, setLoadStep] = useState(0)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  const handleSearch = async ({ street, city, state, country, knownFacts }) => {
    setLoading(true)
    setError(null)
    setResult(null)
    setLoadStep(0)
    try {
      setLoadStep(0)
      const geo = await geocodeStructured({ street, city, state, country })
      setLoadStep(1)
      const [weather, climate] = await Promise.all([
        getCurrentWeather(geo.lat, geo.lon),
        getClimateNormals(geo.lat, geo.lon),
      ])
      setLoadStep(3)
      const ai = await analyzeProperty(geo, weather, climate, knownFacts)
      setLoadStep(4)
      setResult({ geo, weather, climate, ai, knownFacts })
    } catch (err) {
      console.error(err)
      setError(err.message ?? 'Something went wrong. Check your API key and try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleRecalculate = async (corrections) => {
    if (!result) return
    setLoading(true)
    setError(null)
    try {
      const mergedFacts = { ...(result.knownFacts ?? {}), ...corrections }
      const ai = await analyzeProperty(result.geo, result.weather, result.climate, mergedFacts)
      setResult(prev => ({ ...prev, ai, knownFacts: mergedFacts }))
    } catch (err) {
      setError(err.message ?? 'Recalculation failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh' }}>
      {/* Hero */}
      <div style={{
        maxWidth: 860,
        margin: '0 auto',
        padding: result ? '32px 20px 0' : '80px 20px 0',
        transition: 'padding 0.4s ease',
      }}>
        {!result && (
          <div style={{ textAlign: 'center', marginBottom: 52 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase',
              color: 'var(--accent)', marginBottom: 24,
              padding: '6px 16px',
              background: 'var(--accent-dim)',
              border: '1px solid rgba(59,130,246,0.2)',
              borderRadius: 100,
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', display: 'inline-block', animation: 'pulse 2s ease infinite' }} />
              Property Intelligence
            </div>

            <h1 style={{
              fontSize: 'clamp(2.6rem, 6vw, 4.2rem)',
              lineHeight: 1.05,
              marginBottom: 20,
              background: 'linear-gradient(135deg, #f1f5f9 0%, #94a3b8 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              Know what any property<br />is actually worth
            </h1>

            <p style={{
              fontSize: 16,
              color: 'var(--text-2)',
              maxWidth: 440,
              margin: '0 auto 44px',
              lineHeight: 1.7,
              fontWeight: 300,
            }}>
              Enter an address anywhere in the world. Get market value, cost of living, neighborhood data, climate, and investment analysis — instantly.
            </p>
          </div>
        )}

        {result && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 8, height: 8, borderRadius: '50%',
                background: 'var(--accent)',
                animation: 'pulse 2s ease infinite',
              }} />
              <span style={{ fontSize: 13, color: 'var(--text-2)', letterSpacing: '0.05em' }}>Dwelling</span>
            </div>
            <button onClick={() => setResult(null)} style={{
              padding: '7px 16px',
              background: 'var(--glass)',
              border: '1px solid var(--glass-border)',
              borderRadius: 100,
              color: 'var(--text-2)',
              fontSize: 12,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--glass-border-hover)'; e.currentTarget.style.color = 'var(--text)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--glass-border)'; e.currentTarget.style.color = 'var(--text-2)' }}
            >
              ← New search
            </button>
          </div>
        )}

        <AddressSearch onSearch={handleSearch} loading={loading} compact={!!result} />
      </div>

      <div style={{ maxWidth: 860, margin: '0 auto', padding: '0 20px 80px' }}>
        {loading && <LoadingState step={loadStep} />}

        {error && (
          <div style={{
            marginTop: 24,
            background: 'var(--red-dim)',
            border: '1px solid rgba(239,68,68,0.2)',
            borderRadius: 'var(--radius)',
            padding: '14px 18px',
            color: 'var(--red)',
            fontSize: 13,
          }}>
            {error}
          </div>
        )}

        {result && !loading && (
          <Dashboard data={result} onRecalculate={handleRecalculate} />
        )}

        {!loading && !result && !error && (
          <div style={{ textAlign: 'center', padding: '20px 0 60px' }}>
            {/* Feature pills */}
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 10, marginBottom: 60 }}>
              {['Market valuation', 'Cost of living', 'Climate data', 'Neighborhood scores', 'Investment analysis', 'Floor plan info'].map(f => (
                <span key={f} style={{
                  padding: '8px 16px',
                  background: 'var(--glass)',
                  border: '1px solid var(--glass-border)',
                  borderRadius: 100,
                  fontSize: 12,
                  color: 'var(--text-2)',
                  backdropFilter: 'blur(8px)',
                }}>{f}</span>
              ))}
            </div>

            <p style={{ fontSize: 12, color: 'var(--text-3)' }}>
              Works for addresses in the US, Canada, UK, Australia, and 50+ countries
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
