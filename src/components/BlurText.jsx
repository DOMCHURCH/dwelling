import { useEffect, useRef, useState } from 'react'

export default function BlurText({ text, className = '', style = {} }) {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    // Check if already in viewport on mount — show immediately, no flash
    const rect = el.getBoundingClientRect()
    if (rect.top < window.innerHeight) {
      setVisible(true)
      return
    }
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
          transform: visible ? 'translateY(0)' : 'translateY(8px)',
          transition: visible
            ? `opacity 0.4s ease ${i * 30}ms, filter 0.4s ease ${i * 30}ms, transform 0.4s ease ${i * 30}ms`
            : 'none',
        }}>
          {word}
        </span>
      ))}
    </span>
  )
}
