import { useState } from 'react'
import { saveCerebrasKey } from '../lib/localAuth'

export default function ApiKeyModal({ currentKey, onSave, onClose, isOnboarding = false }) {
  const [key, setKey] = useState(currentKey || '')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)

  const inp = {
    width: '100%', padding: '13px 16px', boxSizing: 'border-box',
    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 12, color: '#fff', fontSize: 14, outline: 'none',
    fontFamily: "'Barlow',sans-serif", fontWeight: 300,
  }

  const save = async () => {
    const trimmed = key.trim()
    setSaving(true); setSaveError(null)
    try {
      await saveCerebrasKey(trimmed)
      onSave(trimmed)
      onClose()
    } catch {
      setSaveError('Failed to save. Try again.')
    } finally { setSaving(false) }
  }

  const skipAndClose = () => {
    sessionStorage.setItem('dw_key_onboarding_seen', '1')
    onClose()
  }

  return (
    <div style={{ position:'fixed', inset:0, zIndex:1200, background:'rgba(0,0,0,0.92)', backdropFilter:'blur(12px)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div className="liquid-glass-strong" style={{ borderRadius:24, maxWidth:480, width:'100%', padding:36, animation:'fadeUp 0.3s ease' }}>

        <div style={{ fontFamily:"'Instrument Serif',serif", fontStyle:'italic', fontSize:24, color:'#fff', marginBottom:8 }}>
          Your Cerebras API Key
        </div>
        <p style={{ fontFamily:"'Barlow',sans-serif", fontWeight:300, fontSize:13, color:'rgba(255,255,255,0.5)', lineHeight:1.75, marginBottom:20 }}>
          An API key is a free passcode that connects Dwelling directly to Cerebras AI on your behalf. Your searches go straight to Cerebras — Dwelling never sees them.
        </p>

        <div className="liquid-glass" style={{ borderRadius:14, padding:'14px 18px', marginBottom:24 }}>
          {[
            ['🆓', 'Free forever. Sign up at Cerebras in under a minute — no credit card required.'],
            ['🔒', 'Private by design. Queries go from your browser directly to Cerebras, not through our servers.'],
            ['⚡', 'No limits. Free accounts get 1M tokens/minute — hundreds of reports with no cap.'],
          ].map(([icon, text]) => (
            <div key={text} style={{ display:'flex', gap:10, marginBottom:8, alignItems:'flex-start' }}>
              <span style={{ fontSize:14, flexShrink:0, marginTop:1 }}>{icon}</span>
              <span style={{ fontFamily:"'Barlow',sans-serif", fontWeight:300, fontSize:12.5, color:'rgba(255,255,255,0.6)', lineHeight:1.6 }}>{text}</span>
            </div>
          ))}
        </div>

        <div style={{ marginBottom:6 }}>
          <label style={{ display:'block', fontSize:11, color:'rgba(255,255,255,0.4)', marginBottom:6, fontFamily:"'Barlow',sans-serif", letterSpacing:'0.08em', textTransform:'uppercase' }}>API Key</label>
          <input
            autoFocus
            type="password" value={key} onChange={e => setKey(e.target.value)}
            placeholder="csk-..."
            style={inp}
            onFocus={e => { e.target.style.borderColor='rgba(255,255,255,0.3)'; e.target.style.background='rgba(255,255,255,0.08)' }}
            onBlur={e => { e.target.style.borderColor='rgba(255,255,255,0.1)'; e.target.style.background='rgba(255,255,255,0.05)' }}
            onKeyDown={e => e.key === 'Enter' && key.trim() && save()}
          />
        </div>
        <p style={{ fontFamily:"'Barlow',sans-serif", fontWeight:300, fontSize:11.5, color:'rgba(255,255,255,0.3)', marginBottom:20, lineHeight:1.6 }}>
          Get yours at{' '}
          <a href="https://cloud.cerebras.ai" target="_blank" rel="noreferrer" style={{ color:'rgba(255,255,255,0.55)', textDecoration:'underline', textUnderlineOffset:3 }}>cloud.cerebras.ai</a>
          {' '}→ API Keys.
        </p>

        {saveError && <p style={{ color:'#f87171', fontFamily:"'Barlow',sans-serif", fontSize:12, marginBottom:12 }}>⚠ {saveError}</p>}

        <div style={{ display:'flex', gap:10 }}>
          <button onClick={save} disabled={saving || !key.trim()} style={{
            flex:1, padding:'13px', border:'none', borderRadius:40, fontFamily:"'Barlow',sans-serif", fontWeight:600, fontSize:14,
            background: saving || !key.trim() ? 'rgba(255,255,255,0.08)' : '#fff',
            color: saving || !key.trim() ? 'rgba(255,255,255,0.25)' : '#000',
            cursor: saving || !key.trim() ? 'not-allowed' : 'pointer',
          }}>
            {saving ? 'Saving...' : 'Save & Start Analyzing →'}
          </button>
          {!isOnboarding && (
            <button onClick={onClose} style={{ padding:'13px 20px', background:'rgba(255,255,255,0.06)', border:'none', borderRadius:40, color:'rgba(255,255,255,0.5)', fontFamily:"'Barlow',sans-serif", fontSize:14, cursor:'pointer' }}>Cancel</button>
          )}
        </div>

        {isOnboarding && (
          <button onClick={skipAndClose} style={{ display:'block', width:'100%', marginTop:10, background:'none', border:'none', color:'rgba(255,255,255,0.2)', fontFamily:"'Barlow',sans-serif", fontSize:12, cursor:'pointer', padding:'4px' }}>
            Skip — I'll add it later from the 🔑 button
          </button>
        )}
      </div>
    </div>
  )
}
