const BASE = 'https://overpass-api.de/api/interpreter'

// Query nearby amenities within radius (meters) of a coordinate
async function queryAmenities(lat, lon, radius = 1000) {
  const query = `
    [out:json][timeout:10];
    (
      node["amenity"="school"](around:${radius},${lat},${lon});
      way["amenity"="school"](around:${radius},${lat},${lon});
      node["amenity"="supermarket"](around:${radius},${lat},${lon});
      node["shop"="supermarket"](around:${radius},${lat},${lon});
      node["shop"="grocery"](around:${radius},${lat},${lon});
      node["amenity"="restaurant"](around:${radius},${lat},${lon});
      node["amenity"="cafe"](around:${radius},${lat},${lon});
      node["amenity"="hospital"](around:${radius},${lat},${lon});
      node["amenity"="clinic"](around:${radius},${lat},${lon});
      node["amenity"="pharmacy"](around:${radius},${lat},${lon});
      node["leisure"="park"](around:${radius},${lat},${lon});
      node["leisure"="playground"](around:${radius},${lat},${lon});
      node["public_transport"="station"](around:${radius},${lat},${lon});
      node["public_transport"="stop_position"](around:${radius},${lat},${lon});
      node["highway"="bus_stop"](around:${radius},${lat},${lon});
      node["railway"="station"](around:${radius},${lat},${lon});
      node["railway"="subway_entrance"](around:${radius},${lat},${lon});
      node["amenity"="bank"](around:${radius},${lat},${lon});
      node["amenity"="gym"](around:${radius},${lat},${lon});
      node["leisure"="fitness_centre"](around:${radius},${lat},${lon});
    );
    out count;
  `

  const res = await fetch(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(query)}`,
  })

  if (!res.ok) return null
  const data = await res.json()
  return data
}

// Get named nearby places for display
async function queryNearbyPlaces(lat, lon, radius = 800) {
  const query = `
    [out:json][timeout:10];
    (
      node["amenity"="school"]["name"](around:${radius},${lat},${lon});
      node["leisure"="park"]["name"](around:${radius},${lat},${lon});
      node["amenity"="supermarket"]["name"](around:${radius},${lat},${lon});
      node["shop"="supermarket"]["name"](around:${radius},${lat},${lon});
      node["public_transport"="station"]["name"](around:${radius},${lat},${lon});
      node["railway"="station"]["name"](around:${radius},${lat},${lon});
      node["amenity"="hospital"]["name"](around:${radius},${lat},${lon});
    );
    out body;
  `

  const res = await fetch(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(query)}`,
  })

  if (!res.ok) return []
  const data = await res.json()
  return data.elements ?? []
}

// Count amenities by category
async function countByCategory(lat, lon, radius = 1000) {
  const query = `
    [out:json][timeout:15];
    (
      node["amenity"="school"](around:${radius},${lat},${lon});
      way["amenity"="school"](around:${radius},${lat},${lon});
    );
    out count;
  `
  const schoolRes = await fetch(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(query)}`,
  })
  const schoolData = await schoolRes.json().catch(() => null)
  const schoolCount = schoolData?.elements?.[0]?.tags?.total ?? 0

  return { schoolCount }
}

export async function getNeighborhoodScores(lat, lon) {
  try {
    // Run queries in parallel with different radii
    const [walk500, walk1000, places] = await Promise.all([
      queryAmenities(lat, lon, 500),
      queryAmenities(lat, lon, 1000),
      queryNearbyPlaces(lat, lon, 800),
    ])

    const count500 = walk500?.elements?.[0]?.tags?.total ?? 0
    const count1000 = walk1000?.elements?.[0]?.tags?.total ?? 0

    // Walkability: based on amenities within 500m (walking distance)
    // 0 amenities = 0, 5+ = 50, 15+ = 80, 30+ = 95
    const walkScore = Math.min(95, Math.round((count500 / 30) * 95))

    // Transit: look for transit stops within 1km
    const transitNodes = places.filter(p =>
      p.tags?.public_transport === 'station' ||
      p.tags?.public_transport === 'stop_position' ||
      p.tags?.highway === 'bus_stop' ||
      p.tags?.railway === 'station' ||
      p.tags?.railway === 'subway_entrance'
    )
    const transitScore = Math.min(95, transitNodes.length * 15)

    // School score: schools within 1km
    const schoolNodes = places.filter(p => p.tags?.amenity === 'school')
    const schoolScore = Math.min(95, 40 + schoolNodes.length * 15)

    // Categorize nearby places for context
    const nearbySchools = places
      .filter(p => p.tags?.amenity === 'school' && p.tags?.name)
      .map(p => p.tags.name)
      .slice(0, 3)

    const nearbyParks = places
      .filter(p => p.tags?.leisure === 'park' && p.tags?.name)
      .map(p => p.tags.name)
      .slice(0, 3)

    const nearbyTransit = places
      .filter(p => (p.tags?.public_transport || p.tags?.railway === 'station') && p.tags?.name)
      .map(p => p.tags.name)
      .slice(0, 3)

    const nearbyGrocery = places
      .filter(p => (p.tags?.amenity === 'supermarket' || p.tags?.shop === 'supermarket') && p.tags?.name)
      .map(p => p.tags.name)
      .slice(0, 3)

    return {
      walkScore: Math.max(5, walkScore),
      transitScore: Math.max(5, transitScore),
      schoolScore: Math.max(30, schoolScore),
      amenityCount500m: count500,
      amenityCount1km: count1000,
      nearbySchools,
      nearbyParks,
      nearbyTransit,
      nearbyGrocery,
      dataSource: 'OpenStreetMap Overpass API',
    }
  } catch (err) {
    console.error('Overpass error:', err)
    return null
  }
}
