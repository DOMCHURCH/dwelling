module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  if (req.method === 'OPTIONS') return res.status(204).end()

  try {
    const { geometry, geometryType, spatialRel, outFields, returnGeometry, f } = req.query
    const params = new URLSearchParams({ geometry, geometryType, spatialRel, outFields, returnGeometry, f })
    const url = `https://hazards.fema.gov/gis/nfhl/rest/services/public/NFHL/MapServer/28/query?${params}`
    const response = await fetch(url, { headers: { 'User-Agent': 'DwellingApp/1.0' } })
    if (!response.ok) return res.status(200).json({ features: [] })
    const data = await response.json()
    res.status(200).json(data)
  } catch (err) {
    res.status(200).json({ features: [] })
  }
}
