export default function HoverGroup({ steps }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 14, textAlign: 'left' }}>
      {steps.map((s, i) => (
        <div key={i} className="liquid-glass how-step"
          style={{ borderRadius: 20, padding: 28, cursor: 'default' }}>
          <div style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 52, color: 'rgba(255,255,255,0.06)', lineHeight: 1, marginBottom: 14 }}>{s.num}</div>
          <div className="liquid-glass-strong" style={{ borderRadius: '50%', width: 42, height: 42, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14, fontSize: 17 }}>{s.icon}</div>
          <h3 style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 19, color: '#fff', marginBottom: 10 }}>{s.title}</h3>
          <p style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.7 }}>{s.desc}</p>
        </div>
      ))}
    </div>
  )
}
