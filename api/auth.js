import { createHash, createHmac, timingSafeEqual, randomBytes, randomUUID, createCipheriv, createDecipheriv, pbkdf2 as _pbkdf2 } from 'crypto'
import { promisify } from 'util'
import { createClient } from '@libsql/client'
import { Resend } from 'resend'
import { hash as argon2Hash, verify as argon2Verify } from '@node-rs/argon2'
import { signupLimiter, signinLimiter, resetLimiter, apiLimiter, applyLimit, getRedis, getClientIp } from './_ratelimit.js'
import { getUserEntitlements } from './_entitlements.js'
import Stripe from 'stripe'

const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET

// Lookup keys must match exactly what you created in the Stripe dashboard
const VALID_LOOKUP_KEYS = ['pro_monthly', 'pro_yearly', 'business_monthly', 'business_yearly']

// In-memory price ID cache — avoids a stripe.prices.list round-trip on every checkout click
const _priceIdCache = {}

function getStripe() {
  if (!STRIPE_SECRET) throw new Error('STRIPE_SECRET_KEY not configured')
  return new Stripe(STRIPE_SECRET, { apiVersion: '2024-06-20' })
}

async function resolvePriceId(stripe, lookup_key) {
  if (_priceIdCache[lookup_key]) return _priceIdCache[lookup_key]
  const prices = await stripe.prices.list({ lookup_keys: [lookup_key], active: true, limit: 1 })
  const price = prices.data[0]
  if (!price) throw new Error(`No active price found for lookup_key "${lookup_key}". Create it in your Stripe dashboard.`)
  _priceIdCache[lookup_key] = price.id
  return price.id
}

// ─── Startup validation — refuse to run with missing critical secrets ─────────
const SECRET = process.env.AUTH_SECRET
if (!SECRET) throw new Error('FATAL: AUTH_SECRET env var is not set. Refusing to start.')

const ENCRYPTION_KEY_HEX = process.env.CEREBRAS_ENCRYPTION_KEY
if (!ENCRYPTION_KEY_HEX) throw new Error('FATAL: CEREBRAS_ENCRYPTION_KEY env var is not set. Refusing to start.')
const ENCRYPTION_KEY = Buffer.from(ENCRYPTION_KEY_HEX, 'hex')
if (ENCRYPTION_KEY.length !== 32) throw new Error('FATAL: CEREBRAS_ENCRYPTION_KEY must be 64 hex chars (32 bytes).')

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean)
const BASE_URL = process.env.BASE_URL || `https://${process.env.VERCEL_URL}` || 'https://dwelling.one'
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'https://dwelling.one'

// Rate limiting handled by Upstash Redis via api/_ratelimit.js

function getDb() {
  return createClient({
    url: process.env.TURSO_URL,
    authToken: process.env.TURSO_TOKEN,
  })
}

// Module-level flag — ensureTable runs once per cold-start instance, not on every request.
let _tableReady = false

