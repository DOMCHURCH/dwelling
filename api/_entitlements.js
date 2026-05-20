/**
 * api/_entitlements.js
 *
 * BYOK entitlement system — all authenticated users have full access.
 *
 * Feature access is determined by:
 *   - Authentication: user must be signed in (no subscription required)
 *   - API Key: user must supply their own key for live AI generation
 *
 * There are no paid tiers, no subscription checks, no Stripe.
 */

/**
 * Returns entitlements for an authenticated user.
 * All signed-in users are treated as "pro" — full feature access.
 *
 * @param {import('@libsql/client').Client} db
 * @param {string} userId
 * @returns {{ is_pro: boolean, is_business: boolean, team_id: string|null, hasSubscription: boolean }}
 */
export async function getUserEntitlements(db, userId) {
  if (!userId) return _empty()
  const result = await db.execute({
    sql: 'SELECT team_id FROM users WHERE id = ?',
    args: [userId],
  })
  const row = result.rows[0]
  if (!row) return _empty()
  return {
    is_pro:          true,   // All authenticated users have full access
    is_business:     false,  // Team features tied to team ownership, not subscription
    team_id:         row.team_id ?? null,
    hasSubscription: false,  // No subscriptions in BYOK model
  }
}

/**
 * Returns entitlements for a user by email.
 * Used by cerebras.js which looks users up by email.
 *
 * @param {import('@libsql/client').Client} db
 * @param {string} email
 * @returns {{ is_pro: boolean, is_business: boolean, team_id: string|null, hasSubscription: boolean }}
 */
export async function getUserEntitlementsByEmail(db, email) {
  if (!email) return _empty()
  const result = await db.execute({
    sql: 'SELECT team_id FROM users WHERE LOWER(email) = LOWER(?)',
    args: [email],
  })
  const row = result.rows[0]
  if (!row) return _empty()
  return {
    is_pro:          true,
    is_business:     false,
    team_id:         row.team_id ?? null,
    hasSubscription: false,
  }
}

function _empty() {
  return { is_pro: false, is_business: false, team_id: null, hasSubscription: false }
}
