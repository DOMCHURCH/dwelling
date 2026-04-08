import { forwardRef } from 'react'

const Section = forwardRef(function Section({ children, style = {} }, ref) {
  return (
    <section ref={ref} style={{ position: 'relative', overflow: 'hidden', background: '#000', contain: 'layout', ...style }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'rgba(255,255,255,0.04)' }} />
      <div style={{ position: 'relative', zIndex: 10 }}>{children}</div>
    </section>
  )
})

export default Section
