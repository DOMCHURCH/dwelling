import { useEffect, useRef } from 'react'
import {
  BackSide, BoxGeometry, Clock, Mesh, MeshLambertMaterial, MeshStandardMaterial,
  PerspectiveCamera, Scene, WebGLRenderer, SRGBColorSpace, MathUtils,
  Vector2, Vector3, MeshPhysicalMaterial, Color, Object3D, InstancedMesh,
  PMREMGenerator, SphereGeometry, AmbientLight, PointLight, ACESFilmicToneMapping,
  Raycaster, Plane,
} from 'three'

// ── RoomEnvironment inlined (avoids three/examples import issues) ────────────
function createAreaLightMaterial(intensity) {
  return new MeshLambertMaterial({ color: 0x000000, emissive: 0xffffff, emissiveIntensity: intensity })
}

class RoomEnvironment extends Scene {
  constructor() {
    super()
    this.name = 'RoomEnvironment'
    this.position.y = -3.5

    const geometry = new BoxGeometry()
    geometry.deleteAttribute('uv')

    const roomMaterial = new MeshStandardMaterial({ side: BackSide })
    const boxMaterial  = new MeshStandardMaterial()

    const mainLight = new PointLight(0xffffff, 900, 28, 2)
    mainLight.position.set(0.418, 16.199, 0.300)
    this.add(mainLight)

    const room = new Mesh(geometry, roomMaterial)
    room.position.set(-0.757, 13.219, 0.717)
    room.scale.set(31.713, 28.305, 28.591)
    this.add(room)

    const boxes = new InstancedMesh(geometry, boxMaterial, 6)
    const t = new Object3D()
    const boxDefs = [
      [[-10.906, 2.009, 1.846],   [0,-0.195,0], [2.328,7.905,4.651]],
      [[ -5.607,-0.754,-0.758],   [0, 0.994,0], [1.970,1.534,3.955]],
      [[  6.167, 0.857, 7.803],   [0, 0.561,0], [3.927,6.285,3.687]],
      [[ -2.017, 0.018, 6.124],   [0, 0.333,0], [2.002,4.566,2.064]],
      [[  2.291,-0.756,-2.621],   [0,-0.286,0], [1.546,1.552,1.496]],
      [[ -2.193,-0.369,-5.547],   [0, 0.516,0], [3.875,3.487,2.986]],
    ]
    boxDefs.forEach(([p, r, s], i) => {
      t.position.set(...p); t.rotation.set(...r); t.scale.set(...s); t.updateMatrix()
      boxes.setMatrixAt(i, t.matrix)
    })
    this.add(boxes)

    const lights = [
      [[-16.116,14.370, 8.208], [0.1,2.428,2.739], 50],
      [[-16.109,18.021,-8.207], [0.1,2.425,2.751], 50],
      [[ 14.904,12.198,-1.832], [0.15,4.265,6.331], 17],
      [[ -0.462, 8.890,14.520], [4.38,5.441,0.088], 43],
      [[  3.235,11.486,-12.541],[2.5, 2.0,  0.1  ], 20],
      [[  0.000,20.000, 0.000], [1.0, 0.1,  1.0  ], 100],
    ]
    lights.forEach(([pos, scale, intensity]) => {
      const m = new Mesh(geometry, createAreaLightMaterial(intensity))
      m.position.set(...pos); m.scale.set(...scale)
      this.add(m)
    })
  }
}

// ── Three.js scene manager ───────────────────────────────────────────────────
class ThreeBase {
  #resizeObserver; #intersectionObserver; #resizeTimer
  #animationFrameId = 0; #clock = new Clock()
  #animationState = { elapsed: 0, delta: 0 }
  #isAnimating = false; #isVisible = false

  onBeforeRender = () => {}
  onAfterResize  = () => {}
  size = { width: 0, height: 0, wWidth: 0, wHeight: 0, ratio: 0 }

  constructor({ canvas }) {
    this.canvas   = canvas
    this.camera   = new PerspectiveCamera(50, 1, 0.1, 100)
    this.scene    = new Scene()
    this.renderer = new WebGLRenderer({ canvas, powerPreference: 'high-performance', alpha: true, antialias: true })
    this.renderer.outputColorSpace = SRGBColorSpace
    canvas.style.display = 'block'
    this.#initObservers()
    this.resize()
  }

