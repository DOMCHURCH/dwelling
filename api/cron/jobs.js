// api/cron/jobs.js
// Single cron dispatcher — routes to the correct job based on ?job= query param.
// Vercel Hobby plan allows max 12 serverless functions; combining both cron handlers
// here keeps the total at exactly 12.
//
// vercel.json cron entries:
//   { "path": "/api/cron/jobs?job=noise-zones", "schedule": "0 3 * * 0" }
//   { "path": "/api/cron/jobs?job=keepalive",   "schedule": "0 6 * * *" }

import { Redis } from '@upstash/redis'
import { createClient } from '@libsql/client'

// ─── Shared auth guard ────────────────────────────────────────────────────────
function authGuard(req, res) {
  if (!process.env.CRON_SECRET) {
    console.error('[cron/jobs] FATAL: CRON_SECRET env var not set')
    res.status(500).json({ error: 'CRON_SECRET not configured' })
    return false
  }
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    res.status(401).json({ error: 'Unauthorized' })
    return false
  }
  return true
}

// ─── Job: redis-keepalive ─────────────────────────────────────────────────────
async function jobKeepalive(res) {
  const redis = Redis.fromEnv()
  await redis.set('keepalive', new Date().toISOString(), { ex: 172800 }) // 48h TTL
  return res.status(200).json({ ok: true, job: 'keepalive', pingedAt: new Date().toISOString() })
}

// ─── Job: precompute-noise-zones ──────────────────────────────────────────────
const CANADIAN_CMAS = [
  { name: 'Toronto',     bbox: [43.5, -79.7, 43.9, -79.1] },
  { name: 'Montreal',    bbox: [45.4, -73.9, 45.7, -73.4] },
  { name: 'Vancouver',   bbox: [49.0, -123.3, 49.4, -122.5] },
  { name: 'Calgary',     bbox: [50.8, -114.3, 51.2, -113.8] },
  { name: 'Edmonton',    bbox: [53.3, -113.8, 53.7, -113.2] },
  { name: 'Ottawa',      bbox: [45.2, -76.0, 45.6, -75.4] },
  { name: 'Winnipeg',    bbox: [49.7, -97.4, 49.99, -96.9] },
  { name: 'Quebec City', bbox: [46.7, -71.5, 46.95, -71.1] },
  { name: 'Hamilton',    bbox: [43.1, -80.0, 43.4, -79.6] },
  { name: 'Halifax',     bbox: [44.55, -63.75, 44.75, -63.5] },
  { name: 'Victoria',    bbox: [48.4, -123.5, 48.5, -123.3] },
  { name: 'Kitchener',   bbox: [43.3, -80.7, 43.6, -80.3] },
]

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter'
const GRID_STEP = 0.01

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

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

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

async function jobNoiseZones(res) {
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
      const now = new Date().toISOString()
      for (let i = 0; i < rows.length; i += 100) {
        for (const row of rows.slice(i, i + 100)) {
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
    await new Promise(r => setTimeout(r, 3000))
  }
  return res.status(200).json({ ok: true, job: 'noise-zones', ...results })
}

// ─── Main dispatcher ──────────────────────────────────────────────────────────
export default async function handler(req, res) {
  if (!authGuard(req, res)) return

  const job = req.query?.job
  if (job === 'keepalive') return jobKeepalive(res)
  if (job === 'noise-zones') return jobNoiseZones(res)

  return res.status(400).json({ error: `Unknown job: "${job}". Valid jobs: keepalive, noise-zones` })
}
