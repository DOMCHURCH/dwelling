// HUD Fair Market Rent — via server-side proxy (api/hud.js)
// Token is kept server-side; client never sees it.

export async function getFairMarketRent(zipCode) {
  if (!zipCode) return null
  // HUD only works for US ZIP codes (5 digits)
  if (!/^\d{5}$/.test(zipCode.trim())) return null
  try {
    const res = await fetch('/api/hud', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ zipCode }),
    })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

// Get FEMA flood zone for a coordinate — already proxied via /api/fema
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
