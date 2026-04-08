// api/cron/precompute-noise-zones.js
// Vercel Cron Job — runs weekly (see vercel.json).
// Downloads OSM data for Canadian CMAs via Overpass and pre-computes noise
// ratings at 1 km grid resolution. Stores results in the noise_zones Turso table.
// This means api/risk.js NEVER calls Overpass live — it reads from the cache.
//
// Noise rating logic:
//   High   — within 200 m of motorway, trunk, primary road or railway
//   Moderate — within 300 m of secondary, tertiary road or large commercial area
//   Low    — everything else (residential/rural)

import { createClient } from '@libsql/client'

// Major Canadian CMA bounding boxes [latMin, lonMin, latMax, lonMax]
const CANADIAN_CMAS = [
  { name: 'Toronto',    bbox: [43.5, -79.7, 43.9, -79.1] },
  { name: 'Montreal',   bbox: [45.4, -73.9, 45.7, -73.4] },
  { name: 'Vancouver',  bbox: [49.0, -123.3, 49.4, -122.5] },
  { name: 'Calgary',    bbox: [50.8, -114.3, 51.2, -113.8] },
  { name: 'Edmonton',   bbox: [53.3, -113.8, 53.7, -113.2] },
  { name: 'Ottawa',     bbox: [45.2, -76.0, 45.6, -75.4] },
  { name: 'Winnipeg',   bbox: [49.7, -97.4, 49.99, -96.9] },
  { name: 'Quebec City',bbox: [46.7, -71.5, 46.95, -71.1] },
  { name: 'Hamilton',   bbox: [43.1, -80.0, 43.4, -79.6] },
  { name: 'Halifax',    bbox: [44.55, -63.75, 44.75, -63.5] },
  { name: 'Victoria',   bbox: [48.4, -123.5, 48.5, -123.3] },
  { name: 'Kitchener',  bbox: [43.3, -80.7, 43.6, -80.3] },
]

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter'
const GRID_STEP = 0.01 // ~1 km

export default async function handler(req, res) {
  // Vercel Cron passes Authorization header — validate it
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const db = createClient({ url: process.env.TURSO_URL, authToken: process.env.TURSO_TOKEN })

  await db.execute(`
    CREATE TABLE IF NOT EXISTS noise_zones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lat_grid REAL NOT NULL,
      lon_grid REAL NOT NULL,
      noise_rating TEXT NOT NULL,
      computed_at TEXT NOT NULL,
      UNIQUE(lat_grid, lon_grid)
    )
  `)

  const results = { processed: 0, errors: 0, cmas: [] }

  for (const cma of CANADIAN_CMAS) {
    try {
      const noiseMap = await fetchNoiseMap(cma.bbox)
      const rows = buildGridRows(cma.bbox, noiseMap)

      // Batch-insert in chunks of 100
      for (let i = 0; i < rows.length; i += 100) {
        const chunk = rows.slice(i, i + 100)
        const now = new Date().toISOString()
        for (const row of chunk) {
          await db.execute({
            sql: `INSERT INTO noise_zones (lat_grid, lon_grid, noise_rating, computed_at)
                  VALUES (?, ?, ?, ?)
                  ON CONFLICT(lat_grid, lon_grid) DO UPDATE SET
                    noise_rating = excluded.noise_rating,
                    computed_at  = excluded.computed_at`,
            args: [row.lat, row.lon, row.rating, now],
          })
        }
      }

      results.processed += rows.length
      results.cmas.push({ name: cma.name, cells: rows.length })
    } catch (err) {
      console.error(`Noise precompute failed for ${cma.name}:`, err.message)
      results.errors++
      results.cmas.push({ name: cma.name, error: err.message })
    }

    // Pause 3 seconds between CMAs to stay well under Overpass rate limits
    await new Promise(r => setTimeout(r, 3000))
  }

  return res.status(200).json({ ok: true, ...results })
}

// Fetch noise-relevant OSM features for a bounding box
async function fetchNoiseMap(bbox) {
  const [latMin, lonMin, latMax, lonMax] = bbox
  const query = `
    [out:json][timeout:60];
    (
      way["highway"~"motorway|trunk|primary|secondary|tertiary"](${latMin},${lonMin},${latMax},${lonMax});
      way["railway"~"rail|light_rail|subway"](${latMin},${lonMin},${latMax},${lonMax});
      node["aeroway"="aerodrome"](${latMin},${lonMin},${latMax},${lonMax});
    );
    out center;
  `

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 55000)
  let response
  try {
    response = await fetch(OVERPASS_URL, {
      method: 'POST',
      body: `data=${encodeURIComponent(query)}`,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timeout)
  }

  if (!response.ok) throw new Error(`Overpass returned ${response.status}`)
  const data = await response.json()

  // Build a set of (lat, lon, type) noise sources
  const sources = []
  for (const el of data.elements || []) {
    const lat = el.center?.lat ?? el.lat
    const lon = el.center?.lon ?? el.lon
    if (!lat || !lon) continue
    const highway = el.tags?.highway
    const railway = el.tags?.railway
    const aeroway = el.tags?.aeroway
    let level = 'low'
    if (aeroway === 'aerodrome' || highway === 'motorway' || highway === 'trunk' || railway) level = 'high'
    else if (highway === 'primary' || highway === 'secondary') level = 'high'
    else if (highway === 'tertiary') level = 'moderate'
    sources.push({ lat, lon, level })
  }

  return sources
}

// For each ~1 km grid cell, determine noise rating based on proximity to sources
function buildGridRows(bbox, sources) {
  const [latMin, lonMin, latMax, lonMax] = bbox
  const rows = []

  for (let lat = latMin; lat <= latMax; lat = Math.round((lat + GRID_STEP) * 10000) / 10000) {
    for (let lon = lonMin; lon <= lonMax; lon = Math.round((lon + GRID_STEP) * 10000) / 10000) {
      let rating = 'Low'

      for (const src of sources) {
        const dist = haversineKm(lat, lon, src.lat, src.lon)
        if (src.level === 'high' && dist < 0.2) { rating = 'High'; break }
        if (src.level === 'high' && dist < 0.4) { rating = 'Moderate' }
        if (src.level === 'moderate' && dist < 0.3 && rating !== 'High') { rating = 'Moderate' }
      }

      rows.push({ lat: Math.round(lat * 100) / 100, lon: Math.round(lon * 100) / 100, rating })
    }
  }

  return rows
}

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}
