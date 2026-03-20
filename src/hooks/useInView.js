import { useEffect, useRef, useState } from 'react'

// Lightweight IntersectionObserver hook — replaces framer-motion whileInView.
// Zero per-frame JS cost. Triggers once by default.
export function useInView(options = {}) {
  const { threshold = 0.1, once = true, rootMargin = '0px' } = options
  const ref = useRef(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true)
          if (once) obs.unobserve(el)
        } else if (!once) {
          setInView(false)
        }
      },
      { threshold, rootMargin }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [threshold, once, rootMargin])

  return [ref, inView]
}
