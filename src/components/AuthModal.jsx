import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'

const TERMS_SECTIONS = [
  { title: '1. No Professional Advice', body: 'All outputs are informational only. Nothing on this Platform constitutes financial, real estate, legal, or investment advice. Always consult a licensed professional before making property-related decisions.' },
  { title: '2. Data Accuracy', body: 'Property valuations are algorithmic estimates and may differ materially from actual market values. The Company makes no warranty regarding accuracy, completeness, or timeliness of any content.' },
  { title: '3. Limitation of Liability', body: 'To the maximum extent permitted by law, the Company shall not be liable for any damages arising from use of the Platform or reliance on its outputs. Total liability shall not exceed CAD $100.00.' },
  { title: '4. User Obligations', body: 'You agree to use the Platform lawfully and not to scrape, reproduce, or redistribute content at scale.' },
  { title: '5. Intellectual Property', body: 'All Platform technology and content are the exclusive property of Dwelling.' },
  { title: '6. Indemnification', body: 'You agree to defend and hold harmless the Company from any claims arising from your use of the Platform or decisions made in reliance on Platform outputs.' },
  { title: '7. Governing Law', body: 'These Terms are governed by the laws of Ontario, Canada.' },
]

const inputStyle = {
  width: '100%',
  padding: '14px 16px',
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 12,
  color: '#ffffff',
  fontSize: 14,
  outline: 'none',
  fontFamily: "'Barlow', sans-serif",
  fontWeight: 300,
  transition: 'border-color 0.2s, background 0.2s',
}

