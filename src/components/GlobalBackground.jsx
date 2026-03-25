import { useEffect, useRef } from 'react'

const VERT = `
attribute vec2 a_pos;
void main() {
  gl_Position = vec4(a_pos, 0.0, 1.0);
}
`

// Wide fireplace flame — rises from bottom, spreads like a hearth
const FRAG = `
precision highp float;
uniform vec2  u_res;
uniform float u_time;
uniform sampler2D u_noise;

float rand(vec2 co) {
  return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
}

float fbm(vec2 uv) {
  float n  = (texture2D(u_noise, uv       ).r - 0.5) * 0.5;
        n += (texture2D(u_noise, uv * 2.0 ).r - 0.5) * 0.25;
        n += (texture2D(u_noise, uv * 3.0 ).r - 0.5) * 0.125;
        n += (texture2D(u_noise, uv * 6.0 ).r - 0.5) * 0.0625;
  return n + 0.5;
}

void main() {
  // uv: 0..1, origin bottom-left, y increases upward
  vec2 uv = gl_FragCoord.xy / u_res;

  // flame rises from bottom: y=0 is base, y=1 is top
  float y = uv.y;

  // center x around 0, keep wide
  float x = uv.x - 0.5;

  // time-driven upward scroll for turbulence
  float speed = u_time * 0.4;

  // sample noise at multiple scales for organic look
  vec2 noiseUV = vec2(x * 1.0, y * 1.5 - speed);
  float turb = fbm(noiseUV);
  float turb2 = fbm(noiseUV * 2.0 + vec2(0.3, speed * 0.5));

  // warp x position with turbulence — more warp near top
  float warpAmt = 0.15 * (1.0 - y) + 0.08 * y;
  float xWarped = x + (turb - 0.5) * warpAmt * 2.0;

  // fireplace shape: wide at bottom, tapers as it rises
  // base width = 1.0 (full screen), narrows at top
  float baseWidth = 0.82;
  float topWidth  = 0.18;
  float widthAtY  = mix(baseWidth, topWidth, pow(y, 0.6));

  // flame body: 1 inside shape, 0 outside
  float shape = 1.0 - smoothstep(widthAtY * 0.7, widthAtY, abs(xWarped));

  // height falloff — flame fades before reaching top
  // add turbulence to height so edge is ragged
  float heightNoise = fbm(vec2(x * 2.0, speed * 0.8)) * 0.35;
  float maxHeight = 0.65 + heightNoise;
  float heightFade = 1.0 - smoothstep(maxHeight * 0.5, maxHeight, y);

  float flame = shape * heightFade;

  // extra glow at base — always bright across full width
  float baseGlow = smoothstep(0.35, 0.0, y) * smoothstep(0.92, 0.6, abs(x));

  // inner hot core — brighter center band
  float core = (1.0 - smoothstep(0.0, widthAtY * 0.35, abs(xWarped))) * heightFade;
  core = pow(core, 1.5);

  // add flickering via low-freq time noise
  float flicker = 0.85 + 0.15 * fbm(vec2(u_time * 0.8, 0.5));

  flame = clamp(flame * flicker, 0.0, 1.0);
  core  = clamp(core  * flicker, 0.0, 1.0);

  // color layers
  // outer: deep red / dark orange
  vec3 outerColor = vec3(0.6, 0.1, 0.0);
  // mid: bright orange
  vec3 midColor   = vec3(1.0, 0.35, 0.0);
  // inner: yellow-orange
  vec3 coreColor  = vec3(1.0, 0.78, 0.1);
  // base glow: warm amber
  vec3 glowColor  = vec3(0.9, 0.25, 0.0);

  vec3 col = vec3(0.0);
  col = mix(col, outerColor, flame);
  col = mix(col, midColor,   flame * flame);
  col = mix(col, coreColor,  core);
  col += glowColor * baseGlow * 0.7;

  // subtle noise grain
  col *= 0.92 + 0.08 * rand(uv + u_time * 0.01);

  col = clamp(col, 0.0, 1.0);
  gl_FragColor = vec4(col, 1.0);
}
`

function makeNoiseTex(gl, size) {
  const data = new Uint8Array(size * size * 4)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4
      const v = Math.sin(x * 127.1 + y * 311.7) * 43758.5453
      const n = Math.abs(v - Math.floor(v))
      // smoother noise via bilinear-friendly values
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
    gl.attachShader(prog, vs)
    gl.attachShader(prog, fs)
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
    document.addEventListener('visibilitychange', () => { paused = document.hidden })

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
      // fade out toward top so content above is readable
      WebkitMaskImage: 'linear-gradient(to top, black 0%, black 40%, transparent 100%)',
      maskImage:       'linear-gradient(to top, black 0%, black 40%, transparent 100%)',
    }}>
      <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />
    </div>
  )
}
