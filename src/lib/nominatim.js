const BASE = 'https://nominatim.openstreetmap.org'

export async function geocodeAddress(address) {
  const params = new URLSearchParams({
    q: address,
    format: 'json',
    addressdetails: 1,
    limit: 1,
  })
  const res = await fetch(`${BASE}/search?${params}`, {
    headers: { 'Accept-Language': 'en', 'User-Agent': 'DwellingApp/1.0' },
  })
  const data = await res.json()
  if (!data.length) throw new Error('Address not found')
  const r = data[0]
  return {
    lat: parseFloat(r.lat),
    lon: parseFloat(r.lon),
    displayName: r.display_name,
    address: r.address,
    type: r.type,
    importance: r.importance,
  }
}

export async function autocompleteAddress(query) {
  if (query.length < 3) return []
  const params = new URLSearchParams({
    q: query,
    format: 'json',
    addressdetails: 1,
    limit: 5,
  })
  const res = await fetch(`${BASE}/search?${params}`, {
    headers: { 'Accept-Language': 'en', 'User-Agent': 'DwellingApp/1.0' },
  })
  return res.json()
}
