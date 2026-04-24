import { useState, useEffect } from 'react'

const COLORS = [
  { from: '#c084fc', to: '#ec4899' },
  { from: '#60a5fa', to: '#a855f7' },
  { from: '#34d399', to: '#38bdf8' },
  { from: '#4ade80', to: '#06b6d4' },
  { from: '#facc15', to: '#4ade80' },
  { from: '#fb923c', to: '#facc15' },
  { from: '#f87171', to: '#fb923c' },
]

const GLOW = ['#c084fc','#60a5fa','#34d399','#4ade80','#facc15','#fb923c','#f87171']

const STEP_MESSAGES = {
  geo: 'Locating market...',
  market: 'Analyzing market fundamentals...',
  scores: 'Calculating investment metrics...',
  affordability: 'Assessing risk factors...',
  investment: 'Building investment analysis...',
  ai: 'Finalizing investment analysis...',
}

export default function LiquidLoading({ city = '', loadStep = '' }) {
  const [heights, setHeights] = useState([0,0,0,0,0,0,0])
  const [droplets, setDroplets] = useState([false,false,false,false,false,false,false])

  useEffect(() => {
    const id = setInterval(() => {
      const t = Date.now() * 0.001
      setHeights(heights => heights.map((_, i) => {
        const d = i * 0.8
        const wave = Math.sin(t + d) + Math.sin(t * 4 + d) * 0.15 + Math.sin(t * 8 + d) * 0.05
        return 80 * wave
      }))
      setDroplets(droplets => droplets.map((_, i) => Math.sin(Date.now() * 0.001 + i * 0.8) > 0.8))
    }, 32)
    return () => clearInterval(id)
  }, [])

  const stepMsg = STEP_MESSAGES[loadStep] || 'Analyzing market...'

  return (
    <div style={{ maxWidth: 480, margin: '80px auto', padding: '0 24px', textAlign: 'center' }}>
      {city && (
        <div style={{ fontFamily: "'Barlow',sans-serif", fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', marginBottom: 8 }}>
          {city}
        </div>
      )}
      <div style={{ fontFamily: "'Barlow',sans-serif", fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 32, minHeight: 20, transition: 'opacity 0.4s' }}>
        {stepMsg}
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 16, height: 140, padding: '0 0 24px' }}>
        {heights.map((height, i) => {
          const { from, to } = COLORS[i]
          const glow = GLOW[i]
          const absH = Math.abs(height)

          return (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
              {/* top droplet -- absolutely positioned so it never affects layout height */}
              <div style={{
                position: 'absolute',
                bottom: ,
                width: 16, height: 16, borderRadius: '50%',
                background: ,
                opacity: droplets[i] ? 1 : 0,
                transform: droplets[i] ? 'translateX(-50%) scale(1)' : 'translateX(-50%) translateY(10px) scale(0.5)',
                transition: 'opacity 0.3s, transform 0.5s',
                filter: 'blur(0.5px)',
                boxShadow: droplets[i] ?  : 'none',
                left: '50%',
              }} />

              {/* main bar */}
              <div style={{
                width: 40,
                height: ,
                borderRadius: 99,
                background: ,
                transform: height < 0 ? 'scaleY(-1)' : 'scaleY(1)',
                transformOrigin: 'bottom',
                transition: 'height 0.12s ease-out',
                filter: 'blur(0.3px)',
                boxShadow: ,
                position: 'relative',
                overflow: 'hidden',
              }}>
                <div style={{
                  position: 'absolute', top: 0, left: 0, right: 0, height: 16,
                  background: 'linear-gradient(to bottom, rgba(255,255,255,0.4), transparent)',
                  borderRadius: 99,
                }} />
              </div>

              {/* base dot */}
              <div style={{
                width: 12, height: 12, borderRadius: '50%', marginTop: 8,
                background: ,
                opacity: 0.7,
                filter: 'blur(0.2px)',
                boxShadow: ,
              }} />
            </div>
          )
        })}
      </div>

    </div>
  )
}
