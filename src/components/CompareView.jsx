import { useState } from 'react'
import ScoreRing from './ScoreRing'
import { getCurrencySymbol, getCurrencyFromCountry } from '../lib/currency'

const fmt = (n) => (n != null && n !== 0) ? n.toLocaleString('en-US', { maximumFractionDigits: 0 }) : '—'

function verdictColor(verdict) {
  if (!verdict) return 'rgba(255,255,255,0.6)'
  if (verdict === 'Excellent' || verdict === 'Good') return '#4ade80'
  if (verdict === 'Caution') return '#fbbf24'
  if (verdict === 'Avoid') return '#f87171'
  return '#ffffff'
}

const SIDE_ICONS = { left: '🅰️', center: '🅱️', right: '🅲' }
const SIDE_LABELS = { left: 'A', center: 'B', right: 'C' }

function CompareColumn({ data, side }) {
  const { geo, ai, realData } = data
  const { areaMetrics, areaRiskScore, marketTemperature, neighborhoodScores } = realData || {}
  const { areaIntelligence, propertyEstimate, investment } = ai || {}
  const sym = getCurrencySymbol(getCurrencyFromCountry(geo?.userCountry || '') || 'USD')

  const cityName = geo?.displayName?.split(',')[0] || 'Area'

  return (
    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* Header */}
      <div className="liquid-glass-strong" style={{ borderRadius: 16, padding: '16px 20px', textAlign: 'center' }}>
        <div style={{ fontSize: 20, marginBottom: 6 }}>{SIDE_ICONS[side] || '🅰️'}</div>
        <div style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 18, color: '#fff', marginBottom: 4 }}>{cityName}</div>
        <div style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 11, color: 'rgba(255,255,255,0.4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{geo?.displayName}</div>
      </div>

      {/* Verdict */}
      {areaIntelligence && (
        <div className="liquid-glass" style={{ borderRadius: 14, padding: '16px 18px' }}>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10, fontFamily: "'Barlow',sans-serif" }}>Overall Verdict</div>
          <div style={{
            display: 'inline-block', padding: '8px 20px', borderRadius: 40, marginBottom: 10,
            background: areaIntelligence.verdict === 'Excellent' || areaIntelligence.verdict === 'Good' ? 'rgba(74,222,128,0.12)' : areaIntelligence.verdict === 'Caution' ? 'rgba(251,191,36,0.1)' : areaIntelligence.verdict === 'Avoid' ? 'rgba(248,113,113,0.1)' : 'rgba(255,255,255,0.06)',
            border: `1px solid ${verdictColor(areaIntelligence.verdict)}40`,
          }}>
            <span style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 20, color: verdictColor(areaIntelligence.verdict) }}>
              {areaIntelligence.verdict}
            </span>
          </div>
          {areaIntelligence.bestFor && (
            <p style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 12, color: 'rgba(255,255,255,0.45)', lineHeight: 1.6, fontStyle: 'italic' }}>
              Best for: {areaIntelligence.bestFor}
            </p>
          )}
        </div>
      )}

      {/* Stability + Market Temp */}
      {areaRiskScore && (
        <div className="liquid-glass" style={{ borderRadius: 14, padding: '16px 18px' }}>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12, fontFamily: "'Barlow',sans-serif" }}>Market Signals</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '10px 12px', border: `1px solid ${areaRiskScore.color}30` }}>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4, fontFamily: "'Barlow',sans-serif" }}>Stability</div>
              <div style={{ fontSize: 28, fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', color: areaRiskScore.color, lineHeight: 1 }}>{areaRiskScore.score}</div>
              <div style={{ fontSize: 10, color: areaRiskScore.color, marginTop: 2, fontFamily: "'Barlow',sans-serif" }}>{areaRiskScore.label}</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '10px 12px', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4, fontFamily: "'Barlow',sans-serif" }}>Temperature</div>
              <div style={{ fontSize: 15, fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', color: marketTemperature?.color || '#fff', marginTop: 4 }}>{marketTemperature?.label || '—'}</div>
            </div>
          </div>
        </div>
      )}

      {/* Price stats */}
      {areaMetrics && (
        <div className="liquid-glass" style={{ borderRadius: 14, padding: '16px 18px' }}>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12, fontFamily: "'Barlow',sans-serif" }}>Pricing</div>
          {[
            { label: 'Median Price', value: `${sym}${Math.round((areaMetrics.medianPrice || 0) / 1000)}k` },
            { label: 'Avg Price', value: `${sym}${Math.round((areaMetrics.avgPrice || 0) / 1000)}k` },
            { label: 'Median DOM', value: areaMetrics.medianDOM != null ? `${areaMetrics.medianDOM} days` : '—' },
            { label: 'Listings', value: fmt(areaMetrics.count) },
          ].map(({ label, value }) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <span style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>{label}</span>
              <span style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 14, color: '#fff' }}>{value}</span>
            </div>
          ))}
        </div>
      )}

      {/* Neighbourhood scores */}
      {neighborhoodScores && (
        <div className="liquid-glass" style={{ borderRadius: 14, padding: '16px 18px' }}>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 14, fontFamily: "'Barlow',sans-serif" }}>Neighbourhood</div>
          <div style={{ display: 'flex', justifyContent: 'space-around' }}>
            <ScoreRing score={neighborhoodScores.walkScore ?? neighborhoodScores.walkability} label="Walk" color="rgba(255,255,255,0.9)" size={52} />
            <ScoreRing score={neighborhoodScores.transitScore ?? neighborhoodScores.transit} label="Transit" color="rgba(255,255,255,0.65)" size={52} />
            <ScoreRing score={neighborhoodScores.schoolScore ?? neighborhoodScores.schools} label="Schools" color="rgba(196,181,253,0.9)" size={52} />
          </div>
        </div>
      )}

      {/* Investment */}
      {investment && (
        <div className="liquid-glass" style={{ borderRadius: 14, padding: '16px 18px' }}>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10, fontFamily: "'Barlow',sans-serif" }}>Investment</div>
          <div style={{
            display: 'inline-block', padding: '4px 14px', borderRadius: 20, marginBottom: 10,
            background: investment.appreciationOutlook === 'bullish' ? 'rgba(74,222,128,0.12)' : investment.appreciationOutlook === 'bearish' ? 'rgba(248,113,113,0.1)' : 'rgba(255,255,255,0.06)',
            border: `1px solid ${investment.appreciationOutlook === 'bullish' ? 'rgba(74,222,128,0.3)' : investment.appreciationOutlook === 'bearish' ? 'rgba(248,113,113,0.3)' : 'rgba(255,255,255,0.1)'}`,
          }}>
            <span style={{ fontFamily: "'Barlow',sans-serif", fontSize: 11, fontWeight: 600, color: investment.appreciationOutlook === 'bullish' ? '#4ade80' : investment.appreciationOutlook === 'bearish' ? '#f87171' : 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {(investment.appreciationOutlook || 'neutral').toUpperCase()}
            </span>
          </div>
          <p style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 12, color: 'rgba(255,255,255,0.45)', lineHeight: 1.6 }}>{investment.investmentSummary}</p>
        </div>
      )}

      {/* AI summary */}
      {areaIntelligence?.marketConditions && (
        <div className="liquid-glass" style={{ borderRadius: 14, padding: '16px 18px' }}>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10, fontFamily: "'Barlow',sans-serif" }}>AI Market Summary</div>
          <p style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 12, color: 'rgba(255,255,255,0.55)', lineHeight: 1.7 }}>{areaIntelligence.marketConditions}</p>
        </div>
      )}

      {/* Risks + Upsides */}
      {areaIntelligence && (areaIntelligence.upsides?.length > 0 || areaIntelligence.risks?.length > 0) && (
        <div className="liquid-glass" style={{ borderRadius: 14, padding: '16px 18px' }}>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12, fontFamily: "'Barlow',sans-serif" }}>Key Signals</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {(areaIntelligence.upsides || []).slice(0, 3).map((u, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <span style={{ color: '#4ade80', fontSize: 11, flexShrink: 0, marginTop: 1 }}>+</span>
                <span style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 12, color: 'rgba(255,255,255,0.55)', lineHeight: 1.5 }}>{u}</span>
              </div>
            ))}
            {(areaIntelligence.risks || []).slice(0, 2).map((r, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <span style={{ color: '#f87171', fontSize: 11, flexShrink: 0, marginTop: 1 }}>−</span>
                <span style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 12, color: 'rgba(255,255,255,0.55)', lineHeight: 1.5 }}>{r}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function CompareView({ resultA, resultB, resultC, onBack, onClearB, onAddC, onClearC }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Header bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <button onClick={onBack}
          style={{ borderRadius: 40, padding: '8px 16px', fontSize: 13, fontFamily: "'Barlow',sans-serif", color: 'rgba(255,255,255,0.6)', border: 'none', cursor: 'pointer', background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(12px)', transition: 'transform 0.15s' }}
          onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.04)'}
          onMouseLeave={e => e.currentTarget.style.transform = ''}>
          ← Back to single view
        </button>
        <div style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 16, color: 'rgba(255,255,255,0.5)' }}>
          Side-by-side comparison
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={onClearB}
            style={{ borderRadius: 40, padding: '8px 16px', fontSize: 13, fontFamily: "'Barlow',sans-serif", color: 'rgba(255,255,255,0.4)', border: 'none', cursor: 'pointer', background: 'transparent', transition: 'color 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.7)'}
            onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.4)'}>
            Change B
          </button>
          {!resultC && onAddC && (
            <button onClick={onAddC}
              style={{ borderRadius: 40, padding: '8px 16px', fontSize: 13, fontFamily: "'Barlow',sans-serif", color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.15)', cursor: 'pointer', background: 'rgba(255,255,255,0.04)', transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 5 }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)' }}>
              + Add area C
            </button>
          )}
          {resultC && onClearC && (
            <button onClick={onClearC}
              style={{ borderRadius: 40, padding: '8px 16px', fontSize: 13, fontFamily: "'Barlow',sans-serif", color: 'rgba(255,255,255,0.4)', border: 'none', cursor: 'pointer', background: 'transparent', transition: 'color 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.7)'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.4)'}>
              Change C
            </button>
          )}
        </div>
      </div>

      {/* Winner banner */}
      {resultA.ai?.areaIntelligence && resultB.ai?.areaIntelligence && (() => {
        const scoreA = resultA.realData?.areaRiskScore?.score || 0
        const scoreB = resultB.realData?.areaRiskScore?.score || 0
        const nameA = resultA.geo?.displayName?.split(',')[0]
        const nameB = resultB.geo?.displayName?.split(',')[0]
        if (scoreA === scoreB) return null
        const winner = scoreA > scoreB ? nameA : nameB
        const winScore = Math.max(scoreA, scoreB)
        return (
          <div className="liquid-glass" style={{ borderRadius: 16, padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(74,222,128,0.05)', border: '1px solid rgba(74,222,128,0.15)' }}>
            <span style={{ fontSize: 20 }}>🏆</span>
            <span style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 14, color: 'rgba(255,255,255,0.7)' }}>
              <span style={{ color: '#4ade80', fontWeight: 500 }}>{winner}</span> scores higher on stability ({winScore}/100)
            </span>
          </div>
        )
      })()}

      {/* Columns */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <CompareColumn data={resultA} side="left" />
        <div style={{ width: 1, background: 'rgba(255,255,255,0.07)', alignSelf: 'stretch', flexShrink: 0 }} />
        <CompareColumn data={resultB} side={resultC ? 'center' : 'right'} />
        {resultC && (
          <>
            <div style={{ width: 1, background: 'rgba(255,255,255,0.07)', alignSelf: 'stretch', flexShrink: 0 }} />
            <CompareColumn data={resultC} side="right" />
          </>
        )}
      </div>

      <p style={{ textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,0.2)', padding: '8px 0', fontFamily: "'Barlow',sans-serif", fontWeight: 300 }}>
        All scores are AI-generated approximations for informational purposes only. Not financial advice.
      </p>
    </div>
  )
}
