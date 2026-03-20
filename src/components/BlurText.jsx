import { useEffect, useRef, useState } from 'react'

export default function BlurText({ text, className = '', style = {} }) {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true) },
      { threshold: 0.1 }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])

  const words = text.split(' ')

  return (
    <span ref={ref} className={className} style={{ display: 'inline', ...style }}>
      {words.map((word, i) => (
        <span
          key={i}
          style={{
            display: 'inline-block',
            marginRight: '0.25em',
            opacity: visible ? 1 : 0,
            filter: visible ? 'blur(0px)' : 'blur(12px)',
            transform: visible ? 'translateY(0)' : 'translateY(30px)',
            transition: `opacity 0.5s ease ${i * 80}ms, filter 0.5s ease ${i * 80}ms, transform 0.5s ease ${i * 80}ms`,
          }}
        >
          {word}
        </span>
      ))}
    </span>
  )
}
