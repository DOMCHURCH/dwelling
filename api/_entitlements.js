/**
 * api/_entitlements.js
 *
 * Centralized entitlement system — the single source of truth for permissions.
 *
 * ALL privilege checks MUST go through these functions.
 * Never trust JWT claims (is_pro, is_business) for access decisions.
 * Never read is_pro/is_business inline outside these helpers.
 *
 * The Stripe webhook and verify-checkout are the ONLY places that write
 * is_pro/is_business to the DB — that is intentional and correct.
 */

/**
 * Returns live entitlements for a user from the DB (by internal user ID).
 *
 * @param {import('@libsql/client').Client} db
 * @param {string} userId - user.id (UUID stored in JWT sub)
 * @returns {{ is_pro: boolean, is_business: boolean, team_id: string|null, hasSubscription: boolean }}
 */
export async function getUserEntitlements(db, userId) {
  if (!userId) return _empty()
  const result = await db.execute({
    sql: 'SELECT is_pro, is_business, team_id, stripe_subscription_id FROM users WHERE id = ?',
    args: [userId],
  })
  return _fromRow(result.rows[0])
}

/**
 * Returns live entitlements for a user from the DB (by email).
 * Used by cerebras.js which looks users up by email.
 *
 * @param {import('@libsql/client').Client} db
 * @param {string} email
 * @returns {{ is_pro: boolean, is_business: boolean, team_id: string|null, hasSubscription: boolean }}
 */
export async function getUserEntitlementsByEmail(db, email) {
  if (!email) return _empty()
  const result = await db.execute({
    sql: 'SELECT is_pro, is_business, team_id, stripe_subscription_id FROM users WHERE LOWER(email) = LOWER(?)',
    args: [email],
  })
  return _fromRow(result.rows[0])
}

function _fromRow(row) {
  if (!row) return _empty()
  return {
    is_pro:          !!row.is_pro,
    is_business:     !!row.is_business,
    team_id:         row.team_id ?? null,
    hasSubscription: !!row.stripe_subscription_id,
  }
}

function _empty() {
  return { is_pro: false, is_business: false, team_id: null, hasSubscription: false }
}
