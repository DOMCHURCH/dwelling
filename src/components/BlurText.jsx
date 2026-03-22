import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'

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
        <motion.span key={i}
          initial={{ filter: 'blur(10px)', opacity: 0, y: 20 }}
          animate={inView ? { filter: 'blur(0px)', opacity: 1, y: 0 } : { filter: 'blur(10px)', opacity: 0, y: 20 }}
          transition={{ duration: 0.35, delay: delay + i * 0.1, ease: [0.25, 0.46, 0.45, 0.94] }}
          style={{ display: 'inline-block', marginRight: '0.3em' }}>
          {word}
        </motion.span>
      ))}
    </span>
  )
}
