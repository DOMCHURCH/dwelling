// api/nhpi.js
// Fetches Statistics Canada NHPI monthly series (Table 18-10-0205-01)
// Cached in Turso for 30 days — StatCan updates monthly.

import { createClient } from '@libsql/client'
import { createHash } from 'crypto'
import { apiLimiter, applyLimit, getClientIp } from './_ratelimit.js'

// Vector IDs from Statistics Canada Table 18-10-0205-01 (NHPI, total new housing price index)
const CITY_VECTORS = {
  toronto:   41692920,
  vancouver: 41692914,
  calgary:   41692926,
  ottawa:    41692923,
  montreal:  41692917,
}

// Canada national YoY estimate used for "vs national" comparison
// Derived from StatCan published data (2024->2025 national NHPI trend)
const NATIONAL_YOY = 3.8

function getCityVector(city) {
  const c = (city || '').toLowerCase()
  if (c.includes('toronto') || c.includes('mississauga') || c.includes('brampton') || c.includes('vaughan') || c.includes('markham')) return CITY_VECTORS.toronto
  if (c.includes('vancouver') || c.includes('burnaby') || c.includes('surrey') || c.includes('richmond')) return CITY_VECTORS.vancouver
  if (c.includes('calgary') || c.includes('airdrie') || c.includes('cochrane')) return CITY_VECTORS.calgary
  if (c.includes('ottawa') || c.includes('gatineau') || c.includes('kanata') || c.includes('nepean')) return CITY_VECTORS.ottawa
  if (c.includes('montreal') || c.includes('laval') || c.includes('longueuil') || c.includes('brossard')) return CITY_VECTORS.montreal
  return null
}

// Annual multipliers (2025=100 base) for cities without live vector IDs
// Derived from Statistics Canada NHPI published data
const FALLBACK_MULTS = {
  edmonton:  { 2022: 98,  2023: 97, 2024: 101, 2025: 100 },
  winnipeg:  { 2022: 101, 2023: 97, 2024: 99,  2025: 100 },
  halifax:   { 2022: 102, 2023: 97, 2024: 100, 2025: 100 },
  hamilton:  { 2022: 99,  2023: 86, 2024: 93,  2025: 100 },
  kitchener: { 2022: 99,  2023: 87, 2024: 93,  2025: 100 },
  victoria:  { 2022: 98,  2023: 89, 2024: 94,  2025: 100 },
  kelowna:   { 2022: 98,  2023: 89, 2024: 94,  2025: 100 },
  saskatoon: { 2022: 101, 2023: 97, 2024: 99,  2025: 100 },
  regina:    { 2022: 100, 2023: 98, 2024: 99,  2025: 100 },
  default:   { 2022: 98,  2023: 91, 2024: 96,  2025: 100 },
}

function getFallbackMults(city) {
  const c = (city || '').toLowerCase()
  for (const [key, vals] of Object.entries(FALLBACK_MULTS)) {
    if (key !== 'default' && c.includes(key)) return vals
  }
  return FALLBACK_MULTS.default
}

// Linearly interpolate annual multipliers into monthly data points
function syntheticMonthly(mults) {
  const entries = Object.entries(mults).map(([y, v]) => ({ year: +y, val: +v })).sort((a, b) => a.year - b.year)
  const months = []
  for (let i = 0; i < entries.length - 1; i++) {
    const { year: y0, val: v0 } = entries[i]
    const { year: y1, val: v1 } = entries[i + 1]
    for (let m = 0; m < 12; m++) {
      const t = m / 12
      months.push({ date: y0 + '-' + String(m + 1).padStart(2, '0'), value: +(v0 + (v1 - v0) * t).toFixed(1) })
    }
  }
  const last = entries[entries.length - 1]
  for (let m = 0; m < 12; m++) {
    months.push({ date: last.year + '-' + String(m + 1).padStart(2, '0'), value: +last.val })
  }
  return months.slice(-24)
}

function computeMetrics(months) {
  if (!months?.length) return { yoyChange: null, trend3m: 'stable' }
  const n = months.length
  const latest = months[n - 1].value
  const yearAgo = months[Math.max(0, n - 13)].value
  const yoyChange = yearAgo > 0 ? +((latest - yearAgo) / yearAgo * 100).toFixed(1) : null
  let trend3m = 'stable'
  if (n >= 4) {
    const recentSlope = months[n - 1].value - months[n - 3].value
    const prevSlope = n >= 6 ? months[n - 3].value - months[n - 5].value : recentSlope
    if (Math.abs(recentSlope) < 0.3) {
      trend3m = 'stable'
    } else if (recentSlope > 0) {
      trend3m = (prevSlope > 0 && recentSlope > prevSlope * 1.3) ? 'accelerating' : 'rising'
    } else {
      trend3m = (prevSlope < 0 && recentSlope < prevSlope * 1.3) ? 'decelerating' : 'cooling'
    }
  }
  return { yoyChange, trend3m }
}

