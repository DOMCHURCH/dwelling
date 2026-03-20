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
    const authHeader = req.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' })
    }
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user) return res.status(401).json({ error: 'Invalid session' })

    const { data: userRecord } = await supabaseAdmin
      .from('users')
      .select('analyses_used, analyses_reset_at, is_pro')
      .eq('id', user.id)
      .maybeSingle()

    // Only count usage if this is NOT the follow-up call
    const skipCount = req.headers['x-skip-count'] === 'true'

    if (!userRecord?.is_pro && !skipCount) {
      const resetAt = new Date(userRecord?.analyses_reset_at ?? 0)
      const now = new Date()
      const isNewMonth = now.getMonth() !== resetAt.getMonth() || now.getFullYear() !== resetAt.getFullYear()
      const currentUsage = isNewMonth ? 0 : (userRecord?.analyses_used ?? 0)

      if (currentUsage >= FREE_LIMIT) {
        return res.status(429).json({ error: 'Monthly analysis limit reached. Upgrade to Pro for unlimited analyses.' })
      }

      await supabaseAdmin
        .from('users')
        .update({
          analyses_used: currentUsage + 1,
          ...(isNewMonth && { analyses_reset_at: now.toISOString() }),
        })
        .eq('id', user.id)
    } else if (!userRecord?.is_pro && skipCount) {
      // Still check the limit even if not counting, to block over-limit users
      const resetAt = new Date(userRecord?.analyses_reset_at ?? 0)
      const now = new Date()
      const isNewMonth = now.getMonth() !== resetAt.getMonth() || now.getFullYear() !== resetAt.getFullYear()
      const currentUsage = isNewMonth ? 0 : (userRecord?.analyses_used ?? 0)
      if (currentUsage > FREE_LIMIT) {
        return res.status(429).json({ error: 'Monthly analysis limit reached. Upgrade to Pro for unlimited analyses.' })
      }
    }

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
}
