import { Redis } from '@upstash/redis'

export default async function handler(req, res) {
  if (!process.env.CRON_SECRET) {
    console.error('[redis-keepalive] FATAL: CRON_SECRET env var not set')
    return res.status(500).json({ error: 'CRON_SECRET not configured' })
  }
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const redis = Redis.fromEnv()
  await redis.set('keepalive', new Date().toISOString(), { ex: 172800 }) // 48h TTL
  return res.status(200).json({ ok: true, pingedAt: new Date().toISOString() })
}
