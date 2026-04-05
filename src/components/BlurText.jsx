import { useEffect, useRef, useState } from 'react'

export default function BlurText({ text, delay = 0, className = '' }) {
  const ref = useRef(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setInView(true); observer.unobserve(el) } },
      { threshold: 0.1 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const words = text.split(' ')
  return (
    <span ref={ref} className={className} style={{ display: 'inline' }}>
      {words.map((word, i) => (
        <span key={i} style={{
          display: 'inline-block', marginRight: '0.3em',
          filter: inView ? 'blur(0)' : 'blur(10px)',
          opacity: inView ? 1 : 0,
          transform: inView ? 'translateY(0)' : 'translateY(20px)',
          transition: `filter 0.35s ease, opacity 0.35s ease, transform 0.35s ease`,
          transitionDelay: `${delay + i * 0.1}s`,
        }}>
          {word}
        </span>
      ))}
    </span>
  )
}
