import { motion } from 'framer-motion'

const steps = ['Locating address...', 'Fetching real data...', 'Running neighborhood analysis...', 'AI property valuation...', 'Building report...']

export default function LoadingState({ step = 0 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 20px', gap: 32 }}>
      {/* Animated logo */}
      <motion.div
        animate={{ opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: 32, color: '#ffffff', letterSpacing: '-0.02em' }}
      >
        DW<span style={{ opacity: 0.4 }}>.</span>ELLING
      </motion.div>

      {/* Progress steps */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
        {steps.map((s, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className={i <= step ? 'liquid-glass-strong' : 'liquid-glass'}
            style={{
              borderRadius: 40,
              padding: '8px 16px',
              background: i === step ? '#ffffff' : i < step ? 'rgba(255,255,255,0.08)' : 'transparent',
              transition: 'all 0.3s ease',
            }}
          >
            <span style={{
              fontFamily: "'Barlow', sans-serif",
              fontWeight: 400,
              fontSize: 12,
              color: i === step ? '#000' : i < step ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.3)',
            }}>
              {i < step ? '✓ ' : ''}{s}
            </span>
          </motion.div>
        ))}
      </div>

      {/* Progress bar */}
      <div style={{ width: 200, height: 2, background: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' }}>
        <motion.div
          style={{ height: '100%', background: '#ffffff', borderRadius: 2 }}
          animate={{ width: `${((step + 1) / steps.length) * 100}%` }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        />
      </div>
    </div>
  )
}
