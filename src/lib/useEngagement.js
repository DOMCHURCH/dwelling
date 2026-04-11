import { useState, useEffect, useRef, useCallback } from 'react'

// Weight per event toward 0–100 engagement score
const WEIGHTS = {
  scroll25: 5,
  scroll50: 10,
  scroll75: 15,
  scroll90: 20,
  lockedClick: 25,
  lockedHover: 12,
  compareClick: 10,
  shareClick: 5,
  time60s: 10,
  time120s: 10,
}

// Minimum score required before a paywall is eligible to fire
export const PAYWALL_MIN_SCORE = 20
// At least 2 high-intent interactions also qualifies regardless of score
export const HIGH_INTENT_THRESHOLD = 2
// Cooldown between consecutive paywall impressions
export const PAYWALL_COOLDOWN_MS = 90_000

export function useEngagement({ enabled = true } = {}) {
  const [score, setScore] = useState(0)
  const [events, setEvents] = useState([])
  const scoreRef = useRef(0)
  const eventsRef = useRef([])
  const lastPaywallRef = useRef(0)
  const scrollMilestones = useRef({ 25: false, 50: false, 75: false, 90: false })

  const addEvent = useCallback((name, meta = {}) => {
    const ev = { name, ts: Date.now(), ...meta }
    eventsRef.current = [...eventsRef.current, ev]
    setEvents(eventsRef.current)
    const w = WEIGHTS[name] ?? 5
    scoreRef.current = Math.min(100, scoreRef.current + w)
    setScore(scoreRef.current)
  }, [])

  // Time-on-page thresholds
  useEffect(() => {
    if (!enabled) return
    const t1 = setTimeout(() => addEvent('time60s'), 60_000)
    const t2 = setTimeout(() => addEvent('time120s'), 120_000)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [enabled, addEvent])

  // Scroll depth milestones
  useEffect(() => {
    if (!enabled) return
    const onScroll = () => {
      const el = document.documentElement
      const scrolled = el.scrollHeight <= el.clientHeight
        ? 100
        : (window.scrollY / (el.scrollHeight - el.clientHeight)) * 100
      for (const pct of [25, 50, 75, 90]) {
        if (!scrollMilestones.current[pct] && scrolled >= pct) {
          scrollMilestones.current[pct] = true
          addEvent(`scroll${pct}`)
        }
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [enabled, addEvent])

  // Reset scroll milestones when result changes (new report)
  const reset = useCallback(() => {
    scoreRef.current = 0
    eventsRef.current = []
    scrollMilestones.current = { 25: false, 50: false, 75: false, 90: false }
    setScore(0)
    setEvents([])
  }, [])

  const highIntentCount = eventsRef.current.filter(
    e => e.name === 'lockedClick' || e.name === 'lockedHover'
  ).length

  /**
   * Returns true when it's appropriate to show a paywall:
   * - Enough engagement score OR ≥2 high-intent interactions
   * - 90s cooldown since last paywall
   */
  const shouldShowPaywall = useCallback(() => {
    const now = Date.now()
    if (now - lastPaywallRef.current < PAYWALL_COOLDOWN_MS) return false
    const scoreReady = scoreRef.current >= PAYWALL_MIN_SCORE
    const highIntentReady = highIntentCount >= HIGH_INTENT_THRESHOLD
    return scoreReady || highIntentReady
  }, [highIntentCount])

  const markPaywallShown = useCallback(() => {
    lastPaywallRef.current = Date.now()
  }, [])

  return {
    engagementScore: score,
    events,
    trackEvent: addEvent,
    shouldShowPaywall,
    markPaywallShown,
    highIntentCount,
    reset,
  }
}
