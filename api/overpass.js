// Serverless proxy for Overpass API
// Runs server-side so browser never sees 504s, results are cached per city

const BASES = [
  'https://overpass-api.de/api/interpreter',
  'https://z.overpass-api.de/api/interpreter',
]

// In-memory cache per serverless instance (resets on cold start, that's fine)
const cache = new Map()
const CACHE_TTL = 1000 * 60 * 60 * 6 // 6 hours

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || 'https://dwelling-three.vercel.app')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).end()

  const { lat, lon } = req.body || {}
  const sLat = typeof lat === 'number' && isFinite(lat) && lat >= -90 && lat <= 90 ? lat : null
  const sLon = typeof lon === 'number' && isFinite(lon) && lon >= -180 && lon <= 180 ? lon : null
  if (!sLat || !sLon) return res.status(400).json({ error: 'Valid lat/lon required' })

  const cacheKey = `${Math.round(sLat * 1000) / 1000},${Math.round(sLon * 1000) / 1000}`
  const cached = cache.get(cacheKey)
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return res.status(200).json(cached.data)
  }

  const query = `
    [out:json][timeout:20];
    (
      node["amenity"~"school|supermarket|restaurant|cafe|fast_food|pharmacy|hospital|bank|gym"](around:2000,${sLat},${sLon});
      way["amenity"~"school|supermarket|restaurant|cafe|fast_food|pharmacy|hospital|bank|gym"](around:2000,${sLat},${sLon});
      node["leisure"="park"](around:2000,${sLat},${sLon});
      node["shop"~"supermarket|grocery|convenience"](around:2000,${sLat},${sLon});
      node["public_transport"="station"](around:2000,${sLat},${sLon});
      node["highway"="bus_stop"](around:2000,${sLat},${sLon});
      node["railway"~"station|subway_entrance"](around:2000,${sLat},${sLon});
      way["building"](around:50,${sLat},${sLon});
    );
    out body;
  `

  for (const base of BASES) {
    try {
      const controller = new AbortController()
      const tid = setTimeout(() => controller.abort(), 12000)
      const r = await fetch(base, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `data=${encodeURIComponent(query)}`,
        signal: controller.signal,
      })
      clearTimeout(tid)
      if (!r.ok) continue
      const data = await r.json()
      cache.set(cacheKey, { data, ts: Date.now() })
      return res.status(200).json(data)
    } catch {
      // try next mirror
    }
  }

  // All mirrors failed — return empty elements so client uses fallback scores
  return res.status(200).json({ elements: [] })
}
