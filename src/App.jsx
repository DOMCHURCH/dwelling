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

  const handleSearch = async ({ street, city, state, country }) => {
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
      const ai = await analyzeProperty(geo, weather, climate)

      setLoadStep(4)
      setResult({ geo, weather, climate, ai })
    } catch (err) {
      console.error(err)
      setError(err.message ?? 'Something went wrong. Check your API key and try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 16px 80px' }}>
      <header style={{ padding: '48px 0 40px', textAlign: 'center' }}>
        <div style={{
          display: 'inline-block',
          fontSize: 11,
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          color: 'var(--accent)',
          marginBottom: 16,
          padding: '5px 14px',
          border: '1px solid rgba(200,169,110,0.3)',
          borderRadius: 20,
        }}>
          Property Intelligence
        </div>
        <h1 style={{ fontSize: 'clamp(2.2rem, 5vw, 3.4rem)', lineHeight: 1.1, marginBottom: 14 }}>
          Dwelling
        </h1>
        <p style={{ fontSize: 15, color: 'var(--muted)', maxWidth: 480, margin: '0 auto 36px' }}>
          Enter any address in the world to get property estimates, cost of living, climate data, neighborhood insights, and investment analysis.
        </p>
        <AddressSearch onSearch={handleSearch} loading={loading} />
      </header>

      {loading && <LoadingState step={loadStep} />}

      {error && (
        <div style={{
          background: 'var(--red-dim)',
          border: '1px solid rgba(192,90,90,0.3)',
          borderRadius: 'var(--radius)',
          padding: '16px 20px',
          color: 'var(--red)',
          fontSize: 14,
          textAlign: 'center',
        }}>
          {error}
        </div>
      )}

      {result && !loading && <Dashboard data={result} />}

      {!loading && !result && !error && (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--hint)', fontSize: 13 }}>
          <div style={{ fontSize: 36, marginBottom: 12, opacity: 0.3 }}>◎</div>
          Fill in your address above — street, city, state/province, and country.
        </div>
      )}
    </div>
  )
}
