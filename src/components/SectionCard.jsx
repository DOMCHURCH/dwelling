// No framer-motion — plain CSS, no scroll listeners, no per-frame JS
export default function SectionCard({ title, icon, children, className = "" }) {
  return (
    <div className={`liquid-glass ${className}`} style={{ borderRadius: 20, padding: 24, marginBottom: 0 }}>
      {title && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, paddingBottom: 14, borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          {icon && <span style={{ fontSize: 15, opacity: 0.7 }}>{icon}</span>}
          <h2 style={{ fontSize: 16, fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontWeight: 400, color: '#ffffff', letterSpacing: '-0.01em' }}>
            {title}
          </h2>
        </div>
      )}
      {children}
    </div>
  )
}
