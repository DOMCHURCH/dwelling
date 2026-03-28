const _cache = new Map()
const CACHE_TTL = 1000 * 60 * 60 * 24

// Only use mirrors that are actually reliable
// kumi.systems and mail.ru are removed — they 503/403 too often
const BASES = [
  'https://overpass-api.de/api/interpreter',
  'https://z.overpass-api.de/api/interpreter',
]

async function fetchOverpass(query) {
  for (const base of BASES) {
    try {
      const controller = new AbortController()
      const tid = setTimeout(() => controller.abort(), 9000)
      const res = await fetch(base, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `data=${encodeURIComponent(query)}`,
        signal: controller.signal,
      })
      clearTimeout(tid)
      if (res.ok) return await res.json()
    } catch {
      // try next mirror
    }
  }
  return null
}

function fallbackScores() {
  return {
    walkScore: 55, transitScore: 45, schoolScore: 55,
    amenityCount500m: 0,
    nearbySchools: [], nearbyParks: [], nearbyTransit: [], nearbyGrocery: [],
    buildingType: 'house', dataSource: 'estimated',
  }
}

export async function getNeighborhoodScores(lat, lon) {
  const key = `${Math.round(lat * 1000) / 1000},${Math.round(lon * 1000) / 1000}`
  const cached = _cache.get(key)
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.data

  try {
    const query = `
      [out:json][timeout:20];
      (
        node["amenity"~"school|supermarket|restaurant|cafe|fast_food|pharmacy|hospital|bank|gym"](around:2000,${lat},${lon});
        way["amenity"~"school|supermarket|restaurant|cafe|fast_food|pharmacy|hospital|bank|gym"](around:2000,${lat},${lon});
        node["leisure"="park"](around:2000,${lat},${lon});
        node["shop"~"supermarket|grocery|convenience"](around:2000,${lat},${lon});
        node["public_transport"="station"](around:2000,${lat},${lon});
        node["highway"="bus_stop"](around:2000,${lat},${lon});
        node["railway"~"station|subway_entrance"](around:2000,${lat},${lon});
        way["building"](around:50,${lat},${lon});
      );
      out body;
    `

    const data = await fetchOverpass(query)
    if (!data) {
      // Cache the fallback briefly so we don't hammer the API on retries
      const fb = fallbackScores()
      _cache.set(key, { data: fb, ts: Date.now() - CACHE_TTL + 1000 * 60 * 5 })
      return fb
    }

    const allPlaces = data.elements ?? []

    const getDist = (p) => {
      const dy = (p.lat - lat) * 111320
      const dx = (p.lon - lon) * 40075000 * Math.cos(lat * Math.PI / 180) / 360
      return Math.sqrt(dx * dx + dy * dy)
    }

    const buildings = allPlaces.filter(p => p.tags?.building)
    let buildingType = 'house'
    if (buildings.length > 0) {
      const b = buildings[0].tags
      if (b['building:levels'] > 3 || b.building === 'apartments') buildingType = 'apartment'
      else if (b.building === 'semidetached_house' || b.building === 'terrace') buildingType = 'semi-detached'
      else if (b.building === 'detached') buildingType = 'detached'
    }

    const places1km = allPlaces.filter(p => p.lat && p.lon && getDist(p) <= 1000)
    const schools   = allPlaces.filter(p => p.tags?.amenity === 'school')
    const parks     = allPlaces.filter(p => p.tags?.leisure === 'park')
    const grocery   = allPlaces.filter(p => p.tags?.amenity === 'supermarket' || p.tags?.shop === 'supermarket' || p.tags?.shop === 'grocery')
    const transit   = allPlaces.filter(p => p.tags?.public_transport === 'station' || p.tags?.highway === 'bus_stop' || p.tags?.railway === 'station' || p.tags?.railway === 'subway_entrance')
    const restaurants = allPlaces.filter(p => p.tags?.amenity === 'restaurant' || p.tags?.amenity === 'cafe' || p.tags?.amenity === 'fast_food')
    const amenities = allPlaces.filter(p => p.tags?.amenity === 'pharmacy' || p.tags?.amenity === 'hospital' || p.tags?.amenity === 'bank' || p.tags?.amenity === 'gym' || p.tags?.shop === 'convenience')

    const result = {
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

    _cache.set(key, { data: result, ts: Date.now() })
    return result
  } catch {
    return fallbackScores()
  }
}
