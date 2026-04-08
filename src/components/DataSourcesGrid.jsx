export default function DataSourcesGrid({ partners }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 12 }}>
      {partners.map((p, i) => (
        <div key={i}>
          <div className="liquid-glass"
            style={{ borderRadius: 18, padding: 24, height: '100%', cursor: 'default',
              opacity: p.status === 'soon' ? 0.7 : 1,
            }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div className="liquid-glass-strong" style={{ borderRadius: 10, width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>{p.icon}</div>
                <div>
                  <div style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 500, fontSize: 14, color: '#fff', lineHeight: 1.2 }}>{p.name}</div>
                  <div style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>{p.type}</div>
                </div>
              </div>
              <div style={{
                borderRadius: 20, padding: '3px 10px', fontSize: 10,
                fontFamily: "'Barlow',sans-serif", fontWeight: 600, flexShrink: 0,
                background: p.status === 'live' ? 'rgba(74,222,128,0.12)' : 'rgba(255,255,255,0.06)',
                border: `1px solid ${p.status === 'live' ? 'rgba(74,222,128,0.25)' : 'rgba(255,255,255,0.1)'}`,
                color: p.status === 'live' ? '#4ade80' : 'rgba(255,255,255,0.4)',
              }}>
                {p.status === 'live' ? '● Live' : '◌ Soon'}
              </div>
            </div>
            <p style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.7 }}>{p.desc}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
