// Persistent rate limiting via Upstash Redis — survives Vercel cold starts
// and works correctly across concurrent serverless instances.
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

let redis
export function getRedis() {
  if (!redis) redis = Redis.fromEnv() // reads UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN
  return redis
}

// 5 signup attempts per IP per hour
export const signupLimiter = new Ratelimit({
  redis: { pipeline: (...a) => getRedis().pipeline(...a), eval: (...a) => getRedis().eval(...a) },
  limiter: Ratelimit.slidingWindow(5, '1 h'),
  prefix: 'rl:signup',
})

// 10 signin attempts per IP per 15 minutes
export const signinLimiter = new Ratelimit({
  redis: { pipeline: (...a) => getRedis().pipeline(...a), eval: (...a) => getRedis().eval(...a) },
  limiter: Ratelimit.slidingWindow(10, '15 m'),
  prefix: 'rl:signin',
})

// 3 password reset requests per IP per hour
export const resetLimiter = new Ratelimit({
  redis: { pipeline: (...a) => getRedis().pipeline(...a), eval: (...a) => getRedis().eval(...a) },
  limiter: Ratelimit.slidingWindow(3, '1 h'),
  prefix: 'rl:reset',
})

// 30 analysis requests per IP per hour (unauthenticated endpoints)
export const apiLimiter = new Ratelimit({
  redis: { pipeline: (...a) => getRedis().pipeline(...a), eval: (...a) => getRedis().eval(...a) },
  limiter: Ratelimit.slidingWindow(30, '1 h'),
  prefix: 'rl:api',
})

/**
 * Apply a rate limiter. Returns true if the request should be blocked.
 * Sets Retry-After header automatically.
 */
export async function applyLimit(limiter, identifier, res) {
  try {
    const { success, reset } = await limiter.limit(identifier)
    if (!success) {
      res.setHeader('Retry-After', Math.ceil((reset - Date.now()) / 1000))
      res.status(429).json({ error: 'Too many requests. Please try again later.' })
      return true // blocked
    }
    return false // allowed
  } catch (err) {
    // If Redis is down, fail open (don't block legitimate users)
    console.error('[ratelimit] Redis error, failing open:', err.message)
    return false
  }
}
