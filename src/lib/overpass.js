const BASES = [
  'https://z.overpass-api.de/api/interpreter',      // Miroir 1 (moins sollicité)
  'https://w.overpass-api.de/api/interpreter',      // Miroir 2
  'https://overpass-api.de/api/interpreter',        // Serveur principal (en dernier)
]

const sleep = (ms) => new Promise(r => setTimeout(r, ms))

/**
 * Fetch avec backoff exponentiel et gestion des erreurs 429/504
 * Utilise une stratégie de "circuit breaker" pour éviter de surcharger les serveurs
 */
async function fetchOverpass(query, retries = 2) {
  let lastError = null
  
  for (let baseIndex = 0; baseIndex < BASES.length; baseIndex++) {
    const base = BASES[baseIndex]
    
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        // Backoff exponentiel : 1s, 3s, 7s, 15s...
        if (attempt > 0) {
          const backoffMs = Math.min(30000, (Math.pow(2, attempt) - 1) * 1000)
          console.log(`Backoff ${backoffMs}ms before retry ${attempt + 1}/${retries}...`)
          await sleep(backoffMs)
        }

        // Timeout court pour détecter rapidement les serveurs lents
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 35000) // 35 secondes
        
        console.log(`Attempting fetch from ${base} (server ${baseIndex + 1}/${BASES.length})...`)
        
        const res = await fetch(base, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: `data=${encodeURIComponent(query)}`,
          signal: controller.signal,
        })
        
        clearTimeout(timeout)
        
        // Succès
        if (res.ok) {
          console.log(`✓ Success from ${base}`)
          return await res.json()
        }

        // 429 (Too Many Requests) - attendre plus longtemps avant de réessayer
        if (res.status === 429) {
          console.warn(`429 Too Many Requests from ${base}, waiting before retry...`)
          lastError = new Error('Rate limited (429)')
          // Attendre 5-10 secondes avant de réessayer
          await sleep(5000 + Math.random() * 5000)
          continue
        }

        // 504, 503, 502 (Erreurs serveur) - essayer le serveur suivant
        if (res.status === 504 || res.status === 503 || res.status === 502) {
          console.warn(`${res.status} ${res.statusText} from ${base}`)
          lastError = new Error(`Server error: ${res.status}`)
          if (baseIndex < BASES.length - 1) {
            console.log(`Switching to next server...`)
            break // Sortir de la boucle de retries pour essayer le serveur suivant
          }
          // Si c'est le dernier serveur, réessayer avec backoff
          continue
        }

        // Autres erreurs
        console.error(`${res.status} ${res.statusText} from ${base}`)
        lastError = new Error(`HTTP ${res.status}`)
        return null

      } catch (err) {
        lastError = err
        
        if (err.name === 'AbortError') {
          console.warn(`Timeout from ${base}`)
          if (baseIndex < BASES.length - 1) {
            console.log(`Switching to next server...`)
            break // Essayer le serveur suivant
          }
          // Si c'est le dernier serveur, réessayer
          await sleep(2000)
          continue
        }

        console.error(`Fetch error from ${base}:`, err.message)
        if (attempt === retries && baseIndex === BASES.length - 1) {
          return null
        }
        
        if (attempt < retries) {
          await sleep(1000)
        }
      }
    }
  }
  
  console.error('All servers exhausted. Last error:', lastError?.message)
  return null
}

/**
 * Requête unique avec timeout court pour détecter rapidement les problèmes
 */
async function queryNearbyPlacesSimple(lat, lon, radius) {
  try {
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
    
    const data = await fetchOverpass(query, 1) // Seulement 1 retry pour cette requête
    return data?.elements ?? []
  } catch (err) {
    console.error('Error in queryNearbyPlacesSimple:', err)
    return []
  }
}

export async function getNeighborhoodScores(lat, lon) {
  try {
    console.log(`Fetching neighborhood scores for ${lat}, ${lon}...`)
    
    // Essayer d'abord avec un rayon de 1km
    const places1km = await queryNearbyPlacesSimple(lat, lon, 1000)
    
    // Petit délai avant la deuxième requête
    await sleep(1000)
    
    // Ensuite avec 2km
    const places2km = await queryNearbyPlacesSimple(lat, lon, 2000)

    // Dédupliquer par ID
    const allPlaces = [...new Map([...places1km, ...places2km].map(p => [p.id, p])).values()]

    console.log(`Found ${allPlaces.length} total places`)

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
        error: 'Overpass API servers are currently overloaded. Showing estimated scores.',
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
      amenityCount500m: places1km.length,
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
