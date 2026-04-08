// api/comps.js
// Fetches comparable listings from Realtor.ca (Canada only).
// Results are cached in Turso for 7 days — no live Realtor.ca hit per user request
// once the cache is warm.

import { createClient } from '@libsql/client'
import { createHash } from 'crypto'
import { apiLimiter, applyLimit } from './_ratelimit.js'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || 'https://dwelling.one')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown'
  if (await applyLimit(apiLimiter, clientIp, res)) return

  const { city, state, country, lat, lon } = req.body
  if (!city || !country) return res.status(400).json({ error: 'Missing required fields' })

  // Cache key: normalized city + province
  const cacheKey = createHash('sha256')
    .update(`${(city || '').toLowerCase()}|${(state || '').toLowerCase()}`)
    .digest('hex')

  try {
    // 1. Check DB cache first
    const cached = await getCachedComps(cacheKey)
    if (cached) return res.status(200).json({ ...cached, fromCache: true })

    // 2. Cache miss — fetch live
    const data = await fetchRealtorCaComps({ city, state, lat, lon })

    // 3. Store in cache (fire-and-forget — don't block response)
    storeCachedComps(cacheKey, data).catch(err =>
      console.warn('Failed to cache comps:', err.message)
    )

    return res.status(200).json(data)
  } catch (err) {
    console.error('Comps error:', err.message)
    return res.status(200).json({ comps: [], source: 'realtor_ca_unavailable', error: err.message })
  }
}

// ─── DB CACHE ────────────────────────────────────────────────────────────────

function getDb() {
  return createClient({ url: process.env.TURSO_URL, authToken: process.env.TURSO_TOKEN })
}

