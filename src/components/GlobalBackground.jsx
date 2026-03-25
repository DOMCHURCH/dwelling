import { useEffect, useRef } from 'react'

export default function GlobalBackground() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    // Inject PixiJS v5 from CDN
    const pixiScript = document.createElement('script')
    pixiScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/pixi.js/5.3.12/pixi.min.js'
    pixiScript.onload = () => initFlame(canvas)
    document.head.appendChild(pixiScript)

    let app = null

    function initFlame(canvas) {
      const PIXI = window.PIXI
      if (!PIXI) return

      const flameFrag = `
precision highp float;
varying vec2 vTextureCoord;
uniform sampler2D uSampler;
uniform sampler2D mapSampler;
uniform vec4 filterArea;
uniform vec2 dimensions;
uniform float time;

float rand(vec2 co) {
  return fract(sin(dot(co.xy ,vec2(12.9898, 78.233))) * 43758.5453);
}
mat2 rotz(float angle) {
  mat2 m;
  m[0][0] = cos(angle); m[0][1] = -sin(angle);
  m[1][0] = sin(angle); m[1][1] = cos(angle);
  return m;
}
float fbm(vec2 uv) {
  float n = (texture2D(mapSampler, uv).r - 0.5) * 0.5;
  n += (texture2D(mapSampler, uv * 2.0).r - 0.5) * 0.5 * 0.5;
  n += (texture2D(mapSampler, uv * 3.0).r - 0.5) * 0.5 * 0.5 * 0.5;
  return n + 0.5;
}
void main() {
  vec2 uv = (vTextureCoord * filterArea.xy) / dimensions;
  uv.y = 1.0 - uv.y;
  vec2 _uv = uv;
  uv -= vec2(0.5);
  uv.y /= dimensions.x / dimensions.y;
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
  blueflame = clamp(blueflame, 0.0, 1.0);
  flame *= smoothstep(1.0, variationH * 0.5, _uv.y);
  flame = clamp(flame, 0.0, 1.0);
  flame = pow(flame, 3.0);
  flame /= smoothstep(1.1, -0.1, _uv.y);
  vec4 col = mix(vec4(1.0, 1.0, 0.0, 0.0), vec4(1.0, 1.0, 0.6, 0.0), flame);
  col = mix(vec4(1.0, 0.0, 0.0, 0.0), col, smoothstep(0.0, 1.6, flame));
  gl_FragColor = col;
  vec4 bluecolor = mix(vec4(0.0, 0.0, 1.0, 0.0), gl_FragColor, 0.95);
  gl_FragColor = mix(gl_FragColor, bluecolor, blueflame);
  gl_FragColor *= flame;
  gl_FragColor.a = flame;
  float haloSize = 0.5;
  float centerL = 1.0 - (length(centerUV + vec2(0.0, 0.1)) / haloSize);
  vec4 halo = vec4(0.8, 0.3, 0.3, 0.0) * 1.0 * fbm(vec2(time * 0.035)) * centerL + 0.02;
  vec4 finalCol = mix(halo, gl_FragColor, gl_FragColor.a);
  gl_FragColor = finalCol;
  gl_FragColor *= mix(rand(uv) + rand(uv * 0.45), 1.0, 0.9);
  gl_FragColor = clamp(gl_FragColor, 0.0, 1.0);
}
`

      class FlameFilter extends PIXI.Filter {
        constructor(texture, time = 0.0) {
          super(null, flameFrag)
          this.uniforms.dimensions = new Float32Array(2)
          this.texture = texture
          this.time = time
        }
        get texture() { return this.uniforms.mapSampler }
        set texture(texture) {
          texture.baseTexture.wrapMode = PIXI.WRAP_MODES.REPEAT
          this.uniforms.mapSampler = texture
        }
        apply(filterManager, input, output, clear) {
          this.uniforms.dimensions[0] = input.sourceFrame.width
          this.uniforms.dimensions[1] = input.sourceFrame.height
          this.uniforms.time = this.time
          filterManager.applyFilter(this, input, output, clear)
        }
      }

      if (window.devicePixelRatio > 1) PIXI.settings.RESOLUTION = 2
      PIXI.settings.PRECISION_FRAGMENT = 'highp'

      app = new PIXI.Application({
        view: canvas,
        width: window.innerWidth,
        height: window.innerHeight,
        backgroundColor: 0x000000,
        autoResize: true,
        transparent: true,
      })

      let isResized = false
      let flame = null

      const loader = new PIXI.Loader()
      loader.baseUrl = 'https://s3-us-west-2.amazonaws.com/s.cdpn.io/106114/'
      loader.add([{ name: 'noise', url: 'noise-texture-11.png?v=9' }])
      loader.load((l, resources) => {
        flame = new FlameFilter(resources.noise.texture)
        app.stage.filterArea = app.screen
        app.stage.filters = [flame]
        app.ticker.add((delta) => {
          if (isResized) {
            app.renderer.resize(window.innerWidth, window.innerHeight)
            isResized = false
          }
          flame.time += 0.1 * delta
        })
      })

      window.addEventListener('resize', () => { isResized = true }, { passive: true })
    }

    return () => {
      if (app) { app.destroy(false, { children: true }); app = null }
      const s = document.querySelector('script[src*="pixi"]')
      if (s) s.remove()
    }
  }, [])

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0,
      height: '100vh',
      zIndex: 0,
      pointerEvents: 'none',
      WebkitMaskImage: 'linear-gradient(to bottom, black 45%, transparent 100%)',
      maskImage: 'linear-gradient(to bottom, black 45%, transparent 100%)',
    }}>
      <canvas
        ref={canvasRef}
        style={{ display: 'block', width: '100%', height: '100%' }}
      />
    </div>
  )
}
