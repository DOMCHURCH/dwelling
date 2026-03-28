// register.js is no longer needed — user creation is handled by api/auth.js signup action
// Kept as a no-op so any stray calls don't 404
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(204).end()
  return res.status(200).json({ success: true })
}
