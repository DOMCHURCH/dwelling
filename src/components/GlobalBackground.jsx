import { useEffect, useRef } from 'react'

export default function GlobalBackground() {
  const containerRef = useRef(null)
  const sceneRef = useRef({
    camera: null,
    scene: null,
    renderer: null,
    uniforms: null,
    animationId: null,
    onResize: null,
  })

  useEffect(() => {
    // Avoid loading Three.js twice if it's already on the page
    if (window.THREE) {
      init()
      return cleanup
    }

    const script = document.createElement('script')
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/89/three.min.js'
    script.onload = () => { if (containerRef.current) init() }
    document.head.appendChild(script)
    sceneRef.current._script = script

    return cleanup
  }, [])

  function init() {
    const THREE = window.THREE
    const container = containerRef.current
    if (!container || !THREE) return

    container.innerHTML = ''

    const camera = new THREE.Camera()
    camera.position.z = 1

    const scene = new THREE.Scene()
    const geometry = new THREE.PlaneBufferGeometry(2, 2)

    const uniforms = {
      time:       { type: 'f',  value: 1.0 },
      resolution: { type: 'v2', value: new THREE.Vector2() },
    }

    const material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: `
        void main() {
          gl_Position = vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        #define TWO_PI 6.2831853072
        #define PI 3.14159265359

        precision highp float;
        uniform vec2 resolution;
        uniform float time;

        float random(in float x) {
          return fract(sin(x) * 1e4);
        }
        float random(vec2 st) {
          return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
        }

        void main(void) {
          vec2 uv = (gl_FragCoord.xy * 2.0 - resolution.xy) / min(resolution.x, resolution.y);

          vec2 fMosaicScal = vec2(4.0, 2.0);
          vec2 vScreenSize = vec2(256.0, 256.0);
          uv.x = floor(uv.x * vScreenSize.x / fMosaicScal.x) / (vScreenSize.x / fMosaicScal.x);
          uv.y = floor(uv.y * vScreenSize.y / fMosaicScal.y) / (vScreenSize.y / fMosaicScal.y);

          float t = time * 0.06 + random(uv.x) * 0.4;
          float lineWidth = 0.0008;

          vec3 color = vec3(0.0);
          for (int j = 0; j < 3; j++) {
            for (int i = 0; i < 5; i++) {
              color[j] += lineWidth * float(i * i) / abs(fract(t - 0.01 * float(j) + float(i) * 0.01) * 1.0 - length(uv));
            }
          }

          // Darken significantly so Dwelling's content stays readable
          vec3 darkened = color * 0.55;
          gl_FragColor = vec4(darkened[2], darkened[1], darkened[0], 1.0);
        }
      `,
    })

    const mesh = new THREE.Mesh(geometry, material)
    scene.add(mesh)

    const renderer = new THREE.WebGLRenderer()
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
    container.appendChild(renderer.domElement)

    const onResize = () => {
      const rect = container.getBoundingClientRect()
      renderer.setSize(rect.width, rect.height)
      uniforms.resolution.value.x = renderer.domElement.width
      uniforms.resolution.value.y = renderer.domElement.height
    }
    onResize()
    window.addEventListener('resize', onResize)

    const animate = () => {
      sceneRef.current.animationId = requestAnimationFrame(animate)
      uniforms.time.value += 0.05
      renderer.render(scene, camera)
    }
    animate()

    sceneRef.current = { camera, scene, renderer, uniforms, animationId: null, onResize, _script: sceneRef.current._script }
  }

  function cleanup() {
    const { animationId, renderer, onResize, _script } = sceneRef.current
    if (animationId) cancelAnimationFrame(animationId)
    if (renderer) renderer.dispose()
    if (onResize) window.removeEventListener('resize', onResize)
    if (_script && document.head.contains(_script)) document.head.removeChild(_script)
  }

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
        // Fade to black at bottom so Dashboard content isn't affected
        WebkitMaskImage: 'linear-gradient(to bottom, black 0%, black 55%, transparent 85%)',
        maskImage: 'linear-gradient(to bottom, black 0%, black 55%, transparent 85%)',
      }}
    />
  )
}
