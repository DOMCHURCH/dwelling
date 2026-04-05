// api/marketdata.js
// Serves live US market data from Redfin public data center
// + hardcoded Canadian data (no free live source exists)
// Cached in memory for 24 hours — only fetches once per day per city

// ─── IN-MEMORY CACHE ─────────────────────────────────────────────────────────

let _usCache = null       // { data: Map<cityKey, {...}>, fetchedAt: timestamp }
let _fetchPromise = null  // prevent parallel fetches

const CACHE_TTL = 1000 * 60 * 60 * 24 // 24 hours

// ─── CANADIAN DATA (hardcoded — CREA/WOWA March 2026) ────────────────────────

const CANADA = {
  vancouver:          { detached: 1930000, condo: 813000,  rent: 2900, ppsf: 1100, yoy: -0.7  },
  surrey:             { detached: 1450000, condo: 620000,  rent: 2400, ppsf: 750,  yoy: -1.0  },
  burnaby:            { detached: 1750000, condo: 780000,  rent: 2700, ppsf: 950,  yoy: -0.8  },
  richmond:           { detached: 1650000, condo: 720000,  rent: 2600, ppsf: 900,  yoy: -0.5  },
  kelowna:            { detached: 890000,  condo: 480000,  rent: 2000, ppsf: 520,  yoy: -2.0  },
  victoria:           { detached: 1050000, condo: 580000,  rent: 2200, ppsf: 650,  yoy: -0.6  },
  abbotsford:         { detached: 1050000, condo: 520000,  rent: 2100, ppsf: 580,  yoy: -1.5  },
  chilliwack:         { detached: 820000,  condo: 430000,  rent: 1800, ppsf: 460,  yoy: -1.0  },
  kamloops:           { detached: 680000,  condo: 360000,  rent: 1700, ppsf: 390,  yoy: 1.0   },
  nanaimo:            { detached: 720000,  condo: 400000,  rent: 1800, ppsf: 430,  yoy: 0.5   },
  calgary:            { detached: 720000,  condo: 340000,  rent: 2100, ppsf: 420,  yoy: 2.4   },
  edmonton:           { detached: 520000,  condo: 220000,  rent: 1700, ppsf: 280,  yoy: 1.2   },
  'red deer':         { detached: 420000,  condo: 200000,  rent: 1500, ppsf: 260,  yoy: 3.0   },
  lethbridge:         { detached: 380000,  condo: 185000,  rent: 1400, ppsf: 240,  yoy: 2.5   },
  'medicine hat':     { detached: 350000,  condo: 170000,  rent: 1300, ppsf: 230,  yoy: 2.0   },
  airdrie:            { detached: 590000,  condo: 290000,  rent: 1900, ppsf: 360,  yoy: 2.0   },
  'grande prairie':   { detached: 390000,  condo: 180000,  rent: 1450, ppsf: 245,  yoy: 1.5   },
  toronto:            { detached: 1350000, condo: 640000,  rent: 2400, ppsf: 870,  yoy: -3.5  },
  mississauga:        { detached: 1250000, condo: 600000,  rent: 2300, ppsf: 750,  yoy: -3.0  },
  brampton:           { detached: 1100000, condo: 540000,  rent: 2100, ppsf: 650,  yoy: -2.5  },
  hamilton:           { detached: 820000,  condo: 470000,  rent: 1900, ppsf: 520,  yoy: -3.0  },
  london:             { detached: 680000,  condo: 380000,  rent: 1700, ppsf: 410,  yoy: -1.5  },
  kitchener:          { detached: 760000,  condo: 430000,  rent: 1900, ppsf: 460,  yoy: -2.0  },
  waterloo:           { detached: 750000,  condo: 420000,  rent: 1900, ppsf: 455,  yoy: -2.0  },
  cambridge:          { detached: 740000,  condo: 410000,  rent: 1850, ppsf: 450,  yoy: -1.5  },
  guelph:             { detached: 820000,  condo: 490000,  rent: 2000, ppsf: 510,  yoy: -1.5  },
  windsor:            { detached: 420000,  condo: 250000,  rent: 1500, ppsf: 280,  yoy: 2.0   },
  ottawa:             { detached: 780000,  condo: 420000,  rent: 2100, ppsf: 450,  yoy: 1.9   },
  kingston:           { detached: 620000,  condo: 380000,  rent: 1800, ppsf: 400,  yoy: 1.5   },
  barrie:             { detached: 720000,  condo: 420000,  rent: 1900, ppsf: 440,  yoy: -1.0  },
  sudbury:            { detached: 420000,  condo: 240000,  rent: 1500, ppsf: 260,  yoy: 3.0   },
  'thunder bay':      { detached: 340000,  condo: 200000,  rent: 1300, ppsf: 230,  yoy: 4.0   },
  oshawa:             { detached: 780000,  condo: 440000,  rent: 1900, ppsf: 470,  yoy: -2.0  },
  'st. catharines':   { detached: 650000,  condo: 380000,  rent: 1750, ppsf: 400,  yoy: -1.0  },
  montreal:           { detached: 620000,  condo: 430000,  rent: 1970, ppsf: 380,  yoy: 6.6   },
  'quebec city':      { detached: 400000,  condo: 280000,  rent: 1500, ppsf: 270,  yoy: 13.4  },
  laval:              { detached: 590000,  condo: 400000,  rent: 1900, ppsf: 360,  yoy: 5.0   },
  longueuil:          { detached: 560000,  condo: 380000,  rent: 1800, ppsf: 340,  yoy: 5.5   },
  gatineau:           { detached: 480000,  condo: 290000,  rent: 1600, ppsf: 310,  yoy: 3.0   },
  sherbrooke:         { detached: 370000,  condo: 240000,  rent: 1400, ppsf: 250,  yoy: 7.0   },
  saguenay:           { detached: 280000,  condo: 180000,  rent: 1100, ppsf: 180,  yoy: 5.0   },
  'trois-rivieres':   { detached: 290000,  condo: 185000,  rent: 1150, ppsf: 195,  yoy: 8.0   },
  winnipeg:           { detached: 410000,  condo: 240000,  rent: 1550, ppsf: 270,  yoy: 6.5   },
  saskatoon:          { detached: 390000,  condo: 220000,  rent: 1450, ppsf: 255,  yoy: 6.0   },
  regina:             { detached: 345000,  condo: 195000,  rent: 1350, ppsf: 230,  yoy: 4.0   },
  halifax:            { detached: 520000,  condo: 340000,  rent: 1900, ppsf: 340,  yoy: -0.8  },
  moncton:            { detached: 320000,  condo: 200000,  rent: 1350, ppsf: 215,  yoy: 5.0   },
  fredericton:        { detached: 290000,  condo: 185000,  rent: 1250, ppsf: 200,  yoy: 4.0   },
  'saint john':       { detached: 270000,  condo: 170000,  rent: 1200, ppsf: 190,  yoy: 3.5   },
  charlottetown:      { detached: 380000,  condo: 250000,  rent: 1500, ppsf: 270,  yoy: 2.0   },
  "st. john's":       { detached: 310000,  condo: 200000,  rent: 1300, ppsf: 210,  yoy: 4.0   },
}

