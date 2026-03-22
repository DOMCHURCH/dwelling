import { useEffect, useRef } from 'react'

export default function GlobalBackground() {
  const containerRef = useRef(null)
  const sceneRef = useRef(null)

  useEffect(() => {
    if (window.THREE) {
      init()
      return cleanup
    }

    const script = document.createElement('script')
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js'
    script.onload = () => { if (containerRef.current) init() }
    document.head.appendChild(script)
    sceneRef.current = { _script: script }

    return cleanup
  }, [])

  function init() {
    const THREE = window.THREE
    const container = containerRef.current
    if (!container || !THREE) return

    const SEPARATION = 150
    const AMOUNTX = 40
    const AMOUNTY = 60

    const scene = new THREE.Scene()

    const camera = new THREE.PerspectiveCamera(60, container.offsetWidth / container.offsetHeight, 1, 10000)
    camera.position.set(0, 355, 1220)

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
    renderer.setSize(container.offsetWidth, container.offsetHeight)
    renderer.setClearColor(0x000000, 0)
    container.appendChild(renderer.domElement)

    const positions = []
    const colors = []

    for (let ix = 0; ix < AMOUNTX; ix++) {
      for (let iy = 0; iy < AMOUNTY; iy++) {
        positions.push(
          ix * SEPARATION - (AMOUNTX * SEPARATION) / 2,
          0,
          iy * SEPARATION - (AMOUNTY * SEPARATION) / 2
        )
        colors.push(1, 1, 1)
      }
    }

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))

    const material = new THREE.PointsMaterial({
      size: 6,
      vertexColors: true,
      transparent: true,
      opacity: 0.25,
      sizeAttenuation: true,
    })

    const points = new THREE.Points(geometry, material)
    scene.add(points)

    let count = 0
    let animationId = null

    const animate = () => {
      animationId = requestAnimationFrame(animate)
      if (sceneRef.current) sceneRef.current._animId = animationId

      const posAttr = geometry.attributes.position
      const pos = posAttr.array

      let i = 0
      for (let ix = 0; ix < AMOUNTX; ix++) {
        for (let iy = 0; iy < AMOUNTY; iy++) {
          pos[i * 3 + 1] =
            Math.sin((ix + count) * 0.3) * 50 +
            Math.sin((iy + count) * 0.5) * 50
          i++
        }
      }

      posAttr.needsUpdate = true
      renderer.render(scene, camera)
      count += 0.07
    }

    animate()

    const handleResize = () => {
      camera.aspect = container.offsetWidth / container.offsetHeight
      camera.updateProjectionMatrix()
      renderer.setSize(container.offsetWidth, container.offsetHeight)
    }
    window.addEventListener('resize', handleResize)

    sceneRef.current = {
      scene,
      renderer,
      geometry,
      material,
      handleResize,
      _animId: animationId,
      _script: sceneRef.current?._script,
    }
  }

  function cleanup() {
    const s = sceneRef.current
    if (!s) return
    if (s._animId) cancelAnimationFrame(s._animId)
    if (s.handleResize) window.removeEventListener('resize', s.handleResize)
    if (s.geometry) s.geometry.dispose()
    if (s.material) s.material.dispose()
    if (s.renderer) s.renderer.dispose()
    if (s._script && document.head.contains(s._script)) document.head.removeChild(s._script)
  }

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '100vh',
        zIndex: 0,
        pointerEvents: 'none',
        WebkitMaskImage: 'linear-gradient(to bottom, black 0%, black 50%, transparent 90%)',
        maskImage: 'linear-gradient(to bottom, black 0%, black 50%, transparent 90%)',
      }}
    />
  )
}
