import { useEffect, useRef } from 'react'

// Glassy metaball shader — WebGL1/2 compatible
// Falls back gracefully if WebGL unavailable
const VERT = `
attribute vec2 a_position;
void main() { gl_Position = vec4(a_position, 0.0, 1.0); }
`

const FRAG = `
precision highp float;
uniform float u_time;
uniform vec2  u_resolution;
uniform vec2  u_mouse;

float sdCircle(vec2 p, float r) { return length(p) - r; }

float opSmoothUnion(float d1, float d2, float k) {
  float h = clamp(0.5 + 0.5 * (d2 - d1) / k, 0.0, 1.0);
  return mix(d2, d1, h) - k * h * (1.0 - h);
}

float scene(vec2 uv, float t) {
  vec2 p1 = vec2(cos(t * 0.7) * 0.45, sin(t * 0.5) * 0.25);
  float c1 = sdCircle(uv - p1, 0.22);

  vec2 p2 = vec2(cos(t * 0.7 + 3.14159) * 0.45, sin(t * 0.5 + 3.14159) * 0.25);
  float c2 = sdCircle(uv - p2, 0.18);

  vec2 p3 = vec2(sin(t * 0.4) * 0.3, cos(t * 0.9) * 0.35);
  float c3 = sdCircle(uv - p3, 0.14);

  float u = opSmoothUnion(c1, c2, 0.22);
  return opSmoothUnion(u, c3, 0.18);
}

void main() {
  vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / u_resolution.y;

  // Subtle mouse influence
  vec2 mouse = (u_mouse / u_resolution - 0.5) * vec2(2.0, -2.0);
  uv += mouse * 0.04;

  float t = u_time * 0.4;
  float d = scene(uv, t);

  // Glow ring around the metaballs
  float glow = exp(-8.0 * abs(d));

  // Dark colour palette — deep navy / teal / indigo
  vec3 col1 = vec3(0.04, 0.06, 0.18);  // deep navy
  vec3 col2 = vec3(0.08, 0.16, 0.28);  // dark teal-blue
  vec3 colGlow = 0.5 + 0.5 * cos(
    u_time * 0.25 + uv.x * 0.8 + vec3(0.0, 0.6, 1.2)
  );
  // Keep glow colours very dark / subtle
  colGlow = mix(col1, col2, colGlow) * 1.6;

  // Inside the blob: slightly lighter dark
  float inside = smoothstep(0.01, -0.02, d);
  vec3 color = mix(col1, col2 * 0.7, inside);
  color += colGlow * glow * 0.5;

  // Vignette — darker at edges
  float vignette = 1.0 - smoothstep(0.4, 1.4, length(uv));
  color *= vignette * 0.85;

  // Fade top to transparent so hero content reads clearly
  float fy = gl_FragCoord.y / u_resolution.y;
  float fade = smoothstep(0.0, 0.12, fy) * smoothstep(0.0, 0.18, 1.0 - fy);
  color *= fade;

  gl_FragColor = vec4(color, 1.0);
}
`

export default function GlobalBackground() {
  const canvasRef = useRef(null)
  const rafRef    = useRef(null)
  const mouseRef  = useRef({ x: 0, y: 0 })
  const startRef  = useRef(Date.now())

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    // Try WebGL1 first (widest support), then WebGL2
    const gl = canvas.getContext('webgl') || canvas.getContext('webgl2')
    if (!gl) {
      console.warn('[GlobalBackground] WebGL not available')
      return
    }

    const compile = (type, src) => {
      const sh = gl.createShader(type)
      gl.shaderSource(sh, src)
      gl.compileShader(sh)
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        console.error('[GlobalBackground] shader error:', gl.getShaderInfoLog(sh))
        gl.deleteShader(sh)
        return null
      }
      return sh
    }

    const vs = compile(gl.VERTEX_SHADER, VERT)
    const fs = compile(gl.FRAGMENT_SHADER, FRAG)
    if (!vs || !fs) return

    const prog = gl.createProgram()
    gl.attachShader(prog, vs)
    gl.attachShader(prog, fs)
    gl.linkProgram(prog)
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error('[GlobalBackground] link error:', gl.getProgramInfoLog(prog))
      return
    }

    // Full-screen quad
    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER,
      new Float32Array([-1, 1, -1, -1, 1, 1, 1, -1]),
      gl.STATIC_DRAW
    )

    const posLoc   = gl.getAttribLocation(prog, 'a_position')
    const timeLoc  = gl.getUniformLocation(prog, 'u_time')
    const resLoc   = gl.getUniformLocation(prog, 'u_resolution')
    const mouseLoc = gl.getUniformLocation(prog, 'u_mouse')

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
      canvas.width  = canvas.clientWidth  * dpr
      canvas.height = canvas.clientHeight * dpr
      gl.viewport(0, 0, canvas.width, canvas.height)
    }

    const onMouse = (e) => { mouseRef.current = { x: e.clientX, y: e.clientY } }

    let paused = false
    const onVis = () => { paused = document.hidden }

    window.addEventListener('resize', resize, { passive: true })
    window.addEventListener('mousemove', onMouse, { passive: true })
    document.addEventListener('visibilitychange', onVis)
    resize()

    const render = () => {
      rafRef.current = requestAnimationFrame(render)
      if (paused) return
      const t = (Date.now() - startRef.current) * 0.001
      gl.clear(gl.COLOR_BUFFER_BIT)
      gl.useProgram(prog)
      gl.bindBuffer(gl.ARRAY_BUFFER, buf)
      gl.enableVertexAttribArray(posLoc)
      gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0)
      gl.uniform1f(timeLoc,  t)
      gl.uniform2f(resLoc,   canvas.width, canvas.height)
      gl.uniform2f(mouseLoc, mouseRef.current.x, mouseRef.current.y)
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    }
    rafRef.current = requestAnimationFrame(render)

    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('resize', resize)
      window.removeEventListener('mousemove', onMouse)
      document.removeEventListener('visibilitychange', onVis)
      gl.deleteProgram(prog)
    }
  }, [])

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0,
      height: '100vh',
      zIndex: 0,
      pointerEvents: 'none',
      // Fade out toward bottom so page content below hero stays pure black
      WebkitMaskImage: 'linear-gradient(to bottom, black 50%, transparent 100%)',
      maskImage:       'linear-gradient(to bottom, black 50%, transparent 100%)',
    }}>
      <canvas
        ref={canvasRef}
        style={{ display: 'block', width: '100%', height: '100%' }}
      />
    </div>
  )
}
