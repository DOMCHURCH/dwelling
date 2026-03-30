// register.js — deprecated, all registration handled by /api/auth (action: signup)
export default async function handler(req, res) {
  return res.status(410).json({ error: 'This endpoint is deprecated. Use /api/auth with action: signup.' })
}
