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
    if (sig !== expected) {
      console.log('DEBUG: Signature mismatch. Expected:', expected, 'Got:', sig)
      return null
    }
    const base64 = body.replace(/-/g, '+').replace(/_/g, '/')
    const payload = JSON.parse(Buffer.from(base64, 'base64').toString())
    if (payload.exp && Date.now() / 1000 > payload.exp) {
      console.log('DEBUG: Token expired at:', new Date(payload.exp * 1000).toISOString())
      return null
    }
    return payload
  } catch (e) { 
    console.log('DEBUG: Token parse error:', e.message)
    return null 
  }
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
    console.log('DEBUG: No Bearer token found in headers')
    return res.status(401).json({ error: 'Unauthorized', debug: 'no_bearer_token' })
  }
  const rawToken = authHeader.replace('Bearer ', '')
  let payload = verifyToken(rawToken)
  
  // Fallback check for default secret
  if (!payload && rawToken.split('.').length === 3) {
    const fallbackSecret = 'dwelling-secret-change-me'
    const [header, body, sig] = rawToken.split('.')
    const expectedFallback = b64url(createHmac('sha256', fallbackSecret).update(`${header}.${body}`).digest())
    if (sig === expectedFallback) {
      console.log('DEBUG: Using fallback secret for token verification')
      const base64 = body.replace(/-/g, '+').replace(/_/g, '/')
      payload = JSON.parse(Buffer.from(base64, 'base64').toString())
    }
  }

  if (!payload) {
    console.log('DEBUG: Token verification failed completely')
    return res.status(401).json({ error: 'Invalid session', debug: 'token_verification_failed' })
  }

  const email = payload.email
  console.log('DEBUG: Authenticated user:', email)

  // 2. API Key Resolution
  let userApiKey = req.headers['x-cerebras-key'] || null
  let keySource = userApiKey ? 'header' : 'none'

  if (!userApiKey) {
    try {
      const db = getDb()
      const result = await db.execute({ sql: 'SELECT cerebras_key FROM users WHERE email = ?', args: [email] })
      if (result.rows.length > 0 && result.rows[0].cerebras_key) {
        const raw = result.rows[0].cerebras_key
        if (raw.startsWith('csk-')) {
          userApiKey = raw
        } else {
          userApiKey = Buffer.from(raw, 'base64').toString().trim()
        }
        keySource = 'database'
      }
    } catch (e) {
      console.log('DEBUG: DB lookup failed:', e.message)
    }
  }

  const platformKey = (process.env.CEREBRAS_API_KEY || '').trim()
  const apiKey = userApiKey || platformKey || null
  if (!userApiKey && platformKey) keySource = 'platform_env'

  console.log('DEBUG: Using API key from source:', keySource)

  if (!apiKey) {
    return res.status(400).json({ error: 'no_key', message: 'No API key found.' })
  }

  // 3. Call Cerebras
  console.log('DEBUG: Calling Cerebras API...')
  const r = await fetch('https://api.cerebras.ai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(req.body),
  })
  
  const data = await r.json()
  console.log('DEBUG: Cerebras response status:', r.status)

  if (!r.ok) {
    console.log('DEBUG: Cerebras error:', JSON.stringify(data))
    return res.status(r.status).json({ 
      error: 'cerebras_error', 
      message: 'Error from Cerebras API', 
      details: data,
      debug_source: keySource 
    })
  }

  res.status(200).json(data)
}
