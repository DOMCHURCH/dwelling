// api/external.js — server-side proxy for HUD Fair Market Rent + US Census ACS
// Merges what were two separate files to stay within Vercel Hobby's 12-function limit.
// Both API keys (HUD_TOKEN, CENSUS_API_KEY) are server-side only — never in client bundle.
import { apiLimiter, applyLimit } from './_ratelimit.js'
import { getClientIp } from './_ratelimit.js'

const HUD_TOKEN = process.env.HUD_TOKEN ?? ''
const CENSUS_KEY = process.env.CENSUS_API_KEY ?? ''
const HUD_BASE = 'https://www.huduser.gov/hudapi/public'
const CENSUS_BASE = 'https://api.census.gov/data'
const GEOCODER_BASE = 'https://geocoding.geo.census.gov/geocoder'
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'https://dwelling.one'

// ── HUD Fair Market Rent ──────────────────────────────────────────────────────
async function getFairMarketRent(zipCode) {
  if (!HUD_TOKEN || !zipCode) return null
  // Normalize: accept plain 5-digit or ZIP+4 (12345-6789), extract the 5-digit part
  const zip5 = zipCode.trim().match(/^(\d{5})(?:-\d{4})?$/)?.[1]
  if (!zip5) return null
  try {
    const crosswalkRes = await fetch(
      `${HUD_BASE}/usps?type=1&query=${zip5}`,
      { headers: { Authorization: `Bearer ${HUD_TOKEN}` } }
    )
    if (!crosswalkRes.ok) return null
    const crosswalk = await crosswalkRes.json()
    const countyCode = crosswalk?.data?.results?.[0]?.county
    if (!countyCode) return null

    const fmrRes = await fetch(
      `${HUD_BASE}/fmr/data/${countyCode}?year=2024`,
      { headers: { Authorization: `Bearer ${HUD_TOKEN}` } }
    )
    if (!fmrRes.ok) return null
    const fmr = await fmrRes.json()
    const fmrData = fmr?.data?.basicdata
    if (!fmrData) return null

    return {
      studio: fmrData.Efficiency ?? null,
      oneBed: fmrData.One_Bedroom ?? null,
      twoBed: fmrData.Two_Bedroom ?? null,
      threeBed: fmrData.Three_Bedroom ?? null,
      fourBed: fmrData.Four_Bedroom ?? null,
      countyName: fmrData.county_name ?? null,
      areaName: fmrData.areaname ?? null,
      year: 2024,
      dataSource: 'HUD Fair Market Rent 2024',
    }
  } catch { return null }
}

// ── US Census ACS ─────────────────────────────────────────────────────────────
async function getAddressTract(street, city, state) {
  const params = new URLSearchParams({
    street, city, state: state || '',
    benchmark: 'Public_AR_Current', vintage: 'Current_Current',
    layers: 'Census Tracts', format: 'json',
  })
  try {
    const res = await fetch(`${GEOCODER_BASE}/geographies/address?${params}`)
    const data = await res.json()
    const match = data?.result?.addressMatches?.[0]
    if (!match) return null
    const geo = match.geographies?.['Census Tracts']?.[0]
    if (!geo) return null
    return { state: geo.STATE, county: geo.COUNTY, tract: geo.TRACT }
  } catch { return null }
}

async function getCensusData(street, city, state) {
  if (!CENSUS_KEY) return null
  const tract = await getAddressTract(street, city, state)
  if (!tract) return null

  const variables = [
    'B25077_001E', 'B25064_001E', 'B19013_001E', 'B25035_001E',
    'B25003_001E', 'B25003_002E', 'B25003_003E', 'NAME',
  ].join(',')
  try {
    const url = `${CENSUS_BASE}/2022/acs/acs5?get=${variables}&for=tract:${tract.tract}&in=state:${tract.state}%20county:${tract.county}&key=${CENSUS_KEY}`
    const res = await fetch(url)
    const data = await res.json()
    if (!data || data.length < 2) return null
    const headers = data[0]
    const values = data[1]
    const obj = {}
    headers.forEach((h, i) => { obj[h] = values[i] })
    return {
      medianHomeValueUSD: parseInt(obj.B25077_001E) || null,
      medianGrossRentUSD: parseInt(obj.B25064_001E) || null,
      medianHouseholdIncomeUSD: parseInt(obj.B19013_001E) || null,
      medianYearBuilt: parseInt(obj.B25035_001E) || null,
      totalOccupiedUnits: parseInt(obj.B25003_001E) || null,
      ownerOccupiedUnits: parseInt(obj.B25003_002E) || null,
      renterOccupiedUnits: parseInt(obj.B25003_003E) || null,
      tractName: obj.NAME || null,
      ownerOccupancyRate: obj.B25003_001E && obj.B25003_002E
        ? Math.round((parseInt(obj.B25003_002E) / parseInt(obj.B25003_001E)) * 100)
        : null,
      dataSource: 'US Census Bureau ACS 5-Year Estimates (2022)',
    }
  } catch { return null }
}

// ── Handler ───────────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  const origin = req.headers.origin || ''
  if (origin === ALLOWED_ORIGIN) res.setHeader('Access-Control-Allow-Origin', origin)
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  res.setHeader('Vary', 'Origin')
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const clientIp = getClientIp(req)
  if (await applyLimit(apiLimiter, clientIp, res)) return

  const { action } = req.body || {}

  if (action === 'fmr') {
    const { zipCode } = req.body
    if (!zipCode) return res.status(400).json({ error: 'zipCode required.' })
    return res.status(200).json(await getFairMarketRent(zipCode))
  }

  if (action === 'census') {
    const { street, city, state, country } = req.body
    if (!country?.toLowerCase().includes('united states')) return res.status(200).json(null)
    if (!street || !city) return res.status(400).json({ error: 'street and city required.' })
    return res.status(200).json(await getCensusData(street, city, state))
  }

  return res.status(400).json({ error: 'Unknown action.' })
}
