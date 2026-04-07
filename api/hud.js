// api/hud.js — server-side proxy for HUD Fair Market Rent API
// Keeps HUD_TOKEN out of the client bundle (was previously VITE_HUD_TOKEN)
import { apiLimiter, applyLimit } from './_ratelimit.js'

const HUD_TOKEN = process.env.HUD_TOKEN ?? ''
const HUD_BASE = 'https://www.huduser.gov/hudapi/public'
const ALLOWED_ORIGIN = 'https://dwelling.one'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN)
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown'
  if (await applyLimit(apiLimiter, clientIp, res)) return

  const { zipCode } = req.body || {}
  if (!zipCode || !/^\d{5}$/.test(zipCode.trim())) {
    return res.status(400).json({ error: 'Valid 5-digit US ZIP code required.' })
  }

  if (!HUD_TOKEN) return res.status(200).json(null)

  try {
    const crosswalkRes = await fetch(
      `${HUD_BASE}/usps?type=1&query=${zipCode}`,
      { headers: { Authorization: `Bearer ${HUD_TOKEN}` } }
    )
    if (!crosswalkRes.ok) return res.status(200).json(null)
    const crosswalk = await crosswalkRes.json()
    const countyCode = crosswalk?.data?.results?.[0]?.county
    if (!countyCode) return res.status(200).json(null)

    const fmrRes = await fetch(
      `${HUD_BASE}/fmr/data/${countyCode}?year=2024`,
      { headers: { Authorization: `Bearer ${HUD_TOKEN}` } }
    )
    if (!fmrRes.ok) return res.status(200).json(null)
    const fmr = await fmrRes.json()
    const fmrData = fmr?.data?.basicdata
    if (!fmrData) return res.status(200).json(null)

    return res.status(200).json({
      studio: fmrData.Efficiency ?? null,
      oneBed: fmrData.One_Bedroom ?? null,
      twoBed: fmrData.Two_Bedroom ?? null,
      threeBed: fmrData.Three_Bedroom ?? null,
      fourBed: fmrData.Four_Bedroom ?? null,
      countyName: fmrData.county_name ?? null,
      areaName: fmrData.areaname ?? null,
      year: 2024,
      dataSource: 'HUD Fair Market Rent 2024',
    })
  } catch {
    return res.status(200).json(null)
  }
}
