// api/risk.js
// Canadian environmental risk — noiseRisk derived from pre-computed OSM noise zones
// (populated weekly by api/cron/precompute-noise-zones.js).
// crimeRisk removed — no free, reliable per-address crime API for Canada.
// FEMA, EPA, USGS removed — US-only APIs.

import { createClient } from '@libsql/client'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || 'https://dwelling.one')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  res.setHeader('Cache-Control', 's-maxage=86400')
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { lat, lon } = req.body
  if (!lat || !lon) return res.status(400).json({ error: 'lat and lon required' })
  const latNum = parseFloat(lat)
  const lonNum = parseFloat(lon)
  if (isNaN(latNum) || isNaN(lonNum) || latNum < -90 || latNum > 90 || lonNum < -180 || lonNum > 180) {
    return res.status(400).json({ error: 'Invalid coordinates' })
  }

  try {
    const noiseRisk = await getNoiseRiskFromCache(latNum, lonNum)
    const detailedRisk = { noiseRisk }
    return res.status(200).json({ detailedRisk })
  } catch (err) {
    console.error('Risk API error:', err.message)
    return res.status(200).json({ detailedRisk: { noiseRisk: 'Moderate' } })
  }
}

function getDb() {
  return createClient({ url: process.env.TURSO_URL, authToken: process.env.TURSO_TOKEN })
}

async function ensureNoiseTable(db) {
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
}

// Snap lat/lon to a ~1 km grid (0.01° ≈ 1 km)
async function getNoiseRiskFromCache(lat, lon) {
  const latGrid = Math.round(lat * 100) / 100
  const lonGrid = Math.round(lon * 100) / 100
  try {
    const db = getDb()
    await ensureNoiseTable(db)
    const result = await db.execute({
      sql: 'SELECT noise_rating FROM noise_zones WHERE lat_grid = ? AND lon_grid = ? LIMIT 1',
      args: [latGrid, lonGrid],
    })
    if (result.rows.length > 0) return result.rows[0].noise_rating
  } catch (err) {
    console.warn('Noise zone cache lookup failed:', err.message)
  }
  // Cache miss — cron hasn't populated this cell yet
  return 'Moderate'
}
