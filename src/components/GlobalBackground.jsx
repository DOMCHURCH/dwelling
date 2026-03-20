// Static orbs — no filter:blur (causes continuous repaints), no animation
// Large soft radial gradients are naturally blurry without filter cost
export default function GlobalBackground() {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      {/* NO solid black div — it was painting over section backgrounds */}
      <div style={{
        position: 'absolute', top: '-20%', left: '50%',
        transform: 'translateX(-50%)',
        width: 900, height: 900, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(99,102,241,0.06) 0%, transparent 55%)',
      }} />
      <div style={{
        position: 'absolute', bottom: '-10%', left: '-10%',
        width: 700, height: 700, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(168,85,247,0.05) 0%, transparent 55%)',
      }} />
      <div style={{
        position: 'absolute', top: '5%', right: '-10%',
        width: 600, height: 600, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(59,130,246,0.04) 0%, transparent 55%)',
      }} />
    </div>
  )
}
