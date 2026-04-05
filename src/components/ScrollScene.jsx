// ScrollScene — Canvas 2D with manual perspective projection.
// No WebGL, no Three.js. Works on every GPU including DX9/ANGLE WebGL1-only.
// Scroll drives camera Z through a tunnel of wireframe shapes.
import { useRef, useEffect } from 'react'

const r = (n) => { const x = Math.sin(n + 1) * 43758.5453; return x - Math.floor(x) }

// 14 shapes at staggered Z positions — camera flies through them on scroll
const BASE = Array.from({ length: 14 }, (_, i) => ({
  x:    (r(i * 3)     - 0.5) * 700,
  y:    (r(i * 3 + 1) - 0.5) * 420,
  z:    -(i * 5) + 5,                   // z: +5 (closest) → -65 (furthest)
  size:  45 + r(i * 7) * 70,
  sides: [4, 3, 6][i % 3],              // square / triangle / hexagon
  rotX:  r(i * 11) * Math.PI * 2,
  rotY:  r(i * 13) * Math.PI * 2,
  speedX:(r(i * 17) - 0.5) * 0.012,
  speedY:(r(i * 19) - 0.5) * 0.015,
  opacity: 0.2 + r(i * 23) * 0.3,
}))

function drawPoly(ctx, cx, cy, radius, sides, rot, opacity) {
  ctx.beginPath()
  for (let i = 0; i <= sides; i++) {
    const a = (i / sides) * Math.PI * 2 + rot
    i === 0
      ? ctx.moveTo(cx + Math.cos(a) * radius, cy + Math.sin(a) * radius)
      : ctx.lineTo(cx + Math.cos(a) * radius, cy + Math.sin(a) * radius)
  }
  ctx.strokeStyle = `rgba(45,74,112,${opacity})`
  ctx.lineWidth = 1
  ctx.stroke()
}

export default function ScrollScene() {
  const canvasRef = useRef(null)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Clone base data so rotations are mutable without touching module-level consts
    const shapes = BASE.map(s => ({ ...s }))

    let scrollY = 0
    let animId

    const resize = () => {
      canvas.width  = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()

    const onScroll = () => { scrollY = window.scrollY }
    window.addEventListener('scroll',  onScroll, { passive: true })
    window.addEventListener('resize',  resize)

    function loop() {
      animId = requestAnimationFrame(loop)

      const w = canvas.width
      const h = canvas.height
      const maxScroll = Math.max(document.documentElement.scrollHeight - h, 1)
      const t = Math.min(scrollY / maxScroll, 1)

      // Camera moves forward (decreasing Z) as user scrolls
      const cameraZ  = 10 - t * 60
      const fadeAlpha = Math.max(0, 1 - scrollY / (h * 1.6))

      ctx.clearRect(0, 0, w, h)
      if (fadeAlpha <= 0) return

      ctx.globalAlpha = fadeAlpha

      // Rotate every shape
      for (const s of shapes) { s.rotX += s.speedX; s.rotY += s.speedY }

      // Painter's algorithm — draw back to front so nearer shapes overlay far ones
      const sorted = [...shapes].sort((a, b) => a.z - b.z)

      for (const s of sorted) {
        const depth = s.z - cameraZ
        if (depth < 20) continue       // behind or too close to camera

        const scale  = 420 / depth     // perspective: focal length 420px
        const cx     = s.x * scale + w / 2
        const cy     = s.y * scale + h / 2
        const radius = s.size * scale
        if (radius < 2) continue       // sub-pixel — skip

        drawPoly(ctx, cx, cy, radius, s.sides, s.rotX, s.opacity)
      }

      ctx.globalAlpha = 1
    }

    loop()

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{ position: 'fixed', inset: 0, zIndex: -1, pointerEvents: 'none' }}
    />
  )
}