  #initObservers() {
    const parent = this.canvas.parentNode
    if (parent) {
      this.#resizeObserver = new ResizeObserver(this.#onResize.bind(this))
      this.#resizeObserver.observe(parent)
    } else {
      window.addEventListener('resize', this.#onResize.bind(this))
    }
    this.#intersectionObserver = new IntersectionObserver(this.#onIntersection.bind(this), { threshold: 0 })
    this.#intersectionObserver.observe(this.canvas)
    document.addEventListener('visibilitychange', this.#onVisibilityChange.bind(this))
  }

  #onResize() {
    clearTimeout(this.#resizeTimer)
    this.#resizeTimer = setTimeout(this.resize.bind(this), 100)
  }

  resize() {
    const parent = this.canvas.parentNode
    const w = parent ? parent.offsetWidth  : window.innerWidth
    const h = parent ? parent.offsetHeight : window.innerHeight
    Object.assign(this.size, { width: w, height: h, ratio: w / h })
    this.camera.aspect = this.size.ratio
    this.camera.updateProjectionMatrix()
    const fovRad = (this.camera.fov * Math.PI) / 180
    this.size.wHeight = 2 * Math.tan(fovRad / 2) * this.camera.position.z
    this.size.wWidth  = this.size.wHeight * this.camera.aspect
    this.renderer.setSize(w, h)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.onAfterResize(this.size)
  }

  #onIntersection(entries) {
    this.#isAnimating = entries[0].isIntersecting
    this.#isAnimating ? this.#startAnimation() : this.#stopAnimation()
  }

  #onVisibilityChange() {
    if (this.#isAnimating) document.hidden ? this.#stopAnimation() : this.#startAnimation()
  }

