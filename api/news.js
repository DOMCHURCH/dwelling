// api/news.js
// Fetches local housing market news via Google News RSS — no API key needed
// Cache 2 hours per city since news doesn't change minute-to-minute
import { apiLimiter, applyLimit } from './_ratelimit.js'

const _cache = new Map()
const CACHE_TTL = 1000 * 60 * 60 * 2

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || 'https://dwelling-three.vercel.app')
  res.setHeader('Cache-Control', 's-maxage=7200')
  if (req.method === 'OPTIONS') return res.status(204).end()

  const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown'
  if (await applyLimit(apiLimiter, clientIp, res)) return

  const { city, state, country } = req.method === 'POST' ? req.body : req.query
  if (!city) return res.status(400).json({ error: 'city required' })

  const key = `${city},${state || ''},${country || ''}`.toLowerCase()
  const cached = _cache.get(key)
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return res.json(cached.data)
  }

  try {
    const location = [city, state, country].filter(Boolean).join(' ')
    const query = encodeURIComponent(`${city} housing market real estate`)
    // Use country-specific locale so results are geographically relevant
    const countryUpper = (country || 'US').toUpperCase()
    const localeMap = {
      CA: { hl: 'en-CA', gl: 'CA', ceid: 'CA:en' },
      GB: { hl: 'en-GB', gl: 'GB', ceid: 'GB:en' },
      AU: { hl: 'en-AU', gl: 'AU', ceid: 'AU:en' },
      NZ: { hl: 'en-NZ', gl: 'NZ', ceid: 'NZ:en' },
      US: { hl: 'en-US', gl: 'US', ceid: 'US:en' },
    }
    const locale = localeMap[countryUpper] || localeMap.US
    const url = `https://news.google.com/rss/search?q=${query}&hl=${locale.hl}&gl=${locale.gl}&ceid=${locale.ceid}`

    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; DwellingApp/1.0)' },
      signal: AbortSignal.timeout(8000),
    })

    if (!response.ok) throw new Error(`RSS fetch failed: ${response.status}`)

    const xml = await response.text()
    const articles = parseRSS(xml).slice(0, 6)

    const result = { articles, city, fetchedAt: new Date().toISOString() }
    _cache.set(key, { data: result, ts: Date.now() })
    return res.json(result)
  } catch (err) {
    console.warn('[news] Failed:', err.message)
    return res.json({ articles: [], city, error: err.message })
  }
}

function parseRSS(xml) {
  const items = []
  const itemRegex = /<item>([\s\S]*?)<\/item>/g
  let match
  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1]
    const title = stripCDATA(extract(block, 'title'))
    const link  = followRedirect(extract(block, 'link') || extract(block, 'guid'))
    const date  = extract(block, 'pubDate')
    const source = extract(block, 'source') || extractAttr(block, 'source', 'url') || ''
    if (!title) continue
    // Remove " - Source Name" suffix Google appends to titles
    const cleanTitle = title.replace(/ - [^-]+$/, '').trim()
    items.push({ title: cleanTitle, url: link, date, source })
  }
  return items
}

function extract(xml, tag) {
  const m = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'))
  return m ? stripCDATA(m[1].trim()) : ''
}

function extractAttr(xml, tag, attr) {
  const m = xml.match(new RegExp(`<${tag}[^>]*${attr}="([^"]*)"`, 'i'))
  return m ? m[1] : ''
}

function stripCDATA(s) {
  return s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim()
}

// Google News links are redirect URLs — return as-is, client can follow
function followRedirect(url) {
  if (!url) return ''
  return url.startsWith('http') ? url : `https://news.google.com${url}`
}
