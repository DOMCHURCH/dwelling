import { memo, useState } from 'react'

const LockedSection = memo(function LockedSection({
  title,
  icon = '🔒',
  previewContent,
  ctaText = 'Unlock this insight →',
  onUnlock,
}) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      className="liquid-glass"
      onClick={onUnlock}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        borderRadius: 20,
        padding: '28px 32px',
        marginBottom: 16,
        cursor: 'pointer',
        border: hovered ? '1px solid rgba(255,255,255,0.2)' : '1px solid rgba(255,255,255,0.07)',
        transition: 'border-color 0.2s, box-shadow 0.2s',
        boxShadow: hovered ? '0 0 24px rgba(255,255,255,0.06)' : 'none',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Section header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: previewContent ? 16 : 0 }}>
        <span style={{ fontSize: 18 }}>{icon}</span>
        <span style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 500, fontSize: 14, color: 'rgba(255,255,255,0.7)' }}>
          {title}
        </span>
        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'rgba(255,255,255,0.25)' }}>🔒</span>
      </div>

      {/* Blurred preview */}
      {previewContent && (
        <div style={{ filter: 'blur(5px)', pointerEvents: 'none', userSelect: 'none', opacity: 0.4, marginBottom: 16 }}>
          {previewContent}
        </div>
      )}

      {/* CTA */}
      <div style={{ textAlign: 'center' }}>
        <button
          onClick={e => { e.stopPropagation(); onUnlock?.() }}
          style={{
            background: hovered ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.07)',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: 10,
            padding: '10px 22px',
            fontFamily: "'Barlow',sans-serif",
            fontWeight: 500,
            fontSize: 13,
            color: '#fff',
            cursor: 'pointer',
            transition: 'background 0.2s',
            // Mobile: full-width
            width: 'auto',
            minWidth: 180,
          }}
        >
          {ctaText}
        </button>
      </div>
    </div>
  )
})

export default LockedSection
