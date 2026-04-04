import { useEffect, useRef, useState } from 'react'

// ── CSS fallback (always available) ──────────────────────────────────────────
function CSSBackground() {
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: -1, pointerEvents: 'none', overflow: 'hidden',
        background: '#000',
      }}
    >
      <style>{`
        @keyframes dw-drift1 { 0%,100%{transform:translate(0,0) scale(1)} 33%{transform:translate(40px,-60px) scale(1.05)} 66%{transform:translate(-30px,30px) scale(0.97)} }
        @keyframes dw-drift2 { 0%,100%{transform:translate(0,0) scale(1.02)} 33%{transform:translate(-50px,40px) scale(0.96)} 66%{transform:translate(60px,-20px) scale(1.04)} }
        @keyframes dw-drift3 { 0%,100%{transform:translate(0,0) scale(0.98)} 50%{transform:translate(30px,50px) scale(1.03)} }
        @keyframes dw-pulse  { 0%,100%{opacity:0.4} 50%{opacity:0.7} }
        .dw-orb { position:absolute; border-radius:50%; filter:blur(80px); will-change: transform; }
      `}</style>
      <div className="dw-orb" style={{ width:600,height:600,top:'-15%',left:'-10%',background:'radial-gradient(circle,rgba(60,60,100,0.8) 0%,transparent 70%)',animation:'dw-drift1 18s ease-in-out infinite,dw-pulse 8s ease-in-out infinite' }} />
      <div className="dw-orb" style={{ width:500,height:500,top:'10%',right:'-5%',background:'radial-gradient(circle,rgba(50,60,90,0.75) 0%,transparent 70%)',animation:'dw-drift2 22s ease-in-out infinite,dw-pulse 10s ease-in-out infinite 2s' }} />
      <div className="dw-orb" style={{ width:400,height:400,top:'40%',left:'30%',background:'radial-gradient(circle,rgba(40,50,80,0.7) 0%,transparent 70%)',animation:'dw-drift3 15s ease-in-out infinite,dw-pulse 12s ease-in-out infinite 4s' }} />
      <div className="dw-orb" style={{ width:350,height:350,bottom:'5%',left:'10%',background:'radial-gradient(circle,rgba(55,50,85,0.65) 0%,transparent 70%)',animation:'dw-drift1 20s ease-in-out infinite reverse,dw-pulse 9s ease-in-out infinite 1s' }} />
      <div style={{ position:'absolute',inset:0,backgroundImage:'linear-gradient(rgba(255,255,255,0.015) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.015) 1px,transparent 1px)',backgroundSize:'80px 80px',opacity:0.4 }} />
      <div style={{ position:'absolute', inset:0, background: 'linear-gradient(to bottom, transparent 40%, #000 90%)' }} />
    </div>
  )
}