export default function AuthModal({ onAuth }) {
  const [mode, setMode] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [showTermsFull, setShowTermsFull] = useState(false)

  const handleSubmit = async () => {
    if (!email || !password) return setError('Please fill in all fields.')
    if (mode === 'signup' && !termsAccepted) return setError('You must accept the Terms & Conditions to continue.')
    if (password.length < 6) return setError('Password must be at least 6 characters.')
    setLoading(true)
    setError(null)
    try {
      if (mode === 'signup') {
        const { data, error: signUpError } = await supabase.auth.signUp({ email, password })
        if (signUpError) throw signUpError
        await fetch('/api/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: data.user.id, email: data.user.email }),
        })
        onAuth(data.user)
      } else {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password })
        if (signInError) throw signInError
        onAuth(data.user)
      }
    } catch (err) {
      setError(err.message ?? 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  const focus = e => { e.target.style.borderColor = 'rgba(255,255,255,0.3)'; e.target.style.background = 'rgba(255,255,255,0.08)' }
  const blur = e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.background = 'rgba(255,255,255,0.05)' }

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
          className="liquid-glass-strong"
          style={{ borderRadius: 24, maxWidth: 440, width: '100%', padding: 32 }}
        >
          <div style={{ marginBottom: 28, textAlign: 'center' }}>
            <div style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: 28, color: '#ffffff', marginBottom: 4 }}>
              DW<span style={{ opacity: 0.4 }}>.</span>ELLING
            </div>
            <p style={{ fontFamily: "'Barlow', sans-serif", fontWeight: 300, fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>
              {mode === 'signup' ? 'Create your account' : 'Welcome back'}
            </p>
          </div>

          {/* Tab switcher */}
          <div className="liquid-glass" style={{ borderRadius: 40, padding: 4, display: 'flex', marginBottom: 24 }}>
            {['signin', 'signup'].map(m => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(null) }}
                style={{
                  flex: 1,
                  padding: '8px',
                  background: mode === m ? '#ffffff' : 'transparent',
                  border: 'none',
                  borderRadius: 36,
                  color: mode === m ? '#000' : 'rgba(255,255,255,0.4)',
                  fontFamily: "'Barlow', sans-serif",
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                {m === 'signin' ? 'Sign In' : 'Sign Up'}
              </button>
            ))}
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 6, fontFamily: "'Barlow', sans-serif", letterSpacing: '0.08em', textTransform: 'uppercase' }}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" style={inputStyle} onFocus={focus} onBlur={blur} />
          </div>

          <div style={{ marginBottom: mode === 'signup' ? 16 : 20 }}>
            <label style={{ display: 'block', fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 6, fontFamily: "'Barlow', sans-serif", letterSpacing: '0.08em', textTransform: 'uppercase' }}>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min. 6 characters" style={inputStyle} onFocus={focus} onBlur={blur} onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
          </div>

          {mode === 'signup' && (
            <div className="liquid-glass" style={{ borderRadius: 12, padding: 16, marginBottom: 16 }}>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
                <input type="checkbox" checked={termsAccepted} onChange={e => setTermsAccepted(e.target.checked)} style={{ width: 16, height: 16, marginTop: 2, accentColor: '#ffffff', flexShrink: 0 }} />
                <span style={{ fontFamily: "'Barlow', sans-serif", fontWeight: 300, fontSize: 12, color: 'rgba(255,255,255,0.7)', lineHeight: 1.6 }}>
                  I accept the{' '}
                  <span onClick={e => { e.preventDefault(); setShowTermsFull(true) }} style={{ color: '#ffffff', textDecoration: 'underline', cursor: 'pointer' }}>Terms & Conditions</span>.
                  {' '}All property data is informational only and not financial advice.
                </span>
              </label>
            </div>
          )}

          {error && (
            <div className="liquid-glass" style={{ borderRadius: 10, padding: '10px 14px', marginBottom: 16, border: '1px solid rgba(248,113,113,0.3)', background: 'rgba(248,113,113,0.08)' }}>
              <p style={{ fontFamily: "'Barlow', sans-serif", fontWeight: 400, fontSize: 12, color: '#f87171' }}>⚠ {error}</p>
            </div>
          )}

          <motion.button
            onClick={handleSubmit}
            disabled={loading}
            whileHover={!loading ? { scale: 1.02 } : {}}
            whileTap={!loading ? { scale: 0.98 } : {}}
            style={{
              width: '100%',
              padding: '14px',
              background: loading ? 'rgba(255,255,255,0.06)' : '#ffffff',
              border: 'none',
              borderRadius: 40,
              color: loading ? 'rgba(255,255,255,0.3)' : '#000',
              fontFamily: "'Barlow', sans-serif",
              fontWeight: 600,
              fontSize: 14,
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background 0.2s',
            }}
          >
            {loading ? 'Please wait...' : mode === 'signup' ? 'Create Account →' : 'Sign In →'}
          </motion.button>
        </motion.div>
      </div>

      {showTermsFull && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1100, background: 'rgba(0,0,0,0.95)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={() => setShowTermsFull(false)}>
          <div onClick={e => e.stopPropagation()} className="liquid-glass-strong" style={{ borderRadius: 20, maxWidth: 680, width: '100%', height: '80vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '20px 28px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              <span style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: 20, color: '#ffffff' }}>Terms & Conditions</span>
              <button onClick={() => setShowTermsFull(false)} style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#ffffff', fontFamily: "'Barlow', sans-serif", fontSize: 12, padding: '6px 12px', cursor: 'pointer' }}>✕ Close</button>
            </div>
            <div style={{ flex: 1, overflowY: 'scroll', padding: '24px 28px' }}>
              <p style={{ fontFamily: "'Barlow', sans-serif", fontWeight: 300, fontSize: 12, color: 'rgba(255,255,255,0.3)', marginBottom: 20 }}>Last updated: June 2025. By creating an account, you agree to all terms below.</p>
              {TERMS_SECTIONS.map(({ title, body }) => (
                <div key={title} style={{ marginBottom: 20 }}>
                  <div style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: 16, color: '#ffffff', marginBottom: 8 }}>{title}</div>
                  <p style={{ fontFamily: "'Barlow', sans-serif", fontWeight: 300, fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 1.8 }}>{body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