// ─── US FALLBACK (used if Redfin fetch fails) ─────────────────────────────────

const US_FALLBACK = {
  'san jose':         { detached: 1626000, condo: 850000,  rent: 3100, ppsf: 870  },
  'san francisco':    { detached: 1181000, condo: 740000,  rent: 3200, ppsf: 980  },
  'los angeles':      { detached: 890000,  condo: 590000,  rent: 2800, ppsf: 680  },
  'san diego':        { detached: 895000,  condo: 580000,  rent: 2700, ppsf: 690  },
  seattle:            { detached: 728000,  condo: 460000,  rent: 2100, ppsf: 530  },
  portland:           { detached: 520000,  condo: 340000,  rent: 1700, ppsf: 360  },
  denver:             { detached: 590000,  condo: 380000,  rent: 1900, ppsf: 380  },
  austin:             { detached: 530000,  condo: 350000,  rent: 1800, ppsf: 310  },
  dallas:             { detached: 380000,  condo: 250000,  rent: 1700, ppsf: 220  },
  houston:            { detached: 310000,  condo: 210000,  rent: 1500, ppsf: 180  },
  miami:              { detached: 680000,  condo: 420000,  rent: 2400, ppsf: 430  },
  orlando:            { detached: 380000,  condo: 240000,  rent: 1700, ppsf: 230  },
  atlanta:            { detached: 380000,  condo: 260000,  rent: 1700, ppsf: 230  },
  chicago:            { detached: 340000,  condo: 270000,  rent: 1800, ppsf: 230  },
  boston:             { detached: 720000,  condo: 590000,  rent: 2800, ppsf: 680  },
  'new york':         { detached: 651000,  condo: 620000,  rent: 3500, ppsf: 840  },
  philadelphia:       { detached: 280000,  condo: 200000,  rent: 1500, ppsf: 180  },
  phoenix:            { detached: 430000,  condo: 280000,  rent: 1700, ppsf: 270  },
  minneapolis:        { detached: 340000,  condo: 230000,  rent: 1500, ppsf: 210  },
  detroit:            { detached: 203000,  condo: 140000,  rent: 1100, ppsf: 120  },
  nashville:          { detached: 490000,  condo: 320000,  rent: 1800, ppsf: 290  },
  charlotte:          { detached: 380000,  condo: 250000,  rent: 1700, ppsf: 230  },
  raleigh:            { detached: 420000,  condo: 280000,  rent: 1800, ppsf: 260  },
  'salt lake city':   { detached: 540000,  condo: 340000,  rent: 1700, ppsf: 340  },
  'las vegas':        { detached: 430000,  condo: 270000,  rent: 1700, ppsf: 280  },
  sacramento:         { detached: 520000,  condo: 340000,  rent: 1900, ppsf: 360  },
  columbus:           { detached: 290000,  condo: 200000,  rent: 1300, ppsf: 180  },
  indianapolis:       { detached: 255000,  condo: 175000,  rent: 1200, ppsf: 155  },
  'kansas city':      { detached: 270000,  condo: 185000,  rent: 1300, ppsf: 170  },
  'st. louis':        { detached: 235000,  condo: 160000,  rent: 1200, ppsf: 150  },
  baltimore:          { detached: 250000,  condo: 175000,  rent: 1400, ppsf: 165  },
  washington:         { detached: 680000,  condo: 450000,  rent: 2200, ppsf: 480  },
  honolulu:           { detached: 950000,  condo: 520000,  rent: 2400, ppsf: 640  },
}

