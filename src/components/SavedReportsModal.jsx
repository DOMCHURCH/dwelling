import { useEffect } from 'react'

export default function SavedReportsModal({ saved, onLoad, onDelete, onClose, loading }) {
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  if (!saved.length) return (
    <Overlay onClose={onClose}>
      <div style={{ textAlign: 'center', padding: '32px 0' }}>
        <div style={{ fontSize: 40, marginBottom: 14 }}>📂</div>
        <div style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 22, color: '#fff', marginBottom: 8 }}>No saved analyses yet</div>
        <p style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>
          Analyze a market and click "Save Report" to bookmark it here.
        </p>
        <button onClick={onClose} style={closeBtnStyle}>Close</button>
      </div>
    </Overlay>
  )

  return (
    <Overlay onClose={onClose}>
      <div style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 22, color: '#fff', marginBottom: 4 }}>Saved Analyses</div>
      <div style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 12, color: 'rgba(255,255,255,0.35)', marginBottom: 20 }}>{saved.length} saved</div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: '60vh', overflowY: 'auto' }}>
        {saved.map(r => (
          <div key={r.id} className="liquid-glass" style={{
            borderRadius: 14, padding: '14px 16px',
            display: 'flex', alignItems: 'center', gap: 12,
            cursor: 'pointer', transition: 'background 0.15s',
          }}
            onClick={() => { onLoad(r); onClose() }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.07)'}
            onMouseLeave={e => e.currentTarget.style.background = ''}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 16, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.city}</div>
              <div style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 11, color: 'rgba(255,255,255,0.35)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>{r.address}</div>
              <div style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 10, color: 'rgba(255,255,255,0.25)', marginTop: 4 }}>
                {new Date(r.created_at || r.savedAt).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}
              </div>
            </div>
            {r.score != null && (
              <div style={{ textAlign: 'center', flexShrink: 0 }}>
                <div style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 22, color: r.score >= 70 ? '#4ade80' : r.score >= 45 ? '#fbbf24' : '#f87171', lineHeight: 1 }}>{r.score}</div>
                <div style={{ fontFamily: "'Barlow',sans-serif", fontSize: 9, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>INV. SCORE</div>
              </div>
            )}
            {r.verdict && (
              <div style={{
                padding: '4px 10px', borderRadius: 20, flexShrink: 0,
                background: r.verdict === 'Excellent' || r.verdict === 'Good' ? 'rgba(74,222,128,0.12)' : r.verdict === 'Caution' ? 'rgba(251,191,36,0.1)' : 'rgba(248,113,113,0.1)',
              }}>
                <span style={{ fontFamily: "'Barlow',sans-serif", fontSize: 10, fontWeight: 600, color: r.verdict === 'Excellent' || r.verdict === 'Good' ? '#4ade80' : r.verdict === 'Caution' ? '#fbbf24' : '#f87171' }}>{r.verdict}</span>
              </div>
            )}
            <button
              onClick={e => { e.stopPropagation(); onDelete(r.id) }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.2)', fontSize: 16, padding: '0 4px', flexShrink: 0, transition: 'color 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.color = '#f87171'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.2)'}
            >×</button>
          </div>
        ))}
      </div>

      <button onClick={onClose} style={{ ...closeBtnStyle, marginTop: 20 }}>Close</button>
    </Overlay>
  )
}

function Overlay({ children, onClose }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="liquid-glass-strong" style={{ borderRadius: 24, width: '100%', maxWidth: 480, padding: '28px 24px', border: '1px solid rgba(255,255,255,0.1)', animation: 'fadeUp 0.25s ease' }}>
        {children}
      </div>
    </div>
  )
}

const closeBtnStyle = {
  width: '100%', padding: '11px', borderRadius: 40, border: 'none', cursor: 'pointer',
  fontFamily: "'Barlow',sans-serif", fontWeight: 400, fontSize: 13,
  background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)',
}
