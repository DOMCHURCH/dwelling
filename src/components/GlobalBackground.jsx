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

    const scene = new THREE.Scene()
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, -1)

    // FIX 10: 1.0 pixel ratio on mobile, 1.5 cap on desktop
    const isMobile = navigator.maxTouchPoints > 0
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
    renderer.setPixelRatio(isMobile ? 1.0 : Math.min(window.devicePixelRatio, 1.5))
    renderer.setSize(container.offsetWidth, container.offsetHeight)
    renderer.setClearColor(0x000000, 0)
    container.appendChild(renderer.domElement)
    renderer.domElement.style.width = '100%'
    renderer.domElement.style.height = '100%'
    renderer.domElement.style.display = 'block'

    const uniforms = {
      resolution: { value: [container.offsetWidth, container.offsetHeight] },
      time:       { value: 0.0 },
      xScale:     { value: 1.0 },
      yScale:     { value: 0.5 },
      distortion: { value: 0.05 },
    }

    const vertexShader = `
      attribute vec3 position;
      void main() {
        gl_Position = vec4(position, 1.0);
      }
    `

    const fragmentShader = `
      precision highp float;
      uniform vec2 resolution;
      uniform float time;
      uniform float xScale;
      uniform float yScale;
      uniform float distortion;

      void main() {
        vec2 p = (gl_FragCoord.xy * 2.0 - resolution) / min(resolution.x, resolution.y);
        float d = length(p) * distortion;
        float rx = p.x * (1.0 + d);
        float gx = p.x;
        float bx = p.x * (1.0 - d);
        float r = 0.05 / abs(p.y + sin((rx + time) * xScale) * yScale);
        float g = 0.05 / abs(p.y + sin((gx + time) * xScale) * yScale);
        float b = 0.05 / abs(p.y + sin((bx + time) * xScale) * yScale);
        gl_FragColor = vec4(r * 0.6, g * 0.6, b * 0.6, 1.0);
      }
    `

    const positions = new THREE.BufferAttribute(new Float32Array([
      -1.0, -1.0, 0.0,
       1.0, -1.0, 0.0,
      -1.0,  1.0, 0.0,
       1.0, -1.0, 0.0,
      -1.0,  1.0, 0.0,
       1.0,  1.0, 0.0,
    ]), 3)

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', positions)

    const material = new THREE.RawShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms,
      side: THREE.DoubleSide,
    })

    const mesh = new THREE.Mesh(geometry, material)
    scene.add(mesh)

    let animationId = null
    let paused = false

    const animate = () => {
      animationId = requestAnimationFrame(animate)
      if (sceneRef.current) sceneRef.current._animId = animationId
      // FIX 1 & 2: skip GPU work entirely when paused
      if (paused) return
      uniforms.time.value += 0.01
      renderer.render(scene, camera)
    }

    animate()

    const handleResize = () => {
      if (!container) return
      renderer.setSize(container.offsetWidth, container.offsetHeight)
      uniforms.resolution.value = [container.offsetWidth, container.offsetHeight]
    }
    window.addEventListener('resize', handleResize)

    // FIX 2: pause when tab loses focus
    const handleVisibility = () => { paused = document.hidden }
    document.addEventListener('visibilitychange', handleVisibility)

    // FIX 1: pause when hero is scrolled out of view
    const observer = new IntersectionObserver(
      ([entry]) => { paused = !entry.isIntersecting || document.hidden },
      { threshold: 0 }
    )
    observer.observe(container)

    sceneRef.current = {
      scene, renderer, geometry, material,
      handleResize, handleVisibility, observer,
      _animId: animationId,
      _script: sceneRef.current?._script,
    }
  }

  function cleanup() {
    const s = sceneRef.current
    if (!s) return
    if (s._animId) cancelAnimationFrame(s._animId)
    if (s.handleResize) window.removeEventListener('resize', s.handleResize)
    if (s.handleVisibility) document.removeEventListener('visibilitychange', s.handleVisibility)
    if (s.observer) s.observer.disconnect()
    if (s.geometry) s.geometry.dispose()
    if (s.material) s.material.dispose()
    if (s.renderer) s.renderer.dispose()
    if (s._script && document.head.contains(s._script)) document.head.removeChild(s._script)
  }

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
        WebkitMaskImage: 'linear-gradient(to bottom, black 40%, transparent 100%)',
        maskImage: 'linear-gradient(to bottom, black 40%, transparent 100%)',
      }}
    />
  )
}
