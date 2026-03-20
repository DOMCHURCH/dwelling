// Static radial gradients — no JS animation, no framer-motion.
// Orbs use pure CSS animation which runs on the compositor thread.
export default function GlobalBackground() {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, background: '#000' }} />
      {/* Orb top-center — CSS keyframe, compositor only */}
      <div style={{
        position: 'absolute', top: '-10%', left: '50%', transform: 'translateX(-50%)',
        width: 600, height: 600, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(99,102,241,0.07) 0%, transparent 70%)',
        filter: 'blur(40px)',
        animation: 'orb-drift-1 20s ease-in-out infinite alternate',
      }} />
      {/* Orb bottom-left */}
      <div style={{
        position: 'absolute', bottom: '-5%', left: '-5%',
        width: 500, height: 500, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(168,85,247,0.05) 0%, transparent 70%)',
        filter: 'blur(40px)',
        animation: 'orb-drift-2 25s ease-in-out infinite alternate',
      }} />
      {/* Orb top-right */}
      <div style={{
        position: 'absolute', top: '10%', right: '-5%',
        width: 400, height: 400, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(59,130,246,0.04) 0%, transparent 70%)',
        filter: 'blur(40px)',
        animation: 'orb-drift-3 18s ease-in-out infinite alternate',
      }} />
    </div>
  )
}