  #startAnimation() {
    if (this.#isVisible) return
    this.#isVisible = true
    this.#clock.start()
    const loop = () => {
      this.#animationFrameId = requestAnimationFrame(loop)
      this.#animationState.delta    = this.#clock.getDelta()
      this.#animationState.elapsed += this.#animationState.delta
      this.onBeforeRender(this.#animationState)
      this.renderer.render(this.scene, this.camera)
    }
    loop()
  }

  #stopAnimation() {
    if (!this.#isVisible) return
    cancelAnimationFrame(this.#animationFrameId)
    this.#isVisible = false
    this.#clock.stop()
  }

  dispose() {
    this.#stopAnimation()
    this.#resizeObserver?.disconnect()
    this.#intersectionObserver?.disconnect()
    window.removeEventListener('resize', this.#onResize.bind(this))
    document.removeEventListener('visibilitychange', this.#onVisibilityChange.bind(this))
    this.scene.clear()
    this.renderer.dispose()
  }
}

// ── Physics engine ───────────────────────────────────────────────────────────
class Physics {
  center = new Vector3()

  constructor(config) {
    this.config       = config
    this.positionData = new Float32Array(3 * config.count)
    this.velocityData = new Float32Array(3 * config.count)
    this.sizeData     = new Float32Array(config.count)
    this.#init()
    this.setSizes()
  }

  #init() {
    const { count, maxX, maxY, maxZ } = this.config
    this.center.toArray(this.positionData, 0)
    for (let i = 1; i < count; i++) {
      const idx = 3 * i
      this.positionData[idx]     = MathUtils.randFloatSpread(2 * maxX)
      this.positionData[idx + 1] = MathUtils.randFloatSpread(2 * maxY)
      this.positionData[idx + 2] = MathUtils.randFloatSpread(2 * maxZ)
    }
  }

  setSizes() {
    const { count, size0, minSize, maxSize } = this.config
    this.sizeData[0] = size0
    for (let i = 1; i < count; i++) this.sizeData[i] = MathUtils.randFloat(minSize, maxSize)
  }

  update({ delta }) {
    const { config, center, positionData: pd, velocityData: vd, sizeData: sd } = this

    if (config.controlSphere0) {
      new Vector3().fromArray(pd, 0).lerp(center, 0.1).toArray(pd, 0)
    }

    for (let i = config.controlSphere0 ? 1 : 0; i < config.count; i++) {
      const b   = 3 * i
      const pos = new Vector3().fromArray(pd, b)
      const vel = new Vector3().fromArray(vd, b)

      vel.y -= delta * config.gravity * sd[i]
      vel.multiplyScalar(config.friction)
      vel.clampLength(0, config.maxVelocity)
      pos.add(vel)

      for (let j = i + 1; j < config.count; j++) {
        const ob   = 3 * j
        const oPos = new Vector3().fromArray(pd, ob)
        const diff = new Vector3().subVectors(oPos, pos)
        const dist = diff.length()
        const sumR = sd[i] + sd[j]
        if (dist < sumR) {
          const overlap = (sumR - dist) * 0.5
          diff.normalize()
          pos.addScaledVector(diff, -overlap)
          oPos.addScaledVector(diff,  overlap)
          oPos.toArray(pd, ob)
        }
      }

      if (Math.abs(pos.x) + sd[i] > config.maxX) { pos.x = Math.sign(pos.x) * (config.maxX - sd[i]); vel.x *= -config.wallBounce }
      if (pos.y - sd[i] < -config.maxY)           { pos.y = -config.maxY + sd[i];                      vel.y *= -config.wallBounce }
      if (Math.abs(pos.z) + sd[i] > config.maxZ)  { pos.z = Math.sign(pos.z) * (config.maxZ - sd[i]); vel.z *= -config.wallBounce }

      pos.toArray(pd, b)
      vel.toArray(vd, b)
    }
  }
}

// ── Instanced sphere cloud ───────────────────────────────────────────────────
const _dummy = new Object3D()

class SphereCloud extends InstancedMesh {
  constructor(renderer, params) {
    const pmrem      = new PMREMGenerator(renderer)
    const envTexture = pmrem.fromScene(new RoomEnvironment()).texture
    pmrem.dispose()

    super(
      new SphereGeometry(1, 20, 20),
      new MeshPhysicalMaterial({ envMap: envTexture, ...params.materialParams }),
      params.count,
    )

    this.config  = params
    this.physics = new Physics(params)

    const ambient = new AmbientLight(0xffffff, params.ambientIntensity)
    this.add(ambient)
    this.light = new PointLight(0xffffff, params.lightIntensity, 100, 1)
    this.add(this.light)

    this.setColors(params.colors)
  }

  setColors(colors) {
    if (!Array.isArray(colors) || !colors.length) return
    const parsed = colors.map(c => c instanceof Color ? c : new Color(c))
    for (let i = 0; i < this.count; i++) this.setColorAt(i, parsed[i % parsed.length])
    if (this.instanceColor) this.instanceColor.needsUpdate = true
  }

  update(deltaInfo) {
    this.physics.update(deltaInfo)
    for (let i = 0; i < this.count; i++) {
      _dummy.position.fromArray(this.physics.positionData, 3 * i)
      _dummy.scale.setScalar(this.physics.sizeData[i])
      _dummy.updateMatrix()
      this.setMatrixAt(i, _dummy.matrix)
    }
    this.instanceMatrix.needsUpdate = true
    if (this.config.controlSphere0) this.light.position.fromArray(this.physics.positionData, 0)
  }
}

// ── Pointer tracking ─────────────────────────────────────────────────────────
const pointer = new Vector2()

// ── Component ────────────────────────────────────────────────────────────────
export default function GlobalBackground() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const config = {
      count: 100,
      materialParams: { metalness: 0.9, roughness: 0.15, clearcoat: 1, clearcoatRoughness: 0.1 },
      colors: ['#0a0a0a', '#111111', '#1a1a1a', '#0f0f0f', '#141414', '#080808', '#161616', '#0d0d0d'],
      minSize: 0.25, maxSize: 0.65, size0: 0.9,
      gravity: 0.35, friction: 0.995, wallBounce: 0.3, maxVelocity: 0.08,
      maxX: 10, maxY: 10, maxZ: 8,
      controlSphere0: true,
      lightIntensity: 4, ambientIntensity: 1.2,
    }

    const three = new ThreeBase({ canvas })
    three.renderer.toneMapping = ACESFilmicToneMapping
    three.camera.position.set(0, 0, 20)

    const spheres = new SphereCloud(three.renderer, config)
    three.scene.add(spheres)

    const raycaster    = new Raycaster()
    const plane        = new Plane(new Vector3(0, 0, 1), 0)
    const intersection = new Vector3()

    function onPointerMove(e) {
      pointer.set(
        (e.clientX / window.innerWidth)  *  2 - 1,
       -(e.clientY / window.innerHeight) *  2 + 1,
      )
    }
    window.addEventListener('pointermove', onPointerMove, { passive: true })

    three.onBeforeRender = (deltaInfo) => {
      raycaster.setFromCamera(pointer, three.camera)
      if (raycaster.ray.intersectPlane(plane, intersection)) {
        spheres.physics.center.copy(intersection)
      }
      spheres.update(deltaInfo)
    }

    three.onAfterResize = (size) => {
      spheres.physics.config.maxX = size.wWidth  / 2
      spheres.physics.config.maxY = size.wHeight / 2
      spheres.physics.config.maxZ = size.wWidth  / 4
    }

    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      three.dispose()
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        zIndex: 1,
        pointerEvents: 'none',
        display: 'block',
        WebkitMaskImage: 'linear-gradient(to bottom, black 40%, transparent 90%)',
        maskImage:       'linear-gradient(to bottom, black 40%, transparent 90%)',
      }}
    />
  )
}
