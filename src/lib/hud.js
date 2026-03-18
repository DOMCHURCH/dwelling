// HUD Fair Market Rent API — real US rental benchmarks by ZIP/county
// Free token at: https://www.huduser.gov/hudapi/public/login
const HUD_TOKEN = import.meta.env.VITE_HUD_TOKEN ?? ''
const HUD_BASE = 'https://www.huduser.gov/hudapi/public'

// Get Fair Market Rent by ZIP code
export async function getFairMarketRent(zipCode) {
  if (!HUD_TOKEN || !zipCode) return null
  // HUD only works for US ZIP codes (5 digits) — skip Canadian/international postal codes
  if (!/^\d{5}$/.test(zipCode.trim())) return null

  try {
    // First get the entity ID for this ZIP
    const crosswalkRes = await fetch(
      `${HUD_BASE}/usps?type=1&query=${zipCode}`,
      { headers: { Authorization: `Bearer ${HUD_TOKEN}` } }
    )
    const crosswalk = await crosswalkRes.json()
    const countyCode = crosswalk?.data?.results?.[0]?.county

    if (!countyCode) return null

    // Now get FMR for that county
    const fmrRes = await fetch(
      `${HUD_BASE}/fmr/data/${countyCode}?year=2024`,
      { headers: { Authorization: `Bearer ${HUD_TOKEN}` } }
    )
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
  } catch {
    return null
  }
}

// Get FEMA flood zone for a coordinate
export async function getFloodZone(lat, lon) {
  try {
    // Route through our proxy to avoid CORS
    const params = new URLSearchParams({
      geometry: lon + ',' + lat,
      geometryType: 'esriGeometryPoint',
      spatialRel: 'esriSpatialRelIntersects',
      outFields: 'FLD_ZONE,SFHA_TF,ZONE_SUBTY',
      returnGeometry: 'false',
      f: 'json',
    })
    const url = '/api/fema?' + params.toString()
    const res = await fetch(url)
    const data = await res.json()
    const feature = data?.features?.[0]?.attributes

    if (!feature) return null

    const zone = feature.FLD_ZONE
    const inSFHA = feature.SFHA_TF === 'T'

    const zoneDesc = {
      'AE': 'High risk flood zone (100-year floodplain)',
      'A': 'High risk flood zone',
      'VE': 'High risk coastal flood zone',
      'X': 'Minimal flood risk',
      'B': 'Moderate flood risk',
      'C': 'Minimal flood risk',
      'D': 'Undetermined flood risk',
    }

    return {
      zone,
      inSpecialFloodHazardArea: inSFHA,
      description: zoneDesc[zone] ?? `Flood zone ${zone}`,
      riskLevel: inSFHA ? 'high' : zone === 'X' || zone === 'C' ? 'low' : 'moderate',
      dataSource: 'FEMA National Flood Hazard Layer',
    }
  } catch {
    return null
  }
}
