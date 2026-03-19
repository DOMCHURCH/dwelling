import { useState } from 'react'
import { supabase } from '../lib/supabase'

const MONO = "'Space Mono', monospace"

const inputStyle = {
  width: '100%',
  padding: '14px 16px',
  background: '#0a0a0f',
  border: '2px solid rgba(255,255,255,0.4)',
  color: '#ffffff',
  fontSize: 14,
  outline: 'none',
  fontFamily: MONO,
  borderRadius: 0,
}

const TERMS_SECTIONS = [
  { title: '1. No Professional Advice', body: 'All outputs are informational only. Nothing on this Platform constitutes financial, real estate, legal, or investment advice. Always consult a licensed professional before making property-related decisions.' },
  { title: '2. Data Accuracy', body: 'Property valuations are algorithmic estimates and may differ materially from actual market values. The Company makes no warranty regarding accuracy, completeness, or timeliness of any content.' },
  { title: '3. Limitation of Liability', body: 'To the maximum extent permitted by law, the Company shall not be liable for any damages arising from use of the Platform or reliance on its outputs. Total liability shall not exceed CAD $100.00.' },
  { title: '4. User Obligations', body: 'You agree to use the Platform lawfully and not to scrape, reproduce, or redistribute content at scale.' },
  { title: '5. Intellectual Property', body: 'All Platform technology and content are the exclusive property of Dwelling.' },
  { title: '6. Indemnification', body: 'You agree to defend and hold harmless the Company from any claims arising from your use of the Platform or decisions made in reliance on Platform outputs.' },
  { title: '7. Governing Law', body: 'These Terms are governed by the laws of Ontario, Canada.' },
]

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

        // Insert user record — retry a few times in case of timing issues
        let inserted = false
        for (let i = 0; i < 3; i++) {
          const { error: insertError } = await supabase.from('users').insert({
            id: data.user.id,
            email: data.user.email,
            terms_accepted_at: new Date().toISOString(),
            analyses_used: 0,
            is_pro: false,
          })
          if (!insertError || insertError.code === '23505') { inserted = true; break }
          await new Promise(r => setTimeout(r, 500))
        }
        if (!inserted) console.warn('User record insert failed — trigger may handle it')

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

  return (
    <>
      <div style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.92)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
      }}>
        <div style={{
          background: '#0a0a0f', border: '2px solid #ffffff',
          maxWidth: 460, width: '100%',
          boxShadow: '8px 8px 0px #ff2d78',
        }}>
          <div style={{ padding: '24px 28px 20px', borderBottom: '2px solid rgba(255,255,255,0.2)' }}>
            <div style={{ fontFamily: MONO, fontSize: 10, color: '#ff2d78', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 6 }}>
              {mode === 'signup' ? 'Create Account' : 'Welcome Back'}
            </div>
            <div style={{ fontFamily: MONO, fontSize: 18, fontWeight: 700, color: '#ffffff', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              DW<span style={{ color: '#ff2d78' }}>.</span>ELLING
            </div>
            <div style={{ fontFamily: MONO, fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Sign in to access property intelligence
            </div>
          </div>

          <div style={{ padding: '24px 28px' }}>
            <div style={{ display: 'flex', marginBottom: 24, border: '2px solid rgba(255,255,255,0.2)' }}>
              {['signin', 'signup'].map(m => (
                <button key={m} onClick={() => { setMode(m); setError(null) }} style={{
                  flex: 1, padding: '10px',
                  background: mode === m ? '#ffffff' : 'transparent',
                  border: 'none',
                  color: mode === m ? '#0a0a0f' : 'rgba(255,255,255,0.4)',
                  fontFamily: MONO, fontSize: 11, fontWeight: 700,
                  textTransform: 'uppercase', letterSpacing: '0.1em',
                  cursor: 'crosshair',
                }}>
                  {m === 'signin' ? 'Sign In' : 'Sign Up'}
                </button>
              ))}
            </div>

            <div style={{ marginBottom: 12 }}>
              <div style={{ fontFamily: MONO, fontSize: 10, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 6 }}>Email</div>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com" style={inputStyle}
                onFocus={e => e.target.style.borderColor = '#ff2d78'}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.4)'}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ fontFamily: MONO, fontSize: 10, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 6 }}>Password</div>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="Min. 6 characters" style={inputStyle}
                onFocus={e => e.target.style.borderColor = '#ff2d78'}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.4)'}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              />
            </div>

            {mode === 'signup' && (
              <div style={{ marginBottom: 20, padding: '16px', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.03)' }}>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'crosshair' }}>
                  <input type="checkbox" checked={termsAccepted}
                    onChange={e => setTermsAccepted(e.target.checked)}
                    style={{ width: 16, height: 16, marginTop: 2, accentColor: '#ff2d78', cursor: 'crosshair', flexShrink: 0 }}
                  />
                  <span style={{ fontFamily: MONO, fontSize: 11, color: '#ffffff', textTransform: 'uppercase', letterSpacing: '0.08em', lineHeight: 1.6 }}>
                    I accept the{' '}
                    <span onClick={e => { e.preventDefault(); setShowTermsFull(true) }}
                      style={{ color: '#ff2d78', textDecoration: 'underline', cursor: 'crosshair' }}>
                      Terms & Conditions
                    </span>
                    . All property data is informational only and not financial advice.
                  </span>
                </label>
              </div>
            )}

            {error && (
              <div style={{ marginBottom: 16, padding: '10px 14px', border: '1px solid #ff2d78', background: 'rgba(255,45,120,0.1)', fontFamily: MONO, fontSize: 11, color: '#ff2d78' }}>
                ⚠ {error}
              </div>
            )}

            <button onClick={handleSubmit} disabled={loading} style={{
              width: '100%', padding: '14px',
              background: loading ? 'rgba(255,255,255,0.1)' : '#ff2d78',
              border: '2px solid ' + (loading ? 'rgba(255,255,255,0.2)' : '#ff2d78'),
              color: '#ffffff', fontFamily: MONO, fontSize: 13, fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.15em',
              cursor: loading ? 'not-allowed' : 'crosshair',
            }}>
              {loading ? 'Please wait...' : mode === 'signup' ? 'Create Account →' : 'Sign In →'}
            </button>
          </div>
        </div>
      </div>

      {showTermsFull && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1100,
          background: 'rgba(0,0,0,0.97)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 20,
        }} onClick={() => setShowTermsFull(false)}>
          <div onClick={e => e.stopPropagation()} style={{
            background: '#0a0a0f', border: '2px solid #ffffff',
            maxWidth: 700, width: '100%', height: '80vh',
            display: 'flex', flexDirection: 'column',
            boxShadow: '8px 8px 0px #ff2d78',
          }}>
            <div style={{ padding: '16px 24px', borderBottom: '2px solid rgba(255,255,255,0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              <span style={{ fontFamily: MONO, fontSize: 13, fontWeight: 700, color: '#ffffff', textTransform: 'uppercase' }}>Terms & Conditions</span>
              <button onClick={() => setShowTermsFull(false)} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.3)', color: '#ffffff', fontFamily: MONO, fontSize: 11, padding: '6px 12px', cursor: 'crosshair' }}>✕ Close</button>
            </div>
            <div style={{ flex: 1, overflowY: 'scroll', padding: '24px', fontFamily: "'Inter', sans-serif", fontSize: 13, color: 'rgba(255,255,255,0.7)', lineHeight: 1.8 }}>
              <p style={{ fontFamily: MONO, fontSize: 10, color: 'rgba(255,255,255,0.3)', marginBottom: 20 }}>Last updated: June 2025. By creating an account, you agree to all terms below.</p>
              {TERMS_SECTIONS.map(({ title, body }) => (
                <div key={title} style={{ marginBottom: 20 }}>
                  <div style={{ fontFamily: MONO, fontSize: 12, fontWeight: 700, color: '#ffffff', textTransform: 'uppercase', marginBottom: 8 }}>{title}</div>
                  <p>{body}</p>
                </div>
              ))}
              <div style={{ marginTop: 24, padding: '16px', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.03)' }}>
                <p style={{ fontFamily: MONO, fontSize: 11, color: 'rgba(255,255,255,0.4)', textAlign: 'center' }}>BY CREATING AN ACCOUNT YOU AGREE TO THESE TERMS IN FULL.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
