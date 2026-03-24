import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { userId, email } = req.body
  if (!userId || !email) return res.status(400).json({ error: 'Missing userId or email' })

  try {
    const { error } = await supabaseAdmin.from('users').upsert({
      id: userId,
      email,
      terms_accepted_at: new Date().toISOString(),
      analyses_used: 0,
      is_pro: false,
    }, { onConflict: 'id' })

    if (error) throw error
    res.status(200).json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}