async function ensureCompsTable(db) {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS cached_comps (
      address_hash TEXT PRIMARY KEY,
      comps_json   TEXT NOT NULL,
      fetched_at   TEXT NOT NULL,
      expires_at   TEXT NOT NULL
    )
  `)
}

async function getCachedComps(cacheKey) {
  try {
    const db = getDb()
    await ensureCompsTable(db)
    const result = await db.execute({
      sql: 'SELECT comps_json FROM cached_comps WHERE address_hash = ? AND expires_at > ? LIMIT 1',
      args: [cacheKey, new Date().toISOString()],
    })
    if (result.rows.length > 0) {
      return JSON.parse(result.rows[0].comps_json)
    }
  } catch (err) {
    console.warn('Comps cache read failed:', err.message)
  }
  return null
}

async function storeCachedComps(cacheKey, data) {
  const db = getDb()
  await ensureCompsTable(db)
  const now = new Date()
  const expires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) // 7 days
  await db.execute({
    sql: `INSERT INTO cached_comps (address_hash, comps_json, fetched_at, expires_at)
          VALUES (?, ?, ?, ?)
          ON CONFLICT(address_hash) DO UPDATE SET
            comps_json = excluded.comps_json,
            fetched_at = excluded.fetched_at,
            expires_at = excluded.expires_at`,
    args: [cacheKey, JSON.stringify(data), now.toISOString(), expires.toISOString()],
  })
}

// ─── REALTOR.CA (CANADA) ─────────────────────────────────────────────────────

async function fetchRealtorCaComps({ city, state, lat, lon }) {
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'application/json',
    'Content-Type': 'application/x-www-form-urlencoded',
    'Referer': 'https://www.realtor.ca/',
    'Origin': 'https://www.realtor.ca',
  }

  const cityLower = (city || '').toLowerCase()
  const isLargeMetro = cityLower.includes('vancouver') || cityLower.includes('toronto') ||
    cityLower.includes('calgary') || cityLower.includes('edmonton') || cityLower.includes('montreal')
  const spread = isLargeMetro ? 0.35 : 0.22
  const bbox = {
    latMax: String((lat || 45.4) + spread),
    lonMax: String((lon || -75.7) + (spread * 1.4)),
    latMin: String((lat || 45.4) - spread),
    lonMin: String((lon || -75.7) - (spread * 1.4)),
  }

  const makeBody = (page) => new URLSearchParams({
    ZoomLevel: '11',
    LatitudeMax: bbox.latMax,
    LongitudeMax: bbox.lonMax,
    LatitudeMin: bbox.latMin,
    LongitudeMin: bbox.lonMin,
    Sort: '6-D',
    PropertyTypeGroupID: '1',
    TransactionTypeId: '2',
    Currency: 'CAD',
    RecordsPerPage: '50',
    CurrentPage: String(page),
    ApplicationId: '1',
    CultureId: '1',
    Version: '7.0',
    PropertySearchTypeId: '1',
  })

  const validateComp = (comp) => {
    if (!comp || comp.price <= 0) return false
    if (comp.daysOnMarket != null && comp.daysOnMarket > 365) return false
    return true
  }

  const parseListing = (listing) => {
    const price = parseInt(listing?.Property?.Price?.replace(/[^0-9]/g, '') || '0')
    if (!price || price < 50000) return null
    const sqftRaw = listing?.Building?.SizeInterior
    const sqft = sqftRaw ? parseInt(sqftRaw.replace(/[^0-9]/g, '')) : null
    return {
      address: listing?.Property?.Address?.AddressText || 'Nearby property',
      price,
      pricePerSqft: sqft && sqft > 100 ? Math.round(price / sqft) : null,
      sqft,
      beds: listing?.Building?.Bedrooms ? parseInt(listing.Building.Bedrooms) : null,
      baths: listing?.Building?.BathroomTotal ? parseInt(listing.Building.BathroomTotal) : null,
      daysOnMarket: listing?.InsertedDateUTC
        ? Math.round((Date.now() - new Date(listing.InsertedDateUTC).getTime()) / 86400000)
        : null,
      type: 'active_listing',
      source: 'realtor_ca',
      mlsNumber: listing?.MlsNumber || null,
    }
  }

  const comps = []
  const endpoints = [
    'https://api2.realtor.ca/Listing.svc/PropertySearch_Post',
    'https://api.realtor.ca/Listing.svc/PropertySearch_Post',
  ]

  for (const endpoint of endpoints) {
    if (comps.length >= 100) break
    for (let page = 1; page <= 3; page++) {
      try {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 10000) // 10s timeout
        let res
        try {
          res = await fetch(endpoint, {
            method: 'POST',
            headers,
            body: makeBody(page).toString(),
            signal: controller.signal,
          })
        } finally {
          clearTimeout(timeout)
        }

        if (!res.ok) {
          console.warn(`Realtor.ca ${endpoint} returned ${res.status}`)
          break
        }

        let data
        try {
          data = await res.json()
        } catch {
          console.warn('Realtor.ca returned unparseable JSON')
          break
        }

        const listings = data?.Results || []
        if (!listings.length) break
        for (const listing of listings) {
          const parsed = parseListing(listing)
          if (parsed && validateComp(parsed)) comps.push(parsed)
        }
        if (listings.length < 50) break
      } catch (e) {
        if (e.name === 'AbortError') console.warn('Realtor.ca fetch timed out (10s)')
        break
      }
    }
    if (comps.length > 0) break
  }

  // Deduplicate by MLS number
  const seen = new Set()
  const deduped = comps.filter(c => {
    const key = c.mlsNumber || c.address
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  const validListings = deduped.filter(c => c.price > 0)

  // Determine data quality source tag
  let source = 'realtor_ca'
  if (validListings.length === 0) source = 'realtor_ca_unavailable'
  else if (validListings.length < 3) source = 'realtor_ca_sparse'

  // Fallback to hardcoded StatCan baselines if Realtor.ca returned nothing
  if (validListings.length === 0) {
    const synth = getStatCanFallbackListings(city)
    return { listings: synth, comps: synth, source: 'statcan_fallback', count: synth.length }
  }

  return { listings: validListings, comps: validListings, source, count: validListings.length }
}

// Hardcoded median price baselines per city from StatCan NHPI + CREA data (2025)
// Used only when Realtor.ca is unreachable from Vercel
function getStatCanFallbackListings(city) {
  const c = (city || '').toLowerCase()
  let medianPrice, ppsf, rent

  if (c.includes('vancouver') || c.includes('burnaby') || c.includes('richmond') || c.includes('surrey')) {
    medianPrice = 1320000; ppsf = 1050; rent = 2900
  } else if (c.includes('toronto') || c.includes('mississauga') || c.includes('brampton')) {
    medianPrice = 1080000; ppsf = 870; rent = 2600
  } else if (c.includes('calgary')) {
    medianPrice = 630000; ppsf = 430; rent = 2000
  } else if (c.includes('edmonton')) {
    medianPrice = 430000; ppsf = 310; rent = 1650
  } else if (c.includes('ottawa') || c.includes('gatineau')) {
    medianPrice = 620000; ppsf = 410; rent = 2100
  } else if (c.includes('montreal') || c.includes('laval')) {
    medianPrice = 540000; ppsf = 390; rent = 1800
  } else if (c.includes('hamilton')) {
    medianPrice = 710000; ppsf = 470; rent = 2000
  } else if (c.includes('kitchener') || c.includes('waterloo') || c.includes('cambridge')) {
    medianPrice = 700000; ppsf = 460; rent = 2000
  } else if (c.includes('victoria')) {
    medianPrice = 880000; ppsf = 620; rent = 2400
  } else if (c.includes('kelowna')) {
    medianPrice = 780000; ppsf = 520; rent = 2100
  } else if (c.includes('halifax')) {
    medianPrice = 530000; ppsf = 360; rent = 1900
  } else if (c.includes('winnipeg')) {
    medianPrice = 360000; ppsf = 270; rent = 1500
  } else if (c.includes('saskatoon')) {
    medianPrice = 360000; ppsf = 270; rent = 1450
  } else if (c.includes('regina')) {
    medianPrice = 310000; ppsf = 240; rent = 1350
  } else {
    medianPrice = 580000; ppsf = 400; rent = 1900
  }

  const spread = 0.15
  return Array.from({ length: 12 }, (_, i) => {
    const factor = 1 + (i - 6) * spread / 6
    const price = Math.round(medianPrice * factor / 1000) * 1000
    return {
      address: `${city} area listing ${i + 1}`,
      price,
      pricePerSqft: Math.round(ppsf * factor),
      sqft: Math.round(price / ppsf),
      beds: 3,
      baths: 2,
      daysOnMarket: 18 + i * 3,
      type: 'active_listing',
      source: 'statcan_estimate',
      mlsNumber: null,
    }
  })
}
