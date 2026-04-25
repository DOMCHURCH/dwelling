import { createHash, createHmac, timingSafeEqual, randomBytes, randomUUID, pbkdf2 as _pbkdf2 } from 'crypto'
import { promisify } from 'util'
import { createClient } from '@libsql/client'
import { Resend } from 'resend'
import { hash as argon2Hash, verify as argon2Verify } from '@node-rs/argon2'
import { signupLimiter, signinLimiter, resetLimiter, apiLimiter, applyLimit, getRedis, getClientIp } from './_ratelimit.js'

// ─── Startup validation ───────────────────────────────────────────────────────
const SECRET = process.env.AUTH_SECRET
if (!SECRET) throw new Error('FATAL: AUTH_SECRET env var is not set. Refusing to start.')

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean)
const BASE_URL = process.env.BASE_URL || `https://${process.env.VERCEL_URL}` || 'https://dwelling.one'
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'https://dwelling.one'

function getDb() {
  return createClient({ url: process.env.TURSO_URL, authToken: process.env.TURSO_TOKEN })
}

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
      created_at TEXT
    )
  `)
  const migrations = [
    'ALTER TABLE users ADD COLUMN terms_accepted_at TEXT',
    'ALTER TABLE users ADD COLUMN terms_accepted_ip TEXT',
    'ALTER TABLE users ADD COLUMN reset_token TEXT',
    'ALTER TABLE users ADD COLUMN reset_token_expires TEXT',
    'ALTER TABLE users ADD COLUMN stripe_customer_id TEXT',
    'ALTER TABLE users ADD COLUMN stripe_subscription_id TEXT',
    'ALTER TABLE users ADD COLUMN is_business INTEGER DEFAULT 0',
    'ALTER TABLE users ADD COLUMN team_id TEXT',
    'ALTER TABLE teams ADD COLUMN invite_code_expires_at TEXT',
    'ALTER TABLE users ADD COLUMN is_admin INTEGER DEFAULT 0',
  ]
  for (const sql of migrations) {
    try { await db.execute(sql) } catch { /* already exists */ }
  }

  await db.execute(`
    CREATE TABLE IF NOT EXISTS invite_code_attempts (
      user_id      TEXT NOT NULL,
      attempted_at TEXT NOT NULL,
      succeeded    INTEGER DEFAULT 0,
      ip           TEXT,
      invite_code  TEXT
    )
  `)
  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_ica_user_time ON invite_code_attempts(user_id, attempted_at)',
    'CREATE INDEX IF NOT EXISTS idx_ica_code_time ON invite_code_attempts(invite_code, attempted_at)',
    'CREATE INDEX IF NOT EXISTS idx_ica_ip_time   ON invite_code_attempts(ip, attempted_at)',
    'CREATE INDEX IF NOT EXISTS idx_users_email   ON users(email)',
    'CREATE INDEX IF NOT EXISTS idx_teams_code    ON teams(invite_code)',
  ]
  for (const sql of indexes) {
    try { await db.execute(sql) } catch { /* already exists */ }
  }

  await db.execute(`
    CREATE TABLE IF NOT EXISTS teams (
      id TEXT PRIMARY KEY,
      name TEXT,
      owner_id TEXT,
      invite_code TEXT UNIQUE,
      invite_code_expires_at TEXT,
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
  _tableReady = true
}

// ─── Password hashing (Argon2id, with PBKDF2 + SHA-256 legacy fallback) ───────
const _pbkdf2Async = promisify(_pbkdf2)

async function hashPassword(password) {
  return argon2Hash(password + SECRET, { memoryCost: 65536, timeCost: 3, parallelism: 1 })
}

async function hashPasswordPbkdf2(password, salt) {
  const key = await _pbkdf2Async(password + SECRET, salt, 100000, 64, 'sha512')
  return key.toString('hex')
}

function hashPasswordSha256(password, salt) {
  return createHash('sha256').update(password + salt + SECRET).digest('hex')
}

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
const ACCESS_TOKEN_TTL = 15 * 60
const REFRESH_TOKEN_TTL = 7 * 24 * 3600

