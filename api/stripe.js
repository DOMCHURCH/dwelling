import Stripe from 'stripe'
import { createClient } from '@libsql/client'
import { createHmac, timingSafeEqual } from 'crypto'
import { applyLimit, apiLimiter } from './_ratelimit.js'

const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET
const STRIPE_PRICE_ID_MONTHLY = process.env.STRIPE_PRICE_ID_MONTHLY
const STRIPE_PRICE_ID_ANNUAL = process.env.STRIPE_PRICE_ID_ANNUAL
const BASE_URL = process.env.BASE_URL || 'https://dwelling.one'
const AUTH_SECRET = process.env.AUTH_SECRET
const ALLOWED_ORIGIN = 'https://dwelling.one'

function getDb() {
  return createClient({ url: process.env.TURSO_URL, authToken: process.env.TURSO_TOKEN })
}

function verifyJwt(token) {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const [header, payload, sig] = parts
    const expected = createHmac('sha256', AUTH_SECRET).update(`${header}.${payload}`).digest('base64url')
    const a = Buffer.from(expected), b = Buffer.from(sig)
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString())
    if (data.exp && Date.now() / 1000 > data.exp) return null
    return data
  } catch { return null }
}

function getStripe() {
  if (!STRIPE_SECRET) throw new Error('STRIPE_SECRET_KEY not configured')
  return new Stripe(STRIPE_SECRET, { apiVersion: '2024-06-20' })
}

