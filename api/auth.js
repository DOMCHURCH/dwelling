import { createHash, createHmac, randomBytes } from 'crypto'
import { createClient } from '@libsql/client'

const SECRET = process.env.AUTH_SECRET || 'dwelling-secret-change-me'
const ADMIN_EMAILS = ['01dominique.c@gmail.com']

function getDb() {
  return createClient({
    url: process.env.TURSO_URL,
    authToken: process.env.TURSO_TOKEN,
  })
}

// ─── Init table if it doesn't exist ──────────────────────────────────────────
async function ensureTable(db) {
  // Create base table if it doesn't exist
  await db.execute(`
    CREATE TABLE IF NOT EXISTS users (
      email TEXT PRIMARY KEY,
      id TEXT NOT NULL,
      salt TEXT NOT NULL,
      password TEXT NOT NULL,
      is_pro INTEGER DEFAULT 0,
      analyses_used INTEGER DEFAULT 0,
      analyses_reset_at TEXT,
      cerebras_key TEXT,
      created_at TEXT
    )
  `)
  // Migrate: add new columns if they don't exist yet
  // SQLite ignores ALTER TABLE errors so we catch individually
  const migrations = [
    'ALTER TABLE users ADD COLUMN terms_accepted_at TEXT',
    'ALTER TABLE users ADD COLUMN terms_accepted_ip TEXT',
  ]
  for (const sql of migrations) {
    try { await db.execute(sql) } catch { /* column already exists, ignore */ }
  }
}

// ─── JWT ─────────────────────────────────────────────────────────────────────
function b64url(buf) {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

function sign(payload) {
  const header = b64url(Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })))
  const body = b64url(Buffer.from(JSON.stringify(payload)))
  const sig = b64url(createHmac('sha256', SECRET).update(`${header}.${body}`).digest())
  return `${header}.${body}.${sig}`
}

function verify(token) {
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

function hashPassword(password, salt) {
  return createHash('sha256').update(password + salt + SECRET).digest('hex')
}

// ─── Handler ─────────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { action } = req.body || {}
  const db = getDb()

  try {
    await ensureTable(db)

    // ── signup ──────────────────────────────────────────────────────────────
    if (action === 'signup') {
      const { email, password } = req.body
      if (!email || !password) return res.status(400).json({ error: 'Missing email or password' })
      if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' })

      const key = email.toLowerCase().trim()
      const existing = await db.execute({ sql: 'SELECT email FROM users WHERE email = ?', args: [key] })
      if (existing.rows.length > 0) return res.status(409).json({ error: 'An account with this email already exists. Try signing in instead.' })

      const salt = randomBytes(16).toString('hex')
      const id = randomBytes(16).toString('hex')
      const is_pro = ADMIN_EMAILS.includes(key) ? 1 : 0

      const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown'
      await db.execute({
        sql: 'INSERT INTO users (email, id, salt, password, is_pro, analyses_used, analyses_reset_at, created_at, terms_accepted_at, terms_accepted_ip) VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, ?)',
        args: [key, id, salt, hashPassword(password, salt), is_pro, new Date().toISOString(), new Date().toISOString(), new Date().toISOString(), clientIp],
      })

      const token = sign({ sub: id, email: key, is_pro: !!is_pro, exp: Math.floor(Date.now() / 1000) + 30 * 86400 })
      return res.status(200).json({ token, userId: id, email: key, is_pro: !!is_pro })
    }

    // ── signin ──────────────────────────────────────────────────────────────
    if (action === 'signin') {
      const { email, password } = req.body
      if (!email || !password) return res.status(400).json({ error: 'Missing email or password' })

      const key = email.toLowerCase().trim()
      const result = await db.execute({ sql: 'SELECT * FROM users WHERE email = ?', args: [key] })
      if (result.rows.length === 0) return res.status(401).json({ error: 'Incorrect email or password.' })

      const user = result.rows[0]
      if (user.password !== hashPassword(password, user.salt)) return res.status(401).json({ error: 'Incorrect email or password.' })

      const token = sign({ sub: user.id, email: key, is_pro: !!user.is_pro, exp: Math.floor(Date.now() / 1000) + 30 * 86400 })
      return res.status(200).json({ token, userId: user.id, email: key, is_pro: !!user.is_pro })
    }

    // ── usage ───────────────────────────────────────────────────────────────
    if (action === 'usage') {
      const authHeader = req.headers.authorization
      if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' })
      const payload = verify(authHeader.replace('Bearer ', ''))
      if (!payload) return res.status(401).json({ error: 'Invalid token' })

      const result = await db.execute({ sql: 'SELECT analyses_used, is_pro, cerebras_key FROM users WHERE email = ?', args: [payload.email] })
      if (result.rows.length === 0) return res.status(200).json({ analyses_used: 0, is_pro: false, has_own_key: false })

      const user = result.rows[0]
      return res.status(200).json({
        analyses_used: user.analyses_used,
        is_pro: !!user.is_pro,
        has_own_key: !!user.cerebras_key,
      })
    }

    // ── save-key (store user's Cerebras API key encrypted server-side) ──────
    if (action === 'save-key') {
      const authHeader = req.headers.authorization
      if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' })
      const payload = verify(authHeader.replace('Bearer ', ''))
      if (!payload) return res.status(401).json({ error: 'Invalid token' })

      const { cerebrasKey } = req.body
      const trimmedKey = (cerebrasKey || '').trim()
      // Validate key format — Cerebras keys start with csk-
      if (trimmedKey && !trimmedKey.startsWith('csk-')) {
        return res.status(400).json({ error: 'Invalid key format. Cerebras API keys start with "csk-".' })
      }
      const encrypted = trimmedKey
        ? Buffer.from(trimmedKey).toString('base64')
        : null

      await db.execute({
        sql: 'UPDATE users SET cerebras_key = ? WHERE email = ?',
        args: [encrypted, payload.email],
      })
      console.log('save-key: saved for', payload.email, '— key present:', !!trimmedKey)
      return res.status(200).json({ success: true })
    }

    // ── get-key (retrieve user's stored Cerebras key) ────────────────────────
    if (action === 'get-key') {
      const authHeader = req.headers.authorization
      if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' })
      const payload = verify(authHeader.replace('Bearer ', ''))
      if (!payload) return res.status(401).json({ error: 'Invalid token' })

      const result = await db.execute({ sql: 'SELECT cerebras_key FROM users WHERE email = ?', args: [payload.email] })
      if (result.rows.length === 0 || !result.rows[0].cerebras_key) {
        return res.status(200).json({ key: null })
      }
      const decoded = Buffer.from(result.rows[0].cerebras_key, 'base64').toString()
      return res.status(200).json({ key: decoded })
    }

    return res.status(400).json({ error: 'Unknown action' })
  } catch (err) {
    console.error('auth error action=' + (req.body?.action || 'unknown'), err?.message || err)
    return res.status(500).json({ error: 'Server error', detail: err?.message || String(err) })
  }
}