async function ensureTable(db) {
  if (_tableReady) return
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
    'ALTER TABLE users ADD COLUMN stripe_customer_id TEXT',
    'ALTER TABLE users ADD COLUMN stripe_subscription_id TEXT',
    'ALTER TABLE users ADD COLUMN is_business INTEGER DEFAULT 0',
    'ALTER TABLE users ADD COLUMN team_id TEXT',
  ]
  for (const sql of migrations) {
    try { await db.execute(sql) } catch { /* already exists */ }
  }

  // ── New tables ──────────────────────────────────────────────────────────────
  await db.execute(`
    CREATE TABLE IF NOT EXISTS teams (
      id TEXT PRIMARY KEY,
      name TEXT,
      owner_id TEXT,
      invite_code TEXT UNIQUE,
      daily_limit INTEGER DEFAULT 3000,
      usage_today INTEGER DEFAULT 0,
      usage_date TEXT,
      logo_data TEXT,
      created_at TEXT
    )
  `)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS team_members (
      team_id TEXT,
      user_id TEXT,
      role TEXT DEFAULT 'member',
      joined_at TEXT,
      PRIMARY KEY (team_id, user_id)
    )
  `)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS saved_reports (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      address TEXT,
      city TEXT,
      score INTEGER,
      verdict TEXT,
      data TEXT,
      created_at TEXT
    )
  `)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS team_reports (
      id TEXT PRIMARY KEY,
      team_id TEXT,
      user_id TEXT,
      user_email TEXT,
      address TEXT,
      city TEXT,
      score INTEGER,
      verdict TEXT,
      data TEXT,
      created_at TEXT
    )
  `)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS team_invites (
      token TEXT PRIMARY KEY,
      team_id TEXT,
      email TEXT,
      nickname TEXT,
      invited_by TEXT,
      created_at TEXT,
      accepted_at TEXT
    )
  `)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS shared_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      token TEXT UNIQUE NOT NULL,
      user_id TEXT,
      data TEXT NOT NULL,
      city TEXT,
      created_at INTEGER DEFAULT (unixepoch()),
      expires_at INTEGER NOT NULL
    )
  `)
  // Prevents verify-checkout replay and cross-user session theft
  await db.execute(`
    CREATE TABLE IF NOT EXISTS verified_checkout_sessions (
      session_id   TEXT PRIMARY KEY,
      user_email   TEXT NOT NULL,
      verified_at  TEXT NOT NULL
    )
  `)
  _tableReady = true
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

// ─── Password hashing (Argon2id, with PBKDF2 + SHA-256 legacy fallback) ───────
const _pbkdf2Async = promisify(_pbkdf2)

// New: Argon2id — salt is embedded in the hash string, no separate salt needed
async function hashPassword(password) {
  return argon2Hash(password + SECRET, { memoryCost: 65536, timeCost: 3, parallelism: 1 })
}

// Legacy PBKDF2 — kept for verifying old accounts on login (then migrated)
async function hashPasswordPbkdf2(password, salt) {
  const key = await _pbkdf2Async(password + SECRET, salt, 100000, 64, 'sha512')
  return key.toString('hex')
}

// Legacy SHA-256 — oldest accounts before PBKDF2 migration
function hashPasswordSha256(password, salt) {
  return createHash('sha256').update(password + salt + SECRET).digest('hex')
}

// Unified verify: handles Argon2id, PBKDF2, and SHA-256 formats.
// Returns { ok, needsMigration } so callers can upgrade the stored hash.
async function verifyPassword(password, storedHash, salt) {
  if (storedHash?.startsWith('$argon2')) {
    return { ok: await argon2Verify(storedHash, password + SECRET), needsMigration: false }
  }
  const pbkdf2Hash = await hashPasswordPbkdf2(password, salt)
  if (storedHash === pbkdf2Hash) return { ok: true, needsMigration: true }
  if (storedHash === hashPasswordSha256(password, salt)) return { ok: true, needsMigration: true }
  return { ok: false, needsMigration: false }
}

// ─── JWT ─────────────────────────────────────────────────────────────────────
const ACCESS_TOKEN_TTL = 15 * 60       // 15 minutes
const REFRESH_TOKEN_TTL = 7 * 24 * 3600 // 7 days

function b64url(buf) {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

function sign(payload) {
  const header = b64url(Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })))
  const body = b64url(Buffer.from(JSON.stringify(payload)))
  const sig = b64url(createHmac('sha256', SECRET).update(`${header}.${body}`).digest())
  return `${header}.${body}.${sig}`
}

// Issues a short-lived access token + a 7-day refresh token stored in Redis.
// Fails open — if Redis is unavailable, returns the access token without a refresh token.
async function issueTokenPair(claims) {
  const accessToken = sign({ ...claims, exp: Math.floor(Date.now() / 1000) + ACCESS_TOKEN_TTL })
  let refreshToken = null
  try {
    refreshToken = randomBytes(32).toString('hex')
    await getRedis().set(`rt:${refreshToken}`, JSON.stringify(claims), { ex: REFRESH_TOKEN_TTL })
  } catch (e) {
    console.error('auth: Redis unavailable, issuing without refresh token:', e.message)
    refreshToken = null
  }
  return { accessToken, refreshToken }
}

function verify(token) {
  try {
    const [header, body, sig] = token.split('.')
    if (!header || !body || !sig) return null
    // Validate algorithm — reject alg:none and unexpected algorithms
    const headerObj = JSON.parse(Buffer.from(header.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString())
    if (headerObj.alg !== 'HS256') return null
    // Constant-time HMAC comparison — prevents timing attacks
    const expected = b64url(createHmac('sha256', SECRET).update(`${header}.${body}`).digest())
    try {
      if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null
    } catch { return null } // lengths differ → invalid
    const base64 = body.replace(/-/g, '+').replace(/_/g, '/')
    const payload = JSON.parse(Buffer.from(base64, 'base64').toString())
    if (payload.exp && Date.now() / 1000 > payload.exp) return null
    return payload
  } catch { return null }
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

async function sendResetEmail(toEmail, resetToken) {
  const resend = new Resend(process.env.RESEND_API_KEY)
  const resetUrl = `${BASE_URL}?reset_token=${resetToken}`
  const safeUrl = escapeHtml(resetUrl)
  await resend.emails.send({
    from: 'Dwelling <hello@dwelling.one>',
    reply_to: '01dominique.c@gmail.com',
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
        <a href="${safeUrl}" style="display:inline-block;background:#fff;color:#000;padding:14px 28px;border-radius:40px;font-weight:600;font-size:15px;text-decoration:none;margin-bottom:28px;">
          Reset Password →
        </a>
        <p style="color:rgba(255,255,255,0.35);font-size:12px;line-height:1.6;">
          If you didn't request this, ignore this email. Your password will not change.<br><br>
          Or copy this link: <span style="color:rgba(255,255,255,0.5);">${safeUrl}</span>
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
  if (origin === ALLOWED_ORIGIN) {
    res.setHeader('Access-Control-Allow-Origin', origin || ALLOWED_ORIGIN)
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Vary', 'Origin')
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { action } = req.body || {}
  const clientIp = getClientIp(req)
  const db = getDb()

  try {
    await ensureTable(db)

    // ── signup ──────────────────────────────────────────────────────────────
    if (action === 'signup') {
      if (await applyLimit(signupLimiter, clientIp, res)) return

      const { email, password } = req.body
      if (!email || !password) return res.status(400).json({ error: 'Missing email or password' })
      if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' })

      const key = email.toLowerCase().trim()
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(key)) {
        return res.status(400).json({ error: 'Invalid email address.' })
      }

      const existing = await db.execute({ sql: 'SELECT email FROM users WHERE email = ?', args: [key] })
      if (existing.rows.length > 0) return res.status(409).json({ error: 'An account with this email already exists. Try signing in instead.' })

      const salt = randomBytes(16).toString('hex') // kept for DB column; Argon2id embeds its own salt
      const id = randomBytes(16).toString('hex')
      const is_pro = ADMIN_EMAILS.includes(key) ? 1 : 0
      const hashed = await hashPassword(password)

      await db.execute({
        sql: 'INSERT INTO users (email, id, salt, password, is_pro, analyses_used, analyses_reset_at, created_at, terms_accepted_at, terms_accepted_ip) VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, ?)',
        args: [key, id, salt, hashed, is_pro, new Date().toISOString(), new Date().toISOString(), new Date().toISOString(), clientIp],
      })

      const is_admin = ADMIN_EMAILS.includes(key)
      const { accessToken, refreshToken } = await issueTokenPair({ sub: id, email: key, is_pro: !!is_pro, is_admin })
      return res.status(200).json({ token: accessToken, refreshToken, userId: id, email: key, is_pro: !!is_pro, is_admin })
    }

    // ── signin ──────────────────────────────────────────────────────────────
    if (action === 'signin') {
      if (await applyLimit(signinLimiter, clientIp, res)) return

      const { email, password } = req.body
      if (!email || !password) return res.status(400).json({ error: 'Missing email or password' })

      const key = email.toLowerCase().trim()
      const result = await db.execute({ sql: 'SELECT * FROM users WHERE email = ?', args: [key] })
      if (result.rows.length === 0) return res.status(401).json({ error: 'Incorrect email or password.' })

      const user = result.rows[0]

      const { ok: passwordOk, needsMigration } = await verifyPassword(password, user.password, user.salt)
      if (!passwordOk) return res.status(401).json({ error: 'Incorrect email or password.' })

      // Silently migrate old PBKDF2/SHA-256 hashes to Argon2id
      if (needsMigration) {
        const upgraded = await hashPassword(password)
        await db.execute({ sql: 'UPDATE users SET password = ? WHERE email = ?', args: [upgraded, key] })
      }

      const is_admin = ADMIN_EMAILS.includes(key)
      const { accessToken, refreshToken } = await issueTokenPair({ sub: user.id, email: key, is_pro: !!user.is_pro, is_business: !!user.is_business, is_admin })
      return res.status(200).json({ token: accessToken, refreshToken, userId: user.id, email: key, is_pro: !!user.is_pro, is_business: !!user.is_business, is_admin })
    }

    // ── forgot-password ─────────────────────────────────────────────────────
    if (action === 'forgot-password') {
      if (await applyLimit(resetLimiter, clientIp, res)) return

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
      if (await applyLimit(resetLimiter, clientIp, res)) return
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
      const hashed = await hashPassword(password)

      await db.execute({
        sql: 'UPDATE users SET password = ?, salt = ?, reset_token = NULL, reset_token_expires = NULL WHERE email = ?',
        args: [hashed, salt, user.email],
      })

      const is_admin = ADMIN_EMAILS.includes(user.email)
      const { accessToken, refreshToken } = await issueTokenPair({ sub: user.id, email: user.email, is_pro: !!user.is_pro, is_business: !!user.is_business, is_admin })
      return res.status(200).json({ token: accessToken, refreshToken, userId: user.id, email: user.email, is_pro: !!user.is_pro, is_business: !!user.is_business, is_admin })
    }

    // ── usage ───────────────────────────────────────────────────────────────
    if (action === 'usage') {
      const authHeader = req.headers.authorization
      if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' })
      const payload = verify(authHeader.replace('Bearer ', ''))
      if (!payload) return res.status(401).json({ error: 'Invalid token' })

      const result = await db.execute({ sql: 'SELECT analyses_used, is_pro, is_business, cerebras_key FROM users WHERE email = ?', args: [payload.email] })
      if (result.rows.length === 0) return res.status(200).json({ analyses_used: 0, is_pro: false, is_business: false, has_own_key: false })

      const user = result.rows[0]
      return res.status(200).json({ analyses_used: user.analyses_used, is_pro: !!user.is_pro, is_business: !!user.is_business, has_own_key: !!user.cerebras_key })
    }

    // ── increment-analysis (track free tier usage) ─────────────────────────────
    if (action === 'increment-analysis') {
      const authHeader = req.headers.authorization
      if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' })
      const payload = verify(authHeader.replace('Bearer ', ''))
      if (!payload) return res.status(401).json({ error: 'Invalid token' })

      const FREE_LIMIT = 3
      const db = getDb()

      // Get current count
      const currentResult = await db.execute({ sql: 'SELECT analyses_used, is_pro FROM users WHERE email = ?', args: [payload.email] })
      if (currentResult.rows.length === 0) return res.status(404).json({ error: 'User not found' })

      const user = currentResult.rows[0]
      // Only track for free users — pro/business users have unlimited
      if (user.is_pro) {
        return res.status(200).json({ analyses_used: 9999, remaining: 9999, atLimit: false, isPro: true })
      }

      // Atomic increment — eliminates SELECT→UPDATE race condition under concurrent requests.
      await db.execute({ sql: 'UPDATE users SET analyses_used = analyses_used + 1 WHERE email = ? AND NOT is_pro', args: [payload.email] })
      const freshResult = await db.execute({ sql: 'SELECT analyses_used FROM users WHERE email = ?', args: [payload.email] })
      const newCount = freshResult.rows[0]?.analyses_used ?? 1
      const atLimit = newCount >= FREE_LIMIT

      return res.status(200).json({ analyses_used: newCount, remaining: Math.max(0, FREE_LIMIT - newCount), atLimit, isPro: false })
    }

    // ── decrement-analysis (refund a credit on failed analysis) ─────────────
    if (action === 'decrement-analysis') {
      if (await applyLimit(resetLimiter, clientIp, res)) return
      const authHeader = req.headers.authorization
      if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' })
      const payload = verify(authHeader.replace('Bearer ', ''))
      if (!payload) return res.status(401).json({ error: 'Invalid token' })

      const db = getDb()
      await db.execute({ sql: 'UPDATE users SET analyses_used = MAX(0, analyses_used - 1) WHERE email = ? AND NOT is_pro', args: [payload.email] })
      const freshResult = await db.execute({ sql: 'SELECT analyses_used FROM users WHERE email = ?', args: [payload.email] })
      const newCount = freshResult.rows[0]?.analyses_used ?? 0
      return res.status(200).json({ analyses_used: newCount, remaining: Math.max(0, FREE_LIMIT - newCount) })
    }

    // ── save-key ────────────────────────────────────────────────────────────
    if (action === 'save-key') {
      if (await applyLimit(apiLimiter, clientIp, res)) return
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
        // Legacy base64 — decode and immediately re-encrypt in place
        try {
          const decoded = Buffer.from(row.cerebras_key, 'base64').toString().trim()
          if (decoded.startsWith('csk-') || decoded.length > 10) {
            key = decoded
            const { encrypted, iv } = encryptKey(decoded)
            await db.execute({
              sql: 'UPDATE users SET cerebras_key = ?, cerebras_key_iv = ? WHERE email = ?',
              args: [encrypted, iv, payload.email],
            })
          }
        } catch { key = null }
      }

      // Return redacted key — client only needs to know if a key is set and its last 4 chars for confirmation.
      // Never return the plaintext key to prevent XSS-based key exfiltration.
      const redacted = key ? `csk-...${key.slice(-4)}` : null
      return res.status(200).json({ key: redacted, hasKey: !!key })
    }

    // ── delete-account ──────────────────────────────────────────────────────
    if (action === 'delete-account') {
      if (await applyLimit(resetLimiter, clientIp, res)) return
      const authHeader = req.headers.authorization
      if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' })
      const payload = verify(authHeader.replace('Bearer ', ''))
      if (!payload) return res.status(401).json({ error: 'Invalid token' })

      const { password, refreshToken: clientRt } = req.body
      if (!password) return res.status(400).json({ error: 'Password is required to delete your account.' })

      const result = await db.execute({ sql: 'SELECT * FROM users WHERE email = ?', args: [payload.email] })
      if (result.rows.length === 0) return res.status(404).json({ error: 'Account not found.' })

      const user = result.rows[0]
      const { ok } = await verifyPassword(password, user.password, user.salt)
      if (!ok) return res.status(401).json({ error: 'Incorrect password.' })

      await db.execute({ sql: 'DELETE FROM users WHERE email = ?', args: [payload.email] })
      // Revoke refresh token if provided
      if (clientRt) { try { await getRedis().del(`rt:${clientRt}`) } catch {} }
      return res.status(200).json({ success: true })
    }

    // ── refresh ─────────────────────────────────────────────────────────────
    if (action === 'refresh') {
      const { refreshToken } = req.body
      if (!refreshToken) return res.status(400).json({ error: 'Refresh token required.' })

      let stored
      try {
        // GETDEL is atomic — eliminates the race condition where two concurrent
        // requests could both read before either deletes the token.
        stored = await getRedis().getdel(`rt:${refreshToken}`)
      } catch (e) {
        console.error('auth: Redis unavailable during refresh:', e.message)
        return res.status(503).json({ error: 'Session service temporarily unavailable. Please try again.' })
      }

      if (!stored) return res.status(401).json({ error: 'Session expired. Please sign in again.' })

      const claims = typeof stored === 'string' ? JSON.parse(stored) : stored
      if (!claims?.email || !claims?.sub) return res.status(401).json({ error: 'Invalid refresh token.' })
      // Re-read plan flags from DB so grants made after last login take effect immediately
      const db = getDb()
      const freshRow = await db.execute({ sql: 'SELECT is_pro, is_business FROM users WHERE email = ?', args: [claims.email] })
      if (freshRow.rows.length > 0) {
        claims.is_pro = !!freshRow.rows[0].is_pro
        claims.is_business = !!freshRow.rows[0].is_business
      }
      const is_admin = ADMIN_EMAILS.includes(claims.email)
      const { accessToken, refreshToken: newRt } = await issueTokenPair({ ...claims, is_admin })
      return res.status(200).json({ token: accessToken, refreshToken: newRt })
    }

    // ── signout ─────────────────────────────────────────────────────────────
    if (action === 'signout') {
      const { refreshToken } = req.body
      if (refreshToken) {
        try { await getRedis().del(`rt:${refreshToken}`) } catch {}
      }
      return res.status(200).json({ success: true })
    }

    if (action === 'notify-pro') {
      if (await applyLimit(apiLimiter, clientIp, res)) return
      const authHeader = req.headers.authorization
      if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' })
      const payload = verify(authHeader.replace('Bearer ', ''))
      if (!payload) return res.status(401).json({ error: 'Invalid token' })
      const { email: notifyEmail } = req.body
      if (!notifyEmail || typeof notifyEmail !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(notifyEmail)) {
        return res.status(400).json({ error: 'Invalid email.' })
      }
      await db.execute(`CREATE TABLE IF NOT EXISTS pro_waitlist (email TEXT PRIMARY KEY, created_at TEXT)`)
      await db.execute(
        `INSERT OR IGNORE INTO pro_waitlist (email, created_at) VALUES (?, ?)`,
        [notifyEmail.trim().toLowerCase(), new Date().toISOString()]
      )
      return res.status(200).json({ success: true })
    }

    // ── Stripe: create-checkout ──────────────────────────────────────────────
    if (action === 'create-checkout') {
      if (!STRIPE_SECRET) return res.status(503).json({ error: 'Payments not yet configured' })
      if (await applyLimit(apiLimiter, clientIp, res)) return
      const authHeader = req.headers.authorization
      if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' })
      const payload = verify(authHeader.replace('Bearer ', ''))
      if (!payload) return res.status(401).json({ error: 'Invalid token' })

      const { lookup_key } = req.body
      if (!lookup_key || !VALID_LOOKUP_KEYS.includes(lookup_key)) {
        return res.status(400).json({ error: `Invalid lookup_key. Must be one of: ${VALID_LOOKUP_KEYS.join(', ')}` })
      }

      try {
        const stripe = getStripe()
        const priceId = await resolvePriceId(stripe, lookup_key)
        const session = await stripe.checkout.sessions.create({
          mode: 'subscription',
          customer_email: payload.email,
          line_items: [{ price: priceId, quantity: 1 }],
          success_url: `${BASE_URL}/?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${BASE_URL}/?checkout=cancelled`,
          subscription_data: { metadata: { user_email: payload.email, plan: lookup_key } },
          metadata: { user_email: payload.email, plan: lookup_key },
          allow_promotion_codes: true,
        })
        return res.status(200).json({ url: session.url })
      } catch (err) {
        console.error('create-checkout error:', err.message)
        return res.status(500).json({ error: err.message || 'Checkout failed' })
      }
    }

    // ── Stripe: verify-checkout ──────────────────────────────────────────────
    if (action === 'verify-checkout') {
      if (!STRIPE_SECRET) return res.status(503).json({ error: 'Payments not yet configured' })
      if (await applyLimit(apiLimiter, clientIp, res)) return
      const authHeader = req.headers.authorization
      if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' })
      const payload = verify(authHeader.replace('Bearer ', ''))
      if (!payload) return res.status(401).json({ error: 'Invalid token' })
      const { sessionId } = req.body
      if (!sessionId || typeof sessionId !== 'string') return res.status(400).json({ error: 'sessionId required' })
      const stripe = getStripe()
      const session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ['subscription'] })
      if (session.payment_status !== 'paid' && session.status !== 'complete') {
        return res.status(400).json({ error: 'Payment not completed' })
      }
      const sessionEmail = (session.customer_email || session.customer_details?.email || '').toLowerCase()
      // Always require a verifiable email — reject if Stripe didn't collect one
      if (!sessionEmail) {
        return res.status(400).json({ error: 'Could not verify payment session ownership — no email on session' })
      }
      if (sessionEmail !== payload.email.toLowerCase()) {
        return res.status(403).json({ error: 'Session does not belong to this account' })
      }
      const plan = session.metadata?.plan ?? ''
      const isBusiness = plan.startsWith('business')

      const db = getDb()

      // Idempotency + replay prevention: INSERT fails if session already claimed.
      // Also prevents a different authenticated user from claiming the same session.
      try {
        const claimed = await db.execute({
          sql: 'INSERT INTO verified_checkout_sessions (session_id, user_email, verified_at) VALUES (?, ?, ?)',
          args: [sessionId, payload.email.toLowerCase(), new Date().toISOString()],
        })
        if (claimed.rowsAffected === 0) throw new Error('conflict')
      } catch (e) {
        // Session already in table — check ownership
        const existing = await db.execute({
          sql: 'SELECT user_email FROM verified_checkout_sessions WHERE session_id = ?',
          args: [sessionId],
        })
        const owner = existing.rows[0]?.user_email
        if (owner && owner !== payload.email.toLowerCase()) {
          return res.status(403).json({ error: 'Session already claimed by a different account' })
        }
        // Same user re-verifying (e.g. page reload) — idempotent success
        const userRow = await db.execute({ sql: 'SELECT is_pro, is_business FROM users WHERE email = ?', args: [payload.email] })
        const u = userRow.rows[0]
        return res.status(200).json({ success: true, is_pro: !!u?.is_pro, is_business: !!u?.is_business })
      }

      await db.execute({
        sql: 'UPDATE users SET is_pro = 1, is_business = ?, stripe_customer_id = ?, stripe_subscription_id = ? WHERE email = ?',
        args: [isBusiness ? 1 : 0, session.customer || null, session.subscription?.id || null, payload.email],
      })
      return res.status(200).json({ success: true, is_pro: true, is_business: isBusiness })
    }

    // ── Stripe: cancel-subscription ──────────────────────────────────────────
    if (action === 'cancel-subscription') {
      if (!STRIPE_SECRET) return res.status(503).json({ error: 'Payments not yet configured' })
      if (await applyLimit(apiLimiter, clientIp, res)) return
      const authHeader = req.headers.authorization
      if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' })
      const payload = verify(authHeader.replace('Bearer ', ''))
      if (!payload) return res.status(401).json({ error: 'Invalid token' })
      const db = getDb()
      const subResult = await db.execute({
        sql: 'SELECT stripe_subscription_id FROM users WHERE email = ?',
        args: [payload.email],
      })
      const subId = subResult.rows[0]?.stripe_subscription_id
      if (!subId) return res.status(400).json({ error: 'No active subscription found' })
      const stripe = getStripe()
      await stripe.subscriptions.update(subId, { cancel_at_period_end: true })
      return res.status(200).json({ success: true, message: 'Subscription will cancel at end of billing period' })
    }

    // ── change-password ───────────────────────────────────────────────────────
    if (action === 'change-password') {
      if (await applyLimit(resetLimiter, clientIp, res)) return
      const authHeader = req.headers.authorization
      if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' })
      const payload = verify(authHeader.replace('Bearer ', ''))
      if (!payload) return res.status(401).json({ error: 'Invalid token' })
      const { currentPassword, newPassword } = req.body
      if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Both passwords required' })
      if (newPassword.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' })
      const db = getDb()
      const result = await db.execute({ sql: 'SELECT password, salt FROM users WHERE email = ?', args: [payload.email] })
      if (!result.rows[0]) return res.status(404).json({ error: 'User not found' })
      const { password: storedHash, salt } = result.rows[0]
      const { ok } = await verifyPassword(currentPassword, storedHash, salt)
      if (!ok) return res.status(403).json({ error: 'Current password is incorrect' })
      const hashed = await hashPassword(newPassword)
      await db.execute({ sql: 'UPDATE users SET password = ? WHERE email = ?', args: [hashed, payload.email] })
      return res.status(200).json({ success: true })
    }

    // ── get-subscription ──────────────────────────────────────────────────────
    if (action === 'get-subscription') {
      const authHeader = req.headers.authorization
      if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' })
      const payload = verify(authHeader.replace('Bearer ', ''))
      if (!payload) return res.status(401).json({ error: 'Invalid token' })
      if (!STRIPE_SECRET) return res.status(200).json({ subscription: null })
      const db = getDb()
      const result = await db.execute({
        sql: 'SELECT stripe_subscription_id, stripe_customer_id, is_pro, is_business FROM users WHERE email = ?',
        args: [payload.email],
      })
      const row = result.rows[0]
      if (!row?.stripe_subscription_id) return res.status(200).json({ subscription: null })
      try {
        const stripe = getStripe()
        const sub = await stripe.subscriptions.retrieve(row.stripe_subscription_id, { expand: ['items.data.price'] })
        const item = sub.items.data[0]
        const price = item?.price
        return res.status(200).json({
          subscription: {
            status: sub.status,
            cancel_at_period_end: sub.cancel_at_period_end,
            current_period_end: sub.current_period_end,
            amount: price ? price.unit_amount / 100 : null,
            currency: price?.currency || 'usd',
            interval: price?.recurring?.interval || 'month',
            plan: sub.metadata?.plan || (row.is_business ? 'business_monthly' : 'pro_monthly'),
          },
        })
      } catch (err) {
        return res.status(200).json({ subscription: null, error: err.message })
      }
    }

    // ── Stripe: portal ────────────────────────────────────────────────────────
    if (action === 'portal') {
      if (!STRIPE_SECRET) return res.status(503).json({ error: 'Payments not yet configured' })
      if (await applyLimit(apiLimiter, clientIp, res)) return
      const authHeader = req.headers.authorization
      if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' })
      const payload = verify(authHeader.replace('Bearer ', ''))
      if (!payload) return res.status(401).json({ error: 'Invalid token' })
      const db = getDb()
      const custResult = await db.execute({
        sql: 'SELECT stripe_customer_id FROM users WHERE email = ?',
        args: [payload.email],
      })
      const customerId = custResult.rows[0]?.stripe_customer_id
      if (!customerId) return res.status(400).json({ error: 'No billing account found' })
      const stripe = getStripe()
      const portalSession = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: BASE_URL,
      })
      return res.status(200).json({ url: portalSession.url })
    }

    // ── Admin: list all users ─────────────────────────────────────────────────
    if (action === 'admin-list-users') {
      const authHeader = req.headers.authorization
      if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' })
      const payload = verify(authHeader.replace('Bearer ', ''))
      if (!payload?.is_admin) return res.status(403).json({ error: 'Admin access required' })
      const db = getDb()
      const result = await db.execute({
        sql: 'SELECT id, email, is_pro, is_business, analyses_used, created_at FROM users ORDER BY created_at DESC LIMIT 200',
        args: [],
      })
      return res.status(200).json({ users: result.rows })
    }

    // ── Admin: adjust user quota ──────────────────────────────────────────────
    if (action === 'admin-adjust-usage') {
      const authHeader = req.headers.authorization
      if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' })
      const payload = verify(authHeader.replace('Bearer ', ''))
      if (!payload?.is_admin) return res.status(403).json({ error: 'Admin access required' })
      const { targetEmail, analysesUsed } = req.body
      if (!targetEmail || analysesUsed == null) return res.status(400).json({ error: 'targetEmail and analysesUsed required' })
      const db = getDb()
      const r = await db.execute({
        sql: 'UPDATE users SET analyses_used = ? WHERE email = ?',
        args: [Math.max(0, parseInt(analysesUsed, 10)), targetEmail.trim().toLowerCase()],
      })
      if (r.rowsAffected === 0) return res.status(404).json({ error: `No user: ${targetEmail}` })
      return res.status(200).json({ success: true })
    }

    // ── Admin: set user subscription tier ──────────────────────────────────────
    if (action === 'admin-grant-pro') {
      const authHeader = req.headers.authorization
      if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' })
      const payload = verify(authHeader.replace('Bearer ', ''))
      if (!payload?.is_admin) return res.status(403).json({ error: 'Admin access required' })
      const { targetEmail, plan } = req.body
      if (!targetEmail || typeof targetEmail !== 'string') return res.status(400).json({ error: 'targetEmail required' })
      if (!plan || !['free', 'pro', 'business'].includes(plan)) return res.status(400).json({ error: 'plan must be "free", "pro", or "business"' })

      const db = getDb()
      const isFree = plan === 'free'
      const isBusiness = plan === 'business'

      const grantResult = await db.execute({
        sql: 'UPDATE users SET is_pro = ?, is_business = ? WHERE LOWER(email) = LOWER(?)',
        args: [isFree ? 0 : 1, isBusiness ? 1 : 0, targetEmail.trim().toLowerCase()],
      })
      if (grantResult.rowsAffected === 0) {
        return res.status(404).json({ error: `No user found with email ${targetEmail}` })
      }
      return res.status(200).json({ success: true, plan, email: targetEmail.trim().toLowerCase() })
    }

    // ── Admin: cancel user subscription (revert to free) ──────────────────────
    if (action === 'admin-cancel-subscription') {
      const authHeader = req.headers.authorization
      if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' })
      const payload = verify(authHeader.replace('Bearer ', ''))
      if (!payload?.is_admin) return res.status(403).json({ error: 'Admin access required' })

      const { targetEmail } = req.body
      if (!targetEmail || typeof targetEmail !== 'string') return res.status(400).json({ error: 'targetEmail required' })

      const db = getDb()
      const userResult = await db.execute({
        sql: 'SELECT stripe_subscription_id FROM users WHERE LOWER(email) = LOWER(?)',
        args: [targetEmail.trim().toLowerCase()],
      })

      if (userResult.rows.length === 0) {
        return res.status(404).json({ error: `No user found with email ${targetEmail}` })
      }

      const subId = userResult.rows[0].stripe_subscription_id

      // Cancel the Stripe subscription if it exists
      if (subId) {
        const stripe = getStripe()
        try {
          await stripe.subscriptions.cancel(subId)
        } catch (err) {
          console.error(`[admin-cancel-subscription] Failed to cancel Stripe sub ${subId}:`, err.message)
          // Continue anyway — update database even if Stripe call fails
        }
      }

      // Revert user to free tier
      await db.execute({
        sql: 'UPDATE users SET is_pro = 0, is_business = 0, stripe_subscription_id = NULL WHERE LOWER(email) = LOWER(?)',
        args: [targetEmail.trim().toLowerCase()],
      })

      // Also revoke all team members if this was a Business account owner
      const revokedUserRow = await db.execute({
        sql: 'SELECT id FROM users WHERE LOWER(email) = LOWER(?)',
        args: [targetEmail.trim().toLowerCase()],
      })
      const revokedId = revokedUserRow.rows[0]?.id
      if (revokedId) {
        const revokedTeamRow = await db.execute({
          sql: 'SELECT team_id FROM users WHERE id = ?',
          args: [revokedId],
        })
        const teamId = revokedTeamRow.rows[0]?.team_id
        if (teamId) {
          const revokedMembers = await db.execute({
            sql: 'UPDATE users SET is_pro = 0, is_business = 0 WHERE team_id = ? AND id != ?',
            args: [teamId, revokedId],
          })
          console.log(`[admin-cancel-subscription] Revoked ${revokedMembers.rowsAffected} team member(s) for team ${teamId}`)
        }
      }

      return res.status(200).json({ success: true, message: `Subscription cancelled and ${targetEmail} reverted to free`, email: targetEmail.trim().toLowerCase() })
    }

    // ── Admin: change subscription type (pro ↔ business) ──────────────────────
    if (action === 'admin-change-subscription-type') {
      const authHeader = req.headers.authorization
      if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' })
      const payload = verify(authHeader.replace('Bearer ', ''))
      if (!payload?.is_admin) return res.status(403).json({ error: 'Admin access required' })

      const { targetEmail, newPlan } = req.body
      if (!targetEmail || typeof targetEmail !== 'string') return res.status(400).json({ error: 'targetEmail required' })
      if (!newPlan || !['pro', 'business'].includes(newPlan)) return res.status(400).json({ error: 'newPlan must be "pro" or "business"' })

      const db = getDb()
      const isBusiness = newPlan === 'business'

      const updateResult = await db.execute({
        sql: 'UPDATE users SET is_pro = 1, is_business = ? WHERE LOWER(email) = LOWER(?)',
        args: [isBusiness ? 1 : 0, targetEmail.trim().toLowerCase()],
      })

      if (updateResult.rowsAffected === 0) {
        return res.status(404).json({ error: `No user found with email ${targetEmail}` })
      }

      return res.status(200).json({ success: true, message: `${targetEmail} changed to ${newPlan}`, email: targetEmail.trim().toLowerCase(), newPlan })
    }

    // ── Saved Reports: save ──────────────────────────────────────────────────
    if (action === 'save-report') {
      const authHeader = req.headers.authorization
      if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' })
      const payload = verify(authHeader.replace('Bearer ', ''))
      if (!payload) return res.status(401).json({ error: 'Invalid token' })
      // Server-side Pro gate — read from DB, never trust JWT claims
      const ent = await getUserEntitlements(db, payload.sub)
      if (!ent.is_pro && !ent.is_business) {
        return res.status(403).json({ error: 'Pro plan required to save reports' })
      }
      const { address, city, score, verdict, data } = req.body
      if (!data) return res.status(400).json({ error: 'data required' })
      // Guard against oversized payloads clogging Turso storage (1 MB cap)
      const serialized = JSON.stringify(data)
      if (serialized.length > 1024 * 1024) return res.status(413).json({ error: 'Report data too large to save (max 1 MB)' })
      const id = randomBytes(12).toString('hex')
      await db.execute({
        sql: 'INSERT OR REPLACE INTO saved_reports (id, user_id, address, city, score, verdict, data, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        args: [id, payload.sub, address || '', city || '', score ?? null, verdict || null, serialized, new Date().toISOString()],
      })
      return res.status(200).json({ success: true, id })
    }

    // ── Saved Reports: list ──────────────────────────────────────────────────
    if (action === 'list-reports') {
      const authHeader = req.headers.authorization
      if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' })
      const payload = verify(authHeader.replace('Bearer ', ''))
      if (!payload) return res.status(401).json({ error: 'Invalid token' })
      const result = await db.execute({
        sql: 'SELECT id, address, city, score, verdict, created_at FROM saved_reports WHERE user_id = ? ORDER BY created_at DESC LIMIT 100',
        args: [payload.sub],
      })
      return res.status(200).json({ reports: result.rows })
    }

    // ── Saved Reports: get full data ─────────────────────────────────────────
    if (action === 'get-report') {
      const authHeader = req.headers.authorization
      if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' })
      const payload = verify(authHeader.replace('Bearer ', ''))
      if (!payload) return res.status(401).json({ error: 'Invalid token' })
      const { id: reportId } = req.body
      if (!reportId) return res.status(400).json({ error: 'id required' })
      const result = await db.execute({
        sql: 'SELECT * FROM saved_reports WHERE id = ? AND user_id = ?',
        args: [reportId, payload.sub],
      })
      if (result.rows.length === 0) return res.status(404).json({ error: 'Report not found' })
      const row = result.rows[0]
      return res.status(200).json({ ...row, data: JSON.parse(row.data || '{}') })
    }

    // ── Saved Reports: delete ────────────────────────────────────────────────
    if (action === 'delete-report') {
      const authHeader = req.headers.authorization
      if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' })
      const payload = verify(authHeader.replace('Bearer ', ''))
      if (!payload) return res.status(401).json({ error: 'Invalid token' })
      const { id: reportId } = req.body
      if (!reportId) return res.status(400).json({ error: 'id required' })
      await db.execute({ sql: 'DELETE FROM saved_reports WHERE id = ? AND user_id = ?', args: [reportId, payload.sub] })
      return res.status(200).json({ success: true })
    }

    // ── Business Team: create ────────────────────────────────────────────────
    if (action === 'create-team') {
      const authHeader = req.headers.authorization
      if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' })
      const payload = verify(authHeader.replace('Bearer ', ''))
      if (!payload) return res.status(401).json({ error: 'Invalid token' })
      const userRow = await db.execute({ sql: 'SELECT is_business, team_id FROM users WHERE id = ?', args: [payload.sub] })
      if (!userRow.rows[0]?.is_business) return res.status(403).json({ error: 'Business plan required' })
      if (userRow.rows[0]?.team_id) return res.status(409).json({ error: 'Already in a team' })
      const { name } = req.body
      if (!name || typeof name !== 'string') return res.status(400).json({ error: 'name required' })
      const teamId = randomBytes(12).toString('hex')
      const inviteCode = randomBytes(6).toString('hex').toUpperCase()
      await db.execute({
        sql: 'INSERT INTO teams (id, name, owner_id, invite_code, daily_limit, usage_today, usage_date, created_at) VALUES (?, ?, ?, ?, 3000, 0, ?, ?)',
        args: [teamId, name.trim(), payload.sub, inviteCode, new Date().toISOString().slice(0, 10), new Date().toISOString()],
      })
      await db.execute({ sql: 'INSERT INTO team_members (team_id, user_id, role, joined_at) VALUES (?, ?, ?, ?)', args: [teamId, payload.sub, 'owner', new Date().toISOString()] })
      await db.execute({ sql: 'UPDATE users SET team_id = ? WHERE id = ?', args: [teamId, payload.sub] })
      return res.status(200).json({ success: true, teamId, inviteCode })
    }

    // ── Business Team: join ──────────────────────────────────────────────────
    if (action === 'join-team') {
      const authHeader = req.headers.authorization
      if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' })
      const payload = verify(authHeader.replace('Bearer ', ''))
      if (!payload) return res.status(401).json({ error: 'Invalid token' })
      const userRow = await db.execute({ sql: 'SELECT is_business, team_id FROM users WHERE id = ?', args: [payload.sub] })
      if (userRow.rows[0]?.team_id) return res.status(409).json({ error: 'Already in a team' })
      const { inviteCode } = req.body
      if (!inviteCode) return res.status(400).json({ error: 'inviteCode required' })
      const teamRow = await db.execute({ sql: 'SELECT id, owner_id FROM teams WHERE invite_code = ?', args: [inviteCode.trim().toUpperCase()] })
      if (teamRow.rows.length === 0) return res.status(404).json({ error: 'Invalid invite code' })
      const teamId = teamRow.rows[0].id
      const ownerId = teamRow.rows[0].owner_id
      // Verify the team owner's Business plan is still active before granting access
      const ownerPlanRow = await db.execute({ sql: 'SELECT is_business FROM users WHERE id = ?', args: [ownerId] })
      if (!ownerPlanRow.rows[0]?.is_business) {
        return res.status(403).json({ error: 'The team owner does not have an active Business plan' })
      }
      // Atomic seat-limit check + insert — prevents concurrent join race condition
      const joinResult = await db.execute({
        sql: `INSERT OR IGNORE INTO team_members (team_id, user_id, role, joined_at)
              SELECT ?, ?, 'member', ?
              WHERE (SELECT COUNT(*) FROM team_members WHERE team_id = ?) < 10`,
        args: [teamId, payload.sub, new Date().toISOString(), teamId],
      })
      if (joinResult.rowsAffected === 0) return res.status(409).json({ error: 'Team is full (10 members max)' })
      // Grant Business plan access — member shares the owner's subscription
      await db.execute({ sql: 'UPDATE users SET team_id = ?, is_pro = 1, is_business = 1 WHERE id = ?', args: [teamId, payload.sub] })
      return res.status(200).json({ success: true, teamId })
    }

    // ── Business Team: get portal data ───────────────────────────────────────
    if (action === 'get-team') {
      const authHeader = req.headers.authorization
      if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' })
      const payload = verify(authHeader.replace('Bearer ', ''))
      if (!payload) return res.status(401).json({ error: 'Invalid token' })
      const userRow = await db.execute({ sql: 'SELECT team_id FROM users WHERE id = ?', args: [payload.sub] })
      const teamId = userRow.rows[0]?.team_id
      if (!teamId) return res.status(404).json({ error: 'Not in a team' })
      const teamRow = await db.execute({ sql: 'SELECT id, name, invite_code, daily_limit, usage_today, usage_date, logo_data FROM teams WHERE id = ?', args: [teamId] })
      if (teamRow.rows.length === 0) return res.status(404).json({ error: 'Team not found' })
      const team = teamRow.rows[0]
      // Reset usage if it's a new day
      const today = new Date().toISOString().slice(0, 10)
      if (team.usage_date !== today) {
        await db.execute({ sql: 'UPDATE teams SET usage_today = 0, usage_date = ? WHERE id = ?', args: [today, teamId] })
        team.usage_today = 0
      }
      const membersRow = await db.execute({
        sql: 'SELECT u.email, tm.role, tm.joined_at FROM team_members tm JOIN users u ON u.id = tm.user_id WHERE tm.team_id = ? ORDER BY tm.joined_at ASC',
        args: [teamId],
      })
      const reportsRow = await db.execute({
        sql: 'SELECT id, user_email, address, city, score, verdict, created_at FROM team_reports WHERE team_id = ? ORDER BY created_at DESC LIMIT 200',
        args: [teamId],
      })
      return res.status(200).json({ team: { ...team, logo_data: undefined }, logoData: team.logo_data, members: membersRow.rows, reports: reportsRow.rows })
    }

    // ── Business Team: log analysis ──────────────────────────────────────────
    if (action === 'log-team-analysis') {
      const authHeader = req.headers.authorization
      if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' })
      const payload = verify(authHeader.replace('Bearer ', ''))
      if (!payload) return res.status(401).json({ error: 'Invalid token' })
      // Verify Business plan is still active — team_id alone doesn't guarantee active plan
      const ent = await getUserEntitlements(db, payload.sub)
      if (!ent.is_business && !ent.is_pro) return res.status(200).json({ logged: false })
      const userRow = await db.execute({ sql: 'SELECT team_id, email FROM users WHERE id = ?', args: [payload.sub] })
      const teamId = userRow.rows[0]?.team_id
      if (!teamId) return res.status(200).json({ logged: false }) // not in a team, silently skip
      const today = new Date().toISOString().slice(0, 10)

      // Atomic increment: only succeeds if current count < daily_limit.
      // Eliminates the read-check-write race condition under concurrent requests.
      // CASE resets to 1 on a new day, otherwise increments.
      const atomicUpdate = await db.execute({
        sql: `UPDATE teams
              SET usage_today = CASE WHEN usage_date = ? THEN usage_today + 1 ELSE 1 END,
                  usage_date  = ?
              WHERE id = ?
                AND (CASE WHEN usage_date = ? THEN usage_today ELSE 0 END) < daily_limit`,
        args: [today, today, teamId, today],
      })

      if (atomicUpdate.rowsAffected === 0) {
        return res.status(429).json({ error: 'Team daily limit reached (3000 analyses/day)' })
      }

      const { address, city, score, verdict, data } = req.body
      // Guard against oversized payloads clogging Turso storage (512 KB cap)
      const teamReportSerialized = JSON.stringify(data || {})
      if (teamReportSerialized.length > 512 * 1024) return res.status(413).json({ error: 'Report data too large (max 512 KB)' })
      const reportId = randomBytes(12).toString('hex')
      await db.execute({
        sql: 'INSERT INTO team_reports (id, team_id, user_id, user_email, address, city, score, verdict, data, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        args: [reportId, teamId, payload.sub, userRow.rows[0].email, address || '', city || '', score ?? null, verdict || null, teamReportSerialized, new Date().toISOString()],
      })

      // Read back the new count for the response
      const teamRow = await db.execute({ sql: 'SELECT usage_today FROM teams WHERE id = ?', args: [teamId] })
      return res.status(200).json({ logged: true, usageToday: teamRow.rows[0]?.usage_today ?? 1 })
    }

    // ── Business Team: save logo ─────────────────────────────────────────────
    if (action === 'save-logo') {
      const authHeader = req.headers.authorization
      if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' })
      const payload = verify(authHeader.replace('Bearer ', ''))
      if (!payload) return res.status(401).json({ error: 'Invalid token' })
      const userRow = await db.execute({ sql: 'SELECT team_id FROM users WHERE id = ?', args: [payload.sub] })
      const teamId = userRow.rows[0]?.team_id
      if (!teamId) return res.status(404).json({ error: 'Not in a team' })
      // Only the team owner may change the logo
      const teamRow = await db.execute({ sql: 'SELECT owner_id FROM teams WHERE id = ?', args: [teamId] })
      if (teamRow.rows[0]?.owner_id !== payload.sub) return res.status(403).json({ error: 'Only the team owner can change the logo' })
      const { logo } = req.body
      if (!logo || typeof logo !== 'string') return res.status(400).json({ error: 'logo (base64) required' })
      if (!/^data:image\/(png|jpeg|gif|webp);base64,/.test(logo)) {
        return res.status(400).json({ error: 'logo must be a base64-encoded image (PNG, JPEG, GIF, or WebP)' })
      }
      if (logo.length > 2 * 1024 * 1024) return res.status(413).json({ error: 'Logo too large (max 2MB)' })
      await db.execute({ sql: 'UPDATE teams SET logo_data = ? WHERE id = ?', args: [logo, teamId] })
      return res.status(200).json({ success: true })
    }

    // ── Business Team: invite member by email ────────────────────────────────
    if (action === 'invite-member') {
      const authHeader = req.headers.authorization
      if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' })
      const payload = verify(authHeader.replace('Bearer ', ''))
      if (!payload) return res.status(401).json({ error: 'Invalid token' })
      // Verify inviter still holds an active Business plan before sending any invite
      const inviterEnt = await getUserEntitlements(db, payload.sub)
      if (!inviterEnt.is_business) return res.status(403).json({ error: 'Active Business plan required to invite members' })
      const userRow = await db.execute({ sql: 'SELECT team_id, email FROM users WHERE id = ?', args: [payload.sub] })
      const teamId = userRow.rows[0]?.team_id
      if (!teamId) return res.status(403).json({ error: 'Not in a team' })
      // Only owner can invite
      const teamRow = await db.execute({ sql: 'SELECT owner_id, name FROM teams WHERE id = ?', args: [teamId] })
      if (teamRow.rows[0]?.owner_id !== payload.sub) return res.status(403).json({ error: 'Only the team owner can invite members' })
      const { email: inviteeEmail, nickname } = req.body
      if (!inviteeEmail || typeof inviteeEmail !== 'string') return res.status(400).json({ error: 'email required' })
      // Check seat count (max 10 total: owner + 9 members)
      const memberCount = await db.execute({ sql: 'SELECT COUNT(*) as cnt FROM team_members WHERE team_id = ?', args: [teamId] })
      if ((memberCount.rows[0]?.cnt || 0) >= 10) return res.status(409).json({ error: 'Team is full (10 members max: owner + 9)' })
      const token = randomBytes(24).toString('hex')
      await db.execute({
        sql: 'INSERT OR REPLACE INTO team_invites (token, team_id, email, nickname, invited_by, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        args: [token, teamId, inviteeEmail.toLowerCase().trim(), nickname || null, userRow.rows[0].email, new Date().toISOString()],
      })
      const inviteLink = `https://dwelling.one/?join=${token}`
      const teamName = teamRow.rows[0]?.name || 'their team'
      const fromName = userRow.rows[0]?.email
      // Send email via Resend if API key is set
      const resendKey = process.env.RESEND_API_KEY
      if (resendKey) {
        try {
          await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              from: 'Dwelling <noreply@dwelling.one>',
              to: [inviteeEmail.toLowerCase().trim()],
              subject: `${fromName} invited you to ${teamName} on Dwelling`,
              html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
                <h2 style="margin:0 0 8px">You've been invited to ${teamName}</h2>
                <p style="color:#666">${fromName} is using Dwelling Business to analyze properties — and wants you on their team.</p>
                <p style="color:#666">As a team member you get access to Business-tier analyses, shared reports, and team API keys — no separate subscription needed.</p>
                <a href="${inviteLink}" style="display:inline-block;background:#3b82f6;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin:16px 0">Accept Invitation</a>
                <p style="color:#999;font-size:12px">This invite link expires in 7 days. If you already have a Dwelling account, sign in first then click the link.</p>
              </div>`,
            }),
          })
        } catch (emailErr) {
          console.error('Failed to send invite email:', emailErr?.message)
        }
      } else {
        console.log(`[invite] No RESEND_API_KEY set — invite link for ${inviteeEmail}: ${inviteLink}`)
      }
      return res.status(200).json({ success: true, token, inviteLink })
    }

    // ── Business Team: accept email invite ───────────────────────────────────
    if (action === 'accept-invite') {
      const authHeader = req.headers.authorization
      if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' })
      const payload = verify(authHeader.replace('Bearer ', ''))
      if (!payload) return res.status(401).json({ error: 'Invalid token' })
      const { token: inviteToken } = req.body
      if (!inviteToken) return res.status(400).json({ error: 'token required' })
      const inviteRow = await db.execute({ sql: 'SELECT * FROM team_invites WHERE token = ?', args: [inviteToken] })
      const invite = inviteRow.rows[0]
      if (!invite) return res.status(404).json({ error: 'Invalid or expired invite' })
      if (invite.accepted_at) return res.status(409).json({ error: 'Invite already used' })
      if (invite.email && invite.email.toLowerCase() !== payload.email.toLowerCase()) {
        return res.status(403).json({ error: 'This invite was sent to a different email address' })
      }
      // Check created within 7 days
      const age = Date.now() - new Date(invite.created_at).getTime()
      if (age > 7 * 24 * 60 * 60 * 1000) return res.status(410).json({ error: 'Invite has expired' })
      // Verify team owner's Business plan is still active — don't grant access if owner cancelled
      const ownerTeamRow = await db.execute({ sql: 'SELECT owner_id FROM teams WHERE id = ?', args: [invite.team_id] })
      const teamOwnerId = ownerTeamRow.rows[0]?.owner_id
      if (teamOwnerId) {
        const ownerPlanRow = await db.execute({ sql: 'SELECT is_business FROM users WHERE id = ?', args: [teamOwnerId] })
        if (!ownerPlanRow.rows[0]?.is_business) {
          return res.status(403).json({ error: 'The team owner\'s Business plan is no longer active. Contact them to renew.' })
        }
      }
      const userRow = await db.execute({ sql: 'SELECT team_id FROM users WHERE id = ?', args: [payload.sub] })
      if (userRow.rows[0]?.team_id) return res.status(409).json({ error: 'You are already in a team' })
      // Atomic seat-limit check + insert — prevents concurrent accept race condition
      const acceptResult = await db.execute({
        sql: `INSERT OR IGNORE INTO team_members (team_id, user_id, role, joined_at)
              SELECT ?, ?, 'member', ?
              WHERE (SELECT COUNT(*) FROM team_members WHERE team_id = ?) < 10`,
        args: [invite.team_id, payload.sub, new Date().toISOString(), invite.team_id],
      })
      if (acceptResult.rowsAffected === 0) return res.status(409).json({ error: 'Team is full (10 members max)' })
      // Grant business access to invited members — they share the owner's Business plan
      await db.execute({ sql: 'UPDATE users SET team_id = ?, is_pro = 1, is_business = 1 WHERE id = ?', args: [invite.team_id, payload.sub] })
      await db.execute({ sql: 'UPDATE team_invites SET accepted_at = ? WHERE token = ?', args: [new Date().toISOString(), inviteToken] })
      return res.status(200).json({ success: true, teamId: invite.team_id })
    }

    if (action === 'share-report') {
      if (await applyLimit(apiLimiter, clientIp, res)) return
      const authHeader = req.headers.authorization
      if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' })
      const payload = verify(authHeader.replace('Bearer ', ''))
      if (!payload) return res.status(401).json({ error: 'Invalid token' })
      const userId = payload.sub
      if (!userId) return res.status(401).json({ error: 'Not authenticated' })
      const { reportData } = req.body
      if (!reportData) return res.status(400).json({ error: 'reportData required' })
      // Guard against oversized payloads clogging Turso storage
      const serialized = JSON.stringify(reportData)
      if (serialized.length > 512 * 1024) return res.status(413).json({ error: 'Report data too large to share' })

      const token = randomUUID()
      const expiresAt = Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60) // 30 days
      const city = reportData?.geo?.displayName ?? 'Unknown'

      await db.execute({
        sql: 'INSERT INTO shared_reports (token, user_id, data, city, expires_at) VALUES (?, ?, ?, ?, ?)',
        args: [token, userId, serialized, city, expiresAt],
      })

      return res.json({ token, url: `${BASE_URL}/?report=${token}` })
    }

    if (action === 'get-shared-report') {
      if (await applyLimit(apiLimiter, clientIp, res)) return
      const { token } = req.body
      if (!token) return res.status(400).json({ error: 'token required' })

      const now = Math.floor(Date.now() / 1000)
      const row = await db.execute({
        sql: 'SELECT data, city FROM shared_reports WHERE token = ? AND expires_at > ?',
        args: [token, now],
      })

      const record = row.rows[0]
      if (!record) return res.status(404).json({ error: 'Report not found or expired' })

      return res.json({ report: JSON.parse(record.data), city: record.city })
    }

    return res.status(400).json({ error: 'Unknown action' })
  } catch (err) {
    const ref = Math.random().toString(36).slice(2, 10)
    console.error(JSON.stringify({ ref, action: req.body?.action || 'unknown', msg: err?.message }))
    return res.status(500).json({ error: 'An internal error occurred.', ref })
  }
}
