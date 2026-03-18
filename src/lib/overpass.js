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
      if (res.status === 429) {
        await sleep(2000 * (i + 1))
        continue
      }
      if (!res.ok) return null
      return await res.json()
    } catch {
      if (i === retries) return null
      await sleep(1000)
    }
  }
  return null
}

async function queryAmenityCount(lat, lon, radius) {
  const query = `
    [out:json][timeout:15];
    (
      node["amenity"="school"](around:${radius},${lat},${lon});
      way["amenity"="school"](around:${radius},${lat},${lon});
      node["amenity"="supermarket"](around:${radius},${lat},${lon});
      node["shop"="supermarket"](around:${radius},${lat},${lon});
      node["shop"="grocery"](around:${radius},${lat},${lon});
      node["amenity"="restaurant"](around:${radius},${lat},${lon});
      node["amenity"="cafe"](around:${radius},${lat},${lon});
      node["amenity"="hospital"](around:${radius},${lat},${lon});
      node["amenity"="pharmacy"](around:${radius},${lat},${lon});
      node["leisure"="park"](around:${radius},${lat},${lon});
      node["leisure"="playground"](around:${radius},${lat},${lon});
      node["public_transport"="station"](around:${radius},${lat},${lon});
      node["public_transport"="stop_position"](around:${radius},${lat},${lon});
      node["highway"="bus_stop"](around:${radius},${lat},${lon});
      node["railway"="station"](around:${radius},${lat},${lon});
      node["railway"="subway_entrance"](around:${radius},${lat},${lon});
    );
    out count;
  `
  const data = await fetchOverpass(query)
  return data?.elements?.[0]?.tags?.total ?? 0
}

async function queryNearbyPlaces(lat, lon, radius) {
  const query = `
    [out:json][timeout:15];
    (
      node["amenity"="school"]["name"](around:${radius},${lat},${lon});
      node["leisure"="park"]["name"](around:${radius},${lat},${lon});
      node["amenity"="supermarket"]["name"](around:${radius},${lat},${lon});
      node["shop"="supermarket"]["name"](around:${radius},${lat},${lon});
      node["public_transport"="station"]["name"](around:${radius},${lat},${lon});
      node["railway"="station"]["name"](around:${radius},${lat},${lon});
      node["highway"="bus_stop"]["name"](around:${radius},${lat},${lon});
      node["amenity"="hospital"]["name"](around:${radius},${lat},${lon});
    );
    out body;
  `
  const data = await fetchOverpass(query)
  return data?.elements ?? []
}

export async function getNeighborhoodScores(lat, lon) {
  try {
    // Sequential to avoid rate limiting
    const count500 = await queryAmenityCount(lat, lon, 500)
    await sleep(500)
    const places = await queryNearbyPlaces(lat, lon, 800)

    // Walkability score based on amenities within 500m
    const walkScore = Math.min(95, Math.round((count500 / 30) * 95))

    // Transit score based on named transit stops
    const transitNodes = places.filter(p =>
      p.tags?.public_transport === 'station' ||
      p.tags?.highway === 'bus_stop' ||
      p.tags?.railway === 'station' ||
      p.tags?.railway === 'subway_entrance'
    )
    const transitScore = Math.min(95, transitNodes.length * 12)

    // School score based on schools within 800m
    const schoolNodes = places.filter(p => p.tags?.amenity === 'school')
    const schoolScore = Math.min(95, 40 + schoolNodes.length * 18)

    return {
      walkScore: Math.max(5, walkScore),
      transitScore: Math.max(5, transitScore),
      schoolScore: Math.max(30, schoolScore),
      amenityCount500m: count500,
      nearbySchools: schoolNodes.filter(p => p.tags?.name).map(p => p.tags.name).slice(0, 3),
      nearbyParks: places.filter(p => p.tags?.leisure === 'park' && p.tags?.name).map(p => p.tags.name).slice(0, 3),
      nearbyTransit: transitNodes.filter(p => p.tags?.name).map(p => p.tags.name).slice(0, 3),
      nearbyGrocery: places.filter(p => (p.tags?.amenity === 'supermarket' || p.tags?.shop === 'supermarket') && p.tags?.name).map(p => p.tags.name).slice(0, 3),
      dataSource: 'OpenStreetMap Overpass API',
    }
  } catch (err) {
    console.error('Overpass error:', err)
    return null
  }
}
