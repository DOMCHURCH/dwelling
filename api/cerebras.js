import { createHmac } from 'crypto'
import { createClient } from '@libsql/client'

const SECRET = process.env.AUTH_SECRET || 'dwelling-secret-change-me'
const FREE_LIMIT = 10
const ADMIN_EMAILS = ['01dominique.c@gmail.com']

function getDb() {
  return createClient({
    url: process.env.TURSO_URL,
    authToken: process.env.TURSO_TOKEN,
  })
}

function b64url(buf) {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

function verifyToken(token) {
  try {
    const [header, body, sig] = token.split('.')
    const expected = b64url(createHmac('sha256', SECRET).update(`${header}.${body}`).digest())
    if (sig !== expected) return null
    // base64url decode — replace url-safe chars back before decoding
    const base64 = body.replace(/-/g, '+').replace(/_/g, '/')
    const payload = JSON.parse(Buffer.from(base64, 'base64').toString())
    if (payload.exp && Date.now() / 1000 > payload.exp) return null
    return payload
  } catch { return null }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Skip-Count, X-Cerebras-Key')
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  // 1. Verify JWT
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    console.error('cerebras: no Bearer token in request')
    return res.status(401).json({ error: 'Unauthorized' })
  }
  const rawToken = authHeader.replace('Bearer ', '')
  const payload = verifyToken(rawToken)
  if (!payload) {
    try {
      const parts = rawToken.split('.')
      if (parts.length !== 3) {
        console.error('cerebras: token malformed, parts:', parts.length)
      } else {
        const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
        const decoded = JSON.parse(Buffer.from(base64, 'base64').toString())
        const expired = decoded.exp && Date.now() / 1000 > decoded.exp
        const expectedSig = b64url(createHmac('sha256', SECRET).update(`${parts[0]}.${parts[1]}`).digest())
        const sigOk = parts[2] === expectedSig
        const secretHint = SECRET.length > 8
          ? `${SECRET.slice(0, 4)}...${SECRET.slice(-4)} (len=${SECRET.length})`
          : `(len=${SECRET.length})`
        console.error('cerebras: token invalid —',
          'sig_ok:', sigOk,
          'expired:', expired,
          'email:', decoded.email,
          'exp:', new Date((decoded.exp || 0) * 1000).toISOString(),
          'secret_hint:', secretHint,
          'using_fallback:', !process.env.AUTH_SECRET
        )
      }
    } catch(e) { console.error('cerebras: token parse error', e.message) }
    return res.status(401).json({ error: 'Invalid session — please sign out and sign in again.' })
  }

  const email = payload.email
  const isAdmin = ADMIN_EMAILS.includes(email)

  // 2. Check for user-provided API key (from header first, then database)
  let userApiKey = req.headers['x-cerebras-key'] || null

  // If no key in header, look it up from DB
  if (!userApiKey && !isAdmin) {
    try {
      const db = getDb()
      const result = await db.execute({ sql: 'SELECT cerebras_key FROM users WHERE email = ?', args: [email] })
      if (result.rows.length > 0 && result.rows[0].cerebras_key) {
        const decoded = Buffer.from(result.rows[0].cerebras_key, 'base64').toString().trim()
        if (decoded) userApiKey = decoded
      }
    } catch (e) {
      console.error('cerebras: DB key lookup failed for', email, e.message)
    }
  }

  const apiKey = (userApiKey || '').trim() || (process.env.CEREBRAS_API_KEY || '').trim() || null
  if (!apiKey) {
    console.error('cerebras: no API key for', email, '— header:', !!req.headers['x-cerebras-key'], '— env:', !!process.env.CEREBRAS_API_KEY)
    return res.status(400).json({ error: 'no_key', message: 'Please add your Cerebras API key in Settings (the 🔑 button).' })
  }

  // 3. Admin — bypass all usage counting entirely
  if (isAdmin) {
    const r = await fetch('https://api.cerebras.ai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(req.body),
    })
    return res.status(r.status).json(await r.json())
  }
  // Users with their own key still use it, but we still track + enforce limits for free users

  // 4. Load user from Turso
  const db = getDb()
  const result = await db.execute({ sql: 'SELECT * FROM users WHERE email = ?', args: [email] })

  let user = result.rows[0]
  if (!user) {
    // Auto-create if missing
    await db.execute({
      sql: 'INSERT OR IGNORE INTO users (email, id, salt, password, is_pro, analyses_used, analyses_reset_at) VALUES (?, ?, ?, ?, 0, 0, ?)',
      args: [email, payload.sub, '', '', new Date().toISOString()],
    })
    user = { analyses_used: 0, is_pro: 0, analyses_reset_at: new Date().toISOString() }
  }

  // 5. Monthly reset
  const resetAt = user.analyses_reset_at ? new Date(user.analyses_reset_at) : new Date(0)
  const daysSince = (Date.now() - resetAt.getTime()) / (1000 * 60 * 60 * 24)
  if (daysSince >= 30) {
    await db.execute({ sql: 'UPDATE users SET analyses_used = 0, analyses_reset_at = ? WHERE email = ?', args: [new Date().toISOString(), email] })
    user.analyses_used = 0
  }

  // 6. Enforce limit
  const skipCount = req.headers['x-skip-count'] === 'true'
  if (!user.is_pro && !skipCount && user.analyses_used >= FREE_LIMIT) {
    return res.status(429).json({ error: 'limit reached' })
  }

  // 7. Call Cerebras (use user's own key if they have one, otherwise platform key)
  const r = await fetch('https://api.cerebras.ai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(req.body),
  })
  const data = await r.json()

  // 8. Increment counter
  if (r.ok && !user.is_pro && !skipCount) {
    await db.execute({
      sql: 'UPDATE users SET analyses_used = analyses_used + 1 WHERE email = ?',
      args: [email],
    })
  }

  res.status(r.status).json(data)
}
