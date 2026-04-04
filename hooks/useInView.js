// SINGLE shared IntersectionObserver for the entire page.
// Instead of 50 separate observers each calling setState,
// one observer watches all elements and dispatches custom events.
// This eliminates the 50-simultaneous-setState cascade on page load.

import { useEffect, useRef, useState } from 'react'

let sharedObserver = null
const callbacks = new Map()

function getObserver() {
  if (!sharedObserver) {
    sharedObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          const cb = callbacks.get(entry.target)
          if (cb) cb(entry.isIntersecting)
        })
      },
      { threshold: 0.08, rootMargin: '0px 0px -40px 0px' }
    )
  }
  return sharedObserver
}

export function useInView(once = true) {
  const ref = useRef(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = getObserver()
    callbacks.set(el, (visible) => {
      if (visible) {
        setInView(true)
        if (once) {
          obs.unobserve(el)
          callbacks.delete(el)
        }
      }
    })
    obs.observe(el)
    return () => {
      obs.unobserve(el)
      callbacks.delete(el)
    }
  }, [once])

  return [ref, inView]
}
