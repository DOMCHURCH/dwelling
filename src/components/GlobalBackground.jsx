import { useEffect, useRef } from 'react'

const NUM_LINES = 3500 // capped for Vercel free plan performance budget

export default function GlobalBackground() {
  const containerRef = useRef(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // Respect prefers-reduced-motion — skip entirely for accessibility + perf
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const canvas = document.createElement('canvas')
    canvas.style.width = '100%'
    canvas.style.height = '100%'
    canvas.style.display = 'block'
    container.appendChild(canvas)

    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
    if (!gl) return

    // Cap device pixel ratio to 1.5 — prevents 4x overdraw on retina/high-DPR screens
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5)

    let cw, ch
    function resize() {
      cw = container.offsetWidth
      ch = container.offsetHeight
      canvas.width = Math.round(cw * dpr)
      canvas.height = Math.round(ch * dpr)
      gl.viewport(0, 0, canvas.width, canvas.height)
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
    const pc = (far + near) / (far - near)
    const pd = (2 * far * near) / (far - near)
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
      thetaArr[i]      = theta
      velThetaArr[i]   = vt
      velRadArr[i]     = rad
      randomTargetX[i] = (Math.random() * 2 - 1) * (cw / ch)
      randomTargetY[i] = Math.random() * 2 - 1
    }

    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.DYNAMIC_DRAW)
    gl.vertexAttribPointer(vertexPosition, 3, gl.FLOAT, false, 0, 0)

    // ── Cursor state ──────────────────────────────────────────────────────────
    // cursorTarget: WebGL normalized coords (-1 to 1 range matching particle space)
    let cursorTarget = null // null = not attracting
    let attracting = false

    function screenToWebGL(clientX, clientY) {
      const rect = canvas.getBoundingClientRect()
      // Map to -1..1 then scale to match particle coord space
      const nx = ((clientX - rect.left) / rect.width * 2 - 1) * (cw / ch)
      const ny = -((clientY - rect.top) / rect.height * 2 - 1)
      return { x: nx, y: ny }
    }

    function handleClick(e) {
      cursorTarget = screenToWebGL(e.clientX, e.clientY)
      attracting = true
      // Release after 2.5 seconds — particles drift back to normal mode
      if (releaseTimer) clearTimeout(releaseTimer)
      releaseTimer = setTimeout(() => {
        attracting = false
        cursorTarget = null
      }, 2500)
    }

    // Also attract on hold (mousedown/touchstart)
    function handleMouseDown(e) { handleClick(e) }
    function handleTouchStart(e) {
      if (e.touches[0]) handleClick(e.touches[0])
    }

    let releaseTimer = null
    window.addEventListener('click', handleClick)
    window.addEventListener('mousedown', handleMouseDown)
    window.addEventListener('touchstart', handleTouchStart)

    // ── Draw modes ────────────────────────────────────────────────────────────
    let drawType = 2
    let cn = 0
    // Throttle: only update every other frame for perf
    let frameSkip = 0

    function drawAttract() {
      // Pull all particles toward cursor position
      const tx = cursorTarget.x
      const ty = cursorTarget.y
      for (let i = 0; i < NUM_LINES; i++) {
        const bp = i * 6
        vertices[bp]     = vertices[bp + 3]
        vertices[bp + 1] = vertices[bp + 4]
        const speed = Math.random() * 0.08 + 0.04
        vertices[bp + 3] += (tx - vertices[bp + 3]) * speed
        vertices[bp + 4] += (ty - vertices[bp + 4]) * speed
      }
    }

    function draw0() {
      for (let i = 0; i < NUM_LINES; i++) {
        const bp = i * 6
        vertices[bp]     = vertices[bp + 3]
        vertices[bp + 1] = vertices[bp + 4]
        vertices[bp + 3] += (randomTargetX[i] - vertices[bp + 3]) * (Math.random() * 0.04 + 0.06)
        vertices[bp + 4] += (randomTargetY[i] - vertices[bp + 4]) * (Math.random() * 0.04 + 0.06)
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
        vertices[bp + 3] += (tx - vertices[bp + 3]) * (Math.random() * 0.1 + 0.1)
        vertices[bp + 4] += (ty - vertices[bp + 4]) * (Math.random() * 0.1 + 0.1)
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

      // Skip every other frame to reduce CPU load
      frameSkip = (frameSkip + 1) % 2
      if (frameSkip !== 0) return

      if (attracting && cursorTarget) {
        drawAttract()
      } else {
        switch (drawType) {
          case 0: draw0(); break
          case 1: draw1(); break
          case 2: draw2(); break
        }
      }

      gl.lineWidth(1)
      gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.DYNAMIC_DRAW)
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
      gl.drawArrays(gl.LINES, 0, NUM_LINES)
      gl.flush()
    }

    function cycleMode() {
      if (!attracting) drawType = (drawType + 1) % 3
      timerHandle = setTimeout(cycleMode, 1500)
    }

    renderLoop()
    timerHandle = setTimeout(cycleMode, 1500)

    return () => {
      if (animId) cancelAnimationFrame(animId)
      if (timerHandle) clearTimeout(timerHandle)
      if (releaseTimer) clearTimeout(releaseTimer)
      window.removeEventListener('resize', resize)
      window.removeEventListener('click', handleClick)
      window.removeEventListener('mousedown', handleMouseDown)
      window.removeEventListener('touchstart', handleTouchStart)
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
