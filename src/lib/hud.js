// HUD Fair Market Rent — via server-side proxy (api/external.js)
// Token is kept server-side; client never sees it.

export async function getFairMarketRent(zipCode) {
  if (!zipCode || !/^\d{5}$/.test(zipCode.trim())) return null
  try {
    const res = await fetch('/api/external', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'fmr', zipCode }),
    })
    if (!res.ok) return null
    return await res.json()
  } catch { return null }
}

// FEMA flood zone — proxied via /api/fema (no key needed)
export async function getFloodZone(lat, lon) {
  try {
    const params = new URLSearchParams({
      geometry: lon + ',' + lat,
      geometryType: 'esriGeometryPoint',
      spatialRel: 'esriSpatialRelIntersects',
      outFields: 'FLD_ZONE,SFHA_TF,ZONE_SUBTY',
      returnGeometry: 'false',
      f: 'json',
    })
    const res = await fetch('/api/fema?' + params.toString())
    const data = await res.json()
    const feature = data?.features?.[0]?.attributes
    if (!feature) return null
    const zone = feature.FLD_ZONE
    const inSFHA = feature.SFHA_TF === 'T'
    const zoneDesc = {
      'AE': 'High risk flood zone (100-year floodplain)', 'A': 'High risk flood zone',
      'VE': 'High risk coastal flood zone', 'X': 'Minimal flood risk',
      'B': 'Moderate flood risk', 'C': 'Minimal flood risk', 'D': 'Undetermined flood risk',
    }
    return {
      zone, inSpecialFloodHazardArea: inSFHA,
      description: zoneDesc[zone] ?? `Flood zone ${zone}`,
      riskLevel: inSFHA ? 'high' : zone === 'X' || zone === 'C' ? 'low' : 'moderate',
      dataSource: 'FEMA National Flood Hazard Layer',
    }
  } catch { return null }
}
