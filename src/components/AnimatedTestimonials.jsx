import { useState, useEffect } from 'react'

const TESTIMONIALS = [
  {
    id: 1,
    quote: "I was about to buy in the wrong neighbourhood — everything looked great online. Dwelling flagged the flood zone risk and showed listings sitting 40+ days. Saved me from a disaster.",
    name: "Marcus T.",
    role: "First-time buyer",
    location: "Hamilton, ON",
    avatar: "MT",
    stars: 5,
  },
  {
    id: 2,
    quote: "Had 2 weeks to pick between Toronto, Ottawa, and Calgary. Ran all three in one afternoon. The stability scores made the decision obvious. We moved to Calgary and couldn't be happier.",
    name: "Priya M.",
    role: "Relocating for work",
    location: "Calgary, AB",
    avatar: "PM",
    stars: 5,
  },
  {
    id: 3,
    quote: "I use it before every client showing now. The investment score and market temperature data gives me something concrete to discuss beyond just price per sqft.",
    name: "Daniel R.",
    role: "Real estate investor",
    location: "Vancouver, BC",
    avatar: "DR",
    stars: 5,
  },
]

export default function AnimatedTestimonials() {
  const [active, setActive] = useState(0)
  const [animating, setAnimating] = useState(false)

  useEffect(() => {
    const iv = setInterval(() => {
      setAnimating(true)
      setTimeout(() => {
        setActive(i => (i + 1) % TESTIMONIALS.length)
        setAnimating(false)
      }, 300)
    }, 5500)
    return () => clearInterval(iv)
  }, [])

  const t = TESTIMONIALS[active]

  return (
    <div style={{ maxWidth: 680, margin: '0 auto 36px', position: 'relative' }}>
      <div className="liquid-glass-strong" style={{
        borderRadius: 20, padding: '32px 36px',
        border: '1px solid rgba(255,255,255,0.1)',
        transition: 'opacity 0.3s ease, transform 0.3s ease',
        opacity: animating ? 0 : 1,
        transform: animating ? 'translateY(8px)' : 'translateY(0)',
      }}>
        <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
          {Array(t.stars).fill(0).map((_, i) => (
            <span key={i} style={{ color: '#fbbf24', fontSize: 14 }}>★</span>
          ))}
        </div>
        <p style={{
          fontFamily: "'Instrument Serif',serif", fontStyle: 'italic',
          fontSize: 'clamp(1rem,2.2vw,1.2rem)', color: 'rgba(255,255,255,0.88)',
          lineHeight: 1.65, marginBottom: 24,
        }}>
          "{t.quote}"
        </p>
        <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1) 50%, transparent)', marginBottom: 20 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 42, height: 42, borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(56,189,248,0.3), rgba(129,140,248,0.3))',
            border: '1px solid rgba(255,255,255,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: "'Barlow',sans-serif", fontWeight: 600, fontSize: 13, color: '#fff', flexShrink: 0,
          }}>{t.avatar}</div>
          <div>
            <div style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 500, fontSize: 14, color: '#fff' }}>{t.name}</div>
            <div style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{t.role} · {t.location}</div>
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 20 }}>
        {TESTIMONIALS.map((_, i) => (
          <button
            key={i}
            onClick={() => { setAnimating(true); setTimeout(() => { setActive(i); setAnimating(false) }, 300) }}
            style={{
              height: 8, borderRadius: 4, border: 'none', cursor: 'pointer',
              background: i === active ? '#fff' : 'rgba(255,255,255,0.2)',
              width: i === active ? 28 : 8,
              transition: 'width 0.3s ease, background 0.3s ease',
              padding: 0,
            }}
          />
        ))}
      </div>
    </div>
  )
}
