import { createHash, createHmac, randomBytes, createCipheriv, createDecipheriv } from 'crypto'
import { createClient } from '@libsql/client'
import { Resend } from 'resend'

// ─── Startup validation — refuse to run with missing critical secrets ─────────
const SECRET = process.env.AUTH_SECRET
if (!SECRET) throw new Error('FATAL: AUTH_SECRET env var is not set. Refusing to start.')

const ENCRYPTION_KEY_HEX = process.env.CEREBRAS_ENCRYPTION_KEY
if (!ENCRYPTION_KEY_HEX) throw new Error('FATAL: CEREBRAS_ENCRYPTION_KEY env var is not set. Refusing to start.')
const ENCRYPTION_KEY = Buffer.from(ENCRYPTION_KEY_HEX, 'hex')
if (ENCRYPTION_KEY.length !== 32) throw new Error('FATAL: CEREBRAS_ENCRYPTION_KEY must be 64 hex chars (32 bytes).')

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '01dominique.c@gmail.com').split(',')
const BASE_URL = process.env.BASE_URL || `https://${process.env.VERCEL_URL}` || 'https://dwelling-three.vercel.app'
const ALLOWED_ORIGIN = 'https://dwelling-three.vercel.app'

// ─── Rate limiting (simple in-memory for Vercel serverless) ──────────────────
// Upstash Redis is ideal but requires extra setup — this covers the basics
const rateLimitStore = new Map()
function rateLimit(key, maxRequests = 10, windowMs = 60000) {
  const now = Date.now()
  const windowStart = now - windowMs
  const attempts = (rateLimitStore.get(key) || []).filter(t => t > windowStart)
  if (attempts.length >= maxRequests) return false
  attempts.push(now)
  rateLimitStore.set(key, attempts)
  return true
}

function getDb() {
  return createClient({
    url: process.env.TURSO_URL,
    authToken: process.env.TURSO_TOKEN,
  })
}

async function ensureTable(db) {
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
      cerebras_key_iv TEXT,
      created_at TEXT
    )
  `)
  const migrations = [
    'ALTER TABLE users ADD COLUMN terms_accepted_at TEXT',
    'ALTER TABLE users ADD COLUMN terms_accepted_ip TEXT',
    'ALTER TABLE users ADD COLUMN reset_token TEXT',
    'ALTER TABLE users ADD COLUMN reset_token_expires TEXT',
    'ALTER TABLE users ADD COLUMN cerebras_key_iv TEXT',
  ]
  for (const sql of migrations) {
    try { await db.execute(sql) } catch { /* already exists */ }
  }
}

// ─── AES-256-GCM encryption for Cerebras API keys ────────────────────────────
function encryptKey(plaintext) {
  const iv = randomBytes(12) // 96-bit IV for GCM
  const cipher = createCipheriv('aes-256-gcm', ENCRYPTION_KEY, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  // Store as: iv:tag:ciphertext (all hex)
  return {
    encrypted: Buffer.concat([tag, encrypted]).toString('hex'),
    iv: iv.toString('hex'),
  }
}

function decryptKey(encryptedHex, ivHex) {
  try {
    const iv = Buffer.from(ivHex, 'hex')
    const data = Buffer.from(encryptedHex, 'hex')
    const tag = data.subarray(0, 16)
    const ciphertext = data.subarray(16)
    const decipher = createDecipheriv('aes-256-gcm', ENCRYPTION_KEY, iv)
    decipher.setAuthTag(tag)
    return decipher.update(ciphertext) + decipher.final('utf8')
  } catch { return null }
}

// ─── PBKDF2 password hashing (replaces SHA-256) ──────────────────────────────
import { pbkdf2 as _pbkdf2 } from 'crypto'
import { promisify } from 'util'
const pbkdf2 = promisify(_pbkdf2)

async function hashPassword(password, salt) {
  const key = await pbkdf2(password + SECRET, salt, 100000, 64, 'sha512')
  return key.toString('hex')
}

// Legacy SHA-256 check for existing accounts during migration
function hashPasswordLegacy(password, salt) {
  return createHash('sha256').update(password + salt + SECRET).digest('hex')
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
    const base64 = body.replace(/-/g, '+').replace(/_/g, '/')
    const payload = JSON.parse(Buffer.from(base64, 'base64').toString())
    if (payload.exp && Date.now() / 1000 > payload.exp) return null
    return payload
  } catch { return null }
}

async function sendResetEmail(toEmail, resetToken) {
  const resend = new Resend(process.env.RESEND_API_KEY)
  const resetUrl = `${BASE_URL}?reset_token=${resetToken}`
  await resend.emails.send({
    from: 'Dwelling <onboarding@resend.dev>',
    to: toEmail,
    subject: 'Reset your Dwelling password',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:40px 20px;background:#000;color:#fff;">
        <h1 style="font-size:28px;font-style:italic;margin-bottom:8px;">DW<span style="opacity:0.4">.</span>ELLING</h1>
        <p style="color:rgba(255,255,255,0.6);margin-bottom:32px;">Canadian City Intelligence</p>
        <h2 style="font-size:20px;margin-bottom:12px;">Reset your password</h2>
        <p style="color:rgba(255,255,255,0.7);line-height:1.6;margin-bottom:28px;">
          Someone requested a password reset for your Dwelling account. This link expires in <strong>1 hour</strong>.
        </p>
        <a href="${resetUrl}" style="display:inline-block;background:#fff;color:#000;padding:14px 28px;border-radius:40px;font-weight:600;font-size:15px;text-decoration:none;margin-bottom:28px;">
          Reset Password →
        </a>
        <p style="color:rgba(255,255,255,0.35);font-size:12px;line-height:1.6;">
          If you didn't request this, ignore this email. Your password will not change.<br><br>
          Or copy this link: <span style="color:rgba(255,255,255,0.5);">${resetUrl}</span>
        </p>
        <hr style="border:none;border-top:1px solid rgba(255,255,255,0.1);margin:28px 0;"/>
        <p style="color:rgba(255,255,255,0.2);font-size:11px;">Dwelling · Ottawa, Canada · Automated message, do not reply.</p>
      </div>
    `,
  })
}

