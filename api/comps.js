// api/comps.js
// Fetches real comparable sold/listed properties from:
// - Redfin Stingray API (US) — no key required
// - Realtor.ca hidden API (Canada) — no key required

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { street, city, state, country, lat, lon, postcode, mode } = req.body

  // Be resilient — if city or country missing, try to proceed with what we have
  // lat/lon can substitute for missing city in most fetch functions
  if (!city && !lat) return res.status(400).json({ error: 'Missing required fields: need city or lat/lon' })

  const isCanada = (country || '').toLowerCase().includes('canada') ||
    (city || '').toLowerCase().includes('canada')
  // Area mode: fetch bulk listings for aggregation (no street needed)
  const isAreaMode = mode === 'area' || !street

  try {
    if (isCanada) {
      const data = await fetchRealtorCaComps({ city, state, lat, lon })
      return res.status(200).json(data)
    } else {
      const data = await fetchRedfinComps({ street, city, state, lat, lon })
      return res.status(200).json(data)
    }
  } catch (err) {
    console.error('Comps error:', err.message)
    // Return empty gracefully — comps are supplementary, not critical
    return res.status(200).json({ comps: [], source: 'none', error: err.message })
  }
}

// ─── REDFIN (US) ────────────────────────────────────────────────────────────

async function fetchRedfinComps({ street, city, state, lat, lon }) {
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Referer': 'https://www.redfin.com/',
  }

  // Step 1: Search for the property to get propertyId and listingId
  const query = encodeURIComponent(`${street}, ${city}, ${state}`)
  const searchUrl = `https://www.redfin.com/stingray/do/location-autocomplete?location=${query}&v=2`
  
  let propertyId = null
  let listingId = null

  try {
    const searchRes = await fetch(searchUrl, { headers })
    const searchRaw = await searchRes.text()
    const searchData = JSON.parse(searchRaw.slice(4)) // strip {}&&
    const match = searchData?.payload?.sections?.[0]?.rows?.[0]
    if (match?.url) {
      // Extract property ID from URL like /TX/Austin/123-Main-St-78701/home/12345678
      const urlMatch = match.url.match(/\/home\/(\d+)/)
      if (urlMatch) propertyId = urlMatch[1]
      if (match.id?.startsWith('listing_')) listingId = match.id.replace('listing_', '')
    }
  } catch (e) {
    console.warn('Redfin search failed:', e.message)
  }

  // Step 2: If we found the property, get nearby sold comps
  const comps = []

  if (propertyId) {
    try {
      const belowFoldUrl = `https://www.redfin.com/stingray/api/home/details/belowTheFold?propertyId=${propertyId}&accessLevel=1`
      const belowRes = await fetch(belowFoldUrl, { headers })
      const belowRaw = await belowRes.text()
      const belowData = JSON.parse(belowRaw.slice(4))

      // Extract tax history and last sale
      const taxHistory = belowData?.payload?.publicRecordsInfo?.addressInfo?.taxHistory || []
      const lastSale = taxHistory.find(t => t.salePrice)
      if (lastSale) {
        comps.push({
          address: `${street}, ${city}, ${state}`,
          price: lastSale.salePrice,
          pricePerSqft: lastSale.pricePerSqFt || null,
          sqft: lastSale.sqFt || null,
          beds: lastSale.beds || null,
          baths: lastSale.baths || null,
          soldDate: lastSale.saleDate || null,
          type: 'subject_property_history',
          source: 'redfin',
        })
      }
    } catch (e) {
      console.warn('Redfin belowTheFold failed:', e.message)
    }

    // Step 3: Get nearby sold comparables
    try {
      const similarsUrl = `https://www.redfin.com/stingray/api/home/details/similars/solds?propertyId=${propertyId}&count=5`
      const similarsRes = await fetch(similarsUrl, { headers })
      const similarsRaw = await similarsRes.text()
      const similarsData = JSON.parse(similarsRaw.slice(4))
      const homes = similarsData?.payload?.homes || []

      for (const home of homes.slice(0, 5)) {
        const p = home.url ? home : home.homeData
        if (!p) continue
        const price = p.priceInfo?.amount || p.soldPrice?.amount
        if (!price) continue
        comps.push({
          address: p.streetLine?.value || 'Nearby property',
          price,
          pricePerSqft: p.sqFtInfo?.amount ? Math.round(price / p.sqFtInfo.amount) : null,
          sqft: p.sqFtInfo?.amount || null,
          beds: p.beds?.value || null,
          baths: p.baths?.value || null,
          soldDate: p.soldDate || null,
          type: 'comparable_sold',
          source: 'redfin',
        })
      }
    } catch (e) {
      console.warn('Redfin similars failed:', e.message)
    }
  }

  // Step 4: Fallback — search nearby sold properties by lat/lon using CSV endpoint
  if (comps.length < 3 && lat && lon) {
    try {
      const regionId = await getRedfinRegionId(city, state, headers)
      if (regionId) {
        const csvUrl = `https://www.redfin.com/stingray/api/gis-csv?al=1&market=socal&min_listing_approx_size=0&num_homes=10&ord=redfin-recommended-asc&page_number=1&region_id=${regionId}&region_type=6&sf=1,2,3,5,6,7&sold_within_days=365&status=9&uipt=1,2,3,4,5,6&v=8`
        const csvRes = await fetch(csvUrl, { headers })
        const csvText = await csvRes.text()
        const rows = csvText.split('\n').slice(1).filter(Boolean)
        for (const row of rows.slice(0, 5)) {
          const cols = row.split(',')
          const price = parseInt(cols[4]?.replace(/[^0-9]/g, '') || '0')
          if (!price) continue
          comps.push({
            address: cols[0] || 'Nearby property',
            price,
            pricePerSqft: cols[11] ? parseInt(cols[11].replace(/[^0-9]/g, '')) : null,
            sqft: cols[10] ? parseInt(cols[10].replace(/[^0-9]/g, '')) : null,
            beds: cols[6] ? parseInt(cols[6]) : null,
            baths: cols[7] ? parseFloat(cols[7]) : null,
            soldDate: cols[3] || null,
            type: 'comparable_sold',
            source: 'redfin_area',
          })
        }
      }
    } catch (e) {
      console.warn('Redfin CSV fallback failed:', e.message)
    }
  }

  return {
    comps: comps.filter(c => c.price > 0),
    source: 'redfin',
    count: comps.length,
  }
}

