import { Redis } from '@upstash/redis'

export default async function handler(req, res) {
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const redis = Redis.fromEnv()
  await redis.set('keepalive', new Date().toISOString(), { ex: 172800 }) // 48h TTL
  return res.status(200).json({ ok: true, pingedAt: new Date().toISOString() })
}
