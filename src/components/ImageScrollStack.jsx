// ImageScrollStack — three images that overlay and transition as you scroll
// Uses CSS scroll-driven + IntersectionObserver, no GSAP needed
// Each image takes up full viewport height and transitions to the next on scroll
import { useEffect, useRef } from 'react'

const IMAGES = [
  {
    src: '/images/toronto-aerial.jpg',
    alt: 'Toronto aerial night',
    caption: 'Any Canadian city.',
    sub: 'From Halifax to Victoria — live intelligence in 30 seconds.',
  },
  {
    src: '/images/topo-map.jpg',
    alt: 'Topographic data map',
    caption: 'Real data. Not guesses.',
    sub: '16+ official sources. Climate, demographics, flood risk, market data.',
  },
  {
    src: '/images/neighbourhood.jpg',
    alt: 'Canadian neighbourhood',
    caption: 'Know before you buy.',
    sub: 'Investment score, neighbourhood safety, school ratings — all in one report.',
  },
]

export default function ImageScrollStack() {
  const containerRef = useRef(null)

  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReduced) return

    const slides = containerRef.current?.querySelectorAll('.img-slide')
    if (!slides?.length) return

    const observers = []
    slides.forEach((slide, i) => {
      const obs = new IntersectionObserver(
        ([entry]) => {
          const img = slide.querySelector('img')
          const text = slide.querySelector('.slide-text')
          if (entry.isIntersecting) {
            slide.style.opacity = '1'
            if (img) img.style.transform = 'scale(1)'
            if (text) { text.style.opacity = '1'; text.style.transform = 'translateY(0)' }
          } else {
            // Only fade out if scrolled past (not before)
            if (entry.boundingClientRect.top < 0) {
              slide.style.opacity = '0'
              if (img) img.style.transform = 'scale(1.08)'
            }
          }
        },
        { threshold: 0.4 }
      )
      obs.observe(slide)
      observers.push(obs)
    })

    return () => observers.forEach(o => o.disconnect())
  }, [])

  return (
    <div ref={containerRef} style={{ position: 'relative', background: '#000' }}>
      {IMAGES.map((img, i) => (
        <div
          key={i}
          className="img-slide"
          style={{
            position: 'relative',
            height: '100vh',
            overflow: 'hidden',
            opacity: i === 0 ? 1 : 0,
            transition: 'opacity 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          {/* Background image with parallax scale */}
          <img
            src={img.src}
            alt={img.alt}
            loading={i === 0 ? 'eager' : 'lazy'}
            style={{
              position: 'absolute', inset: 0,
              width: '100%', height: '100%',
              objectFit: 'cover',
              objectPosition: 'center',
              transform: i === 0 ? 'scale(1)' : 'scale(1.08)',
              transition: 'transform 1.2s cubic-bezier(0.4, 0, 0.2, 1)',
              willChange: 'transform',
            }}
          />

          {/* Dark gradient overlay */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.5) 50%, rgba(0,0,0,0.85) 100%)',
          }} />

          {/* Slide number indicator */}
          <div style={{
            position: 'absolute', top: 32, right: 32,
            fontFamily: "'Barlow',sans-serif", fontWeight: 300,
            fontSize: 11, color: 'rgba(255,255,255,0.3)',
            letterSpacing: '0.15em',
          }}>
            {String(i + 1).padStart(2, '0')} / {String(IMAGES.length).padStart(2, '0')}
          </div>

          {/* Text content */}
          <div
            className="slide-text"
            style={{
              position: 'absolute', bottom: '12%', left: '50%',
              transform: i === 0 ? 'translateY(0) translateX(-50%)' : 'translateY(24px) translateX(-50%)',
              opacity: i === 0 ? 1 : 0,
              transition: 'opacity 0.9s cubic-bezier(0.4, 0, 0.2, 1), transform 0.9s cubic-bezier(0.4, 0, 0.2, 1)',
              textAlign: 'center',
              width: '90%', maxWidth: 640,
            }}
          >
            <h2 style={{
              fontFamily: "'Instrument Serif',serif", fontStyle: 'italic',
              fontSize: 'clamp(2.2rem,5vw,4rem)', color: '#fff',
              lineHeight: 0.95, letterSpacing: '-0.02em', marginBottom: 14,
            }}>
              {img.caption}
            </h2>
            <p style={{
              fontFamily: "'Barlow',sans-serif", fontWeight: 300,
              fontSize: 16, color: 'rgba(255,255,255,0.65)',
              lineHeight: 1.6,
            }}>
              {img.sub}
            </p>
          </div>

          {/* Bottom thin line progress indicator */}
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            height: 2,
            background: `linear-gradient(to right, rgba(255,255,255,0.6) ${((i + 1) / IMAGES.length) * 100}%, rgba(255,255,255,0.1) ${((i + 1) / IMAGES.length) * 100}%)`,
          }} />
        </div>
      ))}
    </div>
  )
}