async function getRedfinRegionId(city, state, headers) {
  try {
    const query = encodeURIComponent(`${city}, ${state}`)
    const url = `https://www.redfin.com/stingray/do/location-autocomplete?location=${query}&v=2`
    const res = await fetch(url, { headers })
    const raw = await res.text()
    const data = JSON.parse(raw.slice(4))
    const row = data?.payload?.sections?.[0]?.rows?.[0]
    if (row?.id?.startsWith('region_')) return row.id.replace('region_', '')
    return null
  } catch {
    return null
  }
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

  // Realtor.ca PropertySearch — search by lat/lon for active listings nearby
  const body = new URLSearchParams({
    ZoomLevel: '13',
    LatitudeMax: String((lat || 45.4) + 0.05),
    LongitudeMax: String((lon || -75.7) + 0.07),
    LatitudeMin: String((lat || 45.4) - 0.05),
    LongitudeMin: String((lon || -75.7) - 0.07),
    Sort: '6-D', // newest first
    PropertyTypeGroupID: '1', // residential
    TransactionTypeId: '2', // for sale
    Currency: 'CAD',
    RecordsPerPage: '12',
    CurrentPage: '1',
    ApplicationId: '1',
    CultureId: '1',
    Version: '7.0',
    PropertySearchTypeId: '1',
  })

  const comps = []

  try {
    const res = await fetch('https://api2.realtor.ca/Listing.svc/PropertySearch_Post', {
      method: 'POST',
      headers,
      body: body.toString(),
    })

    if (!res.ok) throw new Error(`Realtor.ca returned ${res.status}`)
    const data = await res.json()
    const listings = data?.Results || []

    for (const listing of listings.slice(0, 8)) {
      const price = parseInt(listing?.Property?.Price?.replace(/[^0-9]/g, '') || '0')
      if (!price) continue

      const address = [
        listing?.Property?.Address?.AddressText,
      ].filter(Boolean).join(', ')

      comps.push({
        address: address || 'Nearby property',
        price,
        pricePerSqft: null, // Realtor.ca doesn't always include sqft
        sqft: listing?.Building?.SizeInterior
          ? parseInt(listing.Building.SizeInterior.replace(/[^0-9]/g, ''))
          : null,
        beds: listing?.Building?.Bedrooms ? parseInt(listing.Building.Bedrooms) : null,
        baths: listing?.Building?.BathroomTotal ? parseInt(listing.Building.BathroomTotal) : null,
        listedDate: listing?.InsertedDateUTC || null,
        type: 'active_listing',
        source: 'realtor_ca',
        mlsNumber: listing?.MlsNumber || null,
      })
    }
  } catch (e) {
    console.warn('Realtor.ca search failed:', e.message)
    // Try alternate API endpoint
    try {
      const altRes = await fetch('https://api37.realtor.ca/Listing.svc/PropertySearch_Post', {
        method: 'POST',
        headers,
        body: body.toString(),
      })
      if (altRes.ok) {
        const altData = await altRes.json()
        const listings = altData?.Results || []
        for (const listing of listings.slice(0, 8)) {
          const price = parseInt(listing?.Property?.Price?.replace(/[^0-9]/g, '') || '0')
          if (!price) continue
          comps.push({
            address: listing?.Property?.Address?.AddressText || 'Nearby property',
            price,
            sqft: listing?.Building?.SizeInterior
              ? parseInt(listing.Building.SizeInterior.replace(/[^0-9]/g, ''))
              : null,
            beds: listing?.Building?.Bedrooms ? parseInt(listing.Building.Bedrooms) : null,
            baths: listing?.Building?.BathroomTotal ? parseInt(listing.Building.BathroomTotal) : null,
            type: 'active_listing',
            source: 'realtor_ca',
          })
        }
      }
    } catch (e2) {
      console.warn('Realtor.ca alt endpoint also failed:', e2.message)
    }
  }

  return {
    comps: comps.filter(c => c.price > 0),
    source: 'realtor_ca',
    count: comps.length,
  }
}