// ─── Handler ─────────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  // CORS — locked to production domain only
  const origin = req.headers.origin || ''
  if (origin === ALLOWED_ORIGIN || process.env.NODE_ENV === 'development') {
    res.setHeader('Access-Control-Allow-Origin', origin || ALLOWED_ORIGIN)
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Vary', 'Origin')
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { action } = req.body || {}
  const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown'
  const db = getDb()

  try {
    await ensureTable(db)

    // ── signup ──────────────────────────────────────────────────────────────
    if (action === 'signup') {
      // Rate limit: 5 signups per IP per hour
      if (!rateLimit(`signup:${clientIp}`, 5, 3600000)) {
        return res.status(429).json({ error: 'Too many signup attempts. Please try again later.' })
      }

      const { email, password } = req.body
      if (!email || !password) return res.status(400).json({ error: 'Missing email or password' })
      if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' })

      const key = email.toLowerCase().trim()
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(key)) {
        return res.status(400).json({ error: 'Invalid email address.' })
      }

      const existing = await db.execute({ sql: 'SELECT email FROM users WHERE email = ?', args: [key] })
      if (existing.rows.length > 0) return res.status(409).json({ error: 'An account with this email already exists. Try signing in instead.' })

      const salt = randomBytes(16).toString('hex')
      const id = randomBytes(16).toString('hex')
      const is_pro = ADMIN_EMAILS.includes(key) ? 1 : 0
      const hashed = await hashPassword(password, salt)

      await db.execute({
        sql: 'INSERT INTO users (email, id, salt, password, is_pro, analyses_used, analyses_reset_at, created_at, terms_accepted_at, terms_accepted_ip) VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, ?)',
        args: [key, id, salt, hashed, is_pro, new Date().toISOString(), new Date().toISOString(), new Date().toISOString(), clientIp],
      })

      const token = sign({ sub: id, email: key, is_pro: !!is_pro, exp: Math.floor(Date.now() / 1000) + 30 * 86400 })
      return res.status(200).json({ token, userId: id, email: key, is_pro: !!is_pro })
    }

    // ── signin ──────────────────────────────────────────────────────────────
    if (action === 'signin') {
      // Rate limit: 10 attempts per IP per 15 minutes
      if (!rateLimit(`signin:${clientIp}`, 10, 900000)) {
        return res.status(429).json({ error: 'Too many sign-in attempts. Please wait 15 minutes.' })
      }

      const { email, password } = req.body
      if (!email || !password) return res.status(400).json({ error: 'Missing email or password' })

      const key = email.toLowerCase().trim()
      const result = await db.execute({ sql: 'SELECT * FROM users WHERE email = ?', args: [key] })
      if (result.rows.length === 0) return res.status(401).json({ error: 'Incorrect email or password.' })

      const user = result.rows[0]

      // Try new PBKDF2 hash first, fall back to legacy SHA-256 and migrate
      let passwordOk = false
      const newHash = await hashPassword(password, user.salt)
      if (user.password === newHash) {
        passwordOk = true
      } else if (user.password === hashPasswordLegacy(password, user.salt)) {
        // Migrate to PBKDF2 on next login
        passwordOk = true
        await db.execute({ sql: 'UPDATE users SET password = ? WHERE email = ?', args: [newHash, key] })
        console.log('auth: migrated password hash')
      }

      if (!passwordOk) return res.status(401).json({ error: 'Incorrect email or password.' })

      const token = sign({ sub: user.id, email: key, is_pro: !!user.is_pro, exp: Math.floor(Date.now() / 1000) + 30 * 86400 })
      return res.status(200).json({ token, userId: user.id, email: key, is_pro: !!user.is_pro })
    }

    // ── forgot-password ─────────────────────────────────────────────────────
    if (action === 'forgot-password') {
      // Rate limit: 3 reset requests per IP per hour
      if (!rateLimit(`forgot:${clientIp}`, 3, 3600000)) {
        return res.status(429).json({ error: 'Too many reset requests. Please wait an hour.' })
      }

      const { email } = req.body
      if (!email) return res.status(400).json({ error: 'Email is required.' })
      const key = email.toLowerCase().trim()

      // Always return success — never reveal if email exists
      const result = await db.execute({ sql: 'SELECT email FROM users WHERE email = ?', args: [key] })
      if (result.rows.length === 0) return res.status(200).json({ success: true })

      const token = randomBytes(32).toString('hex')
      const expires = new Date(Date.now() + 60 * 60 * 1000).toISOString()

      await db.execute({
        sql: 'UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE email = ?',
        args: [token, expires, key],
      })

      try {
        await sendResetEmail(key, token)
      } catch (e) {
        console.error('Reset email failed:', e.message)
        return res.status(500).json({ error: 'Failed to send reset email. Please try again.' })
      }

      return res.status(200).json({ success: true })
    }

    // ── reset-password ──────────────────────────────────────────────────────
    if (action === 'reset-password') {
      const { token, password } = req.body
      if (!token || !password) return res.status(400).json({ error: 'Missing token or password.' })
      if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' })

      const result = await db.execute({ sql: 'SELECT * FROM users WHERE reset_token = ?', args: [token] })
      if (result.rows.length === 0) return res.status(400).json({ error: 'Invalid or expired reset link. Please request a new one.' })

      const user = result.rows[0]
      if (!user.reset_token_expires || new Date(user.reset_token_expires) < new Date()) {
        return res.status(400).json({ error: 'This reset link has expired. Please request a new one.' })
      }

      const salt = randomBytes(16).toString('hex')
      const hashed = await hashPassword(password, salt)

      await db.execute({
        sql: 'UPDATE users SET password = ?, salt = ?, reset_token = NULL, reset_token_expires = NULL WHERE email = ?',
        args: [hashed, salt, user.email],
      })

      const jwtToken = sign({ sub: user.id, email: user.email, is_pro: !!user.is_pro, exp: Math.floor(Date.now() / 1000) + 30 * 86400 })
      return res.status(200).json({ token: jwtToken, userId: user.id, email: user.email, is_pro: !!user.is_pro })
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
      return res.status(200).json({ analyses_used: user.analyses_used, is_pro: !!user.is_pro, has_own_key: !!user.cerebras_key })
    }

    // ── save-key ────────────────────────────────────────────────────────────
    if (action === 'save-key') {
      const authHeader = req.headers.authorization
      if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' })
      const payload = verify(authHeader.replace('Bearer ', ''))
      if (!payload) return res.status(401).json({ error: 'Invalid token' })

      const { cerebrasKey } = req.body
      const trimmedKey = (cerebrasKey || '').trim()

      if (trimmedKey && trimmedKey.length < 10) {
        return res.status(400).json({ error: 'API key seems too short. Please check your Cerebras dashboard.' })
      }

      if (trimmedKey) {
        const { encrypted, iv } = encryptKey(trimmedKey)
        await db.execute({
          sql: 'UPDATE users SET cerebras_key = ?, cerebras_key_iv = ? WHERE email = ?',
          args: [encrypted, iv, payload.email],
        })
      } else {
        await db.execute({
          sql: 'UPDATE users SET cerebras_key = NULL, cerebras_key_iv = NULL WHERE email = ?',
          args: [payload.email],
        })
      }

      return res.status(200).json({ success: true })
    }

    // ── get-key ─────────────────────────────────────────────────────────────
    if (action === 'get-key') {
      const authHeader = req.headers.authorization
      if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' })
      const payload = verify(authHeader.replace('Bearer ', ''))
      if (!payload) return res.status(401).json({ error: 'Invalid token' })

      const result = await db.execute({ sql: 'SELECT cerebras_key, cerebras_key_iv FROM users WHERE email = ?', args: [payload.email] })
      if (result.rows.length === 0 || !result.rows[0].cerebras_key) return res.status(200).json({ key: null })

      const row = result.rows[0]

      // Handle both new AES-encrypted keys and legacy base64 keys
      let key = null
      if (row.cerebras_key_iv) {
        // New AES-256-GCM encrypted
        key = decryptKey(row.cerebras_key, row.cerebras_key_iv)
      } else {
        // Legacy base64 — decode and return, will be re-encrypted on next save
        try {
          const decoded = Buffer.from(row.cerebras_key, 'base64').toString().trim()
          if (decoded.startsWith('csk-') || decoded.length > 10) key = decoded
        } catch { key = null }
      }

      return res.status(200).json({ key })
    }

    return res.status(400).json({ error: 'Unknown action' })
  } catch (err) {
    console.error('auth error action=' + (req.body?.action || 'unknown'), err?.message || err)
    return res.status(500).json({ error: 'Server error', detail: err?.message || String(err) })
  }
}
