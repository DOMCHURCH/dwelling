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
    const payload = JSON.parse(Buffer.from(body, 'base64').toString())
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
  if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' })
  const payload = verifyToken(authHeader.replace('Bearer ', ''))
  if (!payload) return res.status(401).json({ error: 'Invalid session' })

  const email = payload.email
  const isAdmin = ADMIN_EMAILS.includes(email)

  // 2. Check for user-provided API key (from header first, then database)
  let userApiKey = req.headers['x-cerebras-key'] || null

  // If no key in header, check if user has one stored in DB
  if (!userApiKey && !isAdmin) {
    try {
      const db = getDb()
      const result = await db.execute({ sql: 'SELECT cerebras_key FROM users WHERE email = ?', args: [email] })
      if (result.rows.length > 0 && result.rows[0].cerebras_key) {
        userApiKey = Buffer.from(result.rows[0].cerebras_key, 'base64').toString()
      }
    } catch {}
  }

  const apiKey = userApiKey || process.env.CEREBRAS_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'No API key configured' })

  // 3. Admin or user with own key — bypass all usage counting
  if (isAdmin || userApiKey) {
    const r = await fetch('https://api.cerebras.ai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(req.body),
    })
    return res.status(r.status).json(await r.json())
  }

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

  // 7. Call Cerebras
  const r = await fetch('https://api.cerebras.ai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.CEREBRAS_API_KEY}` },
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
