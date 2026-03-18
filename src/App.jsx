import { useState, useEffect } from 'react'
import AddressSearch from './components/AddressSearch'
import LoadingState from './components/LoadingState'
import Dashboard from './components/Dashboard'
import { geocodeStructured } from './lib/nominatim'
import { getCurrentWeather, getClimateNormals } from './lib/weather'
import { analyzeProperty } from './lib/groq'
import { getNeighborhoodScores } from './lib/overpass'
import { getCensusData } from './lib/census'
import { getFairMarketRent, getFloodZone } from './lib/hud'

export default function App() {
  const [loading, setLoading] = useState(false)
  const [loadStep, setLoadStep] = useState(0)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (result) {
      const addr = [result.geo.userStreet, result.geo.userCity, result.geo.userCountry].filter(Boolean).join(', ')
      document.title = `${addr} — Dwelling`
    } else {
      document.title = 'Dwelling — Property Intelligence'
    }
  }, [result])

  const handleSearch = async ({ street, city, state, country, knownFacts }) => {
    setLoading(true)
    setError(null)
    setResult(null)
    setLoadStep(0)

    try {
      // Step 1: Geocode
      setLoadStep(0)
      const geo = await geocodeStructured({ street, city, state, country })

      // Step 2: Fetch all data in parallel
      setLoadStep(1)
      const postcode = geo.address?.postcode ?? ''

      const [weather, climate, neighborhoodScores, censusData, fmr, floodZone] = await Promise.all([
        getCurrentWeather(geo.lat, geo.lon),
        getClimateNormals(geo.lat, geo.lon),
        getNeighborhoodScores(geo.lat, geo.lon),
        getCensusData(street, city, state, country),
        getFairMarketRent(postcode),
        getFloodZone(geo.lat, geo.lon),
      ])

      // Step 3: Run AI analysis with real data as context
      setLoadStep(3)
      const realData = { neighborhoodScores, censusData, fmr, floodZone }
      const ai = await analyzeProperty(geo, weather, climate, knownFacts ?? {}, realData)

      setLoadStep(4)
      setResult({ geo, weather, climate, ai, knownFacts: knownFacts ?? {}, realData })
    } catch (err) {
      console.error(err)
      setError(err.message ?? 'Something went wrong.')
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
      const ai = await analyzeProperty(result.geo, result.weather, result.climate, mergedFacts, result.realData)
      setResult(prev => ({ ...prev, ai, knownFacts: mergedFacts }))
    } catch (err) {
      setError(err.message ?? 'Recalculation failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh' }}>
      <nav style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '22px 40px',
        borderBottom: result ? '1px solid var(--glass-border)' : 'none',
      }}>
        <div style={{
          fontFamily: 'Syne, sans-serif', fontWeight: 800,
          fontSize: 22, letterSpacing: '-0.04em', color: 'var(--text)',
          cursor: 'pointer',
        }} onClick={() => setResult(null)}>
          DW<span style={{ color: 'var(--accent)' }}>.</span>
        </div>
        {result && (
          <button onClick={() => setResult(null)} style={{
            padding: '8px 18px',
            background: 'var(--glass)',
            border: '1px solid var(--glass-border)',
            borderRadius: 100,
            color: 'var(--text-2)',
            fontSize: 13,
            cursor: 'pointer',
            transition: 'all 0.2s',
            fontFamily: 'DM Sans, sans-serif',
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--text)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--glass-border)'; e.currentTarget.style.color = 'var(--text-2)' }}
          >
            ← New search
          </button>
        )}
      </nav>

      {!result && !loading && (
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '60px 40px 0' }}>
          <div className="hero-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 60, alignItems: 'center', minHeight: '65vh' }}>
            <div>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase',
                color: 'var(--lime)', marginBottom: 28,
                fontFamily: 'DM Sans, sans-serif', fontWeight: 500,
              }}>
                <span style={{
                  width: 7, height: 7, borderRadius: '50%',
                  background: 'var(--lime)', display: 'inline-block',
                  animation: 'pulse 2s ease infinite',
                  boxShadow: '0 0 8px var(--lime)',
                }} />
                Property Intelligence
              </div>

              <h1 style={{ fontSize: 'clamp(3rem, 5vw, 5.2rem)', lineHeight: 0.95, marginBottom: 28, color: 'var(--text)' }}>
                Know what<br />any home<br />
                <span style={{ color: 'var(--accent-2)' }}>is worth.</span>
              </h1>

              <p style={{ fontSize: 16, color: 'var(--text-2)', maxWidth: 380, marginBottom: 44, lineHeight: 1.75, fontWeight: 300 }}>
                Enter an address anywhere in the world. Get market value, cost of living, neighborhood data, and investment analysis — in seconds.
              </p>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {['Market valuation', 'Cost of living', 'Climate data', 'Investment analysis', 'Real neighborhood data'].map(f => (
                  <span key={f} style={{
                    padding: '7px 14px',
                    background: 'var(--accent-dim)',
                    border: '1px solid rgba(124,92,252,0.2)',
                    borderRadius: 100,
                    fontSize: 12,
                    color: 'var(--accent-2)',
                    fontFamily: 'DM Sans, sans-serif',
                  }}>{f}</span>
                ))}
              </div>
            </div>

            <div>
              <AddressSearch onSearch={handleSearch} loading={loading} />
            </div>
          </div>
        </div>
      )}

      <div style={{ maxWidth: 900, margin: '0 auto', padding: result || loading ? '32px 24px 80px' : '0 24px' }}>
        {loading && <LoadingState step={loadStep} />}

        {error && (
          <div style={{
            marginTop: 24,
            background: 'var(--red-dim)',
            border: '1px solid rgba(248,113,113,0.2)',
            borderRadius: 'var(--radius)',
            padding: '14px 18px',
            color: 'var(--red)',
            fontSize: 13,
          }}>
            {error}
          </div>
        )}

        {result && !loading && (
          <>
            <AddressSearch onSearch={handleSearch} loading={loading} compact />
            <div style={{ marginTop: 24 }}>
              <Dashboard data={result} onRecalculate={handleRecalculate} />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
