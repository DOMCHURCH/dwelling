/**
 * api/stripe-webhook.js
 *
 * Dedicated Stripe webhook endpoint. Must be separate from api/auth.js because
 * Stripe signature verification requires the raw request body bytes — the same
 * bytes Stripe signed. api/auth.js receives a pre-parsed JSON object, so the
 * original bytes are unavailable there.
 *
 * Vercel Node.js functions receive the raw stream on `req` before any body
 * parsing, so reading it here gives us the exact bytes Stripe signed.
 *
 * Register this URL in your Stripe dashboard:
 *   https://dashboard.stripe.com/webhooks → Add endpoint
 *   URL: https://dwelling.one/api/stripe-webhook
 *   Events to listen for:
 *     - customer.subscription.created
 *     - customer.subscription.updated
 *     - customer.subscription.deleted
 *     - invoice.payment_failed
 */

import Stripe from 'stripe'
import { createClient } from '@libsql/client'

const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET

function getDb() {
  return createClient({
    url: process.env.TURSO_URL,
    authToken: process.env.TURSO_TOKEN,
  })
}

/** Read raw body bytes from the request stream before any parsing. */
async function getRawBody(req) {
  const chunks = []
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk, 'utf8') : chunk)
  }
  return Buffer.concat(chunks)
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!STRIPE_SECRET) {
    return res.status(503).json({ error: 'Stripe not configured' })
  }

  const stripe = new Stripe(STRIPE_SECRET, { apiVersion: '2024-06-20' })
  const sig = req.headers['stripe-signature']
  let event

  if (STRIPE_WEBHOOK_SECRET) {
    // Production: verify the webhook signature using raw body bytes
    let rawBody
    try {
      rawBody = await getRawBody(req)
    } catch (err) {
      console.error('[stripe-webhook] Failed to read raw body:', err.message)
      return res.status(400).json({ error: 'Could not read request body' })
    }

    if (!sig) {
      console.error('[stripe-webhook] Missing stripe-signature header')
      return res.status(400).json({ error: 'Missing stripe-signature header' })
    }

    try {
      event = stripe.webhooks.constructEvent(rawBody, sig, STRIPE_WEBHOOK_SECRET)
    } catch (err) {
      console.error('[stripe-webhook] Signature verification failed:', err.message)
      return res.status(400).json({ error: `Webhook signature invalid: ${err.message}` })
    }
  } else {
    // Development only: accept without signature verification
    // NEVER deploy to production without STRIPE_WEBHOOK_SECRET set
    console.warn('[stripe-webhook] STRIPE_WEBHOOK_SECRET not set — skipping verification (dev mode only)')
    try {
      const rawBody = await getRawBody(req)
      event = JSON.parse(rawBody.toString('utf8'))
    } catch {
      return res.status(400).json({ error: 'Invalid JSON body' })
    }
    if (!event?.type) return res.status(400).json({ error: 'Invalid Stripe event' })
  }

  const db = getDb()
  const { type, data } = event

  try {
    // ── Idempotency guard — Stripe re-delivers unacknowledged events ──────────
    // INSERT OR IGNORE: if the event_id already exists, rowsAffected = 0 → skip.
    await db.execute(`
      CREATE TABLE IF NOT EXISTS processed_stripe_events (
        event_id     TEXT PRIMARY KEY,
        event_type   TEXT NOT NULL,
        processed_at TEXT NOT NULL
      )
    `)
    const dedup = await db.execute({
      sql: 'INSERT OR IGNORE INTO processed_stripe_events (event_id, event_type, processed_at) VALUES (?, ?, ?)',
      args: [event.id, type, new Date().toISOString()],
    })
    if (dedup.rowsAffected === 0) {
      console.log(`[stripe-webhook] Duplicate event ${event.id} (${type}) — already processed, skipping`)
      return res.status(200).json({ received: true, duplicate: true })
    }

    // ── Subscription activated or renewed ─────────────────────────────────────
    if (type === 'customer.subscription.created' || type === 'customer.subscription.updated') {
      const sub = data.object
      const email = sub.metadata?.user_email
      const plan = sub.metadata?.plan ?? ''
      const isBusiness = plan.startsWith('business')

      if (!email) {
        console.warn(`[stripe-webhook] ${type}: no user_email in subscription metadata (sub ${sub.id})`)
        return res.status(200).json({ received: true, warning: 'No email in metadata' })
      }

      if (sub.status === 'active' || sub.status === 'trialing') {
        await db.execute({
          sql: 'UPDATE users SET is_pro = 1, is_business = ?, stripe_subscription_id = ? WHERE LOWER(email) = LOWER(?)',
          args: [isBusiness ? 1 : 0, sub.id, email],
        })
        console.log(`[stripe-webhook] Activated ${isBusiness ? 'business' : 'pro'} for ${email}`)
      } else if (sub.status === 'past_due' || sub.status === 'unpaid') {
        // Stripe retries payment automatically — don't revoke yet, just log
        console.warn(`[stripe-webhook] Subscription ${sub.id} for ${email} is ${sub.status} — awaiting retry`)
      }
    }

    // ── Subscription cancelled ─────────────────────────────────────────────────
    if (type === 'customer.subscription.deleted') {
      const sub = data.object
      const email = sub.metadata?.user_email

      if (email) {
        await db.execute({
          sql: 'UPDATE users SET is_pro = 0, is_business = 0, stripe_subscription_id = NULL WHERE LOWER(email) = LOWER(?)',
          args: [email],
        })
        console.log(`[stripe-webhook] Revoked subscription for ${email}`)
      }
    }

    // ── Payment failed ─────────────────────────────────────────────────────────
    if (type === 'invoice.payment_failed') {
      const invoice = data.object
      const email = invoice.customer_email
      console.warn(`[stripe-webhook] Payment failed for ${email} — invoice ${invoice.id}. Stripe will retry automatically.`)
      // Don't revoke access yet — Stripe retries 3x over several days.
      // subscription.deleted fires automatically if all retries fail.
    }

    return res.status(200).json({ received: true, type })
  } catch (err) {
    console.error('[stripe-webhook] Handler error:', err)
    return res.status(500).json({ error: 'Webhook handler failed' })
  }
}
