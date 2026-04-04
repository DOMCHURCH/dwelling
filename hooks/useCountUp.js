import { useEffect, useState, useRef } from 'react'

export function useCountUp(target, duration = 1200, prefix = '', suffix = '') {
  const [display, setDisplay] = useState(prefix + '0' + suffix)
  const ref = useRef(null)

  useEffect(() => {
    if (target == null) return
    const num = parseFloat(String(target).replace(/[^0-9.]/g, ''))
    if (isNaN(num)) { setDisplay(prefix + target + suffix); return }
    const start = Date.now()
    const tick = () => {
      const elapsed = Date.now() - start
      const progress = Math.min(elapsed / duration, 1)
      const ease = 1 - Math.pow(1 - progress, 3)
      const current = Math.round(ease * num)
      const formatted = current.toLocaleString()
      setDisplay(prefix + formatted + suffix)
      if (progress < 1) ref.current = requestAnimationFrame(tick)
    }
    ref.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(ref.current)
  }, [target])

  return display
}
