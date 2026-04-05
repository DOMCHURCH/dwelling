import { useState, useEffect } from 'react'
import { signIn, signUp } from '../lib/localAuth'

const TERMS = [
  {
    title: '1. Acceptance of Terms',
    body: 'By creating an account or accessing Dwelling (the "Platform"), you agree to be legally bound by these Terms and Conditions ("Terms"). If you do not agree to all of these Terms, you must not use the Platform. These Terms constitute a binding legal agreement between you ("User") and Dwelling ("Company," "we," "us," or "our"). We reserve the right to modify these Terms at any time. Continued use of the Platform after modifications constitutes acceptance of the revised Terms. It is your responsibility to review these Terms periodically.'
  },
  {
    title: '2. No Professional or Financial Advice',
    body: 'ALL CONTENT PROVIDED BY THE PLATFORM IS FOR INFORMATIONAL AND EDUCATIONAL PURPOSES ONLY. Nothing on the Platform constitutes, and should not be construed as, financial advice, real estate advice, investment advice, legal advice, tax advice, insurance advice, or any other professional advice of any kind. The Platform does not recommend the purchase, sale, or holding of any real property, security, or investment. You should consult with a qualified and licensed professional before making any financial or real estate decision. The Company is not a licensed real estate brokerage, financial institution, investment dealer, or professional advisory firm.'
  },
  {
    title: '3. Accuracy and Reliability of Data',
    body: 'THE COMPANY MAKES NO REPRESENTATIONS, WARRANTIES, OR GUARANTEES OF ANY KIND, EXPRESS OR IMPLIED, REGARDING THE ACCURACY, COMPLETENESS, RELIABILITY, CURRENTNESS, SUITABILITY, OR AVAILABILITY OF ANY DATA, REPORT, SCORE, ESTIMATE, ANALYSIS, OR OTHER CONTENT PROVIDED BY THE PLATFORM. Algorithmic estimates, AI verdicts, stability scores, and all other generated outputs are approximations only. The Company expressly disclaims all liability arising from reliance on Platform content.'
  },
  {
    title: '4. AI-Generated Content Disclaimer',
    body: 'The Platform uses artificial intelligence to generate reports, analyses, verdicts, scores, and other content. AI-generated content may contain errors, hallucinations, or outdated information. AI verdicts and investment scores are NOT predictive of future market performance. The Company is not liable for any loss or damage resulting from AI-generated content.'
  },
  {
    title: '5. Limitation of Liability',
    body: 'TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, THE TOTAL CUMULATIVE LIABILITY OF THE COMPANY TO YOU SHALL NOT EXCEED THE GREATER OF: (A) THE TOTAL AMOUNT PAID BY YOU IN THE THREE MONTHS PRECEDING THE CLAIM; OR (B) TWENTY-FIVE CANADIAN DOLLARS (CAD $25.00). THE COMPANY IS NOT LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES.'
  },
  {
    title: '6. Subscription, Billing, and Cancellation',
    body: 'ALL SUBSCRIPTION FEES ARE STRICTLY NON-REFUNDABLE. The Company does not offer refunds or credits for any reason. Subscriptions renew automatically unless cancelled before the renewal date. Cancellation takes effect at the end of the current billing period. No partial-period credits are issued.'
  },
  {
    title: '7. Governing Law and Dispute Resolution',
    body: 'These Terms are governed by the laws of the Province of Ontario, Canada. Disputes shall be resolved by binding arbitration in Ottawa, Ontario. YOU WAIVE ANY RIGHT TO PARTICIPATE IN ANY CLASS ACTION AGAINST THE COMPANY.'
  },
]

const inp = {
  width: '100%', padding: '13px 16px',
  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 12, color: '#fff', fontSize: 14, outline: 'none',
  fontFamily: "'Barlow',sans-serif", fontWeight: 300, transition: 'border-color 0.15s, background 0.15s',
  boxSizing: 'border-box',
}

async function requestPasswordReset(email) {
  const res = await fetch('/api/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'forgot-password', email }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to send reset email.')
  return data
}

async function submitNewPassword(token, password) {
  const res = await fetch('/api/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'reset-password', token, password }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to reset password.')
  return data
}

