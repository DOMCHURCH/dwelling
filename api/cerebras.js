import { createClient } from '@supabase/supabase-js'

const FREE_LIMIT = 10

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

    // 2. Load user record — auto-create if missing (handles new signups)
    let { data: userRecord } = await supabaseAdmin
      .from('users')
      .select('analyses_used, analyses_reset_at, is_pro')
      .eq('id', user.id)
      .maybeSingle()

    if (!userRecord) {
      // Row doesn't exist yet — create it now
      await supabaseAdmin.from('users').upsert({
        id: user.id,
        email: user.email,
        analyses_used: 0,
        is_pro: false,
        terms_accepted_at: new Date().toISOString(),
      }, { onConflict: 'id' })
      userRecord = { analyses_used: 0, is_pro: false, analyses_reset_at: null }
    }

    // Usage counter temporarily disabled for testing
    // const skipCount = req.headers['x-skip-count'] === 'true'

    // 4. Forward to Cerebras
    const response = await fetch('https://api.cerebras.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.CEREBRAS_API_KEY}`,
      },
      body: JSON.stringify(req.body),
    })
    const data = await response.json()
    res.status(response.status).json(data)

  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}v
