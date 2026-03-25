import { useEffect, useRef } from 'react'

// Plain WebGL1 — no PixiJS, no CDN dependency
// Flame shader ported from @kuvkar (shadertoy.com/view/4tXXRn)
// Flipped upside down, made wider

const VERT = `
attribute vec2 a_pos;
void main() {
  gl_Position = vec4(a_pos, 0.0, 1.0);
}
`

const FRAG = `
precision highp float;
uniform vec2  u_res;
uniform float u_time;
uniform sampler2D u_noise;

float rand(vec2 co) {
  return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
}

mat2 rotz(float a) {
  return mat2(cos(a), -sin(a), sin(a), cos(a));
}

float fbm(vec2 uv) {
  float n  = (texture2D(u_noise, uv      ).r - 0.5) * 0.5;
        n += (texture2D(u_noise, uv * 2.0).r - 0.5) * 0.25;
        n += (texture2D(u_noise, uv * 3.0).r - 0.5) * 0.125;
  return n + 0.5;
}

void main() {
  // _uv: 0..1 from top-left
  vec2 _uv = gl_FragCoord.xy / u_res;
  // FLIP: invert y so flame origin is at top, drips downward
  _uv.y = 1.0 - _uv.y;

  vec2 uv = _uv - vec2(0.5);
  float aspect = u_res.x / u_res.y;
  // wider: divide x by 0.35 instead of aspect
  uv.x /= 0.35;
  uv.y /= aspect;

  vec2 centerUV = uv;

  float variationH = fbm(vec2(u_time * 0.3)) * 1.1;
  // downward drip: positive y offset
  vec2 offset = vec2(0.0, u_time * 0.05);
  float f = fbm(uv * 0.1 + offset);
  float l = max(0.1, length(uv));
  uv += rotz(((f - 0.5) / l) * smoothstep(0.8, 0.3, _uv.y) * 0.45) * uv;

  float flame = 1.3 - length(uv.x) * 5.0;

  float blueflame = pow(max(0.0, flame * 0.9), 15.0);
  blueflame *= smoothstep(0.8, 2.0, _uv.y);
  blueflame /= max(0.001, abs(uv.x * 2.0));
  blueflame = clamp(blueflame, 0.0, 1.0);

  // flame drips downward from top (_uv.y=0 is top after flip)
  flame *= smoothstep(0.0, variationH * 0.5, 1.0 - _uv.y);
  flame  = clamp(flame, 0.0, 1.0);
  flame  = pow(flame, 3.0);
  flame /= max(0.001, smoothstep(-0.1, 1.1, _uv.y));
  flame  = clamp(flame, 0.0, 1.0);

  // colors: yellow core → red → orange
  vec3 col = mix(vec3(1.0, 1.0, 0.0), vec3(1.0, 1.0, 0.6), flame);
  col = mix(vec3(1.0, 0.0, 0.0), col, smoothstep(0.0, 1.6, flame));

  // blue tinge at base (top of screen after flip)
  vec3 blue = mix(vec3(0.0, 0.0, 1.0), col, 0.95);
  col = mix(col, blue, blueflame);

  col *= flame;

  // red halo glow
  float haloSize = 0.5;
  float centerL  = 1.0 - (length(centerUV + vec2(0.0, -0.1)) / haloSize);
  vec3 halo = vec3(0.8, 0.3, 0.3) * fbm(vec2(u_time * 0.035)) * centerL + 0.02;
  col = mix(halo, col, clamp(flame * 2.0, 0.0, 1.0));

  // subtle noise grain
  col *= mix(rand(uv) + rand(uv * 0.45), 1.0, 0.9);
  col  = clamp(col, 0.0, 1.0);

  gl_FragColor = vec4(col, 1.0);
}
`

// Procedural noise texture — tileable value noise
function makeNoiseTex(gl, size) {
  const data = new Uint8Array(size * size * 4)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4
      // smooth value noise via sin hash
      const v = Math.sin(x * 127.1 + y * 311.7) * 43758.5453
      const n = Math.abs(v - Math.floor(v))
      const b = Math.floor(n * 255)
      data[i] = data[i+1] = data[i+2] = b
      data[i+3] = 255
    }
  }
  const tex = gl.createTexture()
  gl.bindTexture(gl.TEXTURE_2D, tex)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, size, size, 0, gl.RGBA, gl.UNSIGNED_BYTE, data)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
  return tex
}

export default function GlobalBackground() {
  const canvasRef = useRef(null)
  const rafRef    = useRef(null)
  const t0Ref     = useRef(Date.now())

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
    if (!gl) return

    // compile
    const compile = (type, src) => {
      const s = gl.createShader(type)
      gl.shaderSource(s, src)
      gl.compileShader(s)
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(s)); return null
      }
      return s
    }
    const vs = compile(gl.VERTEX_SHADER,   VERT)
    const fs = compile(gl.FRAGMENT_SHADER, FRAG)
    if (!vs || !fs) return

    const prog = gl.createProgram()
    gl.attachShader(prog, vs); gl.attachShader(prog, fs)
    gl.linkProgram(prog)
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error(gl.getProgramInfoLog(prog)); return
    }

    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,1,-1,-1,1,1,1,-1]), gl.STATIC_DRAW)

    const posLoc   = gl.getAttribLocation(prog,  'a_pos')
    const resLoc   = gl.getUniformLocation(prog,  'u_res')
    const timeLoc  = gl.getUniformLocation(prog,  'u_time')
    const noiseLoc = gl.getUniformLocation(prog,  'u_noise')

    const noiseTex = makeNoiseTex(gl, 256)

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
      canvas.width  = canvas.clientWidth  * dpr
      canvas.height = canvas.clientHeight * dpr
      gl.viewport(0, 0, canvas.width, canvas.height)
    }
    window.addEventListener('resize', resize, { passive: true })
    resize()

    let paused = false
    const onVis = () => { paused = document.hidden }
    document.addEventListener('visibilitychange', onVis)

    const render = () => {
      rafRef.current = requestAnimationFrame(render)
      if (paused) return
      const t = (Date.now() - t0Ref.current) * 0.001

      gl.clearColor(0, 0, 0, 1)
      gl.clear(gl.COLOR_BUFFER_BIT)
      gl.useProgram(prog)
      gl.bindBuffer(gl.ARRAY_BUFFER, buf)
      gl.enableVertexAttribArray(posLoc)
      gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0)
      gl.uniform2f(resLoc, canvas.width, canvas.height)
      gl.uniform1f(timeLoc, t)
      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D, noiseTex)
      gl.uniform1i(noiseLoc, 0)
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    }
    rafRef.current = requestAnimationFrame(render)

    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('resize', resize)
      document.removeEventListener('visibilitychange', onVis)
      gl.deleteProgram(prog)
      gl.deleteTexture(noiseTex)
    }
  }, [])

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0,
      height: '100vh',
      zIndex: 0,
      pointerEvents: 'none',
      WebkitMaskImage: 'linear-gradient(to bottom, black 30%, transparent 100%)',
      maskImage:       'linear-gradient(to bottom, black 30%, transparent 100%)',
    }}>
      <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />
    </div>
  )
}