async function fetchWithTimeout(url, opts = {}, ms = 12000) {
  const ctrl = new AbortController()
  const id = setTimeout(() => ctrl.abort(), ms)
  try {
    return await fetch(url, { ...opts, signal: ctrl.signal })
  } finally {
    clearTimeout(id)
  }
}

async function fetchStatCanSeries(vectorId, nPeriods = 24) {
  const url = `https://www150.statcan.gc.ca/t1/wds/rest/getDataFromVectorsAndLatestNPeriods/${vectorId}/${nPeriods}`
  const res = await fetchWithTimeout(url, { headers: { 'User-Agent': 'DwellingApp/1.0', 'Accept': 'application/json' } })
  if (!res.ok) throw new Error(`StatCan ${res.status}`)
  const data = await res.json()
  const points = data?.[0]?.object?.vectorDataPoint
  if (!points?.length) throw new Error('No data points')
  return points
    .filter(p => p.value != null && p.value !== '')
    .map(p => ({ date: String(p.refPerRaw || p.refPer || '').slice(0, 7), value: parseFloat(p.value) }))
    .filter(p => !isNaN(p.value) && p.date.length === 7)
    .sort((a, b) => a.date.localeCompare(b.date))
}

// ── DB cache ──────────────────────────────────────────────────────────────────

function getDb() {
  return createClient({ url: process.env.TURSO_URL, authToken: process.env.TURSO_TOKEN })
}

let _tableReady = false
async function ensureTable(db) {
  if (_tableReady) return
  await db.execute(`CREATE TABLE IF NOT EXISTS cached_nhpi (
    cache_key  TEXT PRIMARY KEY,
    data_json  TEXT NOT NULL,
    fetched_at TEXT NOT NULL,
    expires_at TEXT NOT NULL
  )`)
  _tableReady = true
}

async function getCached(key) {
  try {
    const db = getDb()
    await ensureTable(db)
    const r = await db.execute({ sql: 'SELECT data_json FROM cached_nhpi WHERE cache_key = ? AND expires_at > ? LIMIT 1', args: [key, new Date().toISOString()] })
    if (r.rows.length) return JSON.parse(r.rows[0].data_json)
  } catch (e) { console.warn('NHPI cache read:', e.message) }
  return null
}

async function setCache(key, data) {
  const db = getDb()
  await ensureTable(db)
  const now = new Date()
  const exp = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) // 30 days
  await db.execute({
    sql: `INSERT INTO cached_nhpi (cache_key, data_json, fetched_at, expires_at) VALUES (?, ?, ?, ?)
          ON CONFLICT(cache_key) DO UPDATE SET data_json=excluded.data_json, fetched_at=excluded.fetched_at, expires_at=excluded.expires_at`,
    args: [key, JSON.stringify(data), now.toISOString(), exp.toISOString()],
  })
}

// ── Handler ───────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  if ((req.headers.origin || '') === (process.env.ALLOWED_ORIGIN || 'https://dwelling.one'))
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin)
  res.setHeader('Vary', 'Origin')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const clientIp = getClientIp(req)
  if (await applyLimit(apiLimiter, clientIp, res)) return

  const { city, country } = req.body
  if (!city) return res.status(400).json({ error: 'Missing city' })

  const isCanada = !country || (country || '').toLowerCase().includes('canada')
  if (!isCanada) return res.status(200).json({ months: [], source: 'not_canada' })

  const cacheKey = createHash('sha256').update((city || '').toLowerCase()).digest('hex').slice(0, 32)
  const cached = await getCached(cacheKey)
  if (cached) return res.status(200).json({ ...cached, fromCache: true })

  const vectorId = getCityVector(city)
  let months = []
  let dataSource = 'statcan_live'

  if (vectorId) {
    try {
      months = await fetchStatCanSeries(vectorId, 24)
    } catch (e) {
      console.warn(`NHPI live fetch failed for ${city} (v${vectorId}):`, e.message)
      dataSource = 'statcan_estimates'
    }
  }

  if (!months.length) {
    months = syntheticMonthly(getFallbackMults(city))
    dataSource = 'statcan_estimates'
  }

  const { yoyChange, trend3m } = computeMetrics(months)
  const aboveNational = yoyChange != null ? +(yoyChange - NATIONAL_YOY).toFixed(1) : null

  const result = { months, yoyChange, trend3m, nationalYoy: NATIONAL_YOY, aboveNational, city, dataSource }
  setCache(cacheKey, result).catch(e => console.warn('NHPI cache write:', e.message))
  return res.status(200).json(result)
}
