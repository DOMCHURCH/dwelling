import { useEffect, useRef } from 'react'

const FLAME_FRAG = `
precision highp float;
varying vec2 vTextureCoord;
uniform sampler2D uSampler;
uniform sampler2D mapSampler;
uniform vec4 filterArea;
uniform vec2 dimensions;
uniform float time;

float rand(vec2 co) {
  return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
}

mat2 rotz(float angle) {
  mat2 m;
  m[0][0] = cos(angle); m[0][1] = -sin(angle);
  m[1][0] = sin(angle); m[1][1] =  cos(angle);
  return m;
}

float fbm(vec2 uv) {
  float n  = (texture2D(mapSampler, uv       ).r - 0.5) * 0.5;
        n += (texture2D(mapSampler, uv * 2.0 ).r - 0.5) * 0.25;
        n += (texture2D(mapSampler, uv * 3.0 ).r - 0.5) * 0.125;
  return n + 0.5;
}

void main() {
  vec2 uv  = (vTextureCoord * filterArea.xy) / dimensions;
  uv.y     = 1.0 - uv.y;
  vec2 _uv = uv;
  uv      -= vec2(0.5);
  uv.y    /= dimensions.x / dimensions.y;
  vec2 centerUV = uv;

  float variationH = fbm(vec2(time * 0.3)) * 1.1;
  vec2 offset = vec2(0.0, -time * 0.05);
  float f = fbm(uv * 0.1 + offset);
  float l = max(0.1, length(uv));
  uv += rotz(((f - 0.5) / l) * smoothstep(-0.2, 0.4, _uv.y) * 0.45) * uv;

  float flame = 1.3 - length(uv.x) * 5.0;

  float blueflame = pow(flame * 0.9, 15.0);
  blueflame *= smoothstep(0.2, -1.0, _uv.y);
  blueflame /= abs(uv.x * 2.0);
  blueflame  = clamp(blueflame, 0.0, 1.0);

  flame *= smoothstep(1.0, variationH * 0.5, _uv.y);
  flame  = clamp(flame, 0.0, 1.0);
  flame  = pow(flame, 3.0);
  flame /= smoothstep(1.1, -0.1, _uv.y);

  vec4 col = mix(vec4(1.0, 1.0, 0.0, 0.0), vec4(1.0, 1.0, 0.6, 0.0), flame);
  col = mix(vec4(1.0, 0.0, 0.0, 0.0), col, smoothstep(0.0, 1.6, flame));
  gl_FragColor = col;

  vec4 bluecolor = mix(vec4(0.0, 0.0, 1.0, 0.0), gl_FragColor, 0.95);
  gl_FragColor = mix(gl_FragColor, bluecolor, blueflame);

  gl_FragColor *= flame;
  gl_FragColor.a = flame;

  float haloSize = 0.5;
  float centerL  = 1.0 - (length(centerUV + vec2(0.0, 0.1)) / haloSize);
  vec4 halo = vec4(0.8, 0.3, 0.3, 0.0) * fbm(vec2(time * 0.035)) * centerL + 0.02;
  vec4 finalCol = mix(halo, gl_FragColor, gl_FragColor.a);
  gl_FragColor = finalCol;

  gl_FragColor *= mix(rand(uv) + rand(uv * 0.45), 1.0, 0.9);
  gl_FragColor = clamp(gl_FragColor, 0.0, 1.0);
}
`

// Minimal vertex shader (PixiJS v5 style, plain WebGL1)
const VERT = `
attribute vec2 aVertexPosition;
attribute vec2 aTextureCoord;
uniform mat3 projectionMatrix;
varying vec2 vTextureCoord;
void main() {
  gl_Position = vec4((projectionMatrix * vec3(aVertexPosition, 1.0)).xy, 0.0, 1.0);
  vTextureCoord = aTextureCoord;
}
`

