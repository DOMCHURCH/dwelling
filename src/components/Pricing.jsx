import { memo } from 'react'
import { useScrollReveal } from '../../hooks/useScrollReveal'

const STACK = [
  { label: 'React 18', desc: 'SPA with lazy-loaded route chunks, GSAP animations, Lenis smooth scroll', color: '#61dafb' },
  { label: 'Vite', desc: 'Sub-second HMR, tree-shaken production bundles, ESM-native dev server', color: '#646cff' },
  { label: 'Vercel', desc: 'Edge-deployed serverless functions, zero-config CI/CD, global CDN', color: '#fff' },
  { label: 'Turso (libSQL)', desc: 'SQLite-at-the-edge — low-latency reads, zero infrastructure overhead', color: '#4ade80' },
  { label: 'BYOK AI Proxy', desc: 'Multi-provider backend proxy: Cerebras, OpenAI, Anthropic, Groq, OpenRouter', color: '#38bdf8' },
  { label: 'Upstash Redis', desc: 'Rate limiting, dedup, session caching — serverless-safe with REST API', color: '#f87171' },
  { label: 'Argon2id', desc: 'Memory-hard password hashing with PBKDF2 legacy migration path', color: '#fbbf24' },
  { label: 'Resend', desc: 'Transactional email delivery for auth flows (password reset, team invites)', color: '#a78bfa' },
]

const ARCH = [
  { icon: '🔐', title: 'Auth Layer', desc: 'JWT (HS256) + Upstash Redis refresh tokens. 15-min access tokens, 7-day refresh, argon2id password hashing.' },
  { icon: '🤖', title: 'AI Proxy', desc: 'Serverless backend proxies user-supplied keys to any supported provider. Keys never stored in proxy logs.' },
  { icon: '🗄', title: 'Database', desc: 'Turso libSQL (SQLite). Users, teams, saved reports, shared links, API keys (AES-256-GCM encrypted at rest).' },
  { icon: '🗺', title: 'Geo Intelligence', desc: 'Nominatim geocoding, Open-Meteo weather/climate, Overpass API for POI density, Stats Canada NHPI data.' },
  { icon: '📊', title: 'Market Data', desc: 'Real listing aggregation, deterministic scoring engine, NHPI price-history charts, risk composite.' },
  { icon: '🛡', title: 'Security', desc: 'Per-IP rate limiting (Upstash), request deduplication, CORS enforcement, no client-side secret exposure.' },
]

const About = memo(function About() {
  const headRef = useScrollReveal({ y: 28, opacity: 0, duration: 0.85, ease: 'power3.out' })
  const stackRef = useScrollReveal({ y: 32, opacity: 0, duration: 0.7, stagger: 0.08, selector: '.stack-item' })
  const archRef = useScrollReveal({ y: 32, opacity: 0, duration: 0.7, stagger: 0.1, selector: '.arch-item' })

  return (
    <section id="stack" style={{ position: 'relative', overflow: 'hidden', padding: 'clamp(80px, 10vw, 120px) 20px' }}>
      <video autoPlay muted loop playsInline
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.07, zIndex: 0, willChange: 'transform' }}>
        <source src="/pricing-bg.webm" type="video/webm" />
      </video>
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, #000 0%, rgba(0,0,0,0.55) 30%, rgba(0,0,0,0.55) 70%, #000 100%)', zIndex: 1 }} />
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 80% 60% at 50% 50%, rgba(56,189,248,0.05) 0%, transparent 70%)', zIndex: 1 }} />

      <div ref={headRef} style={{ position: 'relative', zIndex: 2, maxWidth: 900, margin: '0 auto', textAlign: 'center', marginBottom: 64 }}>
        <div className="liquid-glass" style={{ borderRadius: 40, display: 'inline-flex', padding: '5px 14px', fontSize: 11, color: 'rgba(255,255,255,0.5)', fontFamily: "'Barlow',sans-serif", letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 20 }}>
          Open Portfolio Project
        </div>

        <h2 style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 'clamp(2.2rem,5vw,3.8rem)', color: '#fff', marginBottom: 16, lineHeight: 0.95, letterSpacing: '-0.02em' }}>
          Built to production standard.
        </h2>
        <p style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 16, color: 'rgba(255,255,255,0.45)', lineHeight: 1.75, maxWidth: 560, margin: '0 auto' }}>
          Dwelling is a full-stack AI real estate intelligence platform — open, free, and built as a systems engineering portfolio project. Bring your own API key to unlock live AI generation.
        </p>
      </div>

      {/* Stack grid */}
      <div ref={stackRef} style={{ position: 'relative', zIndex: 2, maxWidth: 900, margin: '0 auto 72px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
        {STACK.map(({ label, desc, color }) => (
          <div key={label} className="stack-item liquid-glass" style={{ borderRadius: 16, padding: '20px 22px' }}>
            <div style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 700, fontSize: 13, color, marginBottom: 8, letterSpacing: '0.02em' }}>{label}</div>
            <div style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 12, color: 'rgba(255,255,255,0.45)', lineHeight: 1.6 }}>{desc}</div>
          </div>
        ))}
      </div>

      {/* Architecture */}
      <div style={{ position: 'relative', zIndex: 2, maxWidth: 900, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <span style={{ fontFamily: "'Barlow',sans-serif", fontSize: 11, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Architecture</span>
        </div>
        <div ref={archRef} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
          {ARCH.map(({ icon, title, desc }) => (
            <div key={title} className="arch-item" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '22px 24px' }}>
              <div style={{ fontSize: 22, marginBottom: 10 }}>{icon}</div>
              <div style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 17, color: '#fff', marginBottom: 8 }}>{title}</div>
              <div style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 12, color: 'rgba(255,255,255,0.45)', lineHeight: 1.65 }}>{desc}</div>
            </div>
          ))}
        </div>

        {/* BYOK callout */}
        <div style={{ marginTop: 40, padding: '28px 32px', background: 'linear-gradient(135deg, rgba(56,189,248,0.06) 0%, rgba(129,140,248,0.04) 100%)', border: '1px solid rgba(56,189,248,0.15)', borderRadius: 20, textAlign: 'center' }}>
          <div style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 22, color: '#fff', marginBottom: 10 }}>
            Bring Your Own Key
          </div>
          <p style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 14, color: 'rgba(255,255,255,0.5)', lineHeight: 1.7, maxWidth: 520, margin: '0 auto 20px' }}>
            No platform subscription required. Connect a free Cerebras, Groq, or OpenRouter key and run live AI analyses at your own cost — typically fractions of a cent per report.
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            {[
              { label: 'Cerebras', note: 'Free 1M tok/min', url: 'https://cloud.cerebras.ai' },
              { label: 'Groq', note: 'Free tier', url: 'https://console.groq.com/keys' },
              { label: 'OpenRouter', note: 'Pay-per-use', url: 'https://openrouter.ai/keys' },
            ].map(p => (
              <a key={p.label} href={p.url} target="_blank" rel="noreferrer"
                style={{ padding: '8px 18px', borderRadius: 40, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', fontFamily: "'Barlow',sans-serif", fontSize: 13, color: 'rgba(255,255,255,0.7)', textDecoration: 'none', display: 'flex', gap: 8, alignItems: 'center', transition: 'opacity 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.opacity = '0.75'}
                onMouseLeave={e => e.currentTarget.style.opacity = '1'}
              >
                {p.label}
                <span style={{ fontSize: 11, color: '#4ade80' }}>{p.note}</span>
              </a>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
})

export default About
