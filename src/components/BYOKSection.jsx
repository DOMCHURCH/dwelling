import { memo } from 'react'
import { useScrollReveal } from '../../hooks/useScrollReveal'

const BYOKSection = memo(function BYOKSection() {
  const revealRef = useScrollReveal({ y: 28, opacity: 0, duration: 0.7, stagger: 0.12, selector: '.byok-card' })
  return (
    <section style={{ padding: '80px 24px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div>
          <div className="liquid-glass" style={{ borderRadius: 40, display: 'inline-flex', padding: '5px 14px', fontSize: 11, color: 'rgba(255,255,255,0.5)', fontFamily: "'Barlow',sans-serif", letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 16 }}>BYOK — Bring Your Own Key</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 16 }}>
          <h2 style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 'clamp(2rem,5vw,3.5rem)', color: '#fff', lineHeight: 0.9, letterSpacing: '-0.02em' }}>
            No AI markup. Ever.
          </h2>
        </div>
        <p style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 14, color: 'rgba(255,255,255,0.45)', maxWidth: 660, lineHeight: 1.8, marginBottom: 40 }}>
          Most AI tools charge you a premium to use AI on your behalf — they pay pennies per query and bill you dollars. Dwelling is different. You connect your own free Cerebras key and your queries go directly from your browser to Cerebras. We never touch them. You pay nothing extra, and your searches stay completely private.
        </p>
        <div ref={revealRef} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
          {[
            {
              icon: '🤝',
              title: 'What is BYOK?',
              body: "Bring Your Own Key means you sign up for your own free AI account (Cerebras) and paste a single key into Dwelling. That key authorizes reports to run under your account — not ours. One-time setup, 60 seconds.",
            },
            {
              icon: '🔒',
              title: 'Why is it more private?',
              body: "Because your queries never touch Dwelling's servers. The moment you search, your browser talks directly to Cerebras — we never see what city you looked up, what your questions are, or what results came back.",
            },
            {
              icon: '🆓',
              title: 'What does it cost?',
              body: "Nothing. Cerebras is free to sign up — no credit card, no trial. Free accounts include 1 million AI tokens per minute, which is enough for hundreds of reports. We never mark up AI costs or add a surcharge.",
            },
          ].map(({ icon, title, body }) => (
            <div key={title} className="liquid-glass byok-card" style={{ borderRadius: 18, padding: 28 }}>
              <div className="liquid-glass-strong" style={{ borderRadius: '50%', width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18, fontSize: 18, flexShrink: 0 }}>{icon}</div>
              <h3 style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 19, color: '#fff', marginBottom: 10 }}>{title}</h3>
              <p style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.75 }}>{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
})

export default BYOKSection
