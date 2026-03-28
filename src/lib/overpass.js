// Overpass calls now go through /api/overpass (serverless proxy)
// so the browser never sees 504s from overpass-api.de directly

const _cache = new Map()
const CACHE_TTL = 1000 * 60 * 60 * 6

function fallbackScores() {
  return {
    walkScore: 55, transitScore: 45, schoolScore: 55,
    amenityCount500m: 0,
    nearbySchools: [], nearbyParks: [], nearbyTransit: [], nearbyGrocery: [],
    buildingType: 'house', dataSource: 'estimated',
  }
}

function parseElements(elements, lat, lon) {
  if (!elements || elements.length === 0) return fallbackScores()

  const getDist = (p) => {
    const dy = (p.lat - lat) * 111320
    const dx = (p.lon - lon) * 40075000 * Math.cos(lat * Math.PI / 180) / 360
    return Math.sqrt(dx * dx + dy * dy)
  }

  const buildings   = elements.filter(p => p.tags?.building)
  let buildingType = 'house'
  if (buildings.length > 0) {
    const b = buildings[0].tags
    if (b['building:levels'] > 3 || b.building === 'apartments') buildingType = 'apartment'
    else if (b.building === 'semidetached_house' || b.building === 'terrace') buildingType = 'semi-detached'
    else if (b.building === 'detached') buildingType = 'detached'
  }

  const places1km   = elements.filter(p => p.lat && p.lon && getDist(p) <= 1000)
  const schools     = elements.filter(p => p.tags?.amenity === 'school')
  const parks       = elements.filter(p => p.tags?.leisure === 'park')
  const grocery     = elements.filter(p => p.tags?.amenity === 'supermarket' || p.tags?.shop === 'supermarket' || p.tags?.shop === 'grocery')
  const transit     = elements.filter(p => p.tags?.public_transport === 'station' || p.tags?.highway === 'bus_stop' || p.tags?.railway === 'station' || p.tags?.railway === 'subway_entrance')
  const restaurants = elements.filter(p => p.tags?.amenity === 'restaurant' || p.tags?.amenity === 'cafe' || p.tags?.amenity === 'fast_food')
  const amenities   = elements.filter(p => p.tags?.amenity === 'pharmacy' || p.tags?.amenity === 'hospital' || p.tags?.amenity === 'bank' || p.tags?.amenity === 'gym' || p.tags?.shop === 'convenience')

  return {
    walkScore: Math.min(95, Math.max(15,
      (grocery.length > 0 ? 20 : 0) +
      (restaurants.length >= 3 ? 20 : restaurants.length * 5) +
      (parks.length > 0 ? 10 : 0) +
      (amenities.length > 0 ? 10 : 0) +
      (transit.length > 0 ? 10 : 0)
    )),
    transitScore: Math.min(95, Math.max(10, transit.length * 8 + (transit.length > 0 ? 20 : 0))),
    schoolScore:  Math.min(95, Math.max(35, 40 + schools.length * 15)),
    amenityCount500m: places1km.length,
    nearbySchools:  schools.filter(p => p.tags?.name).map(p => p.tags.name).slice(0, 3),
    nearbyParks:    parks.filter(p => p.tags?.name).map(p => p.tags.name).slice(0, 3),
    nearbyTransit:  transit.filter(p => p.tags?.name).map(p => p.tags.name).slice(0, 5),
    nearbyGrocery:  grocery.filter(p => p.tags?.name).map(p => p.tags.name).slice(0, 3),
    buildingType,
    dataSource: 'OpenStreetMap',
  }
}

export async function getNeighborhoodScores(lat, lon) {
  const key = `${Math.round(lat * 1000) / 1000},${Math.round(lon * 1000) / 1000}`
  const cached = _cache.get(key)
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.data

  try {
    const res = await fetch('/api/overpass', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lat, lon }),
    })

    if (!res.ok) {
      const fb = fallbackScores()
      _cache.set(key, { data: fb, ts: Date.now() - CACHE_TTL + 1000 * 60 * 5 })
      return fb
    }

    const data = await res.json()
    const result = parseElements(data.elements, lat, lon)
    _cache.set(key, { data: result, ts: Date.now() })
    return result
  } catch {
    return fallbackScores()
  }
}
