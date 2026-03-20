import { motion } from 'framer-motion'

export default function GlobalBackground() {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      {/* Pure black base */}
      <div style={{ position: 'absolute', inset: 0, background: '#000' }} />

      {/* Orb top center */}
      <motion.div
        style={{
          position: 'absolute',
          top: '-10%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 600,
          height: 600,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99,102,241,0.06) 0%, transparent 70%)',
          filter: 'blur(40px)',
        }}
        animate={{ y: [0, 30, 0] }}
        transition={{ duration: 20, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' }}
      />

      {/* Orb bottom left */}
      <motion.div
        style={{
          position: 'absolute',
          bottom: '-5%',
          left: '-5%',
          width: 500,
          height: 500,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(168,85,247,0.04) 0%, transparent 70%)',
          filter: 'blur(40px)',
        }}
        animate={{ y: [0, -20, 0], x: [0, 20, 0] }}
        transition={{ duration: 20, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut', delay: 7 }}
      />

      {/* Orb top right */}
      <motion.div
        style={{
          position: 'absolute',
          top: '10%',
          right: '-5%',
          width: 400,
          height: 400,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(59,130,246,0.03) 0%, transparent 70%)',
          filter: 'blur(40px)',
        }}
        animate={{ y: [0, 25, 0], x: [0, -15, 0] }}
        transition={{ duration: 20, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut', delay: 14 }}
      />
    </div>
  )
}
