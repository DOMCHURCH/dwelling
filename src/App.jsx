import { useState, useEffect } from 'react'
import AddressSearch from './components/AddressSearch'
import LoadingState from './components/LoadingState'
import Dashboard from './components/Dashboard'
import { geocodeStructured } from './lib/nominatim'
import { getCurrentWeather, getClimateNormals } from './lib/weather'
import { analyzeProperty } from './lib/cerebras'
import { getNeighborhoodScores } from './lib/overpass'
import { getCensusData } from './lib/census'
import { getFairMarketRent, getFloodZone } from './lib/hud'

function MarqueeTicker() {
  const items = ['MARKET ANALYSIS ★', 'PROPERTY INTELLIGENCE ★', 'REAL DATA ★', 'NEIGHBORHOOD SCORES ★', 'INVESTMENT INSIGHTS ★', 'CLIMATE DATA ★', 'COST OF LIVING ★', 'PRICE HISTORY ★']
  const text = items.join('   ')
  return (
    <div className="marquee-wrapper">
      <div className="marquee-content">
        {text}&nbsp;&nbsp;&nbsp;{text}
      </div>
    </div>
  )
}

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
      setLoadStep(0)
      const geo = await geocodeStructured({ street, city, state, country })
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

      {/* Nav */}
      <nav style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '20px 40px',
        borderBottom: '2px solid var(--white)',
        background: 'var(--obsidian)',
      }}>
        <div style={{
          fontFamily: "'Space Mono', monospace",
          fontWeight: 700,
          fontSize: 20,
          letterSpacing: '0.15em',
          color: 'var(--white)',
          textTransform: 'uppercase',
          cursor: 'crosshair',
        }} onClick={() => setResult(null)}>
          DW<span className="neon-pink">.</span>ELLING
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: 'var(--text-2)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Property Intelligence Platform
          </span>
          {result && (
            <button onClick={() => setResult(null)} style={{
              padding: '8px 16px',
              background: 'transparent',
              border: '2px solid var(--white)',
              color: 'var(--white)',
              fontSize: 11,
              cursor: 'crosshair',
              fontFamily: "'Space Mono', monospace",
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              transition: 'all 0.1s',
            }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--white)'; e.currentTarget.style.color = 'var(--obsidian)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--white)' }}
            >
              ← New Search
            </button>
          )}
        </div>
      </nav>

      <MarqueeTicker />

      {!result && !loading && (
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '80px 40px 0' }}>
          {/* HERO */}
          <div style={{ position: 'relative', marginBottom: 80 }}>

            {/* Big decorative number */}
            <div style={{
              position: 'absolute', right: -20, top: -40,
              fontFamily: "'Space Mono', monospace",
              fontSize: 'clamp(120px, 20vw, 280px)',
              fontWeight: 700,
              color: 'transparent',
              WebkitTextStroke: '2px rgba(255,255,255,0.08)',
              userSelect: 'none',
              lineHeight: 1,
              zIndex: 0,
            }}>$</div>

            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{
                fontFamily: "'Space Mono', monospace",
                fontSize: 11,
                letterSpacing: '0.3em',
                textTransform: 'uppercase',
                color: 'var(--neon-pink)',
                marginBottom: 20,
                display: 'flex', alignItems: 'center', gap: 12,
              }}>
                <span style={{ display: 'inline-block', width: 40, height: 2, background: 'var(--neon-pink)' }} />
                EST. 2025 — REAL ESTATE INTELLIGENCE
              </div>

              <h1 style={{
                fontSize: 'clamp(3.5rem, 9vw, 9rem)',
                lineHeight: 0.9,
                marginBottom: 32,
                fontFamily: "'Clash Display', 'Space Mono', monospace",
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '-0.03em',
              }}>
                <span style={{ display: 'block', color: 'var(--white)' }}>KNOW</span>
                <span style={{ display: 'block', WebkitTextStroke: '2px var(--acid-yellow)', color: 'transparent' }}>WHAT</span>
                <span style={{ display: 'block', color: 'var(--neon-pink)', textShadow: '4px 4px 0px rgba(255,45,120,0.3)' }}>ANY HOME</span>
                <span style={{ display: 'block', color: 'var(--white)' }}>IS WORTH.</span>
              </h1>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 60, alignItems: 'start' }}>
                <div>
                  <p style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: 16, color: 'var(--text-2)',
                    maxWidth: 420, marginBottom: 40, lineHeight: 1.8,
                  }}>
                    Enter any address in the world. Get real market data, neighborhood scores, climate analysis, and AI-powered investment insights — instantly.
                  </p>
                  <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 40 }}>
                    {['Real Data', 'Global Coverage', 'AI Analysis', 'Free'].map(f => (
                      <span key={f} style={{
                        padding: '6px 14px',
                        border: '2px solid var(--white)',
                        fontFamily: "'Space Mono', monospace",
                        fontSize: 11,
                        color: 'var(--white)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.1em',
                      }}>{f}</span>
                    ))}
                  </div>
                </div>
                <div>
                  <AddressSearch onSearch={handleSearch} loading={loading} />
                </div>
              </div>
            </div>
          </div>

          {/* Stats bar */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
            border: '2px solid var(--white)',
            marginBottom: 60,
          }}>
            {[
              { num: '140M+', label: 'US Properties' },
              { num: '50+', label: 'Countries' },
              { num: '100%', label: 'Free' },
              { num: 'LIVE', label: 'Real Data' },
            ].map((s, i) => (
              <div key={i} style={{
                padding: '24px',
                borderRight: i < 3 ? '2px solid var(--white)' : 'none',
                textAlign: 'center',
              }}>
                <div style={{
                  fontFamily: "'Space Mono', monospace",
                  fontSize: 'clamp(1.5rem, 3vw, 2.5rem)',
                  fontWeight: 700,
                  color: i === 0 ? 'var(--neon-pink)' : i === 1 ? 'var(--acid-yellow)' : i === 2 ? 'var(--green)' : 'var(--cyan)',
                  textShadow: i === 0 ? '0 0 20px rgba(255,45,120,0.5)' : 'none',
                  marginBottom: 4,
                }}>{s.num}</div>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.15em' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Results */}
      <div style={{ maxWidth: 960, margin: '0 auto', padding: result || loading ? '40px 24px 80px' : '0 24px' }}>
        {loading && <LoadingState step={loadStep} />}

        {error && (
          <div style={{
            border: '2px solid var(--neon-pink)',
            background: 'rgba(255,45,120,0.1)',
            padding: '16px 20px',
            fontFamily: "'Space Mono', monospace",
            fontSize: 13,
            color: 'var(--neon-pink)',
            marginTop: 24,
          }}>
            ⚠ {error}
          </div>
        )}

        {result && !loading && (
          <>
            <div style={{ marginBottom: 24 }}>
              <AddressSearch onSearch={handleSearch} loading={loading} compact />
            </div>
            <Dashboard data={result} onRecalculate={handleRecalculate} />
          </>
        )}
      </div>
    </div>
  )
}
