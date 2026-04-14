const BASE = 'https://nominatim.openstreetmap.org'

async function nominatimFetch(params) {
  params.set('format', 'json')
  params.set('addressdetails', 1)
  params.set('limit', 1)
  const res = await fetch(`${BASE}/search?${params}`, {
    headers: { 'Accept-Language': 'en', 'User-Agent': 'DwellingApp/1.0' },
    signal: AbortSignal.timeout(10000), // 10 s — Nominatim is usually <300 ms
  })
  if (!res.ok) throw new Error(`Geocoding service error (${res.status})`)
  return res.json()
}

// Geocode with structured fields first, fall back to free-form query if no results
export async function geocodeStructured({ street, city, state, country }) {
  // 1. Try structured search
  const structuredParams = new URLSearchParams({ street, city, country })
  if (state) structuredParams.set('state', state)
  let data = await nominatimFetch(structuredParams)

  // 2. Fall back to free-form query (handles unusual addresses, abbreviations, etc.)
  if (!data.length) {
    const q = [street, city, state, country].filter(Boolean).join(', ')
    data = await nominatimFetch(new URLSearchParams({ q }))
  }

  // 3. City-only last resort so coordinates are at least in the right area
  if (!data.length && city && country) {
    const cityParams = new URLSearchParams({ city, country })
    if (state) cityParams.set('state', state)
    data = await nominatimFetch(cityParams)
  }

  if (!data.length) throw new Error('Address not found — double-check the street, city, and country.')

  const r = data[0]
  return {
    lat: parseFloat(r.lat),
    lon: parseFloat(r.lon),
    displayName: r.display_name,
    address: r.address,
    userStreet: street,
    userCity: city,
    userState: state,
    userCountry: country,
  }
}
