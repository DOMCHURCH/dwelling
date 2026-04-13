import { memo } from 'react'

const VERDICT_CONFIG = {
  BUY:   { color: '#22c55e', bg: 'rgba(34,197,94,0.08)',   icon: '↑', tagline: 'Strong market fundamentals for buyers' },
  HOLD:  { color: '#f59e0b', bg: 'rgba(245,158,11,0.08)',  icon: '→', tagline: 'Monitor conditions before committing'  },
  AVOID: { color: '#ef4444', bg: 'rgba(239,68,68,0.08)',   icon: '↓', tagline: 'Significant headwinds detected'        },
}

function Pill({ label, value, locked, onClick }) {
  return (
    <div
      onClick={locked ? onClick : undefined}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
        padding: '10px 18px', borderRadius: 12,
        background: locked ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.07)',
        cursor: locked ? 'pointer' : 'default',
        border: locked ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(255,255,255,0.06)',
        transition: 'opacity 0.2s',
      }}
    >
      <span style={{ fontFamily: "'Barlow',sans-serif", fontSize: 10, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>
        {label}
      </span>
      <span style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 600, fontSize: 15, color: locked ? 'rgba(255,255,255,0.3)' : '#fff' }}>
        {locked ? '— Unlock →' : value}
      </span>
    </div>
  )
}

const VerdictCard = memo(function VerdictCard({ verdict, roiEstimate, isPro, onUpgrade }) {
  if (!verdict) return null
  const cfg = VERDICT_CONFIG[verdict.label] ?? VERDICT_CONFIG.HOLD

  return (
    <div
      className="liquid-glass"
      style={{
        borderRadius: 24, padding: '36px 40px', textAlign: 'center',
        background: cfg.bg,
        border: `1px solid ${cfg.color}22`,
        marginBottom: 24,
      }}
    >
      <div style={{ fontFamily: "'Barlow',sans-serif", fontSize: 11, letterSpacing: '0.15em', color: 'rgba(255,255,255,0.35)', marginBottom: 12, textTransform: 'uppercase' }}>
        AI Verdict
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 8 }}>
        <span style={{ fontSize: 40, color: cfg.color, lineHeight: 1 }}>{cfg.icon}</span>
        <span style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 800, fontSize: 'clamp(2.5rem,7vw,4.5rem)', color: cfg.color, lineHeight: 1, letterSpacing: '-0.02em' }}>
          {verdict.label}
        </span>
      </div>

      <p style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: '1.05rem', color: 'rgba(255,255,255,0.6)', marginBottom: 24 }}>
        {cfg.tagline}
      </p>

      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
        <Pill label="Confidence" value={verdict.confidence} />
        <Pill label="Risk Level" value={verdict.riskLevel} />
        <Pill
          label="ROI Estimate"
          value={roiEstimate ? `${roiEstimate}%` : null}
          locked={!isPro || !roiEstimate}
          onClick={onUpgrade}
        />
      </div>
    </div>
  )
})

export default VerdictCard
