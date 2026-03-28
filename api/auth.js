import { createHash, randomBytes } from 'crypto'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'

const SECRET = process.env.AUTH_SECRET || 'dwelling-secret-change-me-in-production'
const FREE_LIMIT = 10
const ADMIN_EMAILS = ['01dominique.c@gmail.com']
const USERS_FILE = '/tmp/dw_users.json'

// ─── Tiny JWT (HS256) ─────────────────────────────────────────────────────────
function b64url(buf) {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

function sign(payload) {
  const header = b64url(Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })))
  const body = b64url(Buffer.from(JSON.stringify(payload)))
  const { createHmac } = require('crypto')
  const sig = b64url(createHmac('sha256', SECRET).update(`${header}.${body}`).digest())
  return `${header}.${body}.${sig}`
}

function verify(token) {
  try {
    const [header, body, sig] = token.split('.')
    const { createHmac } = require('crypto')
    const expected = b64url(createHmac('sha256', SECRET).update(`${header}.${body}`).digest())
    if (sig !== expected) return null
    const payload = JSON.parse(Buffer.from(body, 'base64').toString())
    if (payload.exp && Date.now() / 1000 > payload.exp) return null
    return payload
  } catch {
    return null
  }
}

// ─── User store (JSON file in /tmp) ──────────────────────────────────────────
function loadUsers() {
  try {
    if (existsSync(USERS_FILE)) {
      return JSON.parse(readFileSync(USERS_FILE, 'utf8'))
    }
  } catch {}
  return {}
}

function saveUsers(users) {
  try {
    writeFileSync(USERS_FILE, JSON.stringify(users), 'utf8')
  } catch {}
}

function hashPassword(password, salt) {
  return createHash('sha256').update(password + salt + SECRET).digest('hex')
}

// ─── Handler ──────────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { action } = req.body || {}

  // ── signup ──────────────────────────────────────────────────────────────────
  if (action === 'signup') {
    const { email, password } = req.body
    if (!email || !password) return res.status(400).json({ error: 'Missing email or password' })
    if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' })

    const users = loadUsers()
    const key = email.toLowerCase().trim()
    if (users[key]) return res.status(409).json({ error: 'An account with this email already exists. Try signing in instead.' })

    const salt = randomBytes(16).toString('hex')
    const id = randomBytes(16).toString('hex')
    users[key] = {
      id, email: key, salt,
      password: hashPassword(password, salt),
      is_pro: ADMIN_EMAILS.includes(key),
      analyses_used: 0,
      analyses_reset_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    }
    saveUsers(users)

    const token = sign({ sub: id, email: key, is_pro: users[key].is_pro, exp: Math.floor(Date.now() / 1000) + 30 * 86400 })
    return res.status(200).json({ token, userId: id, email: key, is_pro: users[key].is_pro })
  }

  // ── signin ──────────────────────────────────────────────────────────────────
  if (action === 'signin') {
    const { email, password } = req.body
    if (!email || !password) return res.status(400).json({ error: 'Missing email or password' })

    const users = loadUsers()
    const key = email.toLowerCase().trim()
    const user = users[key]
    if (!user) return res.status(401).json({ error: 'Incorrect email or password.' })
    if (user.password !== hashPassword(password, user.salt)) return res.status(401).json({ error: 'Incorrect email or password.' })

    const token = sign({ sub: user.id, email: key, is_pro: user.is_pro, exp: Math.floor(Date.now() / 1000) + 30 * 86400 })
    return res.status(200).json({ token, userId: user.id, email: key, is_pro: user.is_pro })
  }

  // ── usage (GET user's current usage count) ──────────────────────────────────
  if (action === 'usage') {
    const authHeader = req.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' })
    const payload = verify(authHeader.replace('Bearer ', ''))
    if (!payload) return res.status(401).json({ error: 'Invalid token' })

    const users = loadUsers()
    const user = users[payload.email]
    if (!user) return res.status(200).json({ analyses_used: 0, is_pro: payload.is_pro })
    return res.status(200).json({ analyses_used: user.analyses_used, is_pro: user.is_pro })
  }

  return res.status(400).json({ error: 'Unknown action' })
}