function b64url(buf) {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

function sign(payload) {
  const header = b64url(Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })))
  const body = b64url(Buffer.from(JSON.stringify(payload)))
  const sig = b64url(createHmac('sha256', SECRET).update(`${header}.${body}`).digest())
  return `${header}.${body}.${sig}`
}

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
    const headerObj = JSON.parse(Buffer.from(header.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString())
    if (headerObj.alg !== 'HS256') return null
    const expected = b64url(createHmac('sha256', SECRET).update(`${header}.${body}`).digest())
    try {
      if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null
    } catch { return null }
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
  const origin = req.headers.origin || ''
  if (origin === ALLOWED_ORIGIN) res.setHeader('Access-Control-Allow-Origin', origin)
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
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(key)) return res.status(400).json({ error: 'Invalid email address.' })
      const existing = await db.execute({ sql: 'SELECT email FROM users WHERE email = ?', args: [key] })
      if (existing.rows.length > 0) return res.status(409).json({ error: 'An account with this email already exists. Try signing in instead.' })
      const salt = randomBytes(16).toString('hex')
      const id = randomBytes(16).toString('hex')
      const is_admin = ADMIN_EMAILS.includes(key)
      const hashed = await hashPassword(password)
      await db.execute({
        sql: 'INSERT INTO users (email, id, salt, password, is_pro, analyses_used, analyses_reset_at, created_at, terms_accepted_at, terms_accepted_ip) VALUES (?, ?, ?, ?, 0, 0, ?, ?, ?, ?)',
        args: [key, id, salt, hashed, new Date().toISOString(), new Date().toISOString(), new Date().toISOString(), clientIp],
      })
      const { accessToken, refreshToken } = await issueTokenPair({ sub: id, email: key, is_admin })
      return res.status(200).json({ token: accessToken, refreshToken, userId: id, email: key, is_admin })
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
      if (needsMigration) {
        const upgraded = await hashPassword(password)
        await db.execute({ sql: 'UPDATE users SET password = ? WHERE email = ?', args: [upgraded, key] })
      }
      const is_admin = ADMIN_EMAILS.includes(key)
      if (is_admin) await db.execute({ sql: 'UPDATE users SET is_admin = 1 WHERE email = ?', args: [key] }).catch(() => {})
      const { accessToken, refreshToken } = await issueTokenPair({ sub: user.id, email: key, is_admin })
      return res.status(200).json({ token: accessToken, refreshToken, userId: user.id, email: key, is_admin })
    }

    // ── forgot-password ─────────────────────────────────────────────────────
    if (action === 'forgot-password') {
      if (await applyLimit(resetLimiter, clientIp, res)) return
      const { email } = req.body
      if (!email) return res.status(400).json({ error: 'Email is required.' })
      const key = email.toLowerCase().trim()
      const result = await db.execute({ sql: 'SELECT email FROM users WHERE email = ?', args: [key] })
      if (result.rows.length === 0) return res.status(200).json({ success: true })
      const token = randomBytes(32).toString('hex')
      const expires = new Date(Date.now() + 60 * 60 * 1000).toISOString()
      await db.execute({ sql: 'UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE email = ?', args: [token, expires, key] })
      try { await sendResetEmail(key, token) } catch (e) {
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
      await db.execute({ sql: 'UPDATE users SET password = ?, salt = ?, reset_token = NULL, reset_token_expires = NULL WHERE email = ?', args: [hashed, salt, user.email] })
      const is_admin = ADMIN_EMAILS.includes(user.email)
      const { accessToken, refreshToken } = await issueTokenPair({ sub: user.id, email: user.email, is_admin })
      return res.status(200).json({ token: accessToken, refreshToken, userId: user.id, email: user.email, is_admin })
    }

    // ── refresh ─────────────────────────────────────────────────────────────
    if (action === 'refresh') {
      const { refreshToken } = req.body
      if (!refreshToken) return res.status(400).json({ error: 'Refresh token required.' })
      let stored
      try {
        stored = await getRedis().getdel(`rt:${refreshToken}`)
      } catch (e) {
        console.error('auth: Redis unavailable during refresh:', e.message)
        return res.status(503).json({ error: 'Session service temporarily unavailable. Please try again.' })
      }
      if (!stored) return res.status(401).json({ error: 'Session expired. Please sign in again.' })
      const claims = typeof stored === 'string' ? JSON.parse(stored) : stored
      if (!claims?.email || !claims?.sub) return res.status(401).json({ error: 'Invalid refresh token.' })
      const is_admin = ADMIN_EMAILS.includes(claims.email)
      const { accessToken, refreshToken: newRt } = await issueTokenPair({ ...claims, is_admin })
      return res.status(200).json({ token: accessToken, refreshToken: newRt })
    }

    // ── signout ─────────────────────────────────────────────────────────────
    if (action === 'signout') {
      const { refreshToken } = req.body
      if (refreshToken) { try { await getRedis().del(`rt:${refreshToken}`) } catch {} }
      return res.status(200).json({ success: true })
    }

    // ── change-password ──────────────────────────────────────────────────────
    if (action === 'change-password') {
      if (await applyLimit(resetLimiter, clientIp, res)) return
      const authHeader = req.headers.authorization
      if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' })
      const payload = verify(authHeader.replace('Bearer ', ''))
      if (!payload) return res.status(401).json({ error: 'Invalid token' })
      const { currentPassword, newPassword } = req.body
      if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Both passwords required' })
      if (newPassword.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' })
      const result = await db.execute({ sql: 'SELECT password, salt FROM users WHERE email = ?', args: [payload.email] })
      if (!result.rows[0]) return res.status(404).json({ error: 'User not found' })
      const { password: storedHash, salt } = result.rows[0]
      const { ok } = await verifyPassword(currentPassword, storedHash, salt)
      if (!ok) return res.status(403).json({ error: 'Current password is incorrect' })
      const hashed = await hashPassword(newPassword)
      await db.execute({ sql: 'UPDATE users SET password = ? WHERE email = ?', args: [hashed, payload.email] })
      return res.status(200).json({ success: true })
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
      if (clientRt) { try { await getRedis().del(`rt:${clientRt}`) } catch {} }
      return res.status(200).json({ success: true })
    }

    // ── Saved Reports: save ──────────────────────────────────────────────────
    if (action === 'save-report') {
      const authHeader = req.headers.authorization
      if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' })
      const payload = verify(authHeader.replace('Bearer ', ''))
      if (!payload) return res.status(401).json({ error: 'Invalid token' })
      const { address, city, score, verdict, data } = req.body
      if (!data) return res.status(400).json({ error: 'data required' })
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
      const result = await db.execute({ sql: 'SELECT * FROM saved_reports WHERE id = ? AND user_id = ?', args: [reportId, payload.sub] })
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

    // ── Team: create ─────────────────────────────────────────────────────────
    if (action === 'create-team') {
      const authHeader = req.headers.authorization
      if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' })
      const payload = verify(authHeader.replace('Bearer ', ''))
      if (!payload) return res.status(401).json({ error: 'Invalid token' })
      const userRow = await db.execute({ sql: 'SELECT team_id FROM users WHERE id = ?', args: [payload.sub] })
      if (userRow.rows[0]?.team_id) return res.status(409).json({ error: 'Already in a team' })
      const { name } = req.body
      if (!name || typeof name !== 'string') return res.status(400).json({ error: 'name required' })
      const teamId = randomBytes(12).toString('hex')
      const inviteCode = randomBytes(16).toString('hex')
      const inviteCodeExpiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString()
      await db.execute({
        sql: 'INSERT INTO teams (id, name, owner_id, invite_code, invite_code_expires_at, daily_limit, usage_today, usage_date, created_at) VALUES (?, ?, ?, ?, ?, 3000, 0, ?, ?)',
        args: [teamId, name.trim(), payload.sub, inviteCode, inviteCodeExpiresAt, new Date().toISOString().slice(0, 10), new Date().toISOString()],
      })
      await db.execute({ sql: 'INSERT INTO team_members (team_id, user_id, role, joined_at) VALUES (?, ?, ?, ?)', args: [teamId, payload.sub, 'owner', new Date().toISOString()] })
      await db.execute({ sql: 'UPDATE users SET team_id = ? WHERE id = ?', args: [teamId, payload.sub] })
      return res.status(200).json({ success: true, teamId, inviteCode })
    }

    // ── Team: join ───────────────────────────────────────────────────────────
    if (action === 'join-team') {
      const authHeader = req.headers.authorization
      if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' })
      const payload = verify(authHeader.replace('Bearer ', ''))
      if (!payload) return res.status(401).json({ error: 'Invalid token' })
      const userRow = await db.execute({ sql: 'SELECT team_id FROM users WHERE id = ?', args: [payload.sub] })
      if (userRow.rows[0]?.team_id) return res.status(409).json({ error: 'Already in a team' })

      const INVITE_ERROR = { error: 'Invalid or expired invite code' }
      const windowStart = new Date(Date.now() - 15 * 60 * 1000).toISOString()
      const ip = clientIp

      const userAttempts = await db.execute({
        sql: 'SELECT COUNT(*) as cnt FROM invite_code_attempts WHERE user_id = ? AND attempted_at > ? AND succeeded = 0',
        args: [payload.sub, windowStart],
      })
      if ((userAttempts.rows[0]?.cnt || 0) >= 5) {
        return res.status(429).json({ error: 'Too many failed attempts. Please wait 15 minutes.' })
      }

      if (ip && ip !== 'unknown') {
        const ipAttempts = await db.execute({
          sql: 'SELECT COUNT(*) as cnt FROM invite_code_attempts WHERE ip = ? AND attempted_at > ? AND succeeded = 0',
          args: [ip, windowStart],
        })
        if ((ipAttempts.rows[0]?.cnt || 0) >= 20) {
          return res.status(429).json({ error: 'Too many failed attempts from this network. Please wait 15 minutes.' })
        }
      }

      const { inviteCode } = req.body
      if (!inviteCode) return res.status(400).json({ error: 'inviteCode required' })
      const normalizedCode = inviteCode.trim().toLowerCase()

      const codeAttempts = await db.execute({
        sql: 'SELECT COUNT(*) as cnt FROM invite_code_attempts WHERE invite_code = ? AND attempted_at > ? AND succeeded = 0',
        args: [normalizedCode, windowStart],
      })
      if ((codeAttempts.rows[0]?.cnt || 0) >= 20) {
        return res.status(429).json({ error: 'This invite code has been temporarily locked due to too many failed attempts.' })
      }

      const logFailure = () => db.execute({
        sql: 'INSERT INTO invite_code_attempts (user_id, attempted_at, succeeded, ip, invite_code) VALUES (?, ?, 0, ?, ?)',
        args: [payload.sub, new Date().toISOString(), ip, normalizedCode],
      }).catch(() => {})

      const teamRow = await db.execute({ sql: 'SELECT id, invite_code_expires_at FROM teams WHERE invite_code = ?', args: [normalizedCode] })
      if (teamRow.rows.length === 0) { await logFailure(); return res.status(404).json(INVITE_ERROR) }
      const team = teamRow.rows[0]
      if (team.invite_code_expires_at && new Date(team.invite_code_expires_at) < new Date()) {
        await logFailure()
        return res.status(404).json(INVITE_ERROR)
      }

      const joinResult = await db.execute({
        sql: `INSERT OR IGNORE INTO team_members (team_id, user_id, role, joined_at)
              SELECT ?, ?, 'member', ?
              WHERE (SELECT COUNT(*) FROM team_members WHERE team_id = ?) < 10`,
        args: [team.id, payload.sub, new Date().toISOString(), team.id],
      })
      if (joinResult.rowsAffected === 0) return res.status(409).json({ error: 'Team is full (10 members max)' })

      await db.execute({
        sql: 'INSERT INTO invite_code_attempts (user_id, attempted_at, succeeded, ip, invite_code) VALUES (?, ?, 1, ?, ?)',
        args: [payload.sub, new Date().toISOString(), ip, normalizedCode],
      })

      await db.execute({ sql: 'UPDATE users SET team_id = ? WHERE id = ?', args: [team.id, payload.sub] })
      return res.status(200).json({ success: true, teamId: team.id })
    }

    // ── Team: rotate invite code ─────────────────────────────────────────────
    if (action === 'rotate-invite-code') {
      const authHeader = req.headers.authorization
      if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' })
      const payload = verify(authHeader.replace('Bearer ', ''))
      if (!payload) return res.status(401).json({ error: 'Invalid token' })
      const userRow = await db.execute({ sql: 'SELECT team_id FROM users WHERE id = ?', args: [payload.sub] })
      const teamId = userRow.rows[0]?.team_id
      if (!teamId) return res.status(404).json({ error: 'Not in a team' })
      const teamRow = await db.execute({ sql: 'SELECT owner_id FROM teams WHERE id = ?', args: [teamId] })
      if (teamRow.rows[0]?.owner_id !== payload.sub) return res.status(403).json({ error: 'Only the team owner can rotate the invite code' })
      const newCode = randomBytes(16).toString('hex')
      const newExpiry = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString()
      await db.execute({ sql: 'UPDATE teams SET invite_code = ?, invite_code_expires_at = ? WHERE id = ?', args: [newCode, newExpiry, teamId] })
      return res.status(200).json({ success: true, inviteCode: newCode, expiresAt: newExpiry })
    }

    // ── Team: get portal data ────────────────────────────────────────────────
    if (action === 'get-team') {
      const authHeader = req.headers.authorization
      if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' })
      const payload = verify(authHeader.replace('Bearer ', ''))
      if (!payload) return res.status(401).json({ error: 'Invalid token' })
      const userRow = await db.execute({ sql: 'SELECT team_id FROM users WHERE id = ?', args: [payload.sub] })
      const teamId = userRow.rows[0]?.team_id
      if (!teamId) return res.status(404).json({ error: 'Not in a team' })
      const teamRow = await db.execute({ sql: 'SELECT id, name, invite_code, invite_code_expires_at, daily_limit, usage_today, usage_date, logo_data FROM teams WHERE id = ?', args: [teamId] })
      if (teamRow.rows.length === 0) return res.status(404).json({ error: 'Team not found' })
      const team = teamRow.rows[0]
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

    // ── Team: log analysis ───────────────────────────────────────────────────
    if (action === 'log-team-analysis') {
      const authHeader = req.headers.authorization
      if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' })
      const payload = verify(authHeader.replace('Bearer ', ''))
      if (!payload) return res.status(401).json({ error: 'Invalid token' })
      const userRow = await db.execute({ sql: 'SELECT team_id, email FROM users WHERE id = ?', args: [payload.sub] })
      const teamId = userRow.rows[0]?.team_id
      if (!teamId) return res.status(200).json({ logged: false })
      const today = new Date().toISOString().slice(0, 10)
      const atomicUpdate = await db.execute({
        sql: `UPDATE teams
              SET usage_today = CASE WHEN usage_date = ? THEN usage_today + 1 ELSE 1 END,
                  usage_date  = ?
              WHERE id = ?
                AND (CASE WHEN usage_date = ? THEN usage_today ELSE 0 END) < daily_limit`,
        args: [today, today, teamId, today],
      })
      if (atomicUpdate.rowsAffected === 0) return res.status(429).json({ error: 'Team daily limit reached' })
      const { address, city, score, verdict, data } = req.body
      const teamReportSerialized = JSON.stringify(data || {})
      if (teamReportSerialized.length > 512 * 1024) return res.status(413).json({ error: 'Report data too large (max 512 KB)' })
      const reportId = randomBytes(12).toString('hex')
      await db.execute({
        sql: 'INSERT INTO team_reports (id, team_id, user_id, user_email, address, city, score, verdict, data, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        args: [reportId, teamId, payload.sub, userRow.rows[0].email, address || '', city || '', score ?? null, verdict || null, teamReportSerialized, new Date().toISOString()],
      })
      const teamRow = await db.execute({ sql: 'SELECT usage_today FROM teams WHERE id = ?', args: [teamId] })
      return res.status(200).json({ logged: true, usageToday: teamRow.rows[0]?.usage_today ?? 1 })
    }

    // ── Team: save logo ──────────────────────────────────────────────────────
    if (action === 'save-logo') {
      const authHeader = req.headers.authorization
      if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' })
      const payload = verify(authHeader.replace('Bearer ', ''))
      if (!payload) return res.status(401).json({ error: 'Invalid token' })
      const userRow = await db.execute({ sql: 'SELECT team_id FROM users WHERE id = ?', args: [payload.sub] })
      const teamId = userRow.rows[0]?.team_id
      if (!teamId) return res.status(404).json({ error: 'Not in a team' })
      const teamRow = await db.execute({ sql: 'SELECT owner_id FROM teams WHERE id = ?', args: [teamId] })
      if (teamRow.rows[0]?.owner_id !== payload.sub) return res.status(403).json({ error: 'Only the team owner can change the logo' })
      const { logo } = req.body
      if (!logo || typeof logo !== 'string') return res.status(400).json({ error: 'logo (base64) required' })
      if (!/^data:image\/(png|jpeg|gif|webp);base64,/.test(logo)) return res.status(400).json({ error: 'logo must be a base64-encoded image (PNG, JPEG, GIF, or WebP)' })
      if (logo.length > 2 * 1024 * 1024) return res.status(413).json({ error: 'Logo too large (max 2MB)' })
      await db.execute({ sql: 'UPDATE teams SET logo_data = ? WHERE id = ?', args: [logo, teamId] })
      return res.status(200).json({ success: true })
    }

    // ── Team: invite member by email ─────────────────────────────────────────
    if (action === 'invite-member') {
      const authHeader = req.headers.authorization
      if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' })
      const payload = verify(authHeader.replace('Bearer ', ''))
      if (!payload) return res.status(401).json({ error: 'Invalid token' })
      const userRow = await db.execute({ sql: 'SELECT team_id, email FROM users WHERE id = ?', args: [payload.sub] })
      const teamId = userRow.rows[0]?.team_id
      if (!teamId) return res.status(403).json({ error: 'Not in a team' })
      const teamRow = await db.execute({ sql: 'SELECT owner_id, name FROM teams WHERE id = ?', args: [teamId] })
      if (teamRow.rows[0]?.owner_id !== payload.sub) return res.status(403).json({ error: 'Only the team owner can invite members' })
      const { email: inviteeEmail, nickname } = req.body
      if (!inviteeEmail || typeof inviteeEmail !== 'string') return res.status(400).json({ error: 'email required' })
      const memberCount = await db.execute({ sql: 'SELECT COUNT(*) as cnt FROM team_members WHERE team_id = ?', args: [teamId] })
      if ((memberCount.rows[0]?.cnt || 0) >= 10) return res.status(409).json({ error: 'Team is full (10 members max)' })
      const token = randomBytes(24).toString('hex')
      await db.execute({
        sql: 'INSERT OR REPLACE INTO team_invites (token, team_id, email, nickname, invited_by, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        args: [token, teamId, inviteeEmail.toLowerCase().trim(), nickname || null, userRow.rows[0].email, new Date().toISOString()],
      })
      const inviteLink = `https://dwelling.one/?join=${token}`
      const teamName = teamRow.rows[0]?.name || 'their team'
      const fromName = userRow.rows[0]?.email
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
                <p style="color:#666">${fromName} is using Dwelling to analyze Canadian real estate — and wants you on their team.</p>
                <a href="${inviteLink}" style="display:inline-block;background:#3b82f6;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin:16px 0">Accept Invitation</a>
                <p style="color:#999;font-size:12px">This invite link expires in 7 days.</p>
              </div>`,
            }),
          })
        } catch (emailErr) {
          console.error('Failed to send invite email:', emailErr?.message)
        }
      }
      return res.status(200).json({ success: true, token, inviteLink })
    }

    // ── Team: accept email invite ────────────────────────────────────────────
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
      const age = Date.now() - new Date(invite.created_at).getTime()
      if (age > 7 * 24 * 60 * 60 * 1000) return res.status(410).json({ error: 'Invite has expired' })
      const userRow = await db.execute({ sql: 'SELECT team_id FROM users WHERE id = ?', args: [payload.sub] })
      if (userRow.rows[0]?.team_id) return res.status(409).json({ error: 'You are already in a team' })
      const acceptResult = await db.execute({
        sql: `INSERT OR IGNORE INTO team_members (team_id, user_id, role, joined_at)
              SELECT ?, ?, 'member', ?
              WHERE (SELECT COUNT(*) FROM team_members WHERE team_id = ?) < 10`,
        args: [invite.team_id, payload.sub, new Date().toISOString(), invite.team_id],
      })
      if (acceptResult.rowsAffected === 0) return res.status(409).json({ error: 'Team is full (10 members max)' })
      await db.execute({ sql: 'UPDATE users SET team_id = ? WHERE id = ?', args: [invite.team_id, payload.sub] })
      await db.execute({ sql: 'UPDATE team_invites SET accepted_at = ? WHERE token = ?', args: [new Date().toISOString(), inviteToken] })
      return res.status(200).json({ success: true, teamId: invite.team_id })
    }

    // ── Shared Reports: share ────────────────────────────────────────────────
    if (action === 'share-report') {
      if (await applyLimit(apiLimiter, clientIp, res)) return
      const authHeader = req.headers.authorization
      if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' })
      const payload = verify(authHeader.replace('Bearer ', ''))
      if (!payload) return res.status(401).json({ error: 'Not authenticated' })
      const { reportData } = req.body
      if (!reportData) return res.status(400).json({ error: 'reportData required' })
      const serialized = JSON.stringify(reportData)
      if (serialized.length > 512 * 1024) return res.status(413).json({ error: 'Report data too large to share' })
      const token = randomUUID()
      const expiresAt = Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60)
      const city = reportData?.geo?.displayName ?? 'Unknown'
      await db.execute({
        sql: 'INSERT INTO shared_reports (token, user_id, data, city, expires_at) VALUES (?, ?, ?, ?, ?)',
        args: [token, payload.sub, serialized, city, expiresAt],
      })
      return res.json({ token, url: `${BASE_URL}/?report=${token}` })
    }

    // ── Shared Reports: get ──────────────────────────────────────────────────
    if (action === 'get-shared-report') {
      if (await applyLimit(apiLimiter, clientIp, res)) return
      const { token } = req.body
      if (!token) return res.status(400).json({ error: 'token required' })
      const now = Math.floor(Date.now() / 1000)
      const row = await db.execute({ sql: 'SELECT data, city FROM shared_reports WHERE token = ? AND expires_at > ?', args: [token, now] })
      const record = row.rows[0]
      if (!record) return res.status(404).json({ error: 'Report not found or expired' })
      return res.json({ report: JSON.parse(record.data), city: record.city })
    }

    // ── Admin: list users ────────────────────────────────────────────────────
    if (action === 'admin-list-users') {
      const authHeader = req.headers.authorization
      if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' })
      const payload = verify(authHeader.replace('Bearer ', ''))
      if (!payload?.is_admin) return res.status(403).json({ error: 'Admin access required' })
      const result = await db.execute({
        sql: 'SELECT id, email, is_pro, is_business, analyses_used, created_at FROM users ORDER BY created_at DESC LIMIT 200',
        args: [],
      })
      return res.status(200).json({ users: result.rows })
    }

    // ── Admin: adjust usage ──────────────────────────────────────────────────
    if (action === 'admin-adjust-usage') {
      const authHeader = req.headers.authorization
      if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' })
      const payload = verify(authHeader.replace('Bearer ', ''))
      if (!payload?.is_admin) return res.status(403).json({ error: 'Admin access required' })
      const { targetEmail, analysesUsed } = req.body
      if (!targetEmail || analysesUsed == null) return res.status(400).json({ error: 'targetEmail and analysesUsed required' })
      const r = await db.execute({
        sql: 'UPDATE users SET analyses_used = ? WHERE email = ?',
        args: [Math.max(0, parseInt(analysesUsed, 10)), targetEmail.trim().toLowerCase()],
      })
      if (r.rowsAffected === 0) return res.status(404).json({ error: `No user: ${targetEmail}` })
      return res.status(200).json({ success: true })
    }

    return res.status(400).json({ error: 'Unknown action' })
  } catch (err) {
    const ref = Math.random().toString(36).slice(2, 10)
    console.error(JSON.stringify({ ref, action: req.body?.action || 'unknown', msg: err?.message }))
    return res.status(500).json({ error: 'An internal error occurred.', ref })
  }
}
