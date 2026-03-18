export default function SectionCard({ title, icon, children, delay = 0, accent = 'var(--white)' }) {
  return (
    <div className="fade-up brutal-card" style={{
      padding: '24px',
      animationDelay: `${delay}ms`,
      marginBottom: 0,
    }}>
      {title && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          marginBottom: 20, paddingBottom: 14,
          borderBottom: `2px solid ${accent}`,
        }}>
          {icon && <span style={{ fontSize: 16 }}>{icon}</span>}
          <h2 style={{
            fontSize: 11,
            fontFamily: "'Space Mono', monospace",
            fontWeight: 700,
            color: accent,
            textTransform: 'uppercase',
            letterSpacing: '0.2em',
          }}>
            {title}
          </h2>
        </div>
      )}
      {children}
    </div>
  )
}
