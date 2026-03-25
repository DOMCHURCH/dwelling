import { useEffect, useRef } from 'react'

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

float random (vec2 st) {
  return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
}

float noise(vec2 st) {
  vec2 i = floor(st);
  vec2 f = fract(st);
  float a = random(i);
  float b = random(i + vec2(1.0, 0.0));
  float c = random(i + vec2(0.0, 1.0));
  float d = random(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(vec2 st, int octaves, float persistence, float lacunarity) {
  float value = 0.0;
  float amplitude = 0.5;
  float frequency = 4.0;
  for(int i = 0; i < 5; i++) {
    if(i >= octaves) break;
    value += amplitude * noise(st * frequency);
    amplitude *= persistence;
    frequency *= lacunarity;
  }
  return value;
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_res;
  
  // Create brick fireplace structure at bottom
  float brickHeight = 0.35;
  float isBrickArea = step(uv.y, brickHeight);
  
  // Brick pattern
  vec2 brickUV = uv;
  brickUV.x *= 8.0;
  brickUV.y *= 12.0;
  
  float brickRow = floor(brickUV.y);
  float brickOffset = mod(brickRow, 2.0) * 0.5;
  vec2 brickCoord = fract(vec2(brickUV.x + brickOffset, brickUV.y));
  
  float brick = step(brickCoord.x, 0.9) * step(brickCoord.y, 0.75);
  float mortar = 1.0 - brick;
  
  vec3 brickColor = vec3(0.55, 0.28, 0.18);
  vec3 mortarColor = vec3(0.25, 0.2, 0.18);
  
  vec3 fireplaceColor = mix(mortarColor, brickColor, brick);
  fireplaceColor += vec3(0.1, 0.05, 0.02) * sin(uv.x * 30.0) * step(uv.y, brickHeight);
  
  // Fireplace opening (arch shape)
  float archX = abs(uv.x - 0.5) * 2.0;
  float archY = (uv.y - 0.05) / 0.45;
  
  float archShape = 0.0;
  if(uv.y > 0.05 && uv.y < 0.5) {
    float archCurve = 1.0 - pow(archX, 1.5);
    archShape = smoothstep(0.6, 0.95, archCurve) * smoothstep(0.0, 0.8, archY);
    archShape *= (1.0 - smoothstep(0.7, 1.0, archY));
  }
  
  // Fire area mask
  float fireMask = 0.0;
  if(uv.y > 0.08 && uv.y < 0.48) {
    float fireWidth = 0.7 * (1.0 - (uv.y - 0.08) / 0.45);
    fireMask = 1.0 - smoothstep(fireWidth * 0.6, fireWidth, abs(uv.x - 0.5) * 1.8);
    fireMask *= smoothstep(0.0, 0.3, (uv.y - 0.08) / 0.45);
    fireMask *= (1.0 - smoothstep(0.7, 1.0, (uv.y - 0.08) / 0.45));
  }
  
  // Flame effects
  float time = u_time * 2.5;
  vec2 fireUV = vec2(uv.x * 3.0 - 1.5, uv.y * 4.0 - time);
  
  // Multiple layers of fire noise
  float fire1 = fbm(fireUV, 3, 0.5, 2.0);
  float fire2 = fbm(fireUV * 2.5 + vec2(1.2, 0.0), 2, 0.6, 2.2);
  float fire3 = fbm(fireUV * 5.0 - vec2(0.5, time * 0.5), 2, 0.7, 2.0);
  
  float fireIntensity = (fire1 * 0.6 + fire2 * 0.3 + fire3 * 0.1) * fireMask;
  
  // Flickering effect
  float flicker = 0.7 + 0.3 * sin(time * 15.0) + 0.15 * sin(time * 37.0);
  fireIntensity *= flicker;
  
  // Add some embers flying up
  float embers = 0.0;
  for(float i = 0.0; i < 5.0; i++) {
    float t = time * 2.0 + i * 2.5;
    vec2 emberUV = vec2(
      uv.x * 8.0 + sin(t * 1.3) * 0.5,
      uv.y * 12.0 - t * 1.8 + i * 1.2
    );
    float emberNoise = fract(sin(dot(floor(emberUV * 10.0), vec2(12.9898, 78.233))) * 43758.5453);
    float emberAlpha = smoothstep(0.2, 0.8, emberNoise) * (1.0 - uv.y * 1.5);
    emberAlpha *= step(uv.y, 0.45) * step(0.08, uv.y);
    embers += emberAlpha * 0.3;
  }
  
  // Logs at bottom of fire
  float logs = 0.0;
  if(uv.y < 0.15 && uv.y > 0.05 && abs(uv.x - 0.5) < 0.4) {
    float logPattern = sin(uv.x * 35.0) * 0.5 + 0.5;
    logs = (1.0 - smoothstep(0.05, 0.12, abs(uv.y - 0.1))) * logPattern;
    logs *= step(uv.y, 0.13);
  }
  
  // Fire colors
  vec3 fireColor;
  if(fireIntensity > 0.7) {
    fireColor = vec3(1.0, 0.9, 0.4); // White hot core
  } else if(fireIntensity > 0.4) {
    fireColor = vec3(1.0, 0.6, 0.1); // Orange
  } else {
    fireColor = vec3(0.8, 0.2, 0.05); // Red
  }
  
  fireColor = mix(fireColor, vec3(1.0, 0.3, 0.05), fire2);
  fireColor *= (0.8 + fire3 * 0.5);
  
  // Add ember glow
  fireColor += vec3(1.0, 0.5, 0.2) * embers;
  
  // Glow effect around fire
  float glow = fireIntensity * 0.6 * (1.0 - abs(uv.x - 0.5) * 1.2);
  glow *= smoothstep(0.0, 0.3, (uv.y - 0.08) / 0.45);
  
  // Combine all elements
  vec3 finalColor = fireplaceColor * (1.0 - archShape);
  finalColor += fireColor * fireIntensity;
  finalColor += vec3(1.0, 0.4, 0.1) * glow * 0.5;
  finalColor += vec3(0.4, 0.2, 0.05) * logs;
  
  // Add some smoke rising (very subtle)
  if(uv.y > 0.35 && uv.y < 0.6 && abs(uv.x - 0.5) < 0.25) {
    float smokeNoise = fbm(vec2(uv.x * 5.0, uv.y * 3.0 - time * 0.5), 2, 0.5, 2.0);
    float smokeAlpha = smokeNoise * 0.15 * (1.0 - (uv.y - 0.35) / 0.25);
    finalColor += vec3(0.2, 0.15, 0.1) * smokeAlpha;
  }
  
  // Slight vignette effect
  float vignette = 1.0 - length(uv - 0.5) * 0.3;
  finalColor *= vignette;
  
  gl_FragColor = vec4(finalColor, 1.0);
}
`

function makeNoiseTex(gl, size) {
  const data = new Uint8Array(size * size * 4)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4
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

export default function Fireplace() {
  const canvasRef = useRef(null)
  const rafRef = useRef(null)
  const t0Ref = useRef(Date.now())

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
    if (!gl) {
      console.error('WebGL not supported')
      return
    }

    const compile = (type, src) => {
      const s = gl.createShader(type)
      gl.shaderSource(s, src)
      gl.compileShader(s)
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(s))
        return null
      }
      return s
    }

    const vs = compile(gl.VERTEX_SHADER, VERT)
    const fs = compile(gl.FRAGMENT_SHADER, FRAG)
    if (!vs || !fs) return

    const prog = gl.createProgram()
    gl.attachShader(prog, vs)
    gl.attachShader(prog, fs)
    gl.linkProgram(prog)
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error(gl.getProgramInfoLog(prog))
      return
    }

    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,1,-1,-1,1,1,1,-1]), gl.STATIC_DRAW)

    const posLoc = gl.getAttribLocation(prog, 'a_pos')
    const resLoc = gl.getUniformLocation(prog, 'u_res')
    const timeLoc = gl.getUniformLocation(prog, 'u_time')
    const noiseLoc = gl.getUniformLocation(prog, 'u_noise')

    const noiseTex = makeNoiseTex(gl, 256)

    const resize = () => {
      const width = canvas.clientWidth
      const height = canvas.clientHeight
      canvas.width = width
      canvas.height = height
      gl.viewport(0, 0, width, height)
    }
    
    window.addEventListener('resize', resize)
    resize()

    let paused = false
    document.addEventListener('visibilitychange', () => {
      paused = document.hidden
    })

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
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
      }
      window.removeEventListener('resize', resize)
      if (gl) {
        gl.deleteProgram(prog)
        gl.deleteTexture(noiseTex)
        gl.deleteBuffer(buf)
        gl.deleteShader(vs)
        gl.deleteShader(fs)
      }
    }
  }, [])

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      height: '400px', // Fixed height for fireplace
      zIndex: 10,
      pointerEvents: 'none',
      boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
    }}>
      <canvas 
        ref={canvasRef} 
        style={{ 
          display: 'block', 
          width: '100%', 
          height: '100%',
          objectFit: 'cover',
        }} 
      />
    </div>
  )
}