// ─── BULK AREA LISTING FETCH ─────────────────────────────────────────────────

async function fetchRedfinBulk(city, state) {
  try {
    // Step 1: resolve region_id from city name
    const autoUrl = `https://www.redfin.com/stingray/do/location-autocomplete?location=${encodeURIComponent([city, state].filter(Boolean).join(', '))}&v=2`
    const autoRes = await fetch(autoUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'Accept': 'application/json' }
    })
    if (!autoRes.ok) throw new Error('Autocomplete failed')
    const autoText = await autoRes.text()
    const autoData = JSON.parse(autoText.replace('{}&&', ''))
    const region = autoData?.payload?.sections?.[0]?.rows?.[0]
    if (!region) throw new Error('Region not found')

    const regionId = region.id?.tableId
    const regionType = region.id?.type || 6 // 6 = city

    // Step 2: fetch up to 350 active listings as CSV
    const csvUrl = `https://www.redfin.com/stingray/api/gis-csv?` +
      `region_id=${regionId}&region_type=${regionType}&status=1&` +
      `uipt=1,2,3&num_homes=200&ord=days-on-market-asc&` +
      `sf=1,2,3,5,6,7&v=8`

    const csvRes = await fetch(csvUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'Accept': 'text/csv,*/*' }
    })
    if (!csvRes.ok) throw new Error(`CSV fetch failed: ${csvRes.status}`)
    const csvText = await csvRes.text()

    const listings = parseRedfinCSV(csvText)
    return { listings, source: 'redfin_bulk', city, count: listings.length }
  } catch (err) {
    console.warn('[comps bulk] Redfin failed:', err.message)
    return { listings: [], source: 'redfin_bulk_failed', error: err.message }
  }
}

