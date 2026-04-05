import { createHmac, createDecipheriv } from 'crypto'
import { createClient } from '@libsql/client'

// ─── Startup validation ───────────────────────────────────────────────────────
const SECRET = process.env.AUTH_SECRET
if (!SECRET) throw new Error('FATAL: AUTH_SECRET env var is not set. Refusing to start.')

const FREE_LIMIT = 10
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '').split(',').filter(Boolean)
const ALLOWED_ORIGIN = 'https://dwelling-three.vercel.app'

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
    const base64 = body.replace(/-/g, '+').replace(/_/g, '/')
    const payload = JSON.parse(Buffer.from(base64, 'base64').toString())
    if (payload.exp && Date.now() / 1000 > payload.exp) return null
    return payload
  } catch { return null }
}

// C-1: Strip premium fields from AI JSON before returning to free-tier users.
// Fields fully removed: investment, riskData, priceHistory
// Neighborhood detail removed (character/pros/cons/bestFor) — basic scores remain
const PREMIUM_FIELDS = ['investment', 'riskData', 'priceHistory']
const NEIGHBORHOOD_DETAIL_FIELDS = ['character', 'pros', 'cons', 'bestFor']

function stripPremiumContent(cerebrasData) {
  try {
    const content = cerebrasData?.choices?.[0]?.message?.content
    if (!content) return cerebrasData
    const analysis = JSON.parse(content)
    PREMIUM_FIELDS.forEach(f => { delete analysis[f] })
    if (analysis.neighborhood) {
      NEIGHBORHOOD_DETAIL_FIELDS.forEach(f => { delete analysis.neighborhood[f] })
    }
    cerebrasData.choices[0].message.content = JSON.stringify(analysis)
  } catch (e) {
    console.error('cerebras: stripPremiumContent failed:', e.message)
  }
  return cerebrasData
}

// AES decrypt for Cerebras keys (mirrors auth.js)
function decryptKey(encryptedHex, ivHex) {
  try {
    const encKeyHex = process.env.CEREBRAS_ENCRYPTION_KEY
    if (!encKeyHex) return null
    const ENCRYPTION_KEY = Buffer.from(encKeyHex, 'hex')
    const iv = Buffer.from(ivHex, 'hex')
    const data = Buffer.from(encryptedHex, 'hex')
    const tag = data.subarray(0, 16)
    const ciphertext = data.subarray(16)
    const decipher = createDecipheriv('aes-256-gcm', ENCRYPTION_KEY, iv)
    decipher.setAuthTag(tag)
    return decipher.update(ciphertext) + decipher.final('utf8')
  } catch { return null }
}

