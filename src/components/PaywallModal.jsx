export default function PaywallModal({ onClose, onUpgrade }) {
  const btn = (primary) => ({
    width:'100%', padding:'13px', borderRadius:40, border:'none', cursor:'pointer',
    fontFamily:"'Barlow',sans-serif", fontWeight:600, fontSize:14,
    background: primary ? '#fff' : 'transparent',
    color: primary ? '#000' : 'rgba(255,255,255,0.4)',
    transition:'transform 0.15s',
  })
  return (
    <div style={{ position:'fixed', inset:0, zIndex:1000, background:'rgba(0,0,0,0.85)', backdropFilter:'blur(8px)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div className="liquid-glass-strong" style={{ borderRadius:24, maxWidth:460, width:'100%', padding:32, animation:'fadeUp 0.3s ease' }}>
        <div style={{ textAlign:'center', marginBottom:24 }}>
          <div style={{ fontFamily:"'Instrument Serif',serif", fontStyle:'italic', fontSize:26, color:'#fff', marginBottom:8 }}>Upgrade to Pro</div>
          <p style={{ fontFamily:"'Barlow',sans-serif", fontWeight:300, fontSize:13, color:'rgba(255,255,255,0.5)' }}>You've used your 10 free analyses this month.</p>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:24 }}>
          <div className="liquid-glass" style={{ borderRadius:16, padding:20 }}>
            <div style={{ fontFamily:"'Barlow',sans-serif", fontWeight:300, fontSize:12, color:'rgba(255,255,255,0.4)', marginBottom:8 }}>Free</div>
            <div style={{ fontFamily:"'Instrument Serif',serif", fontStyle:'italic', fontSize:28, color:'#fff', marginBottom:12 }}>$0<span style={{fontSize:14,color:'rgba(255,255,255,0.4)' }}>/mo</span></div>
            {['10 analyses/month','All data sources','AI analysis'].map(f=>(
              <div key={f} style={{ fontFamily:"'Barlow',sans-serif", fontWeight:300, fontSize:12, color:'rgba(255,255,255,0.5)', marginBottom:6 }}>✓ {f}</div>
            ))}
          </div>
          <div className="liquid-glass-strong" style={{ borderRadius:16, padding:20, border:'1px solid rgba(255,255,255,0.2)' }}>
            <div style={{ display:'inline-block', background:'#fff', color:'#000', fontFamily:"'Barlow',sans-serif", fontWeight:600, fontSize:10, borderRadius:20, padding:'2px 10px', marginBottom:8 }}>Most Popular</div>
            <div style={{ fontFamily:"'Barlow',sans-serif", fontWeight:300, fontSize:12, color:'rgba(255,255,255,0.6)', marginBottom:4 }}>Pro</div>
            <div style={{ fontFamily:"'Instrument Serif',serif", fontStyle:'italic', fontSize:28, color:'#fff', marginBottom:12 }}>$9<span style={{fontSize:14,color:'rgba(255,255,255,0.4)' }}>/mo</span></div>
            {['Unlimited analyses','All data sources','AI analysis','Priority support'].map(f=>(
              <div key={f} style={{ fontFamily:"'Barlow',sans-serif", fontWeight:300, fontSize:12, color:'#fff', marginBottom:6 }}>✓ {f}</div>
            ))}
          </div>
        </div>
        <button onClick={onUpgrade} style={btn(true)}
          onMouseEnter={e=>e.currentTarget.style.transform='scale(1.02)'}
          onMouseLeave={e=>e.currentTarget.style.transform=''}>
          Upgrade to Pro — $9/month →
        </button>
        <button onClick={onClose} style={{...btn(false),marginTop:8}}
          onMouseEnter={e=>e.currentTarget.style.color='rgba(255,255,255,0.7)'}
          onMouseLeave={e=>e.currentTarget.style.color='rgba(255,255,255,0.4)'}>
          Maybe later
        </button>
      </div>
    </div>
  )
}
