// api/census.js — server-side proxy for US Census ACS API
// Keeps CENSUS_API_KEY out of the client bundle (was previously VITE_CENSUS_API_KEY)
import { apiLimiter, applyLimit } from './_ratelimit.js'

const CENSUS_KEY = process.env.CENSUS_API_KEY ?? ''
const CENSUS_BASE = 'https://api.census.gov/data'
const GEOCODER_BASE = 'https://geocoding.geo.census.gov/geocoder'
const ALLOWED_ORIGIN = 'https://dwelling.one'

async function getAddressTract(street, city, state) {
  const params = new URLSearchParams({
    street,
    city,
    state: state || '',
    benchmark: 'Public_AR_Current',
    vintage: 'Current_Current',
    layers: 'Census Tracts',
    format: 'json',
  })
  const res = await fetch(`${GEOCODER_BASE}/geographies/address?${params}`)
  const data = await res.json()
  const match = data?.result?.addressMatches?.[0]
  if (!match) return null
  const geo = match.geographies?.['Census Tracts']?.[0]
  if (!geo) return null
  return { state: geo.STATE, county: geo.COUNTY, tract: geo.TRACT }
}

async function getACSData(state, county, tract) {
  const variables = [
    'B25077_001E', 'B25064_001E', 'B19013_001E', 'B25035_001E',
    'B25003_001E', 'B25003_002E', 'B25003_003E', 'NAME',
  ].join(',')
  const url = `${CENSUS_BASE}/2022/acs/acs5?get=${variables}&for=tract:${tract}&in=state:${state}%20county:${county}&key=${CENSUS_KEY}`
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
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN)
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown'
  if (await applyLimit(apiLimiter, clientIp, res)) return

  const { street, city, state } = req.body || {}
  if (!street || !city) return res.status(400).json({ error: 'street and city are required.' })
  if (!CENSUS_KEY) return res.status(200).json(null)

  try {
    const tract = await getAddressTract(street, city, state)
    if (!tract) return res.status(200).json(null)
    const result = await getACSData(tract.state, tract.county, tract.tract)
    return res.status(200).json(result)
  } catch {
    return res.status(200).json(null)
  }
}
