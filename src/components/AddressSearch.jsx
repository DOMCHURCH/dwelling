import { useState, useEffect, useRef } from 'react'
import { autocompleteAddress } from '../lib/nominatim'

export default function AddressSearch({ onSearch, loading }) {
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [showSugg, setShowSugg] = useState(false)
  const debounceRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (query.length < 3) { setSuggestions([]); return }
    debounceRef.current = setTimeout(async () => {
      const results = await autocompleteAddress(query)
      setSuggestions(results.slice(0, 5))
      setShowSugg(true)
    }, 350)
  }, [query])

  const handleSelect = (place) => {
    setQuery(place.display_name)
    setSuggestions([])
    setShowSugg(false)
    onSearch(place.display_name)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (query.trim()) {
      setShowSugg(false)
      onSearch(query.trim())
    }
  }

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 10 }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onFocus={() => suggestions.length && setShowSugg(true)}
            onBlur={() => setTimeout(() => setShowSugg(false), 150)}
            placeholder="Enter any address in the world..."
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px 18px',
              background: 'var(--bg-input)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              color: 'var(--text)',
              fontSize: 15,
              outline: 'none',
              transition: 'border-color 0.2s',
            }}
            onFocusCapture={e => e.target.style.borderColor = 'var(--border-active)'}
            onBlurCapture={e => e.target.style.borderColor = 'var(--border)'}
          />
          {showSugg && suggestions.length > 0 && (
            <div style={{
              position: 'absolute',
              top: 'calc(100% + 6px)',
              left: 0,
              right: 0,
              background: '#1a1a18',
              border: '1px solid var(--border-active)',
              borderRadius: 'var(--radius)',
              zIndex: 100,
              overflow: 'hidden',
            }}>
              {suggestions.map((s, i) => (
                <div
                  key={i}
                  onMouseDown={() => handleSelect(s)}
                  style={{
                    padding: '10px 16px',
                    cursor: 'pointer',
                    fontSize: 13,
                    color: 'var(--muted)',
                    borderBottom: i < suggestions.length - 1 ? '1px solid var(--border)' : 'none',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => e.target.style.background = 'var(--bg-card-hover)'}
                  onMouseLeave={e => e.target.style.background = 'transparent'}
                >
                  <span style={{ color: 'var(--text)', fontWeight: 500 }}>
                    {s.display_name.split(',')[0]}
                  </span>
                  {' — '}
                  {s.display_name.split(',').slice(1, 3).join(',')}
                </div>
              ))}
            </div>
          )}
        </div>
        <button
          type="submit"
          disabled={loading || !query.trim()}
          style={{
            padding: '14px 28px',
            background: 'var(--accent)',
            border: 'none',
            borderRadius: 'var(--radius)',
            color: '#0a0a08',
            fontWeight: 500,
            fontSize: 14,
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1,
            transition: 'opacity 0.2s, transform 0.1s',
            whiteSpace: 'nowrap',
            letterSpacing: '0.02em',
          }}
          onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.97)' }}
          onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
        >
          {loading ? 'Analyzing...' : 'Analyze'}
        </button>
      </form>
    </div>
  )
}
