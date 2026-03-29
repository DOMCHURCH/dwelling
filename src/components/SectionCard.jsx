import { useState } from 'react'

const DEFAULT_COLLAPSED = ['Cost of Living', 'Price History & Projection', 'Flood Risk', 'Environmental Risk', 'Local Insights']

export default function SectionCard({ title, icon, children }) {
  const [open, setOpen] = useState(!DEFAULT_COLLAPSED.includes(title))

  return (
    <div className="liquid-glass" style={{ borderRadius: 20, marginBottom: 0, overflow: 'hidden' }}>
      {title && (
        <button
          onClick={() => setOpen(o => !o)}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 10,
            padding: open ? '18px 24px 14px' : '18px 24px',
            borderBottom: open ? '1px solid rgba(255,255,255,0.07)' : 'none',
            background: 'none', border: 'none', cursor: 'pointer',
          }}
        >
          {icon && <span style={{ fontSize: 15, opacity: 0.7, flexShrink: 0 }}>{icon}</span>}
          <h2 style={{ flex: 1, textAlign: 'left', fontSize: 16, fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontWeight: 400, color: '#ffffff', letterSpacing: '-0.01em', margin: 0 }}>
            {title}
          </h2>
          <span style={{
            fontSize: 11, color: 'rgba(255,255,255,0.3)',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.3s cubic-bezier(0.34,1.56,0.64,1)',
            display: 'inline-block', flexShrink: 0,
          }}>▼</span>
        </button>
      )}
      <div style={{
        maxHeight: open ? '2000px' : '0px',
        overflow: 'hidden',
        transition: open
          ? 'max-height 0.5s cubic-bezier(0.4,0,0.2,1)'
          : 'max-height 0.3s cubic-bezier(0.4,0,0.2,1)',
      }}>
        <div style={{ padding: title ? '16px 24px 24px' : '24px' }}>
          {children}
        </div>
      </div>
    </div>
  )
}
