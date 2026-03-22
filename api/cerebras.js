import { createClient } from '@supabase/supabase-js'

const FREE_LIMIT = 10
const ADMIN_EMAILS = ['01dominique.c@gmail.com']

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Skip-Count')

  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    // 1. Verify auth token
    const authHeader = req.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' })
    }
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user) return res.status(401).json({ error: 'Invalid session' })

    // Admin bypass — skip all usage counting
    if (ADMIN_EMAILS.includes(user.email)) {
      const response = await fetch('https://api.cerebras.ai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.CEREBRAS_API_KEY}` },
        body: JSON.stringify(req.body),
      })
      const data = await response.json()
      return res.status(response.status).json(data)
    }

    // 2. Load user record — auto-create if missing (handles new signups)
    let { data: userRecord } = await supabaseAdmin
      .from('users')
      .select('analyses_used, analyses_reset_at, is_pro')
      .eq('id', user.id)
      .maybeSingle()

    if (!userRecord) {
      await supabaseAdmin.from('users').upsert({
        id: user.id,
        email: user.email,
        analyses_used: 0,
        is_pro: false,
        terms_accepted_at: new Date().toISOString(),
        analyses_reset_at: new Date().toISOString(),
      }, { onConflict: 'id' })
      userRecord = { analyses_used: 0, is_pro: false, analyses_reset_at: new Date().toISOString() }
    }

    // 3. Monthly reset — if 30 days have passed since last reset, zero the counter
    const resetAt = userRecord.analyses_reset_at ? new Date(userRecord.analyses_reset_at) : new Date(0)
    const daysSinceReset = (Date.now() - resetAt.getTime()) / (1000 * 60 * 60 * 24)

    if (daysSinceReset >= 30) {
      await supabaseAdmin
        .from('users')
        .update({ analyses_used: 0, analyses_reset_at: new Date().toISOString() })
        .eq('id', user.id)
      userRecord.analyses_used = 0
    }

    // 4. Enforce usage limit for free users
    const skipCount = req.headers['x-skip-count'] === 'true'

    if (!userRecord.is_pro && !skipCount) {
      if (userRecord.analyses_used >= FREE_LIMIT) {
        return res.status(429).json({ error: 'limit reached' })
      }
    }

    // 5. Forward to Cerebras
    const response = await fetch('https://api.cerebras.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.CEREBRAS_API_KEY}`,
      },
      body: JSON.stringify(req.body),
    })
    const data = await response.json()

    // 6. Increment counter only on success, for free users
    if (response.ok && !userRecord.is_pro && !skipCount) {
      await supabaseAdmin
        .from('users')
        .update({ analyses_used: userRecord.analyses_used + 1 })
        .eq('id', user.id)
    }

    res.status(response.status).json(data)

  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}
