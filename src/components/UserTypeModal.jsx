import { useState } from 'react'

const USER_TYPE_KEY = 'dw_user_type'

export function getUserType() {
  return localStorage.getItem(USER_TYPE_KEY) || null
}

export function setUserType(type) {
  localStorage.setItem(USER_TYPE_KEY, type)
}

const TYPES = [
  { id: 'investor',  icon: '📈', label: 'Investor',        sub: 'Evaluating returns & market timing' },
  { id: 'buyer',     icon: '🏠', label: 'Home Buyer',      sub: 'Looking for a place to settle' },
  { id: 'renter',    icon: '🗝', label: 'Renter',          sub: 'Finding the right neighbourhood' },
  { id: 'agent',     icon: '🤝', label: 'Agent / Broker',  sub: 'Researching areas for clients' },
  { id: 'explorer',  icon: '🔍', label: 'Just Exploring',  sub: 'Curious about a city or area' },
]

export default function UserTypeModal({ onSelect, onSkip }) {
  const [selected, setSelected] = useState(null)
  const [saving, setSaving] = useState(false)

  const handleConfirm = () => {
    if (!selected) return
    setSaving(true)
    setUserType(selected)
    setTimeout(() => onSelect(selected), 200)
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 300,
        background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px 16px',
      }}
      onClick={e => e.target === e.currentTarget && onSkip()}
    >
      <div
        className="liquid-glass-strong"
        style={{
          borderRadius: 24, width: '100%', maxWidth: 420,
          padding: '32px 28px',
          border: '1px solid rgba(255,255,255,0.1)',
          animation: 'fadeUp 0.25s ease',
        }}
      >
        <div style={{ marginBottom: 22 }}>
          <div style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 24, color: '#fff', marginBottom: 6 }}>
            What brings you to Dwelling?
          </div>
          <p style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 13, color: 'rgba(255,255,255,0.45)', lineHeight: 1.6 }}>
            Helps us surface the most relevant insights for you.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
          {TYPES.map(t => (
            <button
              key={t.id}
              onClick={() => setSelected(t.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 16px', borderRadius: 14, border: 'none', cursor: 'pointer',
                background: selected === t.id
                  ? 'rgba(255,255,255,0.12)'
                  : 'rgba(255,255,255,0.04)',
                outline: selected === t.id
                  ? '1px solid rgba(255,255,255,0.25)'
                  : '1px solid rgba(255,255,255,0.06)',
                transition: 'all 0.15s',
                textAlign: 'left',
              }}
              onMouseEnter={e => { if (selected !== t.id) e.currentTarget.style.background = 'rgba(255,255,255,0.07)' }}
              onMouseLeave={e => { if (selected !== t.id) e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
            >
              <span style={{ fontSize: 20, flexShrink: 0 }}>{t.icon}</span>
              <div>
                <div style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 500, fontSize: 14, color: '#fff' }}>{t.label}</div>
                <div style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 1 }}>{t.sub}</div>
              </div>
              {selected === t.id && (
                <div style={{ marginLeft: 'auto', width: 18, height: 18, borderRadius: '50%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: 10, color: '#000' }}>✓</span>
                </div>
              )}
            </button>
          ))}
        </div>

        <button
          onClick={handleConfirm}
          disabled={!selected || saving}
          style={{
            width: '100%', padding: '13px', borderRadius: 40, border: 'none',
            cursor: selected ? 'pointer' : 'default',
            fontFamily: "'Barlow',sans-serif", fontWeight: 600, fontSize: 14,
            background: selected
              ? 'linear-gradient(90deg, #38bdf8, #818cf8)'
              : 'rgba(255,255,255,0.08)',
            color: selected ? '#000' : 'rgba(255,255,255,0.25)',
            transition: 'all 0.2s',
          }}
        >
          {saving ? 'Saving...' : 'Continue →'}
        </button>

        <div style={{ textAlign: 'center', marginTop: 12 }}>
          <button
            onClick={onSkip}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 12,
              color: 'rgba(255,255,255,0.22)', transition: 'color 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.5)'}
            onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.22)'}
          >
            Skip for now
          </button>
        </div>
      </div>
    </div>
  )
}
