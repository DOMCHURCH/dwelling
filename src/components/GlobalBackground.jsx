import { useEffect, useRef } from 'react'

// ── WebGL support check ───────────────────────────────────────────────────────
function isWebGLAvailable() {
  try {
    const canvas = document.createElement('canvas')
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    )
  } catch {
    return false
  }
}

// ── CSS fallback background ───────────────────────────────────────────────────
function CSSBackground() {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 1,
        pointerEvents: 'none',
        overflow: 'hidden',
        WebkitMaskImage: 'linear-gradient(to bottom, black 40%, transparent 90%)',
        maskImage: 'linear-gradient(to bottom, black 40%, transparent 90%)',
      }}
    >
      <style>{`
        @keyframes dw-drift1 {
          0%   { transform: translate(0px, 0px) scale(1); }
          33%  { transform: translate(40px, -60px) scale(1.05); }
          66%  { transform: translate(-30px, 30px) scale(0.97); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        @keyframes dw-drift2 {
          0%   { transform: translate(0px, 0px) scale(1.02); }
          33%  { transform: translate(-50px, 40px) scale(0.96); }
          66%  { transform: translate(60px, -20px) scale(1.04); }
          100% { transform: translate(0px, 0px) scale(1.02); }
        }
        @keyframes dw-drift3 {
          0%   { transform: translate(0px, 0px) scale(0.98); }
          50%  { transform: translate(30px, 50px) scale(1.03); }
          100% { transform: translate(0px, 0px) scale(0.98); }
        }
        @keyframes dw-pulse {
          0%, 100% { opacity: 0.4; }
          50%       { opacity: 0.7; }
        }
        .dw-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
        }
      `}</style>
      {/* Orbs */}
      <div className="dw-orb" style={{
        width: 600, height: 600,
        top: '-15%', left: '-10%',
        background: 'radial-gradient(circle, rgba(40,40,60,0.9) 0%, transparent 70%)',
        animation: 'dw-drift1 18s ease-in-out infinite, dw-pulse 8s ease-in-out infinite',
      }} />
      <div className="dw-orb" style={{
        width: 500, height: 500,
        top: '10%', right: '-5%',
        background: 'radial-gradient(circle, rgba(30,35,55,0.85) 0%, transparent 70%)',
        animation: 'dw-drift2 22s ease-in-out infinite, dw-pulse 10s ease-in-out infinite 2s',
      }} />
      <div className="dw-orb" style={{
        width: 400, height: 400,
        top: '40%', left: '30%',
        background: 'radial-gradient(circle, rgba(20,25,45,0.8) 0%, transparent 70%)',
        animation: 'dw-drift3 15s ease-in-out infinite, dw-pulse 12s ease-in-out infinite 4s',
      }} />
      <div className="dw-orb" style={{
        width: 350, height: 350,
        bottom: '5%', left: '10%',
        background: 'radial-gradient(circle, rgba(35,30,50,0.75) 0%, transparent 70%)',
        animation: 'dw-drift1 20s ease-in-out infinite reverse, dw-pulse 9s ease-in-out infinite 1s',
      }} />
      {/* Subtle grid */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `
          linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)
        `,
        backgroundSize: '80px 80px',
        opacity: 0.6,
      }} />
    </div>
  )
}

