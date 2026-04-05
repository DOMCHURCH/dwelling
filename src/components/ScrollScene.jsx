// ScrollScene.jsx — R3F canvas fixed behind the landing page.
// Camera flies through a 3D wireframe tunnel as the user scrolls.
//
// WebGL failure strategy (layered):
//  1. probeWebGL()   — tests WebGL2 THEN WebGL1 (mirroring THREE's order).
//                      Also detects DX9 ANGLE renderer that fails at binding.
//  2. window 'error' — catches the uncaught throw from THREE's effect-phase
//                      constructor (React Error Boundaries don't cover effects).
//  3. WebGLBoundary  — React Error Boundary as final safety-net for render-
//                      phase throws.
// Any failure silently renders null — no crash, no console spam.
import { useRef, useEffect, useState, Component } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'

// ─── WebGL capability probe ───────────────────────────────────────────────────
// Mirrors Three.js's own getContext() call order (webgl2 → webgl → experimental)
// so we catch failures before THREE even loads.
function probeWebGL() {
  try {
    const c = document.createElement('canvas')
    c.width = 1; c.height = 1
    const attrs = { failIfMajorPerformanceCaveat: false }

    const gl = c.getContext('webgl2', attrs)
            || c.getContext('webgl',  attrs)
            || c.getContext('experimental-webgl', attrs)

    if (!gl) return false

    // Detect known-broken ANGLE DX9 renderer.
    // "Direct3D9Ex vs_3_0 ps_3_0" is shader model 3 — too old for THREE.
    // This renderer string is exposed via WEBGL_debug_renderer_info.
    const dbg = gl.getExtension('WEBGL_debug_renderer_info')
    if (dbg) {
      const renderer = gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) || ''
      if (renderer.includes('Direct3D9') || renderer.includes('vs_3_0 ps_3_0')) {
        const lose = gl.getExtension('WEBGL_lose_context')
        if (lose) lose.loseContext()
        return false
      }
    }

    // Release the probe context so THREE can create its own without competing.
    const lose = gl.getExtension('WEBGL_lose_context')
    if (lose) lose.loseContext()

    return true
  } catch {
    return false
  }
}

// ─── React Error Boundary — render-phase safety net ──────────────────────────
class WebGLBoundary extends Component {
  state = { crashed: false }
  static getDerivedStateFromError() { return { crashed: true } }
  componentDidCatch() { /* suppress — already handled */ }
  render() { return this.state.crashed ? null : this.props.children }
}

// ─── Geometry & shape data ────────────────────────────────────────────────────
const r = (n) => { const x = Math.sin(n + 1) * 43758.5453; return x - Math.floor(x) }

const SHAPES = Array.from({ length: 14 }, (_, i) => ({
  id: i,
  position: [
    (r(i * 3)     - 0.5) * 18,
    (r(i * 3 + 1) - 0.5) * 10,
    -(i * 4.8) + 3,
  ],
  type: ['box', 'oct', 'ico'][i % 3],
  scale: 0.5 + r(i * 7) * 1.1,
  rx: (r(i * 11) - 0.5) * 0.007,
  ry: (r(i * 13) - 0.5) * 0.009,
  opacity: 0.18 + r(i * 17) * 0.26,
}))

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
      <meshBasicMaterial color="#2d4a70" transparent opacity={opacity} wireframe />
    </mesh>
  )
}

// ─── Camera rig ───────────────────────────────────────────────────────────────
function CameraRig() {
  const { camera } = useThree()
  const scrollY = useRef(0)

  useEffect(() => {
    const onScroll = () => { scrollY.current = window.scrollY }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useFrame(() => {
    const maxScroll = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1)
    const t = Math.min(scrollY.current / maxScroll, 1)
    const k = 0.09
    camera.position.z += (10 - t * 60 - camera.position.z) * k
    camera.position.y += (-t * 5     - camera.position.y)  * k
    camera.position.x += (Math.sin(t * Math.PI * 1.6) * 2.8 - camera.position.x) * k
    camera.lookAt(camera.position.x * 0.04, camera.position.y * 0.04, camera.position.z - 5)
  })

  return null
}

// ─── Canvas gl factory — forces WebGL1 to avoid WebGL2 binding failures ──────
// Three.js tries webgl2 first; on AMD DX9/ANGLE systems that fails with
// "BindToCurrentSequence failed". By supplying our own context factory we
// skip webgl2 entirely and use the same WebGL1 path that previously worked.
function makeGLContext(canvas) {
  const attrs = { antialias: false, alpha: true, powerPreference: 'low-power', failIfMajorPerformanceCaveat: false }
  const ctx = canvas.getContext('webgl', attrs) || canvas.getContext('experimental-webgl', attrs)
  if (!ctx) throw new Error('webgl unavailable')
  return ctx
}

// ─── Public component ────────────────────────────────────────────────────────
export default function ScrollScene() {
  const wrapRef  = useRef(null)
  const [ok, setOk] = useState(null) // null=pending, true=go, false=skip

  useEffect(() => {
    const capable = probeWebGL()
    if (!capable) { setOk(false); return }

    // Safety net: if THREE's effect-phase constructor throws an uncaught
    // WebGL error (not caught by React Error Boundary), tear down the canvas.
    const onGlobalError = (e) => {
      const msg = (e?.error?.message || e?.message || '').toLowerCase()
      if (msg.includes('webgl') || msg.includes('creating webgl')) {
        e.preventDefault()   // suppress browser's red uncaught-error UI
        setOk(false)
      }
    }
    window.addEventListener('error', onGlobalError)
    setOk(true)
    return () => window.removeEventListener('error', onGlobalError)
  }, [])

  // Fade out past the hero section
  useEffect(() => {
    if (!ok) return
    const onScroll = () => {
      if (!wrapRef.current) return
      wrapRef.current.style.opacity = Math.max(0, 1 - window.scrollY / (window.innerHeight * 1.6))
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [ok])

  if (!ok) return null

  return (
    <div
      ref={wrapRef}
      aria-hidden="true"
      style={{ position: 'fixed', inset: 0, zIndex: -1, pointerEvents: 'none', willChange: 'opacity' }}
    >
      <WebGLBoundary>
        <Canvas
          camera={{ position: [0, 0, 10], fov: 55 }}
          dpr={[1, 1.5]}
          gl={makeGLContext}
        >
          {SHAPES.map(s => <Shape key={s.id} {...s} />)}
          <CameraRig />
        </Canvas>
      </WebGLBoundary>
    </div>
  )
}
