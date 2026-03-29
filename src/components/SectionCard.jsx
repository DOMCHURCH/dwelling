export default function SectionCard({ title, icon, children }) {
  return (
    <div className="liquid-glass" style={{ borderRadius: 20, marginBottom: 0 }}>
      {title && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '18px 24px 14px',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
        }}>
          {icon && <span style={{ fontSize: 15, opacity: 0.7 }}>{icon}</span>}
          <h2 style={{ fontSize: 16, fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontWeight: 400, color: '#ffffff', letterSpacing: '-0.01em', margin: 0 }}>
            {title}
          </h2>
        </div>
      )}
      <div style={{ padding: title ? '16px 24px 24px' : '24px' }}>
        {children}
      </div>
    </div>
  )
}
