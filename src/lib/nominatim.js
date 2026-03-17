const BASE = 'https://nominatim.openstreetmap.org'

// Structured geocode — uses separate fields so Nominatim finds the exact location
export async function geocodeStructured({ street, city, state, country }) {
  const params = new URLSearchParams({
    street,
    city,
    state,
    country,
    format: 'json',
    addressdetails: 1,
    limit: 1,
  })
  const res = await fetch(`${BASE}/search?${params}`, {
    headers: { 'Accept-Language': 'en', 'User-Agent': 'DwellingApp/1.0' },
  })
  const data = await res.json()
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
