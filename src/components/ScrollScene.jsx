// ScrollScene.jsx — R3F canvas fixed behind the landing page.
// Camera flies through a 3D wireframe tunnel as the user scrolls.
// window.scrollY drives camera Z/Y/X position via useFrame lerp.
// Graceful degradation: if WebGL is unavailable (sandboxed GPU, old driver,
// ANGLE DX9 fallback) the component silently renders nothing.
import { useRef, useEffect, useState, Component } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'

// ─── WebGL capability probe ───────────────────────────────────────────────────
// Must run in useEffect (not module-level) so SSR doesn't throw.
function probeWebGL() {
  try {
    const c = document.createElement('canvas')
    // Try both contexts; some browsers only expose experimental-webgl
    const gl = c.getContext('webgl', { failIfMajorPerformanceCaveat: false })
            || c.getContext('experimental-webgl', { failIfMajorPerformanceCaveat: false })
    return !!gl
  } catch {
    return false
  }
}

// ─── Error boundary — catches the R3F hard-throw when context creation fails ─
class WebGLBoundary extends Component {
  state = { crashed: false }
  static getDerivedStateFromError() { return { crashed: true } }
  componentDidCatch(err) {
    // Only suppress the known WebGL context error; re-throw anything else
    if (!err?.message?.toLowerCase().includes('webgl')) throw err
  }
  render() {
    return this.state.crashed ? null : this.props.children
  }
}

// Deterministic seeded pseudo-random — avoids hydration/hot-reload randomness
const r = (n) => { const x = Math.sin(n + 1) * 43758.5453; return x - Math.floor(x) }

// 14 shapes pre-computed at module level (static, no re-init on re-render)
const SHAPES = Array.from({ length: 14 }, (_, i) => ({
  id: i,
  // Spread across X/Y, march along negative Z so camera flies through them
  position: [
    (r(i * 3)     - 0.5) * 18,
    (r(i * 3 + 1) - 0.5) * 10,
    -(i * 4.8) + 3,           // Z: +3 (closest) → -63 (furthest)
  ],
  type: ['box', 'oct', 'ico'][i % 3],
  scale: 0.5 + r(i * 7) * 1.1,
  rx: (r(i * 11) - 0.5) * 0.007,  // rotation speed per frame
  ry: (r(i * 13) - 0.5) * 0.009,
  opacity: 0.18 + r(i * 17) * 0.26,
}))

// ─── Individual shape ─────────────────────────────────────────────────────────
function Shape({ position, type, scale, rx, ry, opacity }) {
  const mesh = useRef()
  useFrame(() => {
    if (!mesh.current) return
    mesh.current.rotation.x += rx
    mesh.current.rotation.y += ry
  })
  return (
    <mesh ref={mesh} position={position} scale={scale}>
      {type === 'box' && <boxGeometry args={[1.3, 1.3, 1.3]} />}
      {type === 'oct' && <octahedronGeometry args={[1, 0]} />}
      {type === 'ico' && <icosahedronGeometry args={[1, 0]} />}
      {/* Colour matches GlobalBackground blue: #2d4a70 */}
      <meshBasicMaterial color="#2d4a70" transparent opacity={opacity} wireframe />
    </mesh>
  )
}

// ─── Camera rig — reads window.scrollY each frame ─────────────────────────────
function CameraRig() {
  const { camera } = useThree()
  const scrollY = useRef(0)

  useEffect(() => {
    const onScroll = () => { scrollY.current = window.scrollY }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useFrame(() => {
    const maxScroll = Math.max(
      document.documentElement.scrollHeight - window.innerHeight,
      1
    )
    // t: 0 at top → 1 at bottom of page
    const t = Math.min(scrollY.current / maxScroll, 1)

    // Target positions — camera flies forward through Z space
    const tz = 10 - t * 60          // z:  10  →  -50
    const ty = -t * 5               // y:   0  →   -5  (gentle downward arc)
    const tx = Math.sin(t * Math.PI * 1.6) * 2.8  // smooth left-right sway

    // Lerp — 0.09 is snappy enough with Lenis's own lerp (0.08)
    const k = 0.09
    camera.position.z += (tz - camera.position.z) * k
    camera.position.y += (ty - camera.position.y) * k
    camera.position.x += (tx - camera.position.x) * k

    // Always look slightly ahead on Z so orientation stays natural
    camera.lookAt(
      camera.position.x * 0.04,
      camera.position.y * 0.04,
      camera.position.z - 5
    )
  })

  return null
}

// ─── Public component ────────────────────────────────────────────────────────
export default function ScrollScene() {
  const wrapRef = useRef(null)
  // null = not checked yet, true/false = result of probe
  const [webglOk, setWebglOk] = useState(null)

  useEffect(() => {
    setWebglOk(probeWebGL())
  }, [])

  // Fade the canvas out as the user scrolls deep into the page (past ~1.5× vh)
  useEffect(() => {
    if (!webglOk) return
    const onScroll = () => {
      if (!wrapRef.current) return
      const vh = window.innerHeight
      // Fully opaque 0 → 0.4×vh, fully gone at 1.6×vh
      const alpha = Math.max(0, 1 - window.scrollY / (vh * 1.6))
      wrapRef.current.style.opacity = alpha
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [webglOk])

  // WebGL unavailable or not yet probed — render nothing, no error
  if (!webglOk) return null

  return (
    <div
      ref={wrapRef}
      aria-hidden="true"
      style={{
        position: 'fixed', inset: 0,
        zIndex: -1, pointerEvents: 'none',
        willChange: 'opacity',
      }}
    >
      <WebGLBoundary>
        <Canvas
          camera={{ position: [0, 0, 10], fov: 55 }}
          dpr={[1, 1.5]}
          gl={{
            antialias: false,
            alpha: true,
            powerPreference: 'low-power',
            // Accept contexts even with performance caveats (software/ANGLE fallback)
            failIfMajorPerformanceCaveat: false,
          }}
        >
          {SHAPES.map(s => <Shape key={s.id} {...s} />)}
          <CameraRig />
        </Canvas>
      </WebGLBoundary>
    </div>
  )
}