// ─── REDFIN CSV PARSER ────────────────────────────────────────────────────────
// Redfin publishes a public TSV at:
// https://redfin-public-data.s3.us-west-2.amazonaws.com/redfin_market_tracker/redfin_metro_market_tracker.tsv000
// Columns include: region, median_sale_price, median_list_price, homes_sold, period_end, etc.

async function fetchRedfinData() {
  const url = 'https://redfin-public-data.s3.us-west-2.amazonaws.com/redfin_market_tracker/redfin_metro_market_tracker.tsv000'
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
    signal: AbortSignal.timeout(15000),
  })
  if (!res.ok) throw new Error(`Redfin fetch failed: ${res.status}`)
  const text = await res.text()
  return parseRedfinTSV(text)
}

function parseRedfinTSV(text) {
  const lines = text.trim().split('\n')
  const headers = lines[0].split('\t')
  const regionIdx = headers.indexOf('region')
  const priceIdx = headers.indexOf('median_sale_price')
  const periodIdx = headers.indexOf('period_end')
  const propertyTypeIdx = headers.indexOf('property_type')

  if (regionIdx === -1 || priceIdx === -1) return null

  // Group by region, keep only the most recent period for each
  const latest = new Map()

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split('\t')
    const region = cols[regionIdx]?.replace(/, [A-Z]{2}$/, '').trim() // "Seattle, WA" → "Seattle"
    const price = parseInt(cols[priceIdx])
    const period = cols[periodIdx]
    const propType = cols[propertyTypeIdx]

    if (!region || !price || propType !== 'All Residential') continue

    const key = region.toLowerCase()
    const existing = latest.get(key)
    if (!existing || period > existing.period) {
      latest.set(key, { price, period })
    }
  }

  // Convert to our format
  const result = {}
  for (const [city, { price }] of latest) {
    result[city] = {
      detached: price,
      condo: Math.round(price * 0.72),  // condos ~72% of SFR price nationally
      rent: Math.round(price * 0.004),  // rent ~0.4% of price/month (gross yield ~4.8%)
      ppsf: Math.round(price / 1600),   // rough sqft estimate
      source: 'redfin_live',
    }
  }

  return result
}

// ─── FETCH + CACHE ────────────────────────────────────────────────────────────

async function getUSData() {
  // Return cached data if fresh
  if (_usCache && Date.now() - _usCache.fetchedAt < CACHE_TTL) {
    return _usCache.data
  }

  // Deduplicate parallel requests
  if (_fetchPromise) return _fetchPromise

  _fetchPromise = (async () => {
    try {
      const data = await fetchRedfinData()
      if (data && Object.keys(data).length > 100) {
        _usCache = { data, fetchedAt: Date.now() }
        console.log(`[marketdata] Redfin: loaded ${Object.keys(data).length} cities`)
        return data
      }
      throw new Error('Insufficient data returned')
    } catch (err) {
      console.warn('[marketdata] Redfin fetch failed, using fallback:', err.message)
      // Cache fallback for 1 hour so we retry sooner
      _usCache = { data: US_FALLBACK, fetchedAt: Date.now() - CACHE_TTL + 3600000 }
      return US_FALLBACK
    } finally {
      _fetchPromise = null
    }
  })()

  return _fetchPromise
}

// ─── LOOKUP HELPER ────────────────────────────────────────────────────────────

function findCity(cityName, dataset) {
  const key = cityName.toLowerCase().trim()
  if (dataset[key]) return { ...dataset[key], city: key }

  // Partial match
  for (const [k, v] of Object.entries(dataset)) {
    if (key.includes(k) || k.includes(key)) return { ...v, city: k }
  }
  return null
}

// ─── VERCEL HANDLER ──────────────────────────────────────────────────────────
import { apiLimiter, applyLimit } from './_ratelimit.js'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || 'https://dwelling-three.vercel.app')
  res.setHeader('Cache-Control', 'public, s-maxage=3600')

  const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown'
  if (await applyLimit(apiLimiter, clientIp, res)) return

  const { city, country } = req.method === 'POST' ? req.body : req.query
  if (!city) return res.status(400).json({ error: 'city param required' })

  const isCanada = country?.toLowerCase().includes('canada')

  if (isCanada) {
    const data = findCity(city, CANADA)
    if (!data) return res.status(404).json({ error: 'City not found', city })
    return res.json({ ...data, currency: 'CAD', source: 'hardcoded_crea_2026' })
  }

  // US — try live Redfin data
  const usData = await getUSData()
  const data = findCity(city, usData)
  if (!data) return res.status(404).json({ error: 'City not found', city })

  return res.json({ ...data, currency: 'USD' })
}
