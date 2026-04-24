// ─── Local Auth — JWT-based, backed by Turso via api/auth.js ─────────────────

function getToken() {
  return localStorage.getItem('dw_token')
}

function setToken(token) {
  if (token) localStorage.setItem('dw_token', token)
  else localStorage.removeItem('dw_token')
}

function getRefreshToken() {
  return localStorage.getItem('dw_refresh')
}

function setRefreshToken(token) {
  if (token) localStorage.setItem('dw_refresh', token)
  else localStorage.removeItem('dw_refresh')
}

function parseJwt(token) {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    return JSON.parse(atob(base64))
  } catch { return null }
}

export function getCurrentUser() {
  const token = getToken()
  if (!token) return null
  const payload = parseJwt(token)
  if (!payload) return null
  if (payload.exp && Date.now() / 1000 > payload.exp) {
    // Expired — if refresh token exists keep the stale user visible so UI doesn't flash logged-out.
    // getAuthToken() will silently refresh before the next API call.
    if (!getRefreshToken()) { setToken(null); return null }
  }
  return { id: payload.sub, email: payload.email, is_pro: payload.is_pro || false, is_business: payload.is_business || false, is_admin: payload.is_admin || false }
}

// Silently exchange the stored refresh token for a new access + refresh token.
// Returns true on success, false on any failure (clears tokens if server rejects).
export async function refreshSession() {
  const rt = getRefreshToken()
  if (!rt) return false
  try {
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'refresh', refreshToken: rt }),
    })
    if (!res.ok) {
      setToken(null)
      setRefreshToken(null)
      return false
    }
    const data = await res.json()
    setToken(data.token)
    setRefreshToken(data.refreshToken || null)
    return true
  } catch { return false }
}

// Returns a valid access token, refreshing proactively if expired or within 60s of expiry.
// Used by all API-calling functions to ensure the token is always fresh.
export async function getAuthToken() {
  const token = getToken()
  if (!token) return null
  const payload = parseJwt(token)
  if (!payload) return null
  // If token has more than 60s remaining, return it as-is
  if (!payload.exp || Date.now() / 1000 < payload.exp - 60) return token
  // Expired or about to expire — try refresh
  const ok = await refreshSession()
  return ok ? getToken() : null
}

export async function signUp(email, password) {
  const res = await fetch('/api/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'signup', email, password }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Sign up failed')
  setToken(data.token)
  setRefreshToken(data.refreshToken || null)
  return { id: data.userId, email: data.email, is_pro: data.is_pro, is_business: data.is_business || false }
}

export async function signIn(email, password) {
  const res = await fetch('/api/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'signin', email, password }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Sign in failed')
  setToken(data.token)
  setRefreshToken(data.refreshToken || null)
  return { id: data.userId, email: data.email, is_pro: data.is_pro, is_business: data.is_business || false }
}

export function signOut() {
  const rt = getRefreshToken()
  setToken(null)
  setRefreshToken(null)
  sessionStorage.removeItem('dw_cerebras_key')
  // Revoke refresh token server-side (fire-and-forget — don't await)
  if (rt) {
    fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'signout', refreshToken: rt }),
    }).catch(() => {})
  }
}

export async function deleteAccount(password) {
  const token = await getAuthToken()
  if (!token) throw new Error('Not logged in')
  const rt = getRefreshToken()
  const res = await fetch('/api/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ action: 'delete-account', password, refreshToken: rt }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to delete account')
  setToken(null)
  setRefreshToken(null)
  sessionStorage.removeItem('dw_cerebras_key')
  return true
}

export async function getUsage() {
  const token = await getAuthToken()
  if (!token || token === 'null' || token === 'undefined' || token.split('.').length !== 3) {
    return { analyses_used: 0, is_pro: false, has_own_key: false }
  }
  try {
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action: 'usage' }),
    })
    if (!res.ok) return { analyses_used: 0, is_pro: false, has_own_key: false }
    return res.json()
  } catch {
    return { analyses_used: 0, is_pro: false, has_own_key: false }
  }
}

// Save user's Cerebras API key to server (stored in Turso, tied to their account)
export async function saveCerebrasKey(cerebrasKey) {
  const token = await getAuthToken()
  if (!token) throw new Error('Not logged in')
  const res = await fetch('/api/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ action: 'save-key', cerebrasKey }),
  })
  if (!res.ok) throw new Error('Failed to save key')
  // Cache locally so it's available immediately without a round trip
  if (cerebrasKey) sessionStorage.setItem('dw_cerebras_key', cerebrasKey)
  else sessionStorage.removeItem('dw_cerebras_key')
}

// Get locally cached key (fallback before server responds)
export function getCachedCerebrasKey() {
  return sessionStorage.getItem('dw_cerebras_key') || ''
}

// Fetch the user's Cerebras key from Turso and cache it locally
export async function loadCerebrasKeyFromServer() {
  const token = await getAuthToken()
  if (!token || token.split('.').length !== 3) return null
  try {
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action: 'get-key' }),
    })
    if (!res.ok) return null
    const data = await res.json()
    if (data.hasKey) {
      sessionStorage.setItem('dw_cerebras_key', '__db__')
      return '__db__'
    }
    return null
  } catch { return null }
}


export function getCachedAiModel() {
  return sessionStorage.getItem('dw_ai_model') || ''
}

export function cacheAiModel(model) {
  if (model) sessionStorage.setItem('dw_ai_model', model)
  else sessionStorage.removeItem('dw_ai_model')
}

export async function getQuotaUsage() {
  const token = await getAuthToken()
  if (!token || token.split('.').length !== 3) return null
  try {
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action: 'get-usage' }),
    })
    if (!res.ok) return null
    return res.json()
  } catch { return null }
}
