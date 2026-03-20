import { useEffect, useRef, useState } from 'react'

// Pure CSS transitions triggered by IntersectionObserver.
// Zero framer-motion — runs on compositor thread only.
export default function BlurText({ text, className = '', style = {} }) {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.unobserve(el) } },
      { threshold: 0.1 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  return (
    <span ref={ref} className={className} style={{ display: 'inline', ...style }}>
      {text.split(' ').map((word, i) => (
        <span key={i} style={{
          display: 'inline-block',
          marginRight: '0.25em',
          opacity: visible ? 1 : 0,
          filter: visible ? 'blur(0px)' : 'blur(4px)',
          transform: visible ? 'translateY(0)' : 'translateY(10px)',
          // CSS transition — runs on GPU compositor, no JS per frame
          transition: `opacity 0.4s ease ${i * 30}ms, filter 0.4s ease ${i * 30}ms, transform 0.4s ease ${i * 30}ms`,
          willChange: visible ? 'auto' : 'opacity, filter, transform',
        }}>
          {word}
        </span>
      ))}
    </span>
  )
}
