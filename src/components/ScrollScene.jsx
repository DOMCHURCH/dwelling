import { useRef, useEffect, useState, Component } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

// ─── Probe ────────────────────────────────────────────────────────────────────
// Only tests WebGL1 — that's all we'll use (see createRenderer below).
function probeWebGL() {
  try {
    const c = document.createElement('canvas')
    const attrs = { failIfMajorPerformanceCaveat: false }
    const gl = c.getContext('webgl', attrs) || c.getContext('experimental-webgl', attrs)
    if (!gl) return false
    const lose = gl.getExtension('WEBGL_lose_context')
    if (lose) lose.loseContext() // free GPU resources before THREE needs them
    return true
  } catch {
    return false
  }
}

// ─── Renderer factory ─────────────────────────────────────────────────────────
// Passed as gl={createRenderer} to R3F Canvas.
// By supplying a pre-made WebGL1 context to THREE.WebGLRenderer via the
// `context` option, THREE skips its own getContext() call entirely —
// no webgl2 attempt, no BindToCurrentSequence failure.
function createRenderer(canvas) {
  const attrs = {
    antialias: false,
    alpha: true,
    powerPreference: 'low-power',
    failIfMajorPerformanceCaveat: false,
  }
  const ctx = canvas.getContext('webgl', attrs) || canvas.getContext('experimental-webgl', attrs)
  if (!ctx) throw new Error('webgl unavailable')
  return new THREE.WebGLRenderer({ canvas, context: ctx, antialias: false, alpha: true })
}

// ─── Error boundary ───────────────────────────────────────────────────────────
class WebGLBoundary extends Component {
  state = { crashed: false }
  static getDerivedStateFromError() { return { crashed: true } }
  componentDidCatch() {}
  render() { return this.state.crashed ? null : this.props.children }
}

// ─── Scene objects ────────────────────────────────────────────────────────────
const r = (n) => { const x = Math.sin(n + 1) * 43758.5453; return x - Math.floor(x) }

const SHAPES = Array.from({ length: 14 }, (_, i) => ({
  id: i,
  position: [(r(i * 3) - 0.5) * 18, (r(i * 3 + 1) - 0.5) * 10, -(i * 4.8) + 3],
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
    camera.position.y += (-t * 5 - camera.position.y) * k
    camera.position.x += (Math.sin(t * Math.PI * 1.6) * 2.8 - camera.position.x) * k
    camera.lookAt(camera.position.x * 0.04, camera.position.y * 0.04, camera.position.z - 5)
  })

  return null
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function ScrollScene() {
  const wrapRef = useRef(null)
  const [ok, setOk] = useState(null)

  useEffect(() => {
    if (!probeWebGL()) { setOk(false); return }

    // Backup: catch any uncaught throw that slips past the boundary
    const onError = (e) => {
      const msg = (e?.error?.message || e?.message || '').toLowerCase()
      if (msg.includes('webgl')) { e.preventDefault(); setOk(false) }
    }
    window.addEventListener('error', onError)
    setOk(true)
    return () => window.removeEventListener('error', onError)
  }, [])

  useEffect(() => {
    if (!ok) return
    const onScroll = () => {
      if (wrapRef.current)
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
        <Canvas camera={{ position: [0, 0, 10], fov: 55 }} dpr={[1, 1.5]} gl={createRenderer}>
          {SHAPES.map(s => <Shape key={s.id} {...s} />)}
          <CameraRig />
        </Canvas>
      </WebGLBoundary>
    </div>
  )
}
