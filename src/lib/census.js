// US Census ACS API — real neighborhood data by address
// Free key at: https://api.census.gov/data/key_signup.html
const CENSUS_KEY = import.meta.env.VITE_CENSUS_API_KEY ?? ''
const CENSUS_BASE = 'https://api.census.gov/data'
const GEOCODER_BASE = 'https://geocoding.geo.census.gov/geocoder'

// Step 1: Convert address to FIPS tract codes
async function getAddressTract(street, city, state) {
  if (!street || !city) return null
  const params = new URLSearchParams({
    street,
    city,
    state,
    benchmark: 'Public_AR_Current',
    vintage: 'Current_Current',
    layers: 'Census Tracts',
    format: 'json',
  })

  try {
    const res = await fetch(`${GEOCODER_BASE}/geographies/address?${params}`)
    const data = await res.json()
    const match = data?.result?.addressMatches?.[0]
    if (!match) return null

    const geo = match.geographies?.['Census Tracts']?.[0]
    if (!geo) return null

    return {
      state: geo.STATE,
      county: geo.COUNTY,
      tract: geo.TRACT,
    }
  } catch {
    return null
  }
}

// Step 2: Fetch ACS data for the tract
async function getACSData(state, county, tract) {
  if (!CENSUS_KEY) return null

  // Key ACS variables:
  // B25077_001E = Median home value
  // B25064_001E = Median gross rent
  // B19013_001E = Median household income
  // B25035_001E = Median year structure built
  // B25003_001E = Total occupied housing units
  // B25003_002E = Owner occupied
  // B25003_003E = Renter occupied
  const variables = [
    'B25077_001E', // median home value
    'B25064_001E', // median gross rent
    'B19013_001E', // median household income
    'B25035_001E', // median year built
    'B25003_001E', // total occupied units
    'B25003_002E', // owner occupied
    'B25003_003E', // renter occupied
    'NAME',
  ].join(',')

  try {
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
  } catch {
    return null
  }
}

export async function getCensusData(street, city, state, country) {
  // Only works for US addresses
  if (!country || !country.toLowerCase().includes('united states')) return null
  if (!CENSUS_KEY) {
    console.warn('No Census API key set. Add VITE_CENSUS_API_KEY to .env')
    return null
  }

  const tract = await getAddressTract(street, city, state)
  if (!tract) return null

  return getACSData(tract.state, tract.county, tract.tract)
}
