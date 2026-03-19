const BASE = 'https://overpass-api.de/api/interpreter'

const sleep = (ms) => new Promise(r => setTimeout(r, ms))

async function fetchOverpass(query, retries = 2) {
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `data=${encodeURIComponent(query)}`,
      })
      if (res.status === 429) { await sleep(2000 * (i + 1)); continue }
      if (!res.ok) return null
      return await res.json()
    } catch {
      if (i === retries) return null
      await sleep(1000)
    }
  }
  return null
}

async function queryNearbyPlaces(lat, lon, radius) {
  const query = `
    [out:json][timeout:20];
    (
      node["amenity"="school"]["name"](around:${radius},${lat},${lon});
      way["amenity"="school"]["name"](around:${radius},${lat},${lon});
      node["leisure"="park"]["name"](around:${radius},${lat},${lon});
      way["leisure"="park"]["name"](around:${radius},${lat},${lon});
      node["amenity"="supermarket"]["name"](around:${radius},${lat},${lon});
      node["shop"="supermarket"]["name"](around:${radius},${lat},${lon});
      node["shop"="grocery"]["name"](around:${radius},${lat},${lon});
      node["amenity"="restaurant"](around:${radius},${lat},${lon});
      node["amenity"="cafe"](around:${radius},${lat},${lon});
      node["amenity"="fast_food"](around:${radius},${lat},${lon});
      node["amenity"="pharmacy"]["name"](around:${radius},${lat},${lon});
      node["amenity"="hospital"]["name"](around:${radius},${lat},${lon});
      node["public_transport"="station"]["name"](around:${radius},${lat},${lon});
      node["highway"="bus_stop"](around:${radius},${lat},${lon});
      node["railway"="station"]["name"](around:${radius},${lat},${lon});
      node["railway"="subway_entrance"](around:${radius},${lat},${lon});
      node["amenity"="bank"](around:${radius},${lat},${lon});
      node["amenity"="gym"](around:${radius},${lat},${lon});
      node["shop"="convenience"](around:${radius},${lat},${lon});
    );
    out body;
  `
  const data = await fetchOverpass(query)
  return data?.elements ?? []
}

export async function getNeighborhoodScores(lat, lon) {
  try {
    // Use 1km radius for all queries — suburban areas need wider radius
    const places = await queryNearbyPlaces(lat, lon, 1000)
    await sleep(300)
    const places2km = await queryNearbyPlaces(lat, lon, 2000)

    // Deduplicate by id
    const allPlaces = [...new Map([...places, ...places2km].map(p => [p.id, p])).values()]

    const schools = allPlaces.filter(p => p.tags?.amenity === 'school')
    const parks = allPlaces.filter(p => p.tags?.leisure === 'park')
    const grocery = allPlaces.filter(p =>
      p.tags?.amenity === 'supermarket' ||
      p.tags?.shop === 'supermarket' ||
      p.tags?.shop === 'grocery'
    )
    const transit = allPlaces.filter(p =>
      p.tags?.public_transport === 'station' ||
      p.tags?.highway === 'bus_stop' ||
      p.tags?.railway === 'station' ||
      p.tags?.railway === 'subway_entrance'
    )
    const restaurants = allPlaces.filter(p =>
      p.tags?.amenity === 'restaurant' ||
      p.tags?.amenity === 'cafe' ||
      p.tags?.amenity === 'fast_food'
    )
    const amenities = allPlaces.filter(p =>
      p.tags?.amenity === 'pharmacy' ||
      p.tags?.amenity === 'hospital' ||
      p.tags?.amenity === 'bank' ||
      p.tags?.amenity === 'gym' ||
      p.tags?.shop === 'convenience'
    )

    // Walk score: based on variety of walkable destinations within 1km
    // Suburban areas with a few amenities should score 30-50, not 5
    const walkCategories = [
      grocery.length > 0 ? 20 : 0,       // grocery is the most important
      restaurants.length >= 3 ? 20 : restaurants.length * 5, // dining
      parks.length > 0 ? 10 : 0,          // parks
      amenities.length > 0 ? 10 : 0,      // pharmacies, banks etc
      transit.length > 0 ? 10 : 0,        // any transit access
    ]
    const walkScore = Math.min(95, Math.max(15, walkCategories.reduce((a, b) => a + b, 0)))

    // Transit score: number of stops/stations within 2km
    // Bus stops are common in suburban Ottawa — each one counts
    const transitScore = Math.min(95, Math.max(10, transit.length * 8 + (transit.length > 0 ? 20 : 0)))

    // School score: schools within 2km
    const schoolScore = Math.min(95, Math.max(35, 40 + schools.length * 15))

    return {
      walkScore,
      transitScore,
      schoolScore,
      amenityCount500m: places.length,
      nearbySchools: schools.filter(p => p.tags?.name).map(p => p.tags.name).slice(0, 3),
      nearbyParks: parks.filter(p => p.tags?.name).map(p => p.tags.name).slice(0, 3),
      nearbyTransit: transit.filter(p => p.tags?.name).map(p => p.tags.name).slice(0, 5),
      nearbyGrocery: grocery.filter(p => p.tags?.name).map(p => p.tags.name).slice(0, 3),
      dataSource: 'OpenStreetMap Overpass API',
    }
  } catch (err) {
    console.error('Overpass error:', err)
    return null
  }
}
