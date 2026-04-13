import { memo, useEffect, useState } from 'react'

const STEPS = [
  { key: 'geo',           icon: '📍', label: 'Locating city boundaries'         },
  { key: 'market',        icon: '📊', label: 'Pulling market data'              },
  { key: 'scores',        icon: '🏘️',  label: 'Computing neighbourhood scores'  },
  { key: 'affordability', icon: '💰', label: 'Running affordability model'      },
  { key: 'investment',    icon: '📈', label: 'Scoring investment potential'     },
  { key: 'ai',            icon: '🤖', label: 'Generating AI intelligence'       },
]

function Dots() {
  const [count, setCount] = useState(1)
  useEffect(() => {
    const t = setInterval(() => setCount(c => (c % 3) + 1), 500)
    return () => clearInterval(t)
  }, [])
  return <span style={{ opacity: 0.5 }}>{'•'.repeat(count)}</span>
}

const LoadingState = memo(function LoadingState({ currentStep = 'geo', hasAIKey = false, city = '' }) {
  const visibleSteps = hasAIKey ? STEPS : STEPS.filter(s => s.key !== 'ai')
  const currentIdx = visibleSteps.findIndex(s => s.key === currentStep)
  const progress = currentIdx === -1 ? 0 : Math.round(((currentIdx + 1) / visibleSteps.length) * 100)
  const isLate = currentIdx >= 3

  return (
    <div style={{ maxWidth: 480, margin: '80px auto', padding: '0 24px', textAlign: 'center' }}>
      {/* City name */}
      {city && (
        <div style={{ fontFamily: "'Barlow',sans-serif", fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', marginBottom: 32 }}>
          Analysing {city}
        </div>
      )}

      {/* Steps list */}
      <div style={{ marginBottom: 32, textAlign: 'left' }}>
        {visibleSteps.map((step, i) => {
          const isDone = i < currentIdx
          const isCurrent = i === currentIdx
          const isPending = i > currentIdx

          return (
            <div
              key={step.key}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '9px 0',
                opacity: isPending ? 0.3 : 1,
                transition: 'opacity 0.4s',
              }}
            >
              <span style={{ fontSize: 16, width: 24, textAlign: 'center' }}>
                {isDone ? '✓' : step.icon}
              </span>
              <span style={{
                fontFamily: "'Barlow',sans-serif",
                fontSize: 13,
                color: isDone ? 'rgba(255,255,255,0.45)' : isCurrent ? '#fff' : 'rgba(255,255,255,0.3)',
                fontWeight: isCurrent ? 500 : 400,
              }}>
                {isCurrent ? <>{step.label}<Dots /></> : step.label}
              </span>
            </div>
          )
        })}
      </div>

      {/* Progress bar */}
      <div style={{ height: 3, background: 'rgba(255,255,255,0.08)', borderRadius: 99, overflow: 'hidden', marginBottom: 16 }}>
        <div
          style={{
            height: '100%',
            width: `${progress}%`,
            background: 'linear-gradient(90deg, #38bdf8, #818cf8)',
            borderRadius: 99,
            transition: 'width 0.6s ease',
          }}
        />
      </div>

      {/* Anti-abandonment copy */}
      {isLate && (
        <p style={{ fontFamily: "'Barlow',sans-serif", fontSize: 12, color: 'rgba(255,255,255,0.3)', marginTop: 12 }}>
          Still working — Canadian market data takes a moment
        </p>
      )}

      {!hasAIKey && (
        <p style={{ fontFamily: "'Barlow',sans-serif", fontSize: 12, color: 'rgba(56,189,248,0.5)', marginTop: 8 }}>
          Add an API key to unlock AI insights
        </p>
      )}
    </div>
  )
})

export default LoadingState
