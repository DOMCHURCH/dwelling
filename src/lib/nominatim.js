const BASE = 'https://nominatim.openstreetmap.org'

async function nominatimFetch(params) {
  params.set('format', 'json')
  params.set('addressdetails', 1)
  params.set('limit', 1)
  const res = await fetch(`${BASE}/search?${params}`, {
    headers: { 'Accept-Language': 'en', 'User-Agent': 'DwellingApp/1.0' },
  })
  return res.json()
}

// Geocode any address string or structured fields.
// When freeform is provided (user typed a plain string), skip structured parsing
// and go straight to Nominatim free-form search which handles any format globally.
export async function geocodeStructured({ street = '', city = '', state = '', country = '', freeform = '' }) {
  let data = []

  // 1. If we have a freeform string, try it directly first — handles any format
  if (freeform) {
    data = await nominatimFetch(new URLSearchParams({ q: freeform }))
  }

  // 2. Try structured search (used when AddressSearch fields are filled separately)
  if (!data.length && (city || street)) {
    const structuredParams = new URLSearchParams()
    if (street)  structuredParams.set('street', street)
    if (city)    structuredParams.set('city', city)
    if (state)   structuredParams.set('state', state)
    if (country) structuredParams.set('country', country)
    data = await nominatimFetch(structuredParams)
  }

  // 3. Free-form fallback from structured fields
  if (!data.length) {
    const q = [street, city, state, country].filter(Boolean).join(', ')
    if (q) data = await nominatimFetch(new URLSearchParams({ q }))
  }

  // 4. City + country only as last resort
  if (!data.length && city) {
    const p = new URLSearchParams({ city })
    if (country) p.set('country', country)
    data = await nominatimFetch(p)
  }

  if (!data.length) throw new Error('Address not found — try a different format, e.g. "Tokyo" or "Paris, France".')

  const r = data[0]
  const addr = r.address || {}

  // Nominatim uses many keys for city depending on place type — try all of them
  const resolvedCity = city ||
    addr.city || addr.town || addr.village || addr.municipality ||
    addr.city_district || addr.suburb || addr.county || addr.region || ''

  // Country: prefer what we were given, then Nominatim's country field
  const resolvedCountry = country || addr.country || ''
  const resolvedState   = state   || addr.state   || addr.province || ''

  return {
    lat: parseFloat(r.lat),
    lon: parseFloat(r.lon),
    displayName: r.display_name,
    address: addr,
    userStreet:  street        || addr.road       || '',
    userCity:    resolvedCity,
    userState:   resolvedState,
    userCountry: resolvedCountry,
  }
}
