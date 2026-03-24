import { useEffect, useRef, useState } from 'react'

export default function GlobalBackground() {
  const canvasRef = useRef(null)
  const frameRef  = useRef(null)
  const mouseRef  = useRef({ x: 0, y: 0 })
  const startRef  = useRef(Date.now())
  const [error, setError] = useState(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl')
    if (!gl) { setError('WebGL not supported'); return }

    const vsSource = `#version 300 es
in vec2 a_position;
void main() { gl_Position = vec4(a_position, 0.0, 1.0); }`

    const fsSource = `#version 300 es
precision highp float;
uniform vec2  u_resolution;
uniform float u_time;
uniform vec2  u_mouse;
uniform float u_cameraSpeed;
uniform float u_tileSize;
uniform float u_unionK;
out vec4 fragColor;

float sdBox(vec3 p, vec3 b) {
  vec3 q = abs(p) - b;
  return length(max(q,0.0)) + min(max(q.x,max(q.y,q.z)),0.0);
}
float opSmoothUnion(float d1, float d2, float k) {
  float h = clamp(0.5+0.5*(d2-d1)/k, 0.0, 1.0);
  return mix(d2,d1,h) - k*h*(1.0-h);
}
float getDist(vec3 p) {
  vec2 id = floor(p.xz/u_tileSize);
  p.xz = mod(p.xz,u_tileSize) - u_tileSize*0.5;
  float n = fract(sin(dot(id,vec2(12.9898,78.233)))*43758.5453);
  float h = 1.0 + n*4.0;
  float b = sdBox(p - vec3(0.0,h-1.0,0.0), vec3(0.4,h,0.4));
  if (n > 0.8) {
    float s = length(p - vec3(0.0,h*2.0,0.0)) - 0.5;
    b = opSmoothUnion(b, s, u_unionK);
  }
  return min(b, p.y+1.0);
}
float rayMarch(vec3 ro, vec3 rd) {
  float dist = 0.0;
  for (int i=0; i<80; i++) {
    float dS = getDist(ro+rd*dist);
    dist += dS;
    if (dist > 80.0 || abs(dS) < 0.001) break;
  }
  return dist;
}
vec3 palette(float t) {
  vec3 a = vec3(0.5), b = vec3(0.5);
  vec3 c = vec3(1.0,1.0,0.5), d = vec3(0.8,0.9,0.3);
  return a + b*cos(6.28318*(c*t+d));
}
void main() {
  vec2 uv = (gl_FragCoord.xy*2.0 - u_resolution.xy) / u_resolution.y;
  vec3 ro = vec3(0.0, 0.0, u_time*u_cameraSpeed);
  vec3 rd = normalize(vec3(uv, 1.0));
  float mx = (u_mouse.x/u_resolution.x - 0.5)*1.2;
  float my = (u_mouse.y/u_resolution.y - 0.5)*0.6;
  mat3 rotX = mat3(1,0,0, 0,cos(my),-sin(my), 0,sin(my),cos(my));
  mat3 rotY = mat3(cos(mx),0,sin(mx), 0,1,0, -sin(mx),0,cos(mx));
  rd = rotY*rotX*rd;
  float dist = rayMarch(ro, rd);
  vec3 col = vec3(0.0);
  if (dist < 80.0) {
    vec3 p = ro + rd*dist;
    float idSeed = floor(p.xz/u_tileSize).x*157.0 + floor(p.xz/u_tileSize).y*311.0;
    float n = fract(sin(idSeed)*43758.5453);
    float lines = abs(fract(p.y*2.0)-0.5);
    float glow  = pow(0.01/max(lines,0.001), 1.5);
    col += palette(n + u_time*0.08) * glow;
  }
  col = mix(col, vec3(0.0,0.0,0.03), smoothstep(0.0,56.0,dist));
  // Fade top and bottom edges
  float fy = gl_FragCoord.y / u_resolution.y;
  col *= smoothstep(0.0, 0.15, fy) * smoothstep(0.0, 0.2, 1.0-fy);
  fragColor = vec4(col, 1.0);
}`

    const compile = (type, src) => {
      const sh = gl.createShader(type)
      gl.shaderSource(sh, src)
      gl.compileShader(sh)
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(sh))
        setError('Shader error')
        return null
      }
      return sh
    }

    const vs = compile(gl.VERTEX_SHADER, vsSource)
    const fs = compile(gl.FRAGMENT_SHADER, fsSource)
    if (!vs || !fs) return

    const prog = gl.createProgram()
    gl.attachShader(prog, vs)
    gl.attachShader(prog, fs)
    gl.linkProgram(prog)
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error(gl.getProgramInfoLog(prog))
      setError('Link error')
      return
    }

    const posLoc   = gl.getAttribLocation(prog, 'a_position')
    const resLoc   = gl.getUniformLocation(prog, 'u_resolution')
    const timeLoc  = gl.getUniformLocation(prog, 'u_time')
    const mouseLoc = gl.getUniformLocation(prog, 'u_mouse')
    const speedLoc = gl.getUniformLocation(prog, 'u_cameraSpeed')
    const tileLoc  = gl.getUniformLocation(prog, 'u_tileSize')
    const unionLoc = gl.getUniformLocation(prog, 'u_unionK')

    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,1,-1,-1,1,1,1,-1]), gl.STATIC_DRAW)

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
      canvas.width  = canvas.clientWidth  * dpr
      canvas.height = canvas.clientHeight * dpr
      gl.viewport(0, 0, canvas.width, canvas.height)
    }
    window.addEventListener('resize', resize)
    resize()

    const onMouse = (e) => { mouseRef.current = { x: e.clientX, y: e.clientY } }
    window.addEventListener('mousemove', onMouse)

    let paused = false
    const onVis = () => { paused = document.hidden }
    document.addEventListener('visibilitychange', onVis)

    const render = () => {
      frameRef.current = requestAnimationFrame(render)
      if (paused) return
      const now = (Date.now() - startRef.current) * 0.001
      gl.clear(gl.COLOR_BUFFER_BIT)
      gl.useProgram(prog)
      gl.enableVertexAttribArray(posLoc)
      gl.bindBuffer(gl.ARRAY_BUFFER, buf)
      gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0)
      gl.uniform2f(resLoc,   canvas.width, canvas.height)
      gl.uniform1f(timeLoc,  now)
      gl.uniform2f(mouseLoc, mouseRef.current.x, mouseRef.current.y)
      gl.uniform1f(speedLoc, 3.5)
      gl.uniform1f(tileLoc,  2.0)
      gl.uniform1f(unionLoc, 0.5)
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    }
    frameRef.current = requestAnimationFrame(render)

    return () => {
      cancelAnimationFrame(frameRef.current)
      window.removeEventListener('resize', resize)
      window.removeEventListener('mousemove', onMouse)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [])

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none',
      WebkitMaskImage: 'linear-gradient(to bottom, black 55%, transparent 100%)',
      maskImage:       'linear-gradient(to bottom, black 55%, transparent 100%)',
    }}>
      <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />
    </div>
  )
}