// ── Three.js background (only loaded if WebGL is available) ───────────────────
function ThreeBackground({ canvasRef }) {
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    let three, spheres, rafId, resizeTimer, resizeObserver

    // Lazy-load Three.js so it doesn't block if WebGL fails
    import('three').then(async (THREE) => {
      const {
        BackSide, BoxGeometry, Clock, Mesh, MeshLambertMaterial, MeshStandardMaterial,
        PerspectiveCamera, Scene, WebGLRenderer, SRGBColorSpace, MathUtils,
        Vector2, Vector3, MeshPhysicalMaterial, Color, Object3D,
        InstancedMesh, PMREMGenerator, SphereGeometry, AmbientLight, PointLight,
        ACESFilmicToneMapping, Raycaster, Plane,
      } = THREE

      // ── Inline RoomEnvironment ──────────────────────────────────────────────
      function createAreaLight(intensity) {
        return new MeshLambertMaterial({ color: 0x000000, emissive: 0xffffff, emissiveIntensity: intensity })
      }
      class RoomEnvironment extends Scene {
        constructor() {
          super()
          this.position.y = -3.5
          const geo = new BoxGeometry(); geo.deleteAttribute('uv')
          const room = new Mesh(geo, new MeshStandardMaterial({ side: BackSide }))
          room.position.set(-0.757, 13.219, 0.717); room.scale.set(31.713, 28.305, 28.591)
          this.add(room)
          const mainLight = new PointLight(0xffffff, 900, 28, 2)
          mainLight.position.set(0.418, 16.199, 0.300); this.add(mainLight)
          const boxes = new InstancedMesh(geo, new MeshStandardMaterial(), 6)
          const t = new Object3D()
          ;[
            [[-10.906,2.009,1.846],[0,-0.195,0],[2.328,7.905,4.651]],
            [[-5.607,-0.754,-0.758],[0,0.994,0],[1.970,1.534,3.955]],
            [[6.167,0.857,7.803],[0,0.561,0],[3.927,6.285,3.687]],
            [[-2.017,0.018,6.124],[0,0.333,0],[2.002,4.566,2.064]],
            [[2.291,-0.756,-2.621],[0,-0.286,0],[1.546,1.552,1.496]],
            [[-2.193,-0.369,-5.547],[0,0.516,0],[3.875,3.487,2.986]],
          ].forEach(([p,r,s],i) => {
            t.position.set(...p); t.rotation.set(...r); t.scale.set(...s); t.updateMatrix()
            boxes.setMatrixAt(i, t.matrix)
          })
          this.add(boxes)
          ;[
            [[-16.116,14.370,8.208],[0.1,2.428,2.739],50],
            [[-16.109,18.021,-8.207],[0.1,2.425,2.751],50],
            [[14.904,12.198,-1.832],[0.15,4.265,6.331],17],
            [[-0.462,8.890,14.520],[4.38,5.441,0.088],43],
            [[3.235,11.486,-12.541],[2.5,2.0,0.1],20],
            [[0.000,20.000,0.000],[1.0,0.1,1.0],100],
          ].forEach(([pos,scale,intensity]) => {
            const m = new Mesh(geo, createAreaLight(intensity))
            m.position.set(...pos); m.scale.set(...scale); this.add(m)
          })
        }
      }

      // ── Physics ─────────────────────────────────────────────────────────────
      const COUNT = 100
      const cfg = {
        count: COUNT, size0: 0.9, minSize: 0.25, maxSize: 0.65,
        gravity: 0.35, friction: 0.995, wallBounce: 0.3, maxVelocity: 0.08,
        maxX: 10, maxY: 10, maxZ: 8, controlSphere0: true,
      }
      const posData = new Float32Array(3 * COUNT)
      const velData = new Float32Array(3 * COUNT)
      const sizeData = new Float32Array(COUNT)
      const center = new Vector3()

      sizeData[0] = cfg.size0
      for (let i = 1; i < COUNT; i++) {
        sizeData[i] = MathUtils.randFloat(cfg.minSize, cfg.maxSize)
        posData[3*i]   = MathUtils.randFloatSpread(2 * cfg.maxX)
        posData[3*i+1] = MathUtils.randFloatSpread(2 * cfg.maxY)
        posData[3*i+2] = MathUtils.randFloatSpread(2 * cfg.maxZ)
      }

      function updatePhysics(delta) {
        new Vector3().fromArray(posData, 0).lerp(center, 0.1).toArray(posData, 0)
        for (let i = 1; i < COUNT; i++) {
          const b = 3 * i
          const pos = new Vector3().fromArray(posData, b)
          const vel = new Vector3().fromArray(velData, b)
          vel.y -= delta * cfg.gravity * sizeData[i]
          vel.multiplyScalar(cfg.friction)
          vel.clampLength(0, cfg.maxVelocity)
          pos.add(vel)
          for (let j = i + 1; j < COUNT; j++) {
            const ob = 3 * j
            const op = new Vector3().fromArray(posData, ob)
            const d = new Vector3().subVectors(op, pos)
            const dist = d.length(), sumR = sizeData[i] + sizeData[j]
            if (dist < sumR) {
              const ov = (sumR - dist) * 0.5; d.normalize()
              pos.addScaledVector(d, -ov); op.addScaledVector(d, ov)
              op.toArray(posData, ob)
            }
          }
          if (Math.abs(pos.x) + sizeData[i] > cfg.maxX) { pos.x = Math.sign(pos.x)*(cfg.maxX-sizeData[i]); vel.x *= -cfg.wallBounce }
          if (pos.y - sizeData[i] < -cfg.maxY)           { pos.y = -cfg.maxY+sizeData[i]; vel.y *= -cfg.wallBounce }
          if (Math.abs(pos.z) + sizeData[i] > cfg.maxZ)  { pos.z = Math.sign(pos.z)*(cfg.maxZ-sizeData[i]); vel.z *= -cfg.wallBounce }
          pos.toArray(posData, b); vel.toArray(velData, b)
        }
      }

      // ── Renderer & scene ────────────────────────────────────────────────────
      const renderer = new WebGLRenderer({ canvas, powerPreference: 'high-performance', alpha: true, antialias: true })
      renderer.outputColorSpace = SRGBColorSpace
      renderer.toneMapping = ACESFilmicToneMapping

      const camera = new PerspectiveCamera(50, 1, 0.1, 100)
      camera.position.set(0, 0, 20)
      const scene = new Scene()

      // Instanced spheres
      const pmrem = new PMREMGenerator(renderer)
      const envTex = pmrem.fromScene(new RoomEnvironment()).texture; pmrem.dispose()
      const colors = ['#0a0a0a','#111111','#1a1a1a','#0f0f0f','#141414','#080808','#161616','#0d0d0d']
      const material = new MeshPhysicalMaterial({ envMap: envTex, metalness: 0.9, roughness: 0.15, clearcoat: 1, clearcoatRoughness: 0.1 })
      const mesh = new InstancedMesh(new SphereGeometry(1, 20, 20), material, COUNT)
      const parsed = colors.map(c => new Color(c))
      for (let i = 0; i < COUNT; i++) mesh.setColorAt(i, parsed[i % parsed.length])
      mesh.instanceColor.needsUpdate = true
      const pointLight = new PointLight(0xffffff, 4, 100, 1)
      mesh.add(new AmbientLight(0xffffff, 1.2))
      mesh.add(pointLight)
      scene.add(mesh)

      const dummy = new Object3D()
      function updateMesh() {
        for (let i = 0; i < COUNT; i++) {
          dummy.position.fromArray(posData, 3 * i)
          dummy.scale.setScalar(sizeData[i])
          dummy.updateMatrix()
          mesh.setMatrixAt(i, dummy.matrix)
        }
        mesh.instanceMatrix.needsUpdate = true
        pointLight.position.fromArray(posData, 0)
      }

      // ── Resize ───────────────────────────────────────────────────────────────
      let w = 0, h = 0, wWidth = 0, wHeight = 0
      function resize() {
        const parent = canvas.parentNode
        w = parent ? parent.offsetWidth  : window.innerWidth
        h = parent ? parent.offsetHeight : window.innerHeight
        camera.aspect = w / h; camera.updateProjectionMatrix()
        const fovRad = (camera.fov * Math.PI) / 180
        wHeight = 2 * Math.tan(fovRad / 2) * camera.position.z
        wWidth  = wHeight * camera.aspect
        cfg.maxX = wWidth / 2; cfg.maxY = wHeight / 2; cfg.maxZ = wWidth / 4
        renderer.setSize(w, h)
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
      }
      resize()
      resizeObserver = new ResizeObserver(() => {
        clearTimeout(resizeTimer); resizeTimer = setTimeout(resize, 100)
      })
      if (canvas.parentNode) resizeObserver.observe(canvas.parentNode)

      // ── Pointer ───────────────────────────────────────────────────────────────
      const pointer = new Vector2()
      const raycaster = new Raycaster()
      const plane = new Plane(new Vector3(0, 0, 1), 0)
      const intersection = new Vector3()
      function onPointerMove(e) {
        pointer.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1)
      }
      window.addEventListener('pointermove', onPointerMove, { passive: true })

      // ── Animation loop ────────────────────────────────────────────────────────
      const clock = new Clock()
      let visible = false
      const io = new IntersectionObserver(([e]) => {
        visible = e.isIntersecting
        if (visible) { clock.start(); loop() } else { clock.stop(); cancelAnimationFrame(rafId) }
      }, { threshold: 0 })
      io.observe(canvas)

      function loop() {
        if (!visible) return
        rafId = requestAnimationFrame(loop)
        const delta = clock.getDelta()
        raycaster.setFromCamera(pointer, camera)
        if (raycaster.ray.intersectPlane(plane, intersection)) center.copy(intersection)
        updatePhysics(delta)
        updateMesh()
        renderer.render(scene, camera)
      }

      // Store references for cleanup
      three = { renderer, io, clock }
      window._dwCleanupPointer = () => window.removeEventListener('pointermove', onPointerMove)
    }).catch(err => {
      console.warn('GlobalBackground: Three.js failed to load', err)
    })

    return () => {
      cancelAnimationFrame(rafId)
      clearTimeout(resizeTimer)
      resizeObserver?.disconnect()
      three?.io?.disconnect()
      three?.renderer?.dispose()
      window._dwCleanupPointer?.()
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute', inset: 0, width: '100%', height: '100%',
        zIndex: 1, pointerEvents: 'none', display: 'block',
        WebkitMaskImage: 'linear-gradient(to bottom, black 40%, transparent 90%)',
        maskImage: 'linear-gradient(to bottom, black 40%, transparent 90%)',
      }}
    />
  )
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function GlobalBackground() {
  const canvasRef = useRef(null)
  const webGLSupported = isWebGLAvailable()

  if (!webGLSupported) return <CSSBackground />
  return <ThreeBackground canvasRef={canvasRef} />
}
