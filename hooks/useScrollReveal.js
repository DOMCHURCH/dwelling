// useScrollReveal + useParallax + useCountUp — GSAP ScrollTrigger hooks
// All GSAP imports are lazy so zero impact on initial bundle
import { useEffect, useRef } from 'react'

let _gsap = null, _ST = null, _ready = false
const _queue = []

export async function getGSAP() {
  if (_ready) return { gsap: _gsap, ScrollTrigger: _ST }
  return new Promise((resolve) => {
    _queue.push(resolve)
    if (_queue.length > 1) return // already loading
    Promise.all([import('gsap'), import('gsap/ScrollTrigger')]).then(([{ gsap }, { ScrollTrigger }]) => {
      gsap.registerPlugin(ScrollTrigger)
      _gsap = gsap; _ST = ScrollTrigger; _ready = true
      _queue.forEach(r => r({ gsap, ScrollTrigger }))
      _queue.length = 0
    })
  })
}

const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

// ─── useScrollReveal ──────────────────────────────────────────────────────────
export function useScrollReveal({
  y = 30, x = 0, opacity = 0, scale = 1,
  duration = 0.7, delay = 0, ease = 'power3.out',
  stagger = 0, selector = null,
} = {}) {
  const ref = useRef(null)
  useEffect(() => {
    let ctx
    getGSAP().then(({ gsap, ScrollTrigger }) => {
      const el = ref.current
      if (!el) return
      const targets = selector ? el.querySelectorAll(selector) : [el]
      if (!targets.length) return
      if (reduced()) { gsap.set(targets, { opacity: 1, y: 0, x: 0, scale: 1 }); return }
      gsap.set(targets, { opacity, y, x, scale })
      ctx = gsap.context(() => {
        gsap.to(targets, {
          opacity: 1, y: 0, x: 0, scale: 1,
          duration, delay, ease, stagger,
          scrollTrigger: { trigger: el, start: 'top 88%', toggleActions: 'play none none none' },
        })
      })
    })
    return () => ctx?.revert()
  }, [])
  return ref
}

// ─── useParallax — scrub-based image parallax ─────────────────────────────────
// speed: 0 = no movement, 0.3 = slow (bg), 0.6 = mid, 1 = matches scroll
export function useParallax({ speed = 0.3, scale = 1.15 } = {}) {
  const ref = useRef(null)
  useEffect(() => {
    if (reduced()) return
    let ctx
    getGSAP().then(({ gsap }) => {
      const el = ref.current
      if (!el) return
      // Pre-scale so we have room to move without showing edges
      // will-change: transform promotes to composited layer for GPU rendering
      el.style.willChange = 'transform'
      gsap.set(el, { scale, transformOrigin: 'center center', force3D: true })
      ctx = gsap.context(() => {
        gsap.to(el, {
          yPercent: -15 * speed * 3,
          ease: 'none',
          force3D: true,
          scrollTrigger: {
            trigger: el.parentElement,
            start: 'top bottom',
            end: 'bottom top',
            scrub: 1, // numeric scrub = smooth catch-up, avoids jank vs scrub:true
          },
        })
      })
    })
    return () => ctx?.revert()
  }, [speed, scale])
  return ref
}

// ─── useCountUp ───────────────────────────────────────────────────────────────
export function useCountUp({ end = 100, duration = 1.8, prefix = '', suffix = '' } = {}) {
  const ref = useRef(null)
  const ran = useRef(false)
  useEffect(() => {
    getGSAP().then(({ gsap, ScrollTrigger }) => {
      const el = ref.current
      if (!el || ran.current) return
      const obj = { val: 0 }
      ScrollTrigger.create({
        trigger: el, start: 'top 85%',
        onEnter: () => {
          if (ran.current) return
          ran.current = true
          gsap.to(obj, {
            val: end, duration, ease: 'power2.out',
            onUpdate: () => { if (el) el.textContent = prefix + Math.round(obj.val).toLocaleString() + suffix },
          })
        },
      })
    })
  }, [end, duration, prefix, suffix])
  return ref
}

// ─── useScrubReveal — cinematic entrance tied to scroll progress ──────────────
export function useScrubReveal({ fromY = 60, fromScale = 0.96 } = {}) {
  const ref = useRef(null)
  useEffect(() => {
    if (reduced()) return
    let ctx
    getGSAP().then(({ gsap, ScrollTrigger }) => {
      const el = ref.current
      if (!el) return
      gsap.set(el, { y: fromY, scale: fromScale, opacity: 0 })
      ctx = gsap.context(() => {
        gsap.to(el, {
          y: 0, scale: 1, opacity: 1,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: el,
            start: 'top 90%',
            end: 'top 55%',
            scrub: 0.8,
          },
        })
      })
    })
    return () => ctx?.revert()
  }, [])
  return ref
}
