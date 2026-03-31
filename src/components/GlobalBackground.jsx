import { useEffect, useRef } from 'react'

const NUM_LINES = 40000

export default function GlobalBackground() {
  const containerRef = useRef(null)
  const stateRef = useRef(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const canvas = document.createElement('canvas')
    canvas.style.width = '100%'
    canvas.style.height = '100%'
    canvas.style.display = 'block'
    container.appendChild(canvas)

    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
    if (!gl) return

    // ── Resize ───────────────────────────────────────────────────────────────
    let cw, ch
    function resize() {
      cw = container.offsetWidth
      ch = container.offsetHeight
      canvas.width = cw
      canvas.height = ch
      gl.viewport(0, 0, cw, ch)
    }
    resize()
    window.addEventListener('resize', resize)

    // ── Shaders ───────────────────────────────────────────────────────────────
    const vsSrc = `
      attribute vec3 vertexPosition;
      uniform mat4 modelViewMatrix;
      uniform mat4 perspectiveMatrix;
      void main(void) {
        gl_Position = perspectiveMatrix * modelViewMatrix * vec4(vertexPosition, 1.0);
      }
    `
    const fsSrc = `
      #ifdef GL_ES
      precision highp float;
      #endif
      void main(void) {
        gl_FragColor = vec4(0.18, 0.28, 0.42, 0.85);
      }
    `

    function compileShader(type, src) {
      const s = gl.createShader(type)
      gl.shaderSource(s, src)
      gl.compileShader(s)
      return s
    }

    const vs = compileShader(gl.VERTEX_SHADER, vsSrc)
    const fs = compileShader(gl.FRAGMENT_SHADER, fsSrc)
    const program = gl.createProgram()
    gl.attachShader(program, vs)
    gl.attachShader(program, fs)
    gl.linkProgram(program)
    gl.useProgram(program)

    const vertexPosition = gl.getAttribLocation(program, 'vertexPosition')
    gl.enableVertexAttribArray(vertexPosition)

    gl.clearColor(0.0, 0.0, 0.0, 0.0)
    gl.enable(gl.BLEND)
    gl.disable(gl.DEPTH_TEST)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE)

    // ── Perspective ───────────────────────────────────────────────────────────
    const fov = 30.0, near = 1.0, far = 10000.0
    const top2 = near * Math.tan(fov * Math.PI / 360.0)
    const bottom2 = -top2
    const ar = canvas.width / canvas.height
    const right2 = top2 * ar, left2 = -right2
    const pa = (right2 + left2) / (right2 - left2)
    const pb = (top2 + bottom2) / (top2 - bottom2)
    const pc = (far + near) / (far - near)  // corrected sign
    const pd = (2 * far * near) / (far - near)  // corrected sign
    const px2 = (2 * near) / (right2 - left2)
    const py2 = (2 * near) / (top2 - bottom2)
    const perspMatrix = new Float32Array([px2,0,pa,0, 0,py2,pb,0, 0,0,pc,pd, 0,0,-1,0])
    const mvMatrix = new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1])

    const uMV = gl.getUniformLocation(program, 'modelViewMatrix')
    const uP  = gl.getUniformLocation(program, 'perspectiveMatrix')
    gl.uniformMatrix4fv(uMV, false, perspMatrix)
    gl.uniformMatrix4fv(uP,  false, mvMatrix)

    // ── Particle data ─────────────────────────────────────────────────────────
    const vertices     = new Float32Array(NUM_LINES * 2 * 3)
    const thetaArr     = new Float32Array(NUM_LINES)
    const velThetaArr  = new Float32Array(NUM_LINES)
    const velRadArr    = new Float32Array(NUM_LINES)
    const randomTargetX = new Float32Array(NUM_LINES)
    const randomTargetY = new Float32Array(NUM_LINES)

    for (let i = 0; i < NUM_LINES; i++) {
      const rad   = 0.1 + 0.2 * Math.random()
      const theta = Math.random() * Math.PI * 2
      const vt    = Math.random() * Math.PI * 2 / 30
      const bp    = i * 6
      vertices[bp]     = rad * Math.cos(theta)
      vertices[bp + 1] = rad * Math.sin(theta)
      vertices[bp + 2] = 1.83
      vertices[bp + 3] = vertices[bp]
      vertices[bp + 4] = vertices[bp + 1]
      vertices[bp + 5] = 1.83
      thetaArr[i]    = theta
      velThetaArr[i] = vt
      velRadArr[i]   = rad
      randomTargetX[i] = (Math.random() * 2 - 1) * (cw / ch)
      randomTargetY[i] = Math.random() * 2 - 1
    }

    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.DYNAMIC_DRAW)
    gl.vertexAttribPointer(vertexPosition, 3, gl.FLOAT, false, 0, 0)

    // ── Draw modes ────────────────────────────────────────────────────────────
    let drawType = 2
    let cn = 0

    function draw0() {
      for (let i = 0; i < NUM_LINES; i++) {
        const bp = i * 6
        vertices[bp]     = vertices[bp + 3]
        vertices[bp + 1] = vertices[bp + 4]
        let px = vertices[bp + 3]
        let py = vertices[bp + 4]
        px += (randomTargetX[i] - px) * (Math.random() * 0.04 + 0.06)
        py += (randomTargetY[i] - py) * (Math.random() * 0.04 + 0.06)
        vertices[bp + 3] = px
        vertices[bp + 4] = py
      }
    }

    function draw1() {
      for (let i = 0; i < NUM_LINES; i++) {
        const bp = i * 6
        vertices[bp]     = vertices[bp + 3]
        vertices[bp + 1] = vertices[bp + 4]
        thetaArr[i] += velThetaArr[i]
        const tx = velRadArr[i] * Math.cos(thetaArr[i])
        const ty = velRadArr[i] * Math.sin(thetaArr[i])
        let px = vertices[bp + 3]
        let py = vertices[bp + 4]
        px += (tx - px) * (Math.random() * 0.1 + 0.1)
        py += (ty - py) * (Math.random() * 0.1 + 0.1)
        vertices[bp + 3] = px
        vertices[bp + 4] = py
      }
    }

    function draw2() {
      cn += 0.1
      for (let i = 0; i < NUM_LINES; i++) {
        const bp = i * 6
        vertices[bp]     = vertices[bp + 3]
        vertices[bp + 1] = vertices[bp + 4]
        thetaArr[i] += velThetaArr[i]
        vertices[bp + 3] += velRadArr[i] * Math.cos(thetaArr[i]) * 0.1
        vertices[bp + 4] += velRadArr[i] * Math.sin(thetaArr[i]) * 0.1
      }
    }

    // ── Animation loop ────────────────────────────────────────────────────────
    let animId = null
    let timerHandle = null

    function renderLoop() {
      animId = requestAnimationFrame(renderLoop)
      switch (drawType) {
        case 0: draw0(); break
        case 1: draw1(); break
        case 2: draw2(); break
      }
      gl.lineWidth(1)
      gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.DYNAMIC_DRAW)
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
      gl.drawArrays(gl.LINES, 0, NUM_LINES)
      gl.flush()
    }

    function cycleMode() {
      drawType = (drawType + 1) % 3
      timerHandle = setTimeout(cycleMode, 1500)
    }

    renderLoop()
    timerHandle = setTimeout(cycleMode, 1500)

    stateRef.current = { animId, timerHandle }

    return () => {
      if (animId) cancelAnimationFrame(animId)
      if (timerHandle) clearTimeout(timerHandle)
      window.removeEventListener('resize', resize)
      gl.deleteBuffer(buf)
      gl.deleteProgram(program)
      if (container.contains(canvas)) container.removeChild(canvas)
    }
  }, [])

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: -1,
        pointerEvents: 'none',
        overflow: 'hidden',
        WebkitMaskImage: 'linear-gradient(to bottom, black 40%, transparent 100%)',
        maskImage: 'linear-gradient(to bottom, black 40%, transparent 100%)',
      }}
    />
  )
}
