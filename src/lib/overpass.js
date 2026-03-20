const BASE = 'https://overpass-api.de/api/interpreter'

const sleep = (ms) => new Promise(r => setTimeout(r, ms))

// Utiliser un serveur de secours si le serveur principal échoue
const FALLBACK_BASES = [
  'https://overpass-api.de/api/interpreter',
  'https://z.overpass-api.de/api/interpreter',
  'https://w.overpass-api.de/api/interpreter',
]

async function fetchOverpass(query, retries = 3) {
  for (let baseIndex = 0; baseIndex < FALLBACK_BASES.length; baseIndex++) {
    const base = FALLBACK_BASES[baseIndex]
    
    for (let i = 0; i <= retries; i++) {
      try {
        // Augmenter le timeout pour les requêtes complexes
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 45000) // 45 secondes
        
        const res = await fetch(base, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: `data=${encodeURIComponent(query)}`,
          signal: controller.signal,
        })
        
        clearTimeout(timeout)
        
        // Gérer les différents codes d'erreur
        if (res.status === 429) {
          // Rate limit : attendre avant de réessayer
          await sleep(2000 * (i + 1))
          continue
        }
        
        if (res.status === 504 || res.status === 503 || res.status === 502) {
          // Erreur serveur : essayer le serveur suivant ou réessayer
          if (baseIndex < FALLBACK_BASES.length - 1) {
            console.warn(`Server ${base} returned ${res.status}, trying fallback...`)
            break // Sortir de la boucle de retries pour essayer le serveur suivant
          }
          // Si c'est le dernier serveur, réessayer
          await sleep(3000 * (i + 1))
          continue
        }
        
        if (!res.ok) {
          console.error(`Overpass API error: ${res.status} ${res.statusText}`)
          return null
        }
        
        return await res.json()
      } catch (err) {
        if (err.name === 'AbortError') {
          console.warn(`Request to ${base} timed out, trying fallback...`)
          if (baseIndex < FALLBACK_BASES.length - 1) {
            break // Essayer le serveur suivant
          }
          // Si c'est le dernier serveur, réessayer
          await sleep(1000)
          continue
        }
        
        console.error(`Fetch error from ${base}:`, err)
        if (i === retries) {
          if (baseIndex < FALLBACK_BASES.length - 1) {
            break // Essayer le serveur suivant
          }
          return null
        }
        await sleep(1000)
      }
    }
  }
  return null
}

// Diviser les requêtes en plusieurs appels pour éviter les timeouts
async function queryNearbyPlaces(lat, lon, radius) {
  try {
    // Requête 1 : Écoles et parcs
    const query1 = `
      [out:json][timeout:25];
      (
        node["amenity"="school"]["name"](around:${radius},${lat},${lon});
        way["amenity"="school"]["name"](around:${radius},${lat},${lon});
        node["leisure"="park"]["name"](around:${radius},${lat},${lon});
        way["leisure"="park"]["name"](around:${radius},${lat},${lon});
      );
      out body;
    `
    
    // Requête 2 : Commerces et alimentation
    const query2 = `
      [out:json][timeout:25];
      (
        node["amenity"="supermarket"]["name"](around:${radius},${lat},${lon});
        node["shop"="supermarket"]["name"](around:${radius},${lat},${lon});
        node["shop"="grocery"]["name"](around:${radius},${lat},${lon});
      );
      out body;
    `
    
    // Requête 3 : Restaurants et cafés
    const query3 = `
      [out:json][timeout:25];
      (
        node["amenity"="restaurant"](around:${radius},${lat},${lon});
        node["amenity"="cafe"](around:${radius},${lat},${lon});
        node["amenity"="fast_food"](around:${radius},${lat},${lon});
      );
      out body;
    `
    
    // Requête 4 : Santé et services
    const query4 = `
      [out:json][timeout:25];
      (
        node["amenity"="pharmacy"]["name"](around:${radius},${lat},${lon});
        node["amenity"="hospital"]["name"](around:${radius},${lat},${lon});
        node["amenity"="bank"](around:${radius},${lat},${lon});
        node["amenity"="gym"](around:${radius},${lat},${lon});
        node["shop"="convenience"](around:${radius},${lat},${lon});
      );
      out body;
    `
    
    // Requête 5 : Transports
    const query5 = `
      [out:json][timeout:25];
      (
        node["public_transport"="station"]["name"](around:${radius},${lat},${lon});
        node["highway"="bus_stop"](around:${radius},${lat},${lon});
        node["railway"="station"]["name"](around:${radius},${lat},${lon});
        node["railway"="subway_entrance"](around:${radius},${lat},${lon});
      );
      out body;
    `
    
    // Exécuter les requêtes en parallèle avec délai pour éviter le rate limiting
    const results = []
    const queries = [query1, query2, query3, query4, query5]
    
    for (const query of queries) {
      const result = await fetchOverpass(query)
      if (result?.elements) {
        results.push(...result.elements)
      }
      // Petit délai entre les requêtes
      await sleep(200)
    }
    
    return results
  } catch (err) {
    console.error('Error querying nearby places:', err)
    return []
  }
}

export async function getNeighborhoodScores(lat, lon) {
  try {
    // Utiliser 1km et 2km de rayon
    const places = await queryNearbyPlaces(lat, lon, 1000)
    await sleep(500)
    const places2km = await queryNearbyPlaces(lat, lon, 2000)

    // Dédupliquer par ID
    const allPlaces = [...new Map([...places, ...places2km].map(p => [p.id, p])).values()]

    // Si aucune donnée n'a pu être récupérée, retourner des scores par défaut
    if (allPlaces.length === 0) {
      console.warn('No neighborhood data available, returning default scores')
      return {
        walkScore: 50,
        transitScore: 40,
        schoolScore: 50,
        amenityCount500m: 0,
        nearbySchools: [],
        nearbyParks: [],
        nearbyTransit: [],
        nearbyGrocery: [],
        dataSource: 'OpenStreetMap Overpass API (limited data)',
        error: 'Limited data available - some amenities may not be shown',
      }
    }

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

    // Walk score: basé sur la variété des destinations accessibles à pied dans 1km
    const walkCategories = [
      grocery.length > 0 ? 20 : 0,
      restaurants.length >= 3 ? 20 : restaurants.length * 5,
      parks.length > 0 ? 10 : 0,
      amenities.length > 0 ? 10 : 0,
      transit.length > 0 ? 10 : 0,
    ]
    const walkScore = Math.min(95, Math.max(15, walkCategories.reduce((a, b) => a + b, 0)))

    // Transit score: nombre d'arrêts/gares dans 2km
    const transitScore = Math.min(95, Math.max(10, transit.length * 8 + (transit.length > 0 ? 20 : 0)))

    // School score: écoles dans 2km
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
    // Retourner des scores par défaut en cas d'erreur
    return {
      walkScore: 50,
      transitScore: 40,
      schoolScore: 50,
      amenityCount500m: 0,
      nearbySchools: [],
      nearbyParks: [],
      nearbyTransit: [],
      nearbyGrocery: [],
      dataSource: 'OpenStreetMap Overpass API',
      error: 'Unable to fetch neighborhood data',
    }
  }
}
