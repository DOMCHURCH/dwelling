import { memo, useState } from 'react'

const BYOKPrompt = memo(function BYOKPrompt({ onKeySubmit, onDismiss, loading }) {
  const [key, setKey] = useState('')
  const [error, setError] = useState('')
  const [step, setStep] = useState(1) // 1 = instructions, 2 = input

  function validateKey(k) {
    return typeof k === 'string' && k.trim().length > 20
  }

  async function handleSubmit() {
    setError('')
    if (!validateKey(key)) {
      setError('Please paste a valid Cerebras API key.')
      return
    }
    await onKeySubmit(key.trim())
  }

  return (
    <div
      className="liquid-glass"
      style={{
        borderRadius: 20,
        padding: '28px 32px',
        marginTop: 24,
        border: '1px solid rgba(56,189,248,0.2)',
        background: 'rgba(56,189,248,0.04)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <span style={{ fontSize: 18 }}>🔑</span>
        <span style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 600, fontSize: 14, color: '#38bdf8' }}>
          Unlock full AI analysis
        </span>
        {onDismiss && (
          <button
            onClick={onDismiss}
            style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: 16 }}
          >
            ×
          </button>
        )}
      </div>

      <p style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6, marginBottom: 20 }}>
        Connect your free Cerebras API key to unlock ROI analysis, flood risk, price projections, and the full AI verdict — <strong style={{ color: 'rgba(255,255,255,0.8)' }}>no markup, direct cost</strong>.
      </p>

      {step === 1 && (
        <>
          <ol style={{ fontFamily: "'Barlow',sans-serif", fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.8, paddingLeft: 20, marginBottom: 12 }}>
            <li>
              Go to{' '}
              <a href="https://cloud.cerebras.ai" target="_blank" rel="noopener noreferrer" style={{ color: '#38bdf8' }}>
                cloud.cerebras.ai
              </a>{' '}
              → API Keys → Create key
            </li>
            <li>Copy your key (starts with <code style={{ background: 'rgba(255,255,255,0.08)', padding: '1px 5px', borderRadius: 4, fontSize: 12 }}>csk-</code>)</li>
            <li>Paste it below — takes 30 seconds</li>
          </ol>
          <p style={{ fontFamily: "'Barlow',sans-serif", fontSize: 12, color: 'rgba(255,255,255,0.35)', lineHeight: 1.6, marginBottom: 20 }}>
            Analyses run on <strong style={{ color: 'rgba(255,255,255,0.55)' }}>Llama 3.3 70B</strong> — Cerebras retired the older Llama 3.1 8B model in May 2026, and 70B delivers noticeably better accuracy on real estate data.
          </p>
          <button
            onClick={() => setStep(2)}
            style={{
              background: '#38bdf8', color: '#000', border: 'none', borderRadius: 10,
              padding: '10px 22px', fontFamily: "'Barlow',sans-serif", fontWeight: 600, fontSize: 13,
              cursor: 'pointer', width: '100%',
            }}
          >
            I have my key →
          </button>
        </>
      )}

      {step === 2 && (
        <>
          <input
            type="password"
            value={key}
            onChange={e => { setKey(e.target.value); setError('') }}
            placeholder="Paste your Cerebras API key..."
            style={{
              width: '100%', boxSizing: 'border-box',
              background: 'rgba(255,255,255,0.06)', border: error ? '1px solid #ef4444' : '1px solid rgba(255,255,255,0.15)',
              borderRadius: 10, padding: '12px 14px',
              fontFamily: "'Barlow',sans-serif", fontSize: 13, color: '#fff',
              marginBottom: 8, outline: 'none',
            }}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            autoFocus
          />
          {error && (
            <p style={{ fontFamily: "'Barlow',sans-serif", fontSize: 12, color: '#ef4444', marginBottom: 8 }}>
              {error}
            </p>
          )}
          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{
              background: loading ? 'rgba(56,189,248,0.5)' : '#38bdf8',
              color: '#000', border: 'none', borderRadius: 10,
              padding: '10px 22px', fontFamily: "'Barlow',sans-serif", fontWeight: 600, fontSize: 13,
              cursor: loading ? 'not-allowed' : 'pointer', width: '100%', transition: 'background 0.2s',
            }}
          >
            {loading ? 'Connecting...' : 'Connect & unlock full AI report →'}
          </button>
          <button
            onClick={() => setStep(1)}
            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: 12, marginTop: 8, width: '100%' }}
          >
            ← Back
          </button>
        </>
      )}
    </div>
  )
})

export default BYOKPrompt
