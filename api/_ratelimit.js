// Persistent rate limiting via Upstash Redis — survives Vercel cold starts
// and works correctly across concurrent serverless instances.
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

let _redis
export function getRedis() {
  if (!_redis) _redis = Redis.fromEnv() // reads UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN
  return _redis
}

// Limiters are created lazily so Redis.fromEnv() is only called when a
// request actually arrives — safe if env vars aren't set locally.
let _signupLimiter, _signinLimiter, _resetLimiter, _apiLimiter

export function getSignupLimiter() {
  return (_signupLimiter ??= new Ratelimit({
    redis: getRedis(),
    limiter: Ratelimit.slidingWindow(5, '1 h'),
    prefix: 'rl:signup',
  }))
}

export function getSigninLimiter() {
  return (_signinLimiter ??= new Ratelimit({
    redis: getRedis(),
    limiter: Ratelimit.slidingWindow(10, '15 m'),
    prefix: 'rl:signin',
  }))
}

export function getResetLimiter() {
  return (_resetLimiter ??= new Ratelimit({
    redis: getRedis(),
    limiter: Ratelimit.slidingWindow(3, '1 h'),
    prefix: 'rl:reset',
  }))
}

export function getApiLimiter() {
  return (_apiLimiter ??= new Ratelimit({
    redis: getRedis(),
    limiter: Ratelimit.slidingWindow(30, '1 h'),
    prefix: 'rl:api',
  }))
}

// Legacy named exports so existing import sites don't need to change
export const signupLimiter = { limit: (...a) => getSignupLimiter().limit(...a) }
export const signinLimiter = { limit: (...a) => getSigninLimiter().limit(...a) }
export const resetLimiter  = { limit: (...a) => getResetLimiter().limit(...a) }
export const apiLimiter    = { limit: (...a) => getApiLimiter().limit(...a) }

/**
 * Extract the real client IP from a Vercel request.
 * Vercel appends the actual client IP as the LAST entry in x-forwarded-for,
 * so we take the rightmost value. x-real-ip is set by Vercel's edge and
 * cannot be spoofed by the client — prefer it when available.
 */
export function getClientIp(req) {
  const xRealIp = req.headers['x-real-ip']
  if (xRealIp) return xRealIp.trim()
  const xfwd = req.headers['x-forwarded-for'] || ''
  if (xfwd) {
    const ips = xfwd.split(',').map(s => s.trim()).filter(Boolean)
    // Take the rightmost IP — leftmost entries are client-controlled
    return ips[ips.length - 1] || 'unknown'
  }
  return req.socket?.remoteAddress || 'unknown'
}

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
