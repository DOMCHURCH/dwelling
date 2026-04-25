// api/cerebras.js — BYOK AI proxy
// Routes user-supplied API keys to the correct provider.
// No subscription tiers, no quota tracking, no platform key needed.

import { createHmac, timingSafeEqual, createHash } from 'crypto'
import { getClientIp, apiLimiter, applyLimit } from './_ratelimit.js'

const ALLOWED_MODELS = [
  // Cerebras
  'llama-4-scout-17b-16e-instruct', 'llama-3.3-70b',
  // OpenAI
  'gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo',
  // Anthropic
  'claude-3-5-haiku-20241022', 'claude-3-5-sonnet-20241022', 'claude-opus-4-5',
  // Groq
  'llama-3.3-70b-versatile', 'mixtral-8x7b-32768', 'gemma2-9b-it',
  // OpenRouter / misc
  'deepseek-chat', 'deepseek-reasoner', 'mistral-large-latest',
]

const PROVIDER_ENDPOINTS = {
  cerebras:   'https://api.cerebras.ai/v1/chat/completions',
  openai:     'https://api.openai.com/v1/chat/completions',
  anthropic:  'https://api.anthropic.com/v1/messages',
  groq:       'https://api.groq.com/openai/v1/chat/completions',
  openrouter: 'https://openrouter.ai/api/v1/chat/completions',
}

function detectProvider(key) {
  if (!key) return null
  if (key.startsWith('csk-'))   return 'cerebras'
  if (key.startsWith('gsk_'))   return 'groq'
  if (key.startsWith('sk-or-')) return 'openrouter'
  if (key.startsWith('sk-ant-')) return 'anthropic'
  if (key.startsWith('sk-'))   return 'openai'
  return null
}

function makeDedupKey(jwt, body) {
  const payload = JSON.stringify({ jwt, messages: body.messages?.slice(-1) })
  return createHash('sha256').update(payload).digest('hex').slice(0, 32)
}

function verifyJwt(token) {
  if (!token) return null
  const secret = process.env.AUTH_SECRET
  if (!secret) return null
  try {
    const [h, p, sig] = token.split('.')
    if (!h || !p || !sig) return null
    const expected = createHmac('sha256', secret).update(`${h}.${p}`).digest('base64url')
    if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null
    return JSON.parse(Buffer.from(p, 'base64url').toString())
  } catch { return null }
}

async function callCerebrasStyle(endpoint, userKey, body) {
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${userKey}`,
    },
    body: JSON.stringify(body),
  })
  return res
}

async function callAnthropic(userKey, body) {
  // Convert OpenAI-style messages to Anthropic format
  const system = body.messages?.find(m => m.role === 'system')?.content || ''
  const messages = (body.messages || []).filter(m => m.role !== 'system').map(m => ({
    role: m.role,
    content: m.content,
  }))
  const anthropicBody = {
    model: body.model,
    max_tokens: body.max_tokens || 4096,
    system,
    messages,
  }
  const res = await fetch(PROVIDER_ENDPOINTS.anthropic, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': userKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(anthropicBody),
  })
  if (!res.ok) return res
  const data = await res.json()
  // Convert Anthropic response to OpenAI format
  const openAIStyle = {
    id: data.id,
    object: 'chat.completion',
    model: data.model,
    choices: [{
      index: 0,
      message: { role: 'assistant', content: data.content?.[0]?.text || '' },
      finish_reason: data.stop_reason || 'stop',
    }],
    usage: {
      prompt_tokens: data.usage?.input_tokens || 0,
      completion_tokens: data.usage?.output_tokens || 0,
      total_tokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
    },
  }
  return new Response(JSON.stringify(openAIStyle), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

async function fetchWithTimeout(url, opts = {}, ms = 55000) {
  const ctrl = new AbortController()
  const id = setTimeout(() => ctrl.abort(), ms)
  try {
    return await fetch(url, { ...opts, signal: ctrl.signal })
  } finally {
    clearTimeout(id)
  }
}

// In-memory dedup set (resets on cold start — good enough for abuse prevention)
const _recentRequests = new Set()

export default async function handler(req, res) {
  const origin = req.headers.origin || ''
  const allowed = process.env.ALLOWED_ORIGIN || 'https://dwelling.one'
  if (origin === allowed) res.setHeader('Access-Control-Allow-Origin', origin)
  res.setHeader('Vary', 'Origin')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-User-Key')
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  // Rate limit: 30 AI calls/hour per IP (abuse prevention only)
  const clientIp = getClientIp(req)
  if (await applyLimit(apiLimiter, clientIp, res)) return

  // JWT auth for deduplication (optional — if no AUTH_SECRET, skip)
  const jwt = (req.headers.authorization || '').replace('Bearer ', '')
  const claims = verifyJwt(jwt)
  // Allow unauthenticated requests — BYOK is open portfolio project

  const userKey = req.headers['x-user-key'] || ''
  if (!userKey) return res.status(401).json({ error: 'No API key provided. Please add your API key in settings.' })

  const provider = detectProvider(userKey)
  if (!provider) return res.status(400).json({ error: 'Unrecognized API key format. Supported: Cerebras (csk-), OpenAI (sk-), Anthropic (sk-ant-), Groq (gsk_), OpenRouter (sk-or-).' })

  const body = req.body
  if (!body?.messages?.length) return res.status(400).json({ error: 'Missing messages' })

  const model = body.model || 'llama-3.3-70b'
  if (!ALLOWED_MODELS.includes(model)) return res.status(400).json({ error: `Model not allowed: ${model}` })

  // Dedup check
  const dedupKey = makeDedupKey(jwt || clientIp, body)
  if (_recentRequests.has(dedupKey)) return res.status(429).json({ error: 'Duplicate request' })
  _recentRequests.add(dedupKey)
  setTimeout(() => _recentRequests.delete(dedupKey), 30000)

  try {
    let providerRes

    if (provider === 'anthropic') {
      providerRes = await callAnthropic(userKey, body)
    } else {
      const endpoint = PROVIDER_ENDPOINTS[provider]
      providerRes = await callCerebrasStyle(endpoint, userKey, body)
    }

    if (!providerRes.ok) {
      const errText = await providerRes.text().catch(() => '')
      console.error(`Provider ${provider} error ${providerRes.status}:`, errText.slice(0, 300))
      return res.status(providerRes.status).json({
        error: `${provider} API error: ${providerRes.status}`,
        detail: errText.slice(0, 200),
      })
    }

    const data = await providerRes.json()
    return res.status(200).json(data)

  } catch (e) {
    if (e.name === 'AbortError') return res.status(504).json({ error: 'AI provider timed out' })
    console.error('cerebras.js proxy error:', e.message)
    return res.status(500).json({ error: 'Internal error' })
  }
}