// ── Three.js canvas ───────────────────────────────────────────────────────────
function ThreeBackground({ onFail }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    let rafId, resizeTimer, resizeObserver, renderer, io, scene, mesh

    // Give the canvas a real size before Three tries to get a context
    canvas.width  = canvas.parentNode?.offsetWidth  || window.innerWidth
    canvas.height = canvas.parentNode?.offsetHeight || window.innerHeight

    // Immediate WebGL check before heavy import
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
    if (!gl) {
      console.warn('[Dwelling] WebGL not supported by browser. Falling back to CSS.')
      onFail()
      return
    }

    const importTimeout = setTimeout(() => {
      console.warn('[Dwelling] Three.js import timeout. Falling back to CSS.')
      onFail()
    }, 5000)

    import('three').then((THREE) => {
      clearTimeout(importTimeout)
      
      const {
        BackSide, BoxGeometry, Clock, Mesh, MeshLambertMaterial, MeshStandardMaterial,
        PerspectiveCamera, Scene, WebGLRenderer, SRGBColorSpace, MathUtils,
        Vector2, Vector3, MeshPhysicalMaterial, Color, Object3D,
        InstancedMesh, PMREMGenerator, SphereGeometry, AmbientLight, PointLight,
        ACESFilmicToneMapping, Raycaster, Plane,
      } = THREE

      try {
        renderer = new WebGLRenderer({ 
          canvas, 
          powerPreference: 'high-performance', 
          alpha: true, 
          antialias: false,
          precision: 'lowp',
          stencil: false,
          failIfMajorPerformanceCaveat: true,
        })
      } catch (e) {
        try {
          renderer = new WebGLRenderer({ 
            canvas, 
            powerPreference: 'low-power', 
            alpha: true, 
            antialias: false,
            precision: 'lowp',
            stencil: false,
          })
        } catch (e2) {
          onFail()
          return
        }
      }

      if (!renderer || !renderer.getContext()) {
        onFail()
        return
      }

      canvas.addEventListener('webglcontextlost', (e) => {
        e.preventDefault()
        onFail()
      }, false)

      renderer.outputColorSpace = SRGBColorSpace
      renderer.toneMapping = ACESFilmicToneMapping

      class RoomEnvironment extends Scene {
        constructor() {
          super(); this.position.y = -3.5
          const geo = new BoxGeometry(); geo.deleteAttribute('uv')
          const room = new Mesh(geo, new MeshStandardMaterial({ side: BackSide }))
          room.position.set(-0.757,13.219,0.717); room.scale.set(31.713,28.305,28.591); this.add(room)
          const ml = new PointLight(0xffffff,900,28,2); ml.position.set(0.418,16.199,0.300); this.add(ml)
          const boxes = new InstancedMesh(geo, new MeshStandardMaterial(), 6)
          const t = new Object3D()
          ;[
            [[-10.906,2.009,1.846],[0,-0.195,0],[2.328,7.905,4.651]],
            [[-5.607,-0.754,-0.758],[0,0.994,0],[1.970,1.534,3.955]],
            [[6.167,0.857,7.803],[0,0.561,0],[3.927,6.285,3.687]],
            [[-2.017,0.018,6.124],[0,0.333,0],[2.002,4.566,2.064]],
            [[2.291,-0.756,-2.621],[0,-0.286,0],[1.546,1.552,1.496]],
            [[-2.193,-0.369,-5.547],[0,0.516,0],[3.875,3.487,2.986]],
          ].forEach(([p,r,s],i)=>{ t.position.set(...p);t.rotation.set(...r);t.scale.set(...s);t.updateMatrix();boxes.setMatrixAt(i,t.matrix) })
          this.add(boxes)
          ;[
            [[-16.116,14.370,8.208],[0.1,2.428,2.739],50],
            [[-16.109,18.021,-8.207],[0.1,2.425,2.751],50],
            [[14.904,12.198,-1.832],[0.15,4.265,6.331],17],
            [[-0.462,8.890,14.520],[4.38,5.441,0.088],43],
            [[3.235,11.486,-12.541],[2.5,2.0,0.1],20],
            [[0.000,20.000,0.000],[1.0,0.1,1.0],100],
          ].forEach(([pos,sc,intensity])=>{
            const m = new Mesh(geo, new MeshLambertMaterial({ color:0, emissive:0xffffff,emissiveIntensity:intensity }))
            m.position.set(...pos); m.scale.set(...sc); this.add(m)
          })
        }
      }

      const camera = new PerspectiveCamera(50, 1, 0.1, 100)
      camera.position.set(0, 0, 20)
      scene = new Scene()

      const pmrem = new PMREMGenerator(renderer)
      const envTex = pmrem.fromScene(new RoomEnvironment()).texture; pmrem.dispose()

      const COUNT = 100
      const colors = ['#0a0a0a','#111111','#1a1a1a','#0f0f0f','#141414','#080808','#161616','#0d0d0d'].map(c=>new Color(c))
      const mat = new MeshPhysicalMaterial({ envMap:envTex, metalness:0.9, roughness:0.15, clearcoat:1, clearcoatRoughness:0.1 })
      mesh = new InstancedMesh(new SphereGeometry(1,20,20), mat, COUNT)
      for (let i=0;i<COUNT;i++) mesh.setColorAt(i, colors[i%colors.length])
      mesh.instanceColor.needsUpdate = true
      const ptLight = new PointLight(0xffffff, 4, 100, 1)
      mesh.add(new AmbientLight(0xffffff, 1.2)); mesh.add(ptLight)
      scene.add(mesh)

      const cfg = { count:COUNT, size0:0.9, minSize:0.25, maxSize:0.65, gravity:0.35, friction:0.995, wallBounce:0.3, maxVelocity:0.08, maxX:10, maxY:10, maxZ:8 }
      const posData = new Float32Array(3*COUNT)
      const velData = new Float32Array(3*COUNT)
      const sizeData = new Float32Array(COUNT)
      const center = new Vector3()
      sizeData[0] = cfg.size0
      for (let i=1;i<COUNT;i++) {
        sizeData[i] = MathUtils.randFloat(cfg.minSize, cfg.maxSize)
        posData[3*i]   = MathUtils.randFloatSpread(2*cfg.maxX)
        posData[3*i+1] = MathUtils.randFloatSpread(2*cfg.maxY)
        posData[3*i+2] = MathUtils.randFloatSpread(2*cfg.maxZ)
      }

      function stepPhysics(delta) {
        new Vector3().fromArray(posData,0).lerp(center,0.1).toArray(posData,0)
        for (let i=1;i<COUNT;i++) {
          const b=3*i, pos=new Vector3().fromArray(posData,b), vel=new Vector3().fromArray(velData,b)
          vel.y -= delta*cfg.gravity*sizeData[i]; vel.multiplyScalar(cfg.friction); vel.clampLength(0,cfg.maxVelocity); pos.add(vel)
          for (let j=i+1;j<COUNT;j++) {
            const ob=3*j, op=new Vector3().fromArray(posData,ob), d=new Vector3().subVectors(op,pos)
            const dist=d.length(), sumR=sizeData[i]+sizeData[j]
            if (dist<sumR) { const ov=(sumR-dist)*0.5; d.normalize(); pos.addScaledVector(d,-ov); op.addScaledVector(d,ov); op.toArray(posData,ob) }
          }
          if (Math.abs(pos.x)+sizeData[i]>cfg.maxX){pos.x=Math.sign(pos.x)*(cfg.maxX-sizeData[i]);vel.x*=-cfg.wallBounce}
          if (pos.y-sizeData[i]<-cfg.maxY){pos.y=-cfg.maxY+sizeData[i];vel.y*=-cfg.wallBounce}
          if (Math.abs(pos.z)+sizeData[i]>cfg.maxZ){pos.z=Math.sign(pos.z)*(cfg.maxZ-sizeData[i]);vel.z*=-cfg.wallBounce}
          pos.toArray(posData,b); vel.toArray(velData,b)
        }
      }

      const dummy = new Object3D()
      function updateMesh() {
        for (let i=0;i<COUNT;i++) {
          dummy.position.fromArray(posData,3*i); dummy.scale.setScalar(sizeData[i]); dummy.updateMatrix(); mesh.setMatrixAt(i,dummy.matrix)
        }
        mesh.instanceMatrix.needsUpdate = true
        ptLight.position.fromArray(posData,0)
      }

      function resize() {
        const par = canvas.parentNode
        const w = par ? par.offsetWidth : window.innerWidth
        const h = par ? par.offsetHeight : window.innerHeight
        camera.aspect = w/h; camera.updateProjectionMatrix()
        const fovRad = (camera.fov*Math.PI)/180
        const wH = 2*Math.tan(fovRad/2)*camera.position.z
        cfg.maxX = wH*camera.aspect/2; cfg.maxY = wH/2; cfg.maxZ = wH*camera.aspect/4
        renderer.setSize(w,h); renderer.setPixelRatio(Math.min(window.devicePixelRatio,2))
      }
      resize()
      resizeObserver = new ResizeObserver(()=>{ clearTimeout(resizeTimer); resizeTimer=setTimeout(resize,100) })
      if (canvas.parentNode) resizeObserver.observe(canvas.parentNode)

      const pointer=new Vector2(), raycaster=new Raycaster(), plane=new Plane(new Vector3(0,0,1),0), hit=new Vector3()
      function onMove(e) { pointer.set((e.clientX/window.innerWidth)*2-1,-(e.clientY/window.innerHeight)*2+1) }
      window.addEventListener('pointermove', onMove, {passive:true})

      const clock = new Clock(); let visible=false
      io = new IntersectionObserver(([e])=>{
        visible=e.isIntersecting
        if (visible){clock.start();loop()} else {clock.stop();cancelAnimationFrame(rafId)}
      },{threshold:0})
      io.observe(canvas)

      function loop() {
        if (!visible) return
        rafId = requestAnimationFrame(loop)
        const delta = clock.getDelta()
        raycaster.setFromCamera(pointer,camera)
        if (raycaster.ray.intersectPlane(plane,hit)) center.copy(hit)
        stepPhysics(delta); updateMesh()
        renderer.render(scene,camera)
      }

      canvas._dwCleanup = () => window.removeEventListener('pointermove', onMove)

    }).catch((err) => {
      clearTimeout(importTimeout)
      onFail()
    })

    return () => {
      clearTimeout(importTimeout)
      cancelAnimationFrame(rafId)
      clearTimeout(resizeTimer)
      resizeObserver?.disconnect()
      io?.disconnect()
      renderer?.dispose()
      canvas._dwCleanup?.()
    }
  }, [onFail])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position:'fixed', inset:0, width:'100%', height:'100%',
        zIndex:-1, pointerEvents:'none', display:'block',
        willChange: 'transform',
        transform: 'translateZ(0)',
        background: '#000',
      }}
    />
  )
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function GlobalBackground() {
  const [useCSSFallback, setUseCSSFallback] = useState(false)
  if (useCSSFallback) return <CSSBackground />
  return <ThreeBackground onFail={() => setUseCSSFallback(true)} />
}
