export default function ScrollScene() { return null }

/*
import { useRef, useEffect } from 'react'

const r = (n) => { const x = Math.sin(n + 1) * 43758.5453; return x - Math.floor(x) }

// ─── Scene data ───────────────────────────────────────────────────────────────
// Camera starts at Z=10 looking toward −Z.
// Shapes are at Z=−5, −10, −15 … −60 — all in front of the camera.
// depth = cameraZ − shapeZ  (always positive for shapes in front)
// scale = FOCAL / depth
// screenX = shape.x × scale + canvas_center_x
//
// With FOCAL=150 and depth=15: scale=10 → a shape with x=15 lands 150px off-center ✓
// World x ±30, y ±20 keeps everything inside a 1440px viewport.
const SHAPES = Array.from({ length: 12 }, (_, i) => ({
  x:     (r(i * 3)     - 0.5) * 60,   // world units ±30
  y:     (r(i * 3 + 1) - 0.5) * 40,   // world units ±20
  z:     -(i * 5 + 5),                  // −5, −10, −15 … −60
  size:   4 + r(i * 7)  * 12,           // 4–16 world units → 40–160 px at near depth
  sides:  [4, 3, 6][i % 3],             // square / triangle / hexagon
  rotX:   r(i * 11) * Math.PI * 2,
  rotY:   r(i * 13) * Math.PI * 2,
  speedX: (r(i * 17) - 0.5) * 0.010,
  speedY: (r(i * 19) - 0.5) * 0.013,
  opacity: 0.15 + r(i * 23) * 0.25,    // 0.15 – 0.40  (white on black = visible)
}))

export default function ScrollScene() {
  const canvasRef = useRef(null)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const shapes = SHAPES.map(s => ({ ...s }))   // mutable copies
    const FOCAL = 150

    let scrollY = 0
    let animId

    const resize = () => {
      canvas.width  = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()

    const onScroll = () => { scrollY = window.scrollY }
    window.addEventListener('resize',  resize)
    window.addEventListener('scroll',  onScroll, { passive: true })

    function loop() {
      animId = requestAnimationFrame(loop)
      const w = canvas.width
      const h = canvas.height

      const maxScroll = Math.max(document.documentElement.scrollHeight - h, 1)
      const t = Math.min(scrollY / maxScroll, 1)

      // Camera flies from Z=10 to Z=−50 as user scrolls top → bottom
      const cameraZ = 10 - t * 60

      // Scene fades out at 1.6× viewport height of scrolling
      const alpha = Math.max(0, 1 - scrollY / (h * 1.6))

      ctx.clearRect(0, 0, w, h)
      if (alpha <= 0) return

      ctx.globalAlpha = alpha

      // Advance rotations every frame
      for (const s of shapes) { s.rotX += s.speedX; s.rotY += s.speedY }

      // Painter's algorithm: draw furthest first
      const sorted = [...shapes].sort((a, b) => a.z - b.z)

      for (const s of sorted) {
        // depth > 0 means the shape is in front of the camera
        const depth = cameraZ - s.z        // ← CORRECT: camera minus shape
        if (depth < 5) continue             // behind or dangerously close

        const scale  = FOCAL / depth
        const sx     = s.x * scale + w * 0.5
        const sy     = s.y * scale + h * 0.5
        const radius = s.size * scale

        if (radius < 1) continue
        if (sx + radius < 0 || sx - radius > w) continue   // off-screen cull
        if (sy + radius < 0 || sy - radius > h) continue

        ctx.beginPath()
        for (let j = 0; j <= s.sides; j++) {
          const a = (j / s.sides) * Math.PI * 2 + s.rotX
          const px = sx + Math.cos(a) * radius
          const py = sy + Math.sin(a) * radius
          j === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)
        }
        ctx.strokeStyle = `rgba(255,255,255,${s.opacity})`
        ctx.lineWidth   = 1
        ctx.stroke()
      }

      ctx.globalAlpha = 1
    }

    loop()

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', resize)
      window.removeEventListener('scroll', onScroll)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}
    />
  )
}
*/
