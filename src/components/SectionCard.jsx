import { motion } from 'framer-motion'

export default function SectionCard({ title, icon, children, delay = 0, accent }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.7, delay: delay / 1000, ease: [0.25, 0.1, 0.25, 1] }}
      className="liquid-glass"
      style={{ borderRadius: 20, padding: 24, marginBottom: 0 }}
    >
      {title && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, paddingBottom: 14, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          {icon && <span style={{ fontSize: 16 }}>{icon}</span>}
          <h2 style={{ fontSize: 16, fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontWeight: 400, color: '#ffffff', letterSpacing: '-0.01em' }}>
            {title}
          </h2>
        </div>
      )}
      {children}
    </motion.div>
  )
}
