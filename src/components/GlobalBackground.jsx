import { useEffect, useRef } from 'react'

const isMobile = typeof navigator !== 'undefined' && /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)
const prefersReduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
const NUM_LINES = isMobile ? 3000 : 6000

export default function GlobalBackground() {
  const containerRef = useRef(null)

  useEffect(() => {
    if (prefersReduced) return

    const container = containerRef.current
    if (!container) return

    const canvas = document.createElement('canvas')
    canvas.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;display:block;'
    container.appendChild(canvas)

    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
    if (!gl) return

    let cw, ch
    function resize() {
      cw = container.offsetWidth || 800
      ch = container.offsetHeight || 600
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = cw * dpr
      canvas.height = ch * dpr
      gl.viewport(0, 0, canvas.width, canvas.height)
    }
    resize()

    const ro = new ResizeObserver(resize)
    ro.observe(container)

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
      precision mediump float;
      #endif
      void main(void) {
        gl_FragColor = vec4(0.18, 0.28, 0.44, 0.7);
      }
    `

    function compileShader(type, src) {
      const s = gl.createShader(type)
      gl.shaderSource(s, src)
      gl.compileShader(s)
      return s
    }

    const program = gl.createProgram()
    gl.attachShader(program, compileShader(gl.VERTEX_SHADER, vsSrc))
    gl.attachShader(program, compileShader(gl.FRAGMENT_SHADER, fsSrc))
    gl.linkProgram(program)
    gl.useProgram(program)

    const vertexPosition = gl.getAttribLocation(program, 'vertexPosition')
    gl.enableVertexAttribArray(vertexPosition)

    gl.clearColor(0.0, 0.0, 0.0, 0.0)
    gl.enable(gl.BLEND)
    gl.disable(gl.DEPTH_TEST)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE)

    const fov = 30.0, near = 1.0, far = 10000.0
    const top2 = near * Math.tan(fov * Math.PI / 360.0)
    const bottom2 = -top2
    const right2 = top2, left2 = -right2
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

    const vertices    = new Float32Array(NUM_LINES * 2 * 3)
    const thetaArr    = new Float32Array(NUM_LINES)
    const velThetaArr = new Float32Array(NUM_LINES)
    const velRadArr   = new Float32Array(NUM_LINES)
    const targetX     = new Float32Array(NUM_LINES)
    const targetY     = new Float32Array(NUM_LINES)

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
      targetX[i] = (Math.random() * 2 - 1)
      targetY[i] = Math.random() * 2 - 1
    }

    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.DYNAMIC_DRAW)
    gl.vertexAttribPointer(vertexPosition, 3, gl.FLOAT, false, 0, 0)

    // Smooth passive cursor attraction — no click needed
    let cursorX = 0, cursorY = 0, hasCursor = false

    function handleMouseMove(e) {
      const rect = canvas.getBoundingClientRect()
      cursorX = (e.clientX - rect.left) / rect.width * 2 - 1
      cursorY = -(((e.clientY - rect.top) / rect.height) * 2 - 1)
      hasCursor = true
    }
    function handleMouseLeave() { hasCursor = false }

    window.addEventListener('mousemove', handleMouseMove, { passive: true })
    window.addEventListener('mouseleave', handleMouseLeave, { passive: true })

    let drawType = 2
    let cn = 0
    let frameCount = 0

    function draw0() {
      for (let i = 0; i < NUM_LINES; i++) {
        const bp = i * 6
        vertices[bp]     = vertices[bp + 3]
        vertices[bp + 1] = vertices[bp + 4]
        const pull = hasCursor ? 0.25 : 0
        const tx = targetX[i] * (1 - pull) + cursorX * pull
        const ty = targetY[i] * (1 - pull) + cursorY * pull
        vertices[bp + 3] += (tx - vertices[bp + 3]) * 0.025
        vertices[bp + 4] += (ty - vertices[bp + 4]) * 0.025
      }
    }

    function draw1() {
      for (let i = 0; i < NUM_LINES; i++) {
        const bp = i * 6
        vertices[bp]     = vertices[bp + 3]
        vertices[bp + 1] = vertices[bp + 4]
        thetaArr[i] += velThetaArr[i]
        const bx = velRadArr[i] * Math.cos(thetaArr[i])
        const by = velRadArr[i] * Math.sin(thetaArr[i])
        const pull = hasCursor ? 0.35 : 0
        vertices[bp + 3] += ((bx * (1 - pull) + cursorX * pull) - vertices[bp + 3]) * 0.06
        vertices[bp + 4] += ((by * (1 - pull) + cursorY * pull) - vertices[bp + 4]) * 0.06
      }
    }

    function draw2() {
      cn += 0.06
      for (let i = 0; i < NUM_LINES; i++) {
        const bp = i * 6
        vertices[bp]     = vertices[bp + 3]
        vertices[bp + 1] = vertices[bp + 4]
        thetaArr[i] += velThetaArr[i]
        const pull = hasCursor ? 0.002 : 0
        vertices[bp + 3] += velRadArr[i] * Math.cos(thetaArr[i]) * 0.1 + (cursorX - vertices[bp + 3]) * pull
        vertices[bp + 4] += velRadArr[i] * Math.sin(thetaArr[i]) * 0.1 + (cursorY - vertices[bp + 4]) * pull
      }
    }

    let animId = null
    let timerHandle = null

    function renderLoop() {
      animId = requestAnimationFrame(renderLoop)
      frameCount++
      if (frameCount % 2 !== 0) return

      switch (drawType) {
        case 0: draw0(); break
        case 1: draw1(); break
        default: draw2(); break
      }

      gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.DYNAMIC_DRAW)
      gl.clear(gl.COLOR_BUFFER_BIT)
      gl.drawArrays(gl.LINES, 0, NUM_LINES)
      gl.flush()
    }

    function cycleMode() {
      drawType = (drawType + 1) % 3
      timerHandle = setTimeout(cycleMode, 6000)
    }

    renderLoop()
    timerHandle = setTimeout(cycleMode, 6000)

    return () => {
      cancelAnimationFrame(animId)
      clearTimeout(timerHandle)
      ro.disconnect()
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseleave', handleMouseLeave)
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
        zIndex: 1,
        pointerEvents: 'none',
        overflow: 'hidden',
        WebkitMaskImage: 'linear-gradient(to bottom, black 35%, transparent 90%)',
        maskImage: 'linear-gradient(to bottom, black 35%, transparent 90%)',
      }}
    />
  )
}
