const steps = ['Locating address...', 'Fetching real data...', 'Neighborhood analysis...', 'AI valuation...', 'Building report...']

export default function LoadingState({ step = 0 }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'80px 20px', gap:32 }}>
      <div style={{ fontFamily:"'Instrument Serif',serif", fontStyle:'italic', fontSize:32, color:'#fff', animation:'glow-pulse 2s ease-in-out infinite' }}>
        DW<span style={{opacity:0.4}}>.</span>ELLING
      </div>
      <div style={{ display:'flex', gap:8, flexWrap:'wrap', justifyContent:'center' }}>
        {steps.map((s, i) => (
          <div key={i} className={i <= step ? 'liquid-glass-strong' : 'liquid-glass'}
            style={{ borderRadius:40, padding:'8px 16px', background: i===step ? '#fff' : 'transparent', transition:'background 0.3s' }}>
            <span style={{ fontFamily:"'Barlow',sans-serif", fontWeight:400, fontSize:12, color: i===step ? '#000' : i<step ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.3)' }}>
              {i < step ? '✓ ' : ''}{s}
            </span>
          </div>
        ))}
      </div>
      <div style={{ width:200, height:2, background:'rgba(255,255,255,0.08)', borderRadius:2, overflow:'hidden' }}>
        <div style={{ height:'100%', background:'#fff', borderRadius:2, width:`${((step+1)/steps.length)*100}%`, transition:'width 0.4s ease' }} />
      </div>
    </div>
  )
}
