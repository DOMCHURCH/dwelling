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
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
    const clock = new THREE.Clock()

    const isMobile = navigator.maxTouchPoints > 0
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: !isMobile })
    renderer.setPixelRatio(isMobile ? 1.0 : Math.min(window.devicePixelRatio, 1.5))
    renderer.setSize(container.offsetWidth, container.offsetHeight)
    renderer.setClearColor(0x000000, 0)
    container.appendChild(renderer.domElement)
    renderer.domElement.style.width = '100%'
    renderer.domElement.style.height = '100%'
    renderer.domElement.style.display = 'block'

    const uniforms = {
      iTime:       { value: 0 },
      iResolution: { value: new THREE.Vector2(container.offsetWidth, container.offsetHeight) },
      iMouse:      { value: new THREE.Vector2(container.offsetWidth / 2, container.offsetHeight / 2) },
    }

    const vertexShader = `
      void main() {
        gl_Position = vec4(position, 1.0);
      }
    `

    // Warp drive tunnel shader — chromatic aberration tunnel effect
    const fragmentShader = `
      precision highp float;
      uniform vec2 iResolution;
      uniform float iTime;
      uniform vec2 iMouse;

      void main() {
        vec2 uv    = (gl_FragCoord.xy - 0.5 * iResolution.xy) / iResolution.y;
        vec2 mouse = (iMouse          - 0.5 * iResolution.xy) / iResolution.y;

        float t = iTime * 0.4;
        uv -= mouse * 0.15;

        float r = length(uv);
        float offset = 0.012;

        vec3 col = vec3(0.0);
        col.r = pow(fract(0.5 / length(uv + vec2(offset, 0.0)) + t * 2.0), 15.0);
        col.g = pow(fract(0.5 / length(uv)                     + t * 2.0), 15.0);
        col.b = pow(fract(0.5 / length(uv - vec2(offset, 0.0)) + t * 2.0), 15.0);

        // Fade edges so it blends with the black background
        float fade = smoothstep(0.0, 0.08, r) * smoothstep(1.2, 0.3, r);
        col *= fade * 0.85;

        gl_FragColor = vec4(col, 1.0);
      }
    `

    const geometry = new THREE.PlaneGeometry(2, 2)
    const material = new THREE.ShaderMaterial({ vertexShader, fragmentShader, uniforms })
    const mesh = new THREE.Mesh(geometry, material)
    scene.add(mesh)

    let paused = false

    const animate = () => {
      if (!sceneRef.current) return
      sceneRef.current._animId = requestAnimationFrame(animate)
      if (paused) return
      uniforms.iTime.value = clock.getElapsedTime()
      renderer.render(scene, camera)
    }
    animate()

    const handleResize = () => {
      if (!container) return
      const w = container.offsetWidth, h = container.offsetHeight
      renderer.setSize(w, h)
      uniforms.iResolution.value.set(w, h)
    }
    window.addEventListener('resize', handleResize)

    const handleMouse = (e) => {
      uniforms.iMouse.value.set(e.clientX, container.offsetHeight - e.clientY)
    }
    window.addEventListener('mousemove', handleMouse)

    const handleVisibility = () => { paused = document.hidden }
    document.addEventListener('visibilitychange', handleVisibility)

    const observer = new IntersectionObserver(
      ([entry]) => { paused = !entry.isIntersecting || document.hidden },
      { threshold: 0 }
    )
    observer.observe(container)

    sceneRef.current = {
      scene, renderer, geometry, material, clock,
      handleResize, handleMouse, handleVisibility, observer,
      _animId: sceneRef.current?._animId,
      _script: sceneRef.current?._script,
    }
  }

  function cleanup() {
    const s = sceneRef.current
    if (!s) return
    if (s._animId) cancelAnimationFrame(s._animId)
    if (s.handleResize)     window.removeEventListener('resize', s.handleResize)
    if (s.handleMouse)      window.removeEventListener('mousemove', s.handleMouse)
    if (s.handleVisibility) document.removeEventListener('visibilitychange', s.handleVisibility)
    if (s.observer)  s.observer.disconnect()
    if (s.geometry)  s.geometry.dispose()
    if (s.material)  s.material.dispose()
    if (s.renderer)  s.renderer.dispose()
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
        // Fade out toward bottom so content sections stay dark
        WebkitMaskImage: 'linear-gradient(to bottom, black 50%, transparent 100%)',
        maskImage:       'linear-gradient(to bottom, black 50%, transparent 100%)',
      }}
    />
  )
}
