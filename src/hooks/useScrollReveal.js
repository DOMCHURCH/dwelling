// useScrollReveal — lightweight GSAP ScrollTrigger reveal hook
// Usage: const ref = useScrollReveal({ y: 40, delay: 0.1 })
import { useEffect, useRef } from 'react'

let gsapLoaded = false
let gsapInstance = null
let ScrollTriggerInstance = null

async function getGSAP() {
  if (gsapLoaded) return { gsap: gsapInstance, ScrollTrigger: ScrollTriggerInstance }
  const [{ gsap }, { ScrollTrigger }] = await Promise.all([
    import('gsap'),
    import('gsap/ScrollTrigger'),
  ])
  gsap.registerPlugin(ScrollTrigger)
  gsapInstance = gsap
  ScrollTriggerInstance = ScrollTrigger
  gsapLoaded = true
  return { gsap, ScrollTrigger }
}

export function useScrollReveal({
  y = 30,
  x = 0,
  opacity = 0,
  scale = 1,
  duration = 0.7,
  delay = 0,
  ease = 'power3.out',
  stagger = 0,
  selector = null, // animate children matching this selector
} = {}) {
  const ref = useRef(null)

  useEffect(() => {
    let ctx
    getGSAP().then(({ gsap, ScrollTrigger }) => {
      const el = ref.current
      if (!el) return

      const targets = selector ? el.querySelectorAll(selector) : [el]
      if (!targets.length) return

      // Respect prefers-reduced-motion
      const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      if (prefersReduced) {
        gsap.set(targets, { opacity: 1, y: 0, x: 0, scale: 1 })
        return
      }

      gsap.set(targets, { opacity, y, x, scale })

      ctx = gsap.context(() => {
        gsap.to(targets, {
          opacity: 1,
          y: 0,
          x: 0,
          scale: 1,
          duration,
          delay,
          ease,
          stagger,
          scrollTrigger: {
            trigger: el,
            start: 'top 88%',
            toggleActions: 'play none none none',
          },
        })
      })
    })

    return () => ctx?.revert()
  }, [])

  return ref
}

export function useParallax({ speed = 0.15 } = {}) {
  const ref = useRef(null)

  useEffect(() => {
    let ctx
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReduced) return

    getGSAP().then(({ gsap, ScrollTrigger }) => {
      const el = ref.current
      if (!el) return

      ctx = gsap.context(() => {
        gsap.to(el, {
          yPercent: -100 * speed,
          ease: 'none',
          scrollTrigger: {
            trigger: el,
            start: 'top bottom',
            end: 'bottom top',
            scrub: true,
          },
        })
      })
    })

    return () => ctx?.revert()
  }, [])

  return ref
}

export function useCountUp({ end = 100, duration = 1.5, prefix = '', suffix = '' } = {}) {
  const ref = useRef(null)
  const hasRun = useRef(false)

  useEffect(() => {
    getGSAP().then(({ gsap, ScrollTrigger }) => {
      const el = ref.current
      if (!el || hasRun.current) return

      const obj = { val: 0 }
      ScrollTrigger.create({
        trigger: el,
        start: 'top 85%',
        onEnter: () => {
          if (hasRun.current) return
          hasRun.current = true
          gsap.to(obj, {
            val: end,
            duration,
            ease: 'power2.out',
            onUpdate: () => {
              if (el) el.textContent = prefix + Math.round(obj.val).toLocaleString() + suffix
            },
          })
        },
      })
    })
  }, [end, duration, prefix, suffix])

  return ref
}
