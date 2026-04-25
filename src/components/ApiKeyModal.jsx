import { useState } from 'react'
import { getUserApiKey, setUserApiKey } from '../lib/localAuth'

const PROVIDERS = [
  { id: 'cerebras',   label: 'Cerebras',   prefix: 'csk-',   free: true,  url: 'https://cloud.cerebras.ai',         note: 'Free · 1M tokens/min' },
  { id: 'groq',       label: 'Groq',       prefix: 'gsk_',   free: true,  url: 'https://console.groq.com/keys',     note: 'Free tier available' },
  { id: 'openrouter', label: 'OpenRouter', prefix: 'sk-or-', free: true,  url: 'https://openrouter.ai/keys',        note: 'Pay-per-use' },
  { id: 'openai',     label: 'OpenAI',     prefix: 'sk-',    free: false, url: 'https://platform.openai.com/api-keys', note: 'Pay-per-use' },
  { id: 'anthropic',  label: 'Anthropic',  prefix: 'sk-ant-',free: false, url: 'https://console.anthropic.com/keys',  note: 'Pay-per-use' },
]

function detectProvider(key) {
  if (!key) return null
  if (key.startsWith('csk-'))    return PROVIDERS.find(p => p.id === 'cerebras')
  if (key.startsWith('gsk_'))    return PROVIDERS.find(p => p.id === 'groq')
  if (key.startsWith('sk-or-'))  return PROVIDERS.find(p => p.id === 'openrouter')
  if (key.startsWith('sk-ant-')) return PROVIDERS.find(p => p.id === 'anthropic')
  if (key.startsWith('sk-'))     return PROVIDERS.find(p => p.id === 'openai')
  return null
}

export default function ApiKeyModal({ onClose, onSaved }) {
  const existing = getUserApiKey()
  const [key, setKey] = useState('')
  const detected = detectProvider(key.trim())

  const save = () => {
    const trimmed = key.trim()
    if (!trimmed) return
    setUserApiKey(trimmed)
    onSaved?.(trimmed)
    onClose?.()
  }

  const remove = () => {
    setUserApiKey('')
    onSaved?.('')
    onClose?.()
  }

  const inp = {
    width: '100%', padding: '13px 16px', boxSizing: 'border-box',
    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 12, color: '#fff', fontSize: 14, outline: 'none',
    fontFamily: "'Barlow',sans-serif", fontWeight: 300,
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1200, background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div className="liquid-glass-strong" style={{ borderRadius: 24, maxWidth: 500, width: '100%', padding: 36, animation: 'fadeUp 0.3s ease' }}>

        <div style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 24, color: '#fff', marginBottom: 8 }}>
          Add your AI API key
        </div>
        <p style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.75, marginBottom: 20 }}>
          Dwelling is free and open — bring your own key from any supported provider. Your key stays in your browser and is never sent to our servers.
        </p>

        {existing && (
          <div style={{ background: 'rgba(74,222,128,0.07)', border: '1px solid rgba(74,222,128,0.2)', borderRadius: 12, padding: '12px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div>
              <div style={{ fontFamily: "'Barlow',sans-serif", fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Current key</div>
              <div style={{ fontFamily: 'monospace', fontSize: 13, color: '#4ade80' }}>
                {existing.slice(0, 10)}•••••{existing.slice(-4)}
              </div>
            </div>
            <button onClick={remove} style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.1)', color: '#f87171', fontFamily: "'Barlow',sans-serif", fontSize: 12, cursor: 'pointer' }}>
              Remove
            </button>
          </div>
        )}

        {/* Provider pills */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 18 }}>
          {PROVIDERS.map(p => (
            <a key={p.id} href={p.url} target="_blank" rel="noreferrer" style={{
              padding: '4px 12px', borderRadius: 99, fontSize: 11.5, fontFamily: "'Barlow',sans-serif",
              color: 'rgba(255,255,255,0.6)', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
              textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 5, transition: 'opacity 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.75'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            >
              <span>{p.label}</span>
              {p.free && <span style={{ color: '#4ade80', fontSize: 10 }}>FREE</span>}
            </a>
          ))}
        </div>

        <div style={{ marginBottom: 6 }}>
          <label style={{ display: 'block', fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 6, fontFamily: "'Barlow',sans-serif", letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            {detected ? `${detected.label} key detected` : 'Paste your API key'}
          </label>
          <input
            autoFocus
            type="password"
            value={key}
            onChange={e => setKey(e.target.value)}
            placeholder="csk-… / sk-… / sk-ant-… / gsk_… / sk-or-…"
            style={{ ...inp, borderColor: detected ? 'rgba(74,222,128,0.4)' : 'rgba(255,255,255,0.1)' }}
            onFocus={e => { e.target.style.background = 'rgba(255,255,255,0.08)' }}
            onBlur={e => { e.target.style.background = 'rgba(255,255,255,0.05)' }}
            onKeyDown={e => e.key === 'Enter' && key.trim() && save()}
          />
        </div>
        <p style={{ fontFamily: "'Barlow',sans-serif", fontSize: 11.5, color: 'rgba(255,255,255,0.3)', marginBottom: 20, lineHeight: 1.6 }}>
          Stored in your browser only — never transmitted to Dwelling servers. Start free with Cerebras at{' '}
          <a href="https://cloud.cerebras.ai" target="_blank" rel="noreferrer" style={{ color: 'rgba(255,255,255,0.5)', textDecoration: 'underline', textUnderlineOffset: 3 }}>cloud.cerebras.ai</a>.
        </p>

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={save} disabled={!key.trim()} style={{
            flex: 1, padding: '13px', border: 'none', borderRadius: 40, fontFamily: "'Barlow',sans-serif", fontWeight: 600, fontSize: 14,
            background: !key.trim() ? 'rgba(255,255,255,0.08)' : '#fff',
            color: !key.trim() ? 'rgba(255,255,255,0.25)' : '#000',
            cursor: !key.trim() ? 'not-allowed' : 'pointer', transition: 'opacity 0.15s',
          }}>
            Save Key →
          </button>
          <button onClick={onClose} style={{ padding: '13px 20px', background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 40, color: 'rgba(255,255,255,0.5)', fontFamily: "'Barlow',sans-serif", fontSize: 14, cursor: 'pointer' }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
