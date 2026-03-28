// ─── Local Auth — JWT-based, backed by Turso via api/auth.js ─────────────────

function getToken() {
  return localStorage.getItem('dw_token')
}

function setToken(token) {
  if (token) localStorage.setItem('dw_token', token)
  else localStorage.removeItem('dw_token')
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
  if (payload.exp && Date.now() / 1000 > payload.exp) { setToken(null); return null }
  return { id: payload.sub, email: payload.email, is_pro: payload.is_pro || false }
}

export function getAuthToken() {
  return getToken()
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
  return { id: data.userId, email: data.email, is_pro: data.is_pro }
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
  return { id: data.userId, email: data.email, is_pro: data.is_pro }
}

export function signOut() {
  setToken(null)
}

export async function getUsage() {
  const token = getToken()
  if (!token) return { analyses_used: 0, is_pro: false, has_own_key: false }
  const res = await fetch('/api/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ action: 'usage' }),
  })
  if (!res.ok) return { analyses_used: 0, is_pro: false, has_own_key: false }
  return res.json()
}

// Save user's Cerebras API key to server (stored in Turso, tied to their account)
export async function saveCerebrasKey(cerebrasKey) {
  const token = getToken()
  if (!token) throw new Error('Not logged in')
  const res = await fetch('/api/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ action: 'save-key', cerebrasKey }),
  })
  if (!res.ok) throw new Error('Failed to save key')
  // Also cache locally so it's available immediately without a round trip
  if (cerebrasKey) localStorage.setItem('dw_cerebras_key', cerebrasKey)
  else localStorage.removeItem('dw_cerebras_key')
}

// Get locally cached key (fallback before server responds)
export function getCachedCerebrasKey() {
  return localStorage.getItem('dw_cerebras_key') || ''
}