function parseRedfinCSV(csv) {
  const lines = csv.trim().split('\n')
  if (lines.length < 2) return []
  const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim().toLowerCase())

  const idx = {
    price: headers.findIndex(h => h.includes('price') && !h.includes('per')),
    ppsf: headers.findIndex(h => h.includes('$/sq') || h.includes('price/sq')),
    dom: headers.findIndex(h => h.includes('days on market') || h === 'dom'),
    beds: headers.findIndex(h => h === 'beds' || h === 'bedrooms'),
    baths: headers.findIndex(h => h === 'baths' || h === 'bathrooms'),
    sqft: headers.findIndex(h => h.includes('sq.ft') || h === 'sqft' || h === 'sq ft'),
    address: headers.findIndex(h => h === 'address' || h.includes('street')),
    city: headers.findIndex(h => h === 'city'),
    zip: headers.findIndex(h => h === 'zip' || h === 'zip/postal code'),
    status: headers.findIndex(h => h === 'status'),
  }

  const listings = []
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i])
    if (cols.length < 3) continue
    const price = parseInt(cols[idx.price]?.replace(/[^0-9]/g, '') || '0')
    if (!price || price < 10000) continue
    listings.push({
      price,
      pricePerSqft: idx.ppsf >= 0 ? parseInt(cols[idx.ppsf]?.replace(/[^0-9]/g, '') || '0') || null : null,
      daysOnMarket: idx.dom >= 0 ? parseInt(cols[idx.dom]) || null : null,
      beds: idx.beds >= 0 ? parseInt(cols[idx.beds]) || null : null,
      baths: idx.baths >= 0 ? parseFloat(cols[idx.baths]) || null : null,
      sqft: idx.sqft >= 0 ? parseInt(cols[idx.sqft]?.replace(/[^0-9]/g, '') || '0') || null : null,
      address: idx.address >= 0 ? cols[idx.address]?.replace(/"/g, '') : '',
      city: idx.city >= 0 ? cols[idx.city]?.replace(/"/g, '') : '',
      status: idx.status >= 0 ? cols[idx.status]?.replace(/"/g, '') : 'active',
    })
  }
  return listings
}

function parseCSVLine(line) {
  const result = []
  let current = ''
  let inQuotes = false
  for (const ch of line) {
    if (ch === '"') { inQuotes = !inQuotes }
    else if (ch === ',' && !inQuotes) { result.push(current); current = '' }
    else { current += ch }
  }
  result.push(current)
  return result
}

async function fetchRealtorCaBulk(city, state) {
  try {
    const province = state || ''
    const body = new URLSearchParams({
      ZoomLevel: '10',
      LatitudeMax: '90', LatitudeMin: '-90',
      LongitudeMax: '180', LongitudeMin: '-180',
      Sort: '6-D',
      PropertyTypeGroupID: '1',
      TransactionTypeId: '2',
      RecordsPerPage: '200',
      CurrentPage: '1',
      CultureId: '1',
      ApplicationId: '37',
      PropertySearchTypeId: '0',
      Keywords: `${city}${province ? ' ' + province : ''}`,
    })

    const res = await fetch('https://api2.realtor.ca/Listing.svc/PropertySearch_Post', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Origin': 'https://www.realtor.ca',
        'Referer': 'https://www.realtor.ca/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      body: body.toString(),
    })

    if (!res.ok) throw new Error(`Realtor.ca returned ${res.status}`)
    const data = await res.json()

    const listings = (data.Results || []).map(r => {
      const price = parseInt(r.Property?.Price?.replace(/[^0-9]/g, '') || '0')
      return {
        price,
        pricePerSqft: null,
        daysOnMarket: null, // Realtor.ca doesn't expose DOM
        beds: parseInt(r.Building?.Bedrooms) || null,
        baths: parseInt(r.Building?.BathroomTotal) || null,
        sqft: parseInt(r.Building?.SizeInterior?.replace(/[^0-9]/g, '') || '0') || null,
        address: `${r.Property?.Address?.AddressText || ''}`,
        city,
        status: 'active',
      }
    }).filter(l => l.price > 10000)

    return { listings, source: 'realtorca_bulk', city, count: listings.length }
  } catch (err) {
    console.warn('[comps bulk] Realtor.ca failed:', err.message)
    return { listings: [], source: 'realtorca_bulk_failed', error: err.message }
  }
}
