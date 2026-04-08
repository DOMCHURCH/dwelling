export default function HoverGroupGrid({ cards }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 14 }}>
      {cards.map((card, i) => (
        <div key={i} className="liquid-glass how-step"
          style={{ borderRadius: 18, padding: 24, cursor: 'default' }}>
          <div className="liquid-glass-strong" style={{ borderRadius: '50%', width: 42, height: 42, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18, fontSize: 17 }}>{card.icon}</div>
          <h3 style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 17, color: '#fff', marginBottom: 7 }}>{card.title}</h3>
          <p style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.7 }}>{card.desc}</p>
        </div>
      ))}
    </div>
  )
}
