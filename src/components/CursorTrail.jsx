export default function CursorTrail() { return null }

/*
import { useRef, useEffect } from 'react'

function randomHex() {
  return '#' + Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0')
}
function randomColors(n) { return Array.from({ length: n }, randomHex) }
function hexToRgb(hex) {
  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
  }
}

const TRAIL_MS = 900
const BASE_COLORS  = ['#f967fb', '#53bc28', '#6958d5']
const LIGHT_COLORS = ['#83f36e', '#fe8a2e', '#ff008a', '#60aed5']

export default function CursorTrail() {
  const canvasRef = useRef(null)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    // Only run where a fine pointer (mouse) exists. Use any-pointer so Windows
    // touchscreen machines with a mouse still get the effect.
    if (!window.matchMedia('(any-pointer: fine)').matches) return

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let tubeColors = [...BASE_COLORS]
    let glowColors = [...LIGHT_COLORS]
    let colorIdx   = 0

    const resize = () => {
      canvas.width  = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const trail = [] // { x, y, t }
    const onMouseMove = (e) => trail.push({ x: e.clientX, y: e.clientY, t: performance.now() })
    const onClick = () => {
      tubeColors = randomColors(3)
      glowColors = randomColors(4)
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('click', onClick)

    let animId
    function loop() {
      animId = requestAnimationFrame(loop)
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const now = performance.now()
      while (trail.length && now - trail[0].t > TRAIL_MS) trail.shift()
      if (trail.length < 2) return

      // Cycle through tube color slowly
      colorIdx = Math.floor(now / 1200) % tubeColors.length
      const tc = hexToRgb(tubeColors[colorIdx])
      const gc = hexToRgb(glowColors[colorIdx % glowColors.length])

      for (let i = 1; i < trail.length; i++) {
        const p0   = trail[i - 1]
        const p1   = trail[i]
        const age  = (now - p1.t) / TRAIL_MS
        const life = 1 - age          // 1 = fresh, 0 = about to vanish

        ctx.lineCap = 'round'

        // ── Pass 1: outer diffuse glow ───────────────────────────────────────
        ctx.beginPath()
        ctx.moveTo(p0.x, p0.y)
        ctx.lineTo(p1.x, p1.y)
        ctx.lineWidth    = 32
        ctx.strokeStyle  = `rgba(${gc.r},${gc.g},${gc.b},${life * 0.18})`
        ctx.shadowBlur   = 28
        ctx.shadowColor  = `rgba(${gc.r},${gc.g},${gc.b},${life * 0.7})`
        ctx.stroke()

        // ── Pass 2: tube body ────────────────────────────────────────────────
        ctx.beginPath()
        ctx.moveTo(p0.x, p0.y)
        ctx.lineTo(p1.x, p1.y)
        ctx.lineWidth    = 10
        ctx.strokeStyle  = `rgba(${tc.r},${tc.g},${tc.b},${life * 0.9})`
        ctx.shadowBlur   = 12
        ctx.shadowColor  = `rgba(${tc.r},${tc.g},${tc.b},${life})`
        ctx.stroke()

        // ── Pass 3: bright specular core ─────────────────────────────────────
        ctx.beginPath()
        ctx.moveTo(p0.x, p0.y)
        ctx.lineTo(p1.x, p1.y)
        ctx.lineWidth    = 3
        ctx.strokeStyle  = `rgba(255,255,255,${life * 0.95})`
        ctx.shadowBlur   = 6
        ctx.shadowColor  = `rgba(255,255,255,${life * 0.8})`
        ctx.stroke()
      }

      ctx.shadowBlur = 0
    }

    loop()

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', resize)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('click', onClick)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{ position: 'fixed', inset: 0, zIndex: 9999, pointerEvents: 'none' }}
    />
  )
}
*/