export default function AuthModal({ onAuth, onDemo }) {
  // mode: 'signin' | 'signup' | 'forgot' | 'reset'
  const [mode, setMode] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [resetToken, setResetToken] = useState('')
  const [terms, setTerms] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [showTerms, setShowTerms] = useState(false)
  const [scrolledToBottom, setScrolledToBottom] = useState(false)

  // Lock body scroll while modal is open
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  // Check URL for reset token on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const token = params.get('reset_token')
    if (token) {
      setResetToken(token)
      setMode('reset')
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  const focus = e => { e.target.style.borderColor = 'rgba(255,255,255,0.3)'; e.target.style.background = 'rgba(255,255,255,0.08)' }
  const unfocus = e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.background = 'rgba(255,255,255,0.05)' }

  const handleSignIn = async () => {
    if (!email || !password) return setError('Please fill in all fields.')
    setLoading(true); setError(null)
    try {
      const user = await signIn(email.trim(), password)
      onAuth(user)
    } catch (e) {
      setError(e.message || 'Something went wrong.')
    } finally { setLoading(false) }
  }

  const handleSignUp = async () => {
    if (!email || !password) return setError('Please fill in all fields.')
    if (!terms) return setError('You must read and accept the Terms & Conditions to create an account.')
    if (password.length < 8) return setError('Password must be at least 8 characters.')
    setLoading(true); setError(null)
    try {
      const user = await signUp(email.trim(), password)
      onAuth(user)
    } catch (e) {
      setError(e.message || 'Something went wrong.')
    } finally { setLoading(false) }
  }

  const handleForgot = async () => {
    if (!email) return setError('Please enter your email address.')
    setLoading(true); setError(null); setSuccess(null)
    try {
      await requestPasswordReset(email.trim())
      setSuccess("If that email exists in our system, a reset link is on its way. Check your inbox — and spam folder just in case.")
    } catch (e) {
      setError(e.message || 'Something went wrong.')
    } finally { setLoading(false) }
  }

  const handleReset = async () => {
    if (!newPassword || !confirmPassword) return setError('Please fill in both password fields.')
    if (newPassword.length < 8) return setError('Password must be at least 8 characters.')
    if (newPassword !== confirmPassword) return setError('Passwords do not match.')
    setLoading(true); setError(null)
    try {
      const data = await submitNewPassword(resetToken, newPassword)
      // Auto sign in with returned token
      const { setToken } = await import('../lib/localAuth')
      onAuth({ id: data.userId, email: data.email, is_pro: data.is_pro })
      // Store token
      localStorage.setItem('dw_token', data.token)
    } catch (e) {
      setError(e.message || 'Something went wrong.')
    } finally { setLoading(false) }
  }

  const handleTermsScroll = (e) => {
    const el = e.target
    if (el.scrollHeight - el.scrollTop <= el.clientHeight + 40) setScrolledToBottom(true)
  }

  const switchMode = (m) => { setMode(m); setError(null); setSuccess(null) }

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div className="liquid-glass-strong" style={{ borderRadius: 24, maxWidth: 440, width: '100%', padding: 32, animation: 'fadeUp 0.35s ease' }}>

          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 28, color: '#fff', marginBottom: 4 }}>
              DW<span style={{ opacity: 0.4 }}>.</span>ELLING
            </div>
            <p style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>
              {mode === 'signup' ? 'Create your account' : mode === 'forgot' ? 'Reset your password' : mode === 'reset' ? 'Choose a new password' : 'Welcome back'}
            </p>
          </div>

          {/* ── RESET PASSWORD (from email link) ── */}
          {mode === 'reset' && (
            <>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 6, fontFamily: "'Barlow',sans-serif", letterSpacing: '0.08em', textTransform: 'uppercase' }}>New Password</label>
                <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Min. 8 characters" style={inp} onFocus={focus} onBlur={unfocus} />
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 6, fontFamily: "'Barlow',sans-serif", letterSpacing: '0.08em', textTransform: 'uppercase' }}>Confirm Password</label>
                <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Repeat your new password" style={inp} onFocus={focus} onBlur={unfocus} onKeyDown={e => e.key === 'Enter' && handleReset()} />
              </div>
              {error && <ErrorBox msg={error} />}
              <button onClick={handleReset} disabled={loading} style={btnStyle(loading)}>
                {loading ? 'Saving...' : 'Set New Password →'}
              </button>
            </>
          )}

          {/* ── FORGOT PASSWORD ── */}
          {mode === 'forgot' && (
            <>
              <p style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 20, lineHeight: 1.6 }}>
                Enter your account email and we'll send you a reset link. Check your spam folder if it doesn't arrive within a minute.
              </p>
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 6, fontFamily: "'Barlow',sans-serif", letterSpacing: '0.08em', textTransform: 'uppercase' }}>Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" style={inp} onFocus={focus} onBlur={unfocus} onKeyDown={e => e.key === 'Enter' && handleForgot()} />
              </div>
              {error && <ErrorBox msg={error} />}
              {success && <SuccessBox msg={success} />}
              {!success && (
                <button onClick={handleForgot} disabled={loading} style={btnStyle(loading)}>
                  {loading ? 'Sending...' : 'Send Reset Link →'}
                </button>
              )}
              <div style={{ textAlign: 'center', marginTop: 16 }}>
                <button onClick={() => switchMode('signin')} style={linkBtn}>← Back to Sign In</button>
              </div>
            </>
          )}

          {/* ── SIGN IN / SIGN UP ── */}
          {(mode === 'signin' || mode === 'signup') && (
            <>
              {/* Tab switcher */}
              <div className="liquid-glass" style={{ borderRadius: 40, padding: 4, display: 'flex', marginBottom: 24 }}>
                {['signin', 'signup'].map(m => (
                  <button key={m} onClick={() => switchMode(m)} style={{ flex: 1, padding: '8px', borderRadius: 36, border: 'none', cursor: 'pointer', fontFamily: "'Barlow',sans-serif", fontSize: 13, fontWeight: 500, transition: 'background 0.2s, color 0.2s', background: mode === m ? '#fff' : 'transparent', color: mode === m ? '#000' : 'rgba(255,255,255,0.4)' }}>
                    {m === 'signin' ? 'Sign In' : 'Sign Up'}
                  </button>
                ))}
              </div>

              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 6, fontFamily: "'Barlow',sans-serif", letterSpacing: '0.08em', textTransform: 'uppercase' }}>Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" style={inp} onFocus={focus} onBlur={unfocus} />
              </div>
              <div style={{ marginBottom: mode === 'signup' ? 8 : 8 }}>
                <label style={{ display: 'block', fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 6, fontFamily: "'Barlow',sans-serif", letterSpacing: '0.08em', textTransform: 'uppercase' }}>Password</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min. 8 characters" style={inp} onFocus={focus} onBlur={unfocus} onKeyDown={e => e.key === 'Enter' && (mode === 'signin' ? handleSignIn() : handleSignUp())} />
              </div>

              {/* Forgot password link — only on sign in */}
              {mode === 'signin' && (
                <div style={{ textAlign: 'right', marginBottom: 16 }}>
                  <button onClick={() => switchMode('forgot')} style={linkBtn}>Forgot password?</button>
                </div>
              )}

              {/* Terms checkbox — only on sign up */}
              {mode === 'signup' && (
                <div className="liquid-glass" style={{ borderRadius: 12, padding: 16, marginBottom: 16, marginTop: 8, border: terms ? '1px solid rgba(74,222,128,0.25)' : '1px solid rgba(255,255,255,0.06)' }}>
                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
                    <div
                      onClick={() => setTerms(t => !t)}
                      style={{ width: 18, height: 18, marginTop: 1, flexShrink: 0, borderRadius: 5, cursor: 'pointer', border: terms ? '2px solid #4ade80' : '2px solid rgba(255,255,255,0.3)', background: terms ? '#4ade80' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s ease' }}
                    >
                      {terms && <span style={{ color: '#000', fontSize: 11, fontWeight: 700, lineHeight: 1 }}>✓</span>}
                    </div>
                    <span style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 12, color: 'rgba(255,255,255,0.7)', lineHeight: 1.6 }}>
                      I have read and agree to the{' '}
                      <span onClick={e => { e.preventDefault(); e.stopPropagation(); setShowTerms(true); setScrolledToBottom(false) }} style={{ color: '#fff', textDecoration: 'underline', cursor: 'pointer' }}>Terms & Conditions</span>.
                      {' '}I understand all data is informational only.
                    </span>
                  </label>
                </div>
              )}

              {error && <ErrorBox msg={error} />}

              <button onClick={mode === 'signin' ? handleSignIn : handleSignUp} disabled={loading} style={btnStyle(loading)}>
                {loading ? 'Please wait...' : (mode === 'signup' ? 'Create Account →' : 'Sign In →')}
              </button>

              {onDemo && (
                <div style={{ textAlign: 'center', marginTop: 16 }}>
                  <button onClick={onDemo} style={linkBtn} onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.65)'} onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.35)'}>
                    Just want to see how it works? View a sample report →
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Terms modal */}
      {showTerms && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1100, background: 'rgba(0,0,0,0.95)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={() => setShowTerms(false)}>
          <div onClick={e => e.stopPropagation()} className="liquid-glass-strong" style={{ borderRadius: 20, maxWidth: 680, width: '100%', height: '82vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '18px 28px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              <div>
                <span style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 20, color: '#fff' }}>Terms & Conditions</span>
                <span style={{ marginLeft: 12, fontFamily: "'Barlow',sans-serif", fontSize: 10, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Last updated: March 30, 2026</span>
              </div>
              <button onClick={() => setShowTerms(false)} style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff', fontFamily: "'Barlow',sans-serif", fontSize: 12, padding: '6px 12px', cursor: 'pointer' }}>✕</button>
            </div>
            <div onScroll={handleTermsScroll} data-lenis-prevent style={{ flex: 1, overflowY: 'scroll', padding: '24px 28px', overscrollBehavior: 'contain' }}>
              <div style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 400, fontSize: 12, color: 'rgba(255,255,255,0.5)', lineHeight: 1.7, marginBottom: 24, padding: '12px 16px', background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.15)', borderRadius: 10 }}>
                ⚠ Please read these Terms carefully before creating an account.
              </div>
              {TERMS.map(({ title, body }) => (
                <div key={title} style={{ marginBottom: 24, paddingBottom: 24, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 15, color: '#fff', marginBottom: 8 }}>{title}</div>
                  <p style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 12.5, color: 'rgba(255,255,255,0.6)', lineHeight: 1.85 }}>{body}</p>
                </div>
              ))}
            </div>
            <div style={{ padding: '16px 28px', borderTop: '1px solid rgba(255,255,255,0.08)', flexShrink: 0, display: 'flex', gap: 10, alignItems: 'center' }}>
              {!scrolledToBottom && (
                <span style={{ fontFamily: "'Barlow',sans-serif", fontSize: 11, color: 'rgba(255,255,255,0.3)', flex: 1 }}>↓ Scroll to read before accepting</span>
              )}
              <button
                onClick={() => { setTerms(true); setShowTerms(false) }}
                style={{ padding: '11px 24px', borderRadius: 40, border: 'none', cursor: 'pointer', fontFamily: "'Barlow',sans-serif", fontWeight: 600, fontSize: 13, background: '#fff', color: '#000', marginLeft: scrolledToBottom ? 'auto' : undefined, opacity: scrolledToBottom ? 1 : 0.5, transition: 'opacity 0.3s ease' }}
              >
                I Accept These Terms ✓
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ── Small helper components ───────────────────────────────────────────────────
function ErrorBox({ msg }) {
  return (
    <div className="liquid-glass" style={{ borderRadius: 10, padding: '10px 14px', marginBottom: 16, border: '1px solid rgba(248,113,113,0.3)', background: 'rgba(248,113,113,0.08)' }}>
      <p style={{ fontFamily: "'Barlow',sans-serif", fontSize: 12, color: '#f87171' }}>⚠ {msg}</p>
    </div>
  )
}

function SuccessBox({ msg }) {
  return (
    <div className="liquid-glass" style={{ borderRadius: 10, padding: '12px 14px', marginBottom: 16, border: '1px solid rgba(74,222,128,0.3)', background: 'rgba(74,222,128,0.08)' }}>
      <p style={{ fontFamily: "'Barlow',sans-serif", fontSize: 12, color: '#4ade80', lineHeight: 1.6 }}>✓ {msg}</p>
    </div>
  )
}

const btnStyle = (loading) => ({
  width: '100%', padding: '14px', background: loading ? 'rgba(255,255,255,0.06)' : '#fff',
  border: 'none', borderRadius: 40, color: loading ? 'rgba(255,255,255,0.3)' : '#000',
  fontFamily: "'Barlow',sans-serif", fontWeight: 600, fontSize: 14,
  cursor: loading ? 'not-allowed' : 'pointer', transition: 'background 0.2s',
})

const linkBtn = {
  background: 'none', border: 'none', cursor: 'pointer',
  fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 13,
  color: 'rgba(255,255,255,0.35)', textDecoration: 'underline',
  textUnderlineOffset: 3, padding: '4px 8px', transition: 'color 0.2s',
}
