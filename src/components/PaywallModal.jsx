import { motion } from 'framer-motion'

export default function PaywallModal({ onClose, onUpgrade }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
        className="liquid-glass-strong"
        style={{ borderRadius: 24, maxWidth: 460, width: '100%', padding: 32 }}
      >
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: 26, color: '#ffffff', marginBottom: 8 }}>Upgrade to Pro</div>
          <p style={{ fontFamily: "'Barlow', sans-serif", fontWeight: 300, fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>You've used your 10 free analyses this month.</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
          {/* Free */}
          <div className="liquid-glass" style={{ borderRadius: 16, padding: 20 }}>
            <div style={{ fontFamily: "'Barlow', sans-serif", fontWeight: 300, fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>Free</div>
            <div style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: 28, color: '#ffffff', marginBottom: 12 }}>$0<span style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)' }}>/mo</span></div>
            {['10 analyses/month', 'All data sources', 'AI analysis'].map(f => (
              <div key={f} style={{ fontFamily: "'Barlow', sans-serif", fontWeight: 300, fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>✓ {f}</div>
            ))}
          </div>
          {/* Pro */}
          <div className="liquid-glass-strong" style={{ borderRadius: 16, padding: 20, border: '1px solid rgba(255,255,255,0.2)' }}>
            <div style={{ display: 'inline-block', background: '#ffffff', color: '#000', fontFamily: "'Barlow', sans-serif", fontWeight: 600, fontSize: 10, borderRadius: 20, padding: '2px 10px', marginBottom: 8 }}>Most Popular</div>
            <div style={{ fontFamily: "'Barlow', sans-serif", fontWeight: 300, fontSize: 12, color: 'rgba(255,255,255,0.6)', marginBottom: 4 }}>Pro</div>
            <div style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: 28, color: '#ffffff', marginBottom: 12 }}>$9<span style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)' }}>/mo</span></div>
            {['Unlimited analyses', 'All data sources', 'AI analysis', 'Priority support'].map(f => (
              <div key={f} style={{ fontFamily: "'Barlow', sans-serif", fontWeight: 300, fontSize: 12, color: '#ffffff', marginBottom: 6 }}>✓ {f}</div>
            ))}
          </div>
        </div>

        <motion.button
          onClick={onUpgrade}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          style={{ width: '100%', padding: '14px', background: '#ffffff', border: 'none', borderRadius: 40, color: '#000', fontFamily: "'Barlow', sans-serif", fontWeight: 600, fontSize: 14, cursor: 'pointer', marginBottom: 10 }}
        >
          Upgrade to Pro — $9/month →
        </motion.button>
        <button
          onClick={onClose}
          style={{ display: 'block', width: '100%', textAlign: 'center', background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.3)', fontFamily: "'Barlow', sans-serif", fontSize: 12, cursor: 'pointer', padding: '8px' }}
          onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.6)'}
          onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.3)'}
        >
          Maybe later
        </button>
      </motion.div>
    </div>
  )
}