export default async function handler(req, res) {
  // CORS — locked to production domain
  const origin = req.headers.origin || ''
  if (origin === ALLOWED_ORIGIN || process.env.NODE_ENV === 'development') {
    res.setHeader('Access-Control-Allow-Origin', origin || ALLOWED_ORIGIN)
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Skip-Count, X-Cerebras-Key')
  res.setHeader('Vary', 'Origin')
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  // 1. Verify JWT
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  const rawToken = authHeader.replace('Bearer ', '')
  const payload = verifyToken(rawToken)
  if (!payload) {
    return res.status(401).json({ error: 'Invalid session — please sign out and sign in again.' })
  }

  const email = payload.email
  const isAdmin = ADMIN_EMAILS.includes(email)

  // 2. Resolve API key — header first, then DB (AES-decrypted)
  let userApiKey = req.headers['x-cerebras-key'] || null
  let keySource = 'header'

  if (!userApiKey && !isAdmin) {
    try {
      const db = getDb()
      const result = await db.execute({ sql: 'SELECT cerebras_key, cerebras_key_iv FROM users WHERE email = ?', args: [email] })
      if (result.rows.length > 0 && result.rows[0].cerebras_key) {
        const row = result.rows[0]
        if (row.cerebras_key_iv) {
          // New AES-256-GCM encrypted
          const decrypted = decryptKey(row.cerebras_key, row.cerebras_key_iv)
          if (decrypted) { userApiKey = decrypted.trim(); keySource = 'database' }
        } else {
          // Legacy base64
          try {
            const decoded = Buffer.from(row.cerebras_key, 'base64').toString().trim()
            if (decoded.length > 10) { userApiKey = decoded; keySource = 'database_legacy' }
          } catch {}
        }
      }
    } catch (e) {
      console.error('cerebras: DB key lookup failed')
    }
  }

  const platformKey = (process.env.CEREBRAS_API_KEY || '').trim()
  const apiKey = (userApiKey || '').trim() || platformKey || null
  if (!userApiKey && platformKey) keySource = 'platform_env'

  if (!apiKey) {
    return res.status(400).json({ error: 'no_key', message: 'Please add your Cerebras API key in Settings (the 🔑 button).' })
  }

  // H-4: Validate user-provided key format before forwarding to Cerebras.
  // Platform key is admin-managed so we trust it; user-supplied keys are validated.
  if (userApiKey && !/^csk-[A-Za-z0-9]{10,}$/.test(userApiKey)) {
    return res.status(400).json({
      error: 'invalid_key_format',
      message: 'Your Cerebras API key format is invalid. Keys must start with "csk-" followed by letters and numbers.',
    })
  }

  // 3. Admin bypass
  if (isAdmin) {
    const r = await fetch('https://api.cerebras.ai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(req.body),
    })
    const data = await r.json()
    return res.status(r.status).json(data)
  }

  // 4. Load user
  const db = getDb()
  const result = await db.execute({ sql: 'SELECT * FROM users WHERE email = ?', args: [email] })
  let user = result.rows[0]

  if (!user) {
    await db.execute({
      sql: 'INSERT OR IGNORE INTO users (email, id, salt, password, is_pro, analyses_used, analyses_reset_at) VALUES (?, ?, ?, ?, 0, 0, ?)',
      args: [email, payload.sub, '', '', new Date().toISOString()],
    })
    user = { analyses_used: 0, is_pro: 0, analyses_reset_at: new Date().toISOString() }
  }

  // 5. Monthly reset
  const resetAt = user.analyses_reset_at ? new Date(user.analyses_reset_at) : new Date(0)
  if ((Date.now() - resetAt.getTime()) / (1000 * 60 * 60 * 24) >= 30) {
    await db.execute({ sql: 'UPDATE users SET analyses_used = 0, analyses_reset_at = ? WHERE email = ?', args: [new Date().toISOString(), email] })
    user.analyses_used = 0
  }

  // 6. Enforce limit
  // X-Skip-Count is only honoured for pro users — never trust a free user's header
  const skipCount = req.headers['x-skip-count'] === 'true' && !!user.is_pro
  if (!user.is_pro && user.analyses_used >= FREE_LIMIT) {
    return res.status(429).json({ error: 'limit reached' })
  }

  // 7. Call Cerebras
  const r = await fetch('https://api.cerebras.ai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(req.body),
  })
  const data = await r.json()

  if (r.status === 401 || data.error?.code === 'wrong_api_key') {
    const msg = keySource === 'platform_env'
      ? 'The platform API key is invalid. Please contact the administrator.'
      : 'Your Cerebras API key is invalid. Please check your settings.'
    return res.status(401).json({ error: 'invalid_key', message: msg })
  }

  // 8. Increment counter
  if (r.ok && !user.is_pro && !skipCount) {
    await db.execute({ sql: 'UPDATE users SET analyses_used = analyses_used + 1 WHERE email = ?', args: [email] })
  }

  // C-1: Server-side paywall — strip premium fields before returning to free users.
  // This ensures premium data is never transmitted, even if client-side blur is bypassed.
  const responseData = (r.ok && !user.is_pro) ? stripPremiumContent(data) : data
  res.status(r.status).json(responseData)
}
