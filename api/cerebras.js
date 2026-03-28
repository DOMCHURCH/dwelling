import { createHmac } from 'crypto'
import { readFileSync, writeFileSync, existsSync } from 'fs'

const SECRET = process.env.AUTH_SECRET || 'dwelling-secret-change-me-in-production'
const FREE_LIMIT = 10
const ADMIN_EMAILS = ['01dominique.c@gmail.com']
const USERS_FILE = '/tmp/dw_users.json'

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

function loadUsers() {
  try { if (existsSync(USERS_FILE)) return JSON.parse(readFileSync(USERS_FILE, 'utf8')) } catch {}
  return {}
}

function saveUsers(users) {
  try { writeFileSync(USERS_FILE, JSON.stringify(users), 'utf8') } catch {}
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Skip-Count, X-Cerebras-Key')
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' })
  const payload = verifyToken(authHeader.replace('Bearer ', ''))
  if (!payload) return res.status(401).json({ error: 'Invalid session' })

  const email = payload.email
  const isAdmin = ADMIN_EMAILS.includes(email)
  const userApiKey = req.headers['x-cerebras-key']
  const apiKey = userApiKey || process.env.CEREBRAS_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'No API key configured' })

  if (isAdmin || userApiKey) {
    const r = await fetch('https://api.cerebras.ai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(req.body),
    })
    return res.status(r.status).json(await r.json())
  }

  const users = loadUsers()
  let user = users[email]
  if (!user) {
    user = { id: payload.sub, email, is_pro: false, analyses_used: 0, analyses_reset_at: new Date().toISOString() }
    users[email] = user
    saveUsers(users)
  }

  const resetAt = user.analyses_reset_at ? new Date(user.analyses_reset_at) : new Date(0)
  if ((Date.now() - resetAt.getTime()) / (1000 * 60 * 60 * 24) >= 30) {
    user.analyses_used = 0
    user.analyses_reset_at = new Date().toISOString()
  }

  const skipCount = req.headers['x-skip-count'] === 'true'
  if (!user.is_pro && !skipCount && user.analyses_used >= FREE_LIMIT) {
    return res.status(429).json({ error: 'limit reached' })
  }

  const r = await fetch('https://api.cerebras.ai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.CEREBRAS_API_KEY}` },
    body: JSON.stringify(req.body),
  })
  const data = await r.json()

  if (r.ok && !user.is_pro && !skipCount) {
    user.analyses_used = (user.analyses_used || 0) + 1
    users[email] = user
    saveUsers(users)
  }

  res.status(r.status).json(data)
}
