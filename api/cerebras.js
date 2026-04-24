import { createHmac, timingSafeEqual, createHash } from 'crypto'
import { createClient } from '@libsql/client'
import { getUserEntitlementsByEmail } from './_entitlements.js'
import { getClientIp, getRedis, checkGlobalAiRpm, checkAndIncrQuota, utcDay, utcMonth } from './_ratelimit.js'

const ALLOWED_MODELS = ['llama-4-scout-17b-16e-instruct', 'llama-3.3-70b']

function detectProvider(key, model = '') {
  if (key.startsWith('csk-'))    return 'cerebras'
  if (key.startsWith('gsk_'))    return 'groq'
  if (key.startsWith('sk-or-'))  return 'openrouter'
  if (key.startsWith('sk-ant-')) return 'anthropic'
  if (key.startsWith('pplx-'))   return 'perplexity'
  if (key.startsWith('fw-'))     return 'fireworks'
  if (key.startsWith('nvapi-'))  return 'nvidia'
  if (key.startsWith('xai-'))    return 'xai'
  if (key.startsWith('AIza'))    return 'google'
  if (key.startsWith('sk-')) {
    if (model.startsWith('deepseek')) return 'deepseek'
    return 'openai'
  }
  if (model.includes('mistral') || model.includes('mixtral')) return 'mistral'
  return 'openai'
}

const PROVIDER_URLS = {
  cerebras:   'https://api.cerebras.ai/v1/chat/completions',
  groq:       'https://api.groq.com/openai/v1/chat/completions',
  openrouter: 'https://openrouter.ai/api/v1/chat/completions',
  openai:     'https://api.openai.com/v1/chat/completions',
  perplexity: 'https://api.perplexity.ai/chat/completions',
  fireworks:  'https://api.fireworks.ai/inference/v1/chat/completions',
  nvidia:     'https://integrate.api.nvidia.com/v1/chat/completions',
  xai:        'https://api.x.ai/v1/chat/completions',
  deepseek:   'https://api.deepseek.com/v1/chat/completions',
  mistral:    'https://api.mistral.ai/v1/chat/completions',
  google:     'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
}

async function callProvider(provider, key, body, signal) {
  if (provider === 'anthropic') {
    const sysMsg = body.messages.find(m => m.role === 'system')
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: body.model, max_tokens: body.max_tokens || 4096,
        messages: body.messages.filter(m => m.role !== 'system'),
        ...(sysMsg && { system: sysMsg.content }),
        ...(body.temperature !== undefined && { temperature: body.temperature }),
      }),
      ...(signal && { signal }),
    })
    if (!r.ok) return r
    const d = await r.json()
    const wrapped = {
      choices: [{ message: { role: 'assistant', content: d.content?.[0]?.text ?? '' }, finish_reason: d.stop_reason }],
      usage: { prompt_tokens: d.usage?.input_tokens, completion_tokens: d.usage?.output_tokens },
    }
    return new Response(JSON.stringify(wrapped), { status: 200, headers: { 'Content-Type': 'application/json' } })
  }
  const url = PROVIDER_URLS[provider] || PROVIDER_URLS.openai
  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify(body),
    ...(signal && { signal }),
  })
}
const PRO_DAILY_LIMIT    = parseInt(process.env.PRO_DAILY_LIMIT    || '200',  10)
const PRO_MONTHLY_LIMIT  = parseInt(process.env.PRO_MONTHLY_LIMIT  || '0',    10) // 0 = unlimited
const BIZ_KEY_DAILY_LIM  = parseInt(process.env.BIZ_KEY_DAILY_LIM  || '200',  10)
const BIZ_KEY_MONTH_LIM  = parseInt(process.env.BIZ_KEY_MONTH_LIM  || '2000', 10)
const CEREBRAS_TIMEOUT_MS = 45000 // 45s — Vercel maxDuration is 60s

// ─── Startup validation ───────────────────────────────────────────────────────
const SECRET = process.env.AUTH_SECRET
if (!SECRET) throw new Error('FATAL: AUTH_SECRET env var is not set. Refusing to start.')