export default async function handler(req, res) {
  const origin = req.headers.origin
  if (origin === ALLOWED_ORIGIN || !origin) {
    res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN)
    res.setHeader('Access-Control-Allow-Methods', 'POST')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  }
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown'
  if (await applyLimit(apiLimiter, clientIp, res)) return

  const { action } = req.body || {}
  if (!action) return res.status(400).json({ error: 'Missing action' })

  const ref = Math.random().toString(36).slice(2, 10)

  try {
    // ── create-checkout ──────────────────────────────────────────────────────
    if (action === 'create-checkout') {
      if (!STRIPE_SECRET) return res.status(503).json({ error: 'Payments not yet configured' })

      const authHeader = req.headers.authorization
      if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' })
      const payload = verifyJwt(authHeader.replace('Bearer ', ''))
      if (!payload) return res.status(401).json({ error: 'Invalid token' })

      const { billing = 'monthly' } = req.body
      const priceId = billing === 'annual' ? STRIPE_PRICE_ID_ANNUAL : STRIPE_PRICE_ID_MONTHLY
      if (!priceId) return res.status(503).json({ error: 'Stripe price ID not configured' })

      const stripe = getStripe()
      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        customer_email: payload.email,
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${BASE_URL}/?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${BASE_URL}/?checkout=cancelled`,
        subscription_data: { metadata: { user_email: payload.email } },
        metadata: { user_email: payload.email },
        allow_promotion_codes: true,
      })

      return res.status(200).json({ url: session.url })
    }

    // ── verify-checkout ──────────────────────────────────────────────────────
    if (action === 'verify-checkout') {
      if (!STRIPE_SECRET) return res.status(503).json({ error: 'Payments not yet configured' })

      const authHeader = req.headers.authorization
      if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' })
      const payload = verifyJwt(authHeader.replace('Bearer ', ''))
      if (!payload) return res.status(401).json({ error: 'Invalid token' })

      const { sessionId } = req.body
      if (!sessionId || typeof sessionId !== 'string') return res.status(400).json({ error: 'sessionId required' })

      const stripe = getStripe()
      const session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ['subscription'] })

      if (session.payment_status !== 'paid' && session.status !== 'complete') {
        return res.status(400).json({ error: 'Payment not completed' })
      }

      // Verify the email belongs to this user (prevents session ID theft)
      const sessionEmail = (session.customer_email || session.customer_details?.email || '').toLowerCase()
      if (sessionEmail && sessionEmail !== payload.email.toLowerCase()) {
        return res.status(403).json({ error: 'Session does not belong to this account' })
      }

      const db = getDb()
      await db.execute({
        sql: 'UPDATE users SET is_pro = 1, stripe_customer_id = ?, stripe_subscription_id = ? WHERE email = ?',
        args: [session.customer || null, session.subscription?.id || null, payload.email],
      })

      return res.status(200).json({ success: true, is_pro: true })
    }

    // ── cancel-subscription ──────────────────────────────────────────────────
    if (action === 'cancel-subscription') {
      if (!STRIPE_SECRET) return res.status(503).json({ error: 'Payments not yet configured' })

      const authHeader = req.headers.authorization
      if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' })
      const payload = verifyJwt(authHeader.replace('Bearer ', ''))
      if (!payload) return res.status(401).json({ error: 'Invalid token' })

      const db = getDb()
      const result = await db.execute({
        sql: 'SELECT stripe_subscription_id FROM users WHERE email = ?',
        args: [payload.email],
      })

      const subId = result.rows[0]?.stripe_subscription_id
      if (!subId) return res.status(400).json({ error: 'No active subscription found' })

      const stripe = getStripe()
      // Cancel at period end (user keeps access until billing period ends)
      await stripe.subscriptions.update(subId, { cancel_at_period_end: true })

      return res.status(200).json({ success: true, message: 'Subscription will cancel at end of billing period' })
    }

    // ── portal ───────────────────────────────────────────────────────────────
    // Opens Stripe Customer Portal for self-serve subscription management
    if (action === 'portal') {
      if (!STRIPE_SECRET) return res.status(503).json({ error: 'Payments not yet configured' })

      const authHeader = req.headers.authorization
      if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' })
      const payload = verifyJwt(authHeader.replace('Bearer ', ''))
      if (!payload) return res.status(401).json({ error: 'Invalid token' })

      const db = getDb()
      const result = await db.execute({
        sql: 'SELECT stripe_customer_id FROM users WHERE email = ?',
        args: [payload.email],
      })

      const customerId = result.rows[0]?.stripe_customer_id
      if (!customerId) return res.status(400).json({ error: 'No billing account found' })

      const stripe = getStripe()
      const portalSession = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: BASE_URL,
      })

      return res.status(200).json({ url: portalSession.url })
    }

    // ── admin-grant-pro ──────────────────────────────────────────────────────
    if (action === 'admin-grant-pro') {
      const authHeader = req.headers.authorization
      if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' })
      const payload = verifyJwt(authHeader.replace('Bearer ', ''))
      if (!payload?.is_admin) return res.status(403).json({ error: 'Admin access required' })

      const { targetEmail, grant } = req.body
      if (!targetEmail || typeof targetEmail !== 'string') return res.status(400).json({ error: 'targetEmail required' })

      const db = getDb()
      const result = await db.execute({
        sql: 'UPDATE users SET is_pro = ? WHERE email = ?',
        args: [grant ? 1 : 0, targetEmail.trim().toLowerCase()],
      })

      if (result.rowsAffected === 0) {
        return res.status(404).json({ error: `No user found with email ${targetEmail}` })
      }

      return res.status(200).json({ success: true, granted: !!grant, email: targetEmail.trim().toLowerCase() })
    }

    // ── webhook ──────────────────────────────────────────────────────────────
    // Stripe sends events here; signature is verified if STRIPE_WEBHOOK_SECRET is set.
    // For test mode you can send events via `stripe trigger` CLI without a secret.
    if (action === 'webhook') {
      const sig = req.headers['stripe-signature']
      let event = req.body

      if (STRIPE_WEBHOOK_SECRET && sig && STRIPE_SECRET) {
        try {
          const stripe = getStripe()
          // In Vercel the body is already parsed; reconstruct raw string for verification.
          // This works for test events. For production, use a dedicated /api/stripe-webhook
          // endpoint that buffers the raw body before JSON parsing.
          const rawBody = JSON.stringify(req.body)
          event = stripe.webhooks.constructEvent(rawBody, sig, STRIPE_WEBHOOK_SECRET)
        } catch (err) {
          console.error(`Webhook sig failed: ${err.message}`)
          return res.status(400).json({ error: 'Webhook signature invalid' })
        }
      }

      const db = getDb()
      const type = event.type || ''

      if (type === 'customer.subscription.created' || type === 'customer.subscription.updated') {
        const sub = event.data?.object
        const email = sub?.metadata?.user_email
        if (email && sub?.status === 'active') {
          await db.execute({
            sql: 'UPDATE users SET is_pro = 1, stripe_subscription_id = ? WHERE email = ?',
            args: [sub.id, email.toLowerCase()],
          })
        }
      }

      if (type === 'customer.subscription.deleted') {
        const sub = event.data?.object
        const email = sub?.metadata?.user_email
        if (email) {
          await db.execute({
            sql: 'UPDATE users SET is_pro = 0, stripe_subscription_id = NULL WHERE email = ?',
            args: [email.toLowerCase()],
          })
        }
      }

      return res.status(200).json({ received: true })
    }

    return res.status(400).json({ error: 'Unknown action' })
  } catch (err) {
    console.error(JSON.stringify({ ref, action, msg: err?.message }))
    return res.status(500).json({ error: 'An internal error occurred.', ref })
  }
}