// Generate a tileable noise texture procedurally — no CDN dependency
function generateNoiseTexture(gl, size = 256) {
  const data = new Uint8Array(size * size * 4)
  for (let i = 0; i < size * size; i++) {
    // Value noise — good enough for FBM
    const x = (i % size) / size
    const y = Math.floor(i / size) / size
    const v = Math.sin(x * 127.1 + y * 311.7) * 43758.5453
    const n = Math.abs(v - Math.floor(v))
    const byte = Math.floor(n * 255)
    data[i * 4 + 0] = byte
    data[i * 4 + 1] = byte
    data[i * 4 + 2] = byte
    data[i * 4 + 3] = 255
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
  const startRef  = useRef(Date.now())

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
    if (!gl) { console.warn('[GlobalBackground] WebGL not available'); return }

    // ── Compile shaders ──────────────────────────────────────────────────────
    const compile = (type, src) => {
      const sh = gl.createShader(type)
      gl.shaderSource(sh, src)
      gl.compileShader(sh)
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        console.error('[GlobalBackground] shader error:', gl.getShaderInfoLog(sh))
        return null
      }
      return sh
    }

    // The flame frag uses vTextureCoord and filterArea/dimensions uniforms
    // We need a simple pass-through vert that sets vTextureCoord
    const vertSrc = `
      attribute vec2 a_pos;
      varying vec2 vTextureCoord;
      void main() {
        vTextureCoord = a_pos * 0.5 + 0.5;
        gl_Position   = vec4(a_pos, 0.0, 1.0);
      }
    `

    const vs = compile(gl.VERTEX_SHADER, vertSrc)
    const fs = compile(gl.FRAGMENT_SHADER, FLAME_FRAG)
    if (!vs || !fs) return

    const prog = gl.createProgram()
    gl.attachShader(prog, vs)
    gl.attachShader(prog, fs)
    gl.linkProgram(prog)
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error('[GlobalBackground] link error:', gl.getProgramInfoLog(prog))
      return
    }

    // ── Full-screen quad ─────────────────────────────────────────────────────
    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,1,-1,-1,1,1,1,-1]), gl.STATIC_DRAW)

    const posLoc  = gl.getAttribLocation(prog, 'a_pos')
    const timeLoc = gl.getUniformLocation(prog, 'time')
    const dimLoc  = gl.getUniformLocation(prog, 'dimensions')
    const areaLoc = gl.getUniformLocation(prog, 'filterArea')
    const mapLoc  = gl.getUniformLocation(prog, 'mapSampler')

    // ── Noise texture ────────────────────────────────────────────────────────
    const noiseTex = generateNoiseTexture(gl, 256)

    // ── Resize ───────────────────────────────────────────────────────────────
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
      canvas.width  = canvas.clientWidth  * dpr
      canvas.height = canvas.clientHeight * dpr
      gl.viewport(0, 0, canvas.width, canvas.height)
    }

    let paused = false
    const onVis = () => { paused = document.hidden }

    window.addEventListener('resize', resize, { passive: true })
    document.addEventListener('visibilitychange', onVis)
    resize()

    // ── Render loop ──────────────────────────────────────────────────────────
    const render = () => {
      rafRef.current = requestAnimationFrame(render)
      if (paused) return

      const t = (Date.now() - startRef.current) * 0.001
      const w = canvas.width
      const h = canvas.height

      gl.clear(gl.COLOR_BUFFER_BIT)
      gl.useProgram(prog)

      gl.bindBuffer(gl.ARRAY_BUFFER, buf)
      gl.enableVertexAttribArray(posLoc)
      gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0)

      gl.uniform1f(timeLoc, t)
      gl.uniform2f(dimLoc, w, h)
      gl.uniform4f(areaLoc, w, h, 0, 0) // filterArea.xy = dimensions

      // Bind noise texture to unit 1
      gl.activeTexture(gl.TEXTURE1)
      gl.bindTexture(gl.TEXTURE_2D, noiseTex)
      gl.uniform1i(mapLoc, 1)

      gl.enable(gl.BLEND)
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)

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
      // Fade to transparent at bottom so rest of page stays dark
      WebkitMaskImage: 'linear-gradient(to bottom, black 40%, transparent 100%)',
      maskImage: 'linear-gradient(to bottom, black 40%, transparent 100%)',
    }}>
      <canvas
        ref={canvasRef}
        style={{ display: 'block', width: '100%', height: '100%' }}
      />
    </div>
  )
}