const FREE_LIMIT = 3
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean)
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'https://dwelling.one'

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
    if (!header || !body || !sig) return null
    // Reject alg:none and unexpected algorithms
    const headerObj = JSON.parse(Buffer.from(header.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString())
    if (headerObj.alg !== 'HS256') return null
    // Constant-time comparison — prevents timing attacks
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

// C-1: Strip premium fields from AI JSON before returning to free-tier users.
// Only investment, riskData, priceHistory are gated — neighborhood detail is free.
const PREMIUM_FIELDS = ['investment', 'riskData', 'priceHistory']

function stripPremiumContent(cerebrasData) {
  try {
    const content = cerebrasData?.choices?.[0]?.message?.content
    if (!content) return cerebrasData
    const analysis = JSON.parse(content)
    PREMIUM_FIELDS.forEach(f => { delete analysis[f] })
    cerebrasData.choices[0].message.content = JSON.stringify(analysis)
  } catch (e) {
    console.error('cerebras: stripPremiumContent failed:', e.message)
  }
  return cerebrasData
}

export default async function handler(req, res) {
  // CORS — locked to production domain
  const origin = req.headers.origin || ''
  if (origin === ALLOWED_ORIGIN) {
    res.setHeader('Access-Control-Allow-Origin', origin || ALLOWED_ORIGIN)
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Skip-Count')
  res.setHeader('Vary', 'Origin')
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  // Guard against oversized bodies — validate before any DB or API work
  // Vercel's default limit is 4.5 MB; we cap messages at 64 KB to prevent prompt-stuffing abuse
  const bodyStr = JSON.stringify(req.body || {})
  if (bodyStr.length > 64 * 1024) {
    return res.status(413).json({ error: 'Request body too large (max 64 KB)' })
  }

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
  // Trust JWT is_admin (cryptographically signed) OR env-var match
  const isAdmin = ADMIN_EMAILS.includes(email) || !!payload.is_admin

  // 2. Resolve API key — platform environment only
  const apiKey = (process.env.CEREBRAS_API_KEY || '').trim()
  const keySource = 'platform_env'

  if (!apiKey) {
    return res.status(500).json({ error: 'service_unavailable', message: 'AI service is not configured. Please contact support.' })
  }

  // 3a. Global requests-per-minute cap — prevents cost explosion from bugs or attacks
  if (await checkGlobalAiRpm(300)) {
    return res.status(429).json({ error: 'Service is experiencing high demand. Please try again in a moment.' })
  }

  // 3b. Request deduplication — blocks concurrent identical requests.
  // TTL is 90s (> CEREBRAS_TIMEOUT_MS=45s) so a retry at 31s still sees 'pending'.
  // Hash uses stable user sub + messages (not model, not email) keyed on actual content.
  // Lock is released immediately on error/timeout so the user can retry right away.
  // On success it transitions to 'done' with a 5s TTL — prevents rapid re-runs but
  // allows a legitimate second analysis after a brief pause.
  let _dedupKey = null
  let _dedupRedis = null
  if (!isAdmin) {
    try {
      const { messages: _msg } = req.body
      const dedupHash = createHash('sha256')
        .update(`${payload.sub}:${JSON.stringify(_msg)}`)
        .digest('hex').slice(0, 32)
      _dedupKey = `dedup:ai:${dedupHash}`
      _dedupRedis = getRedis()
      const set = await _dedupRedis.set(_dedupKey, 'pending', { nx: true, ex: 90 })
      if (!set) {
        const status = await _dedupRedis.get(_dedupKey).catch(() => null)
        console.warn(JSON.stringify({ event: 'ai_dedup_hit', user: email, status }))
        return res.status(429).json({
          error: 'duplicate_request',
          message: status === 'pending'
            ? 'Your analysis is still in progress. Please wait for it to complete.'
            : 'Identical request already processed. Please wait a moment.',
        })
      }
    } catch { _dedupKey = null } // Redis down → skip dedup entirely
  }

  // 3. Admin bypass — still subject to model allowlist and stream guard
  if (isAdmin) {
    const { model, messages, temperature, max_tokens, stream } = req.body
    if (!ALLOWED_MODELS.includes(model)) {
      return res.status(400).json({ error: `Invalid model. Allowed: ${ALLOWED_MODELS.join(', ')}` })
    }
    if (stream) return res.status(400).json({ error: 'Streaming not supported via this endpoint' })
    const r = await callProvider(detectProvider(apiKey, model), apiKey, { model, messages, temperature, max_tokens: Math.min(max_tokens || 4096, 8192) })
    const data = await r.json()
    return res.status(r.status).json(data)
  }

  // 4. Load user — use centralized entitlement function for plan check
  const db = getDb()
  const ent = await getUserEntitlementsByEmail(db, email)

  // Also load full user row for usage tracking fields
  const result = await db.execute({ sql: 'SELECT analyses_used, analyses_reset_at, is_admin FROM users WHERE LOWER(email) = LOWER(?)', args: [email] })
  let user = result.rows[0]

  if (!user) {
    await db.execute({
      sql: 'INSERT OR IGNORE INTO users (email, id, salt, password, is_pro, analyses_used, analyses_reset_at) VALUES (?, ?, ?, ?, 0, 0, ?)',
      args: [email, payload.sub, '', '', new Date().toISOString()],
    })
    user = { analyses_used: 0, analyses_reset_at: new Date().toISOString() }
  }

  const isPro = ent.is_pro // always from DB, never JWT
  const isDbAdmin = !!(user?.is_admin) || isAdmin // env-var OR DB flag

  // 5. Monthly reset
  const resetAt = user.analyses_reset_at ? new Date(user.analyses_reset_at) : new Date(0)
  if ((Date.now() - resetAt.getTime()) / (1000 * 60 * 60 * 24) >= 30) {
    await db.execute({ sql: 'UPDATE users SET analyses_used = 0, analyses_reset_at = ? WHERE LOWER(email) = LOWER(?)', args: [new Date().toISOString(), email] })
    user.analyses_used = 0
  }

  // Admin bypass — unlimited analyses regardless of plan
  if (isDbAdmin) {
    const { model, messages, temperature, max_tokens, stream } = req.body
    if (!ALLOWED_MODELS.includes(model)) {
      return res.status(400).json({ error: `Invalid model. Allowed: ${ALLOWED_MODELS.join(', ')}` })
    }
    if (stream) return res.status(400).json({ error: 'Streaming not supported via this endpoint' })
    const r2 = await callProvider(detectProvider(apiKey, model), apiKey, { model, messages, temperature, max_tokens: Math.min(max_tokens || 4096, 8192) })
    const data2 = await r2.json()
    return res.status(r2.status).json(data2)
  }

  const skipCount = req.headers['x-skip-count'] === 'true' && isPro
  const isBusiness = ent.is_business

  // 5b. Unified quota enforcement — all tiers, atomic, calendar-based UTC resets.
  // Single source of truth for AI call counting. Never trust frontend counters.
  // Runs BEFORE the AI call so no charge occurs if the limit is exceeded.
  if (!skipCount) {
    const day = utcDay()
    const month = utcMonth()
    try {
      const redis = getRedis()

      if (isBusiness) {
        // ── Business ──────────────────────────────────────────────────────────
        // Track per-user daily/monthly caps for Business plan.
        const dKey = `quota:user:${payload.sub}:daily:${day}`
        const mKey = `quota:user:${payload.sub}:monthly:${month}`

        const daily = await checkAndIncrQuota(redis, dKey, BIZ_KEY_DAILY_LIM, 172800)
        if (!daily.allowed) {
          console.error(JSON.stringify({ event: 'biz_daily_limit', user: email, count: daily.count }))
          return res.status(429).json({ error: 'daily_limit_reached', message: `Daily limit of ${BIZ_KEY_DAILY_LIM} analyses reached. Resets at midnight UTC.` })
        }
        const monthly = await checkAndIncrQuota(redis, mKey, BIZ_KEY_MONTH_LIM, 35 * 86400)
        if (!monthly.allowed) {
          redis.decr(dKey).catch(() => {})
          console.error(JSON.stringify({ event: 'biz_monthly_limit', user: email, count: monthly.count }))
          return res.status(429).json({ error: 'monthly_limit_reached', message: `Monthly limit of ${BIZ_KEY_MONTH_LIM} analyses reached. Resets on the 1st of next month.` })
        }

      } else if (isPro) {
        // ── Pro ───────────────────────────────────────────────────────────────
        // Daily hard cap; optional monthly cap (0 = unlimited).
        const dKey = `quota:user:${payload.sub}:daily:${day}`
        const daily = await checkAndIncrQuota(redis, dKey, PRO_DAILY_LIMIT, 172800)
        if (!daily.allowed) {
          console.error(JSON.stringify({ event: 'pro_daily_limit', user: email, count: daily.count, limit: PRO_DAILY_LIMIT }))
          return res.status(429).json({ error: 'daily_limit_reached', message: `Daily limit of ${PRO_DAILY_LIMIT} analyses reached. Resets at midnight UTC.` })
        }
        if (PRO_MONTHLY_LIMIT > 0) {
          const mKey = `quota:user:${payload.sub}:monthly:${month}`
          const monthly = await checkAndIncrQuota(redis, mKey, PRO_MONTHLY_LIMIT, 35 * 86400)
          if (!monthly.allowed) {
            redis.decr(dKey).catch(() => {})
            return res.status(429).json({ error: 'monthly_limit_reached', message: `Monthly limit of ${PRO_MONTHLY_LIMIT} analyses reached. Resets on the 1st of next month.` })
          }
        }

      } else {
        // ── Free ─────────────────────────────────────────────────────────────
        // auth.js increment-analysis owns the free-tier counter (deterministic
        // reports). This is defence-in-depth — free users normally can't reach
        // the AI path (canUseAI gate in App.jsx), but enforce here too.
        const used = parseInt(await redis.get(`quota:user:${payload.sub}:monthly:${month}`) || '0', 10)
        if (used >= FREE_LIMIT) {
          return res.status(429).json({ error: 'limit reached' })
        }
      }
    } catch (quotaErr) {
      // Redis down — fail open for Pro/Business (paying users), fail closed for Free.
      if (!isPro && !isBusiness) {
        console.error(JSON.stringify({ event: 'quota_redis_down_free', user: email }))
        return res.status(503).json({ error: 'Service temporarily unavailable. Please try again.' })
      }
      console.error(JSON.stringify({ event: 'quota_redis_down_paid', user: email, error: quotaErr.message }))
    }
  }

  // 7. Call Cerebras with hard timeout — prevents serverless function from hanging
  const { model, messages, temperature, max_tokens, stream } = req.body
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), CEREBRAS_TIMEOUT_MS)
  const t0 = Date.now()
  let r
  try {
    r = await callProvider(detectProvider(apiKey, model), apiKey, { model, messages, temperature, max_tokens, stream }, controller.signal)
  } catch (fetchErr) {
    clearTimeout(timeoutId)
    const isTimeout = fetchErr.name === 'AbortError'
    console.error(JSON.stringify({ event: 'cerebras_fetch_error', user: email, timeout: isTimeout, ms: Date.now() - t0 }))
    // Release dedup lock immediately so user can retry without waiting 90s.
    if (_dedupKey && _dedupRedis) _dedupRedis.del(_dedupKey).catch(() => {})
    return res.status(504).json({ error: isTimeout ? 'AI request timed out. Please try again.' : 'AI service unavailable.' })
  } finally {
    clearTimeout(timeoutId)
  }

  const data = await r.json()
  const latencyMs = Date.now() - t0
  console.log(JSON.stringify({ event: 'cerebras_call', user: email, status: r.status, latency_ms: latencyMs, isPro, keySource }))

  if (latencyMs > 30000) {
    console.warn(JSON.stringify({ event: 'cerebras_slow_response', user: email, latency_ms: latencyMs }))
  }

  if (r.status === 401 || data.error?.code === 'wrong_api_key') {
    const msg = keySource === 'platform_env'
      ? 'The platform API key is invalid. Please contact the administrator.'
      : 'Your Cerebras API key is invalid. Please check your settings.'
    return res.status(401).json({ error: 'invalid_key', message: msg })
  }

  // C-1: Server-side paywall — strip premium fields before returning to free users.
  // This ensures premium data is never transmitted, even if client-side blur is bypassed.
  const responseData = (r.ok && !isPro) ? stripPremiumContent(data) : data

  // Transition dedup lock from 'pending' → 'done' (5s TTL).
  // Blocks rapid re-runs of the identical request but allows a retry after a brief pause.
  if (_dedupKey && _dedupRedis) _dedupRedis.set(_dedupKey, 'done', { ex: 5 }).catch(() => {})

  res.status(r.status).json(responseData)
}
