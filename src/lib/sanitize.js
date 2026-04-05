// Input sanitization for user-supplied location strings used in LLM prompts.
// Prevents prompt injection (OWASP LLM Top 10 #1).

const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?previous/i,
  /system\s+(prompt|override|instruction)/i,
  /you\s+are\s+now/i,
  /do\s+not\s+follow/i,
  /reveal\s+(your|the)\s+prompt/i,
  /act\s+as\s+(a\s+)?different/i,
  /pretend\s+you/i,
  /disregard\s+(all\s+)?previous/i,
  /<script/i,
  /javascript:/i,
]

/**
 * Sanitize a location string before interpolation into an LLM prompt.
 * Returns a clean string safe for use in system/user messages.
 */
export function sanitizeLocation(input) {
  if (!input) return ''
  const trimmed = String(input).trim().slice(0, 120)
  // If injection pattern detected, return a safe fallback
  if (INJECTION_PATTERNS.some(p => p.test(trimmed))) {
    console.warn('[sanitize] Injection pattern detected in location input:', trimmed.slice(0, 40))
    return 'Unknown Location'
  }
  // Strip characters used for template literals, shell injection, and HTML
  return trimmed.replace(/[`${}\\<>]/g, '').trim()
}
