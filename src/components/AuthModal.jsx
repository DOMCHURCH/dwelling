import { useState } from 'react'
import { supabase } from '../lib/supabase'

const TERMS = [
  { title: '1. No Professional Advice', body: 'All outputs are informational only. Nothing constitutes financial, real estate, legal, or investment advice.' },
  { title: '2. Data Accuracy', body: 'Property valuations are algorithmic estimates and may differ from actual market values.' },
  { title: '3. Limitation of Liability', body: 'Total liability shall not exceed CAD $100.00.' },
  { title: '4. Governing Law', body: 'These Terms are governed by the laws of Ontario, Canada.' },
]

const inp = {
  width:'100%', padding:'13px 16px',
  background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)',
  borderRadius:12, color:'#fff', fontSize:14, outline:'none',
  fontFamily:"'Barlow',sans-serif", fontWeight:300, transition:'border-color 0.15s, background 0.15s',
}

export default function AuthModal({ onAuth }) {
  const [mode, setMode] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [terms, setTerms] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [showTerms, setShowTerms] = useState(false)
  const [confirmEmail, setConfirmEmail] = useState(null)

  const submit = async () => {
    if (!email || !password) return setError('Please fill in all fields.')
    if (mode === 'signup' && !terms) return setError('You must accept the Terms & Conditions.')
    if (password.length < 6) return setError('Password must be at least 6 characters.')
    setLoading(true); setError(null)
    try {
      if (mode === 'signup') {
        const { data, error: e } = await supabase.auth.signUp({ email, password })
        if (e) throw e

        // identities array is empty if email is already registered
        if (data.user && data.user.identities && data.user.identities.length === 0) {
          throw new Error('An account with this email already exists. Try signing in instead.')
        }

        // Try to create the user row — may fail silently if no session yet
        try {
          await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: data.user.id, email: data.user.email }),
          })
        } catch { /* will retry on first sign in */ }

        // If session exists, email confirmation is disabled in Supabase — proceed directly
        if (data.session) {
          onAuth(data.user)
        } else {
          // Email confirmation required — show the confirmation screen
          setConfirmEmail(email)
        }
      } else {
        const { data, error: e } = await supabase.auth.signInWithPassword({ email, password })
        if (e) throw e
        onAuth(data.user)
      }
    } catch(e) {
      const msg = e.message ?? ''
      if (msg.includes('Invalid login') || msg.includes('invalid_credentials')) {
        setError('Incorrect email or password.')
      } else if (msg.includes('already registered') || msg.includes('already exists')) {
        setError('An account with this email already exists. Try signing in instead.')
      } else if (msg.includes('Password should')) {
        setError('Password must be at least 6 characters.')
      } else if (msg.includes('Email not confirmed') || msg.includes('email_not_confirmed')) {
        setConfirmEmail(email)
      } else {
        setError(msg || 'Something went wrong. Please try again.')
      }
    }
    finally { setLoading(false) }
  }

  const focus = e => { e.target.style.borderColor='rgba(255,255,255,0.3)'; e.target.style.background='rgba(255,255,255,0.08)' }
  const unfocus = e => { e.target.style.borderColor='rgba(255,255,255,0.1)'; e.target.style.background='rgba(255,255,255,0.05)' }

  // ── Email confirmation screen ──────────────────────────────────────────────
  if (confirmEmail) {
    return (
      <div style={{ position:'fixed', inset:0, zIndex:1000, background:'rgba(0,0,0,0.88)', backdropFilter:'blur(8px)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
        <div className="liquid-glass-strong" style={{ borderRadius:24, maxWidth:440, width:'100%', padding:40, animation:'fadeUp 0.35s ease', textAlign:'center' }}>

          {/* Envelope icon */}
          <div style={{ width:72, height:72, borderRadius:'50%', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 28px', fontSize:32 }}>
            ✉️
          </div>

          <div style={{ fontFamily:"'Instrument Serif',serif", fontStyle:'italic', fontSize:26, color:'#fff', marginBottom:12 }}>
            Check your inbox
          </div>

          <p style={{ fontFamily:"'Barlow',sans-serif", fontWeight:300, fontSize:14, color:'rgba(255,255,255,0.5)', lineHeight:1.7, marginBottom:6 }}>
            We sent a confirmation link to
          </p>
          <p style={{ fontFamily:"'Barlow',sans-serif", fontWeight:500, fontSize:15, color:'#fff', marginBottom:28, wordBreak:'break-all' }}>
            {confirmEmail}
          </p>

          <div className="liquid-glass" style={{ borderRadius:14, padding:'16px 20px', marginBottom:28, textAlign:'left' }}>
            <p style={{ fontFamily:"'Barlow',sans-serif", fontWeight:300, fontSize:13, color:'rgba(255,255,255,0.6)', lineHeight:1.75, margin:0 }}>
              Click the link in the email to activate your account, then return here and sign in.
              <br /><br />
              <span style={{ color:'rgba(255,255,255,0.35)' }}>Don't see it? Check your spam or junk folder.</span>
            </p>
          </div>

          <button
            onClick={() => { setConfirmEmail(null); setMode('signin'); setPassword('') }}
            style={{ width:'100%', padding:'14px', background:'#fff', border:'none', borderRadius:40, color:'#000', fontFamily:"'Barlow',sans-serif", fontWeight:600, fontSize:14, cursor:'pointer', marginBottom:12, transition:'background 0.2s' }}
          >
            Go to Sign In →
          </button>

          <button
            onClick={() => setConfirmEmail(null)}
            style={{ background:'none', border:'none', color:'rgba(255,255,255,0.25)', fontFamily:"'Barlow',sans-serif", fontSize:12, cursor:'pointer', padding:'4px' }}
          >
            ← Back
          </button>
        </div>
      </div>
    )
  }

  // ── Normal auth form ───────────────────────────────────────────────────────
  return (
    <>
      <div style={{ position:'fixed', inset:0, zIndex:1000, background:'rgba(0,0,0,0.88)', backdropFilter:'blur(8px)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
        <div className="liquid-glass-strong" style={{ borderRadius:24, maxWidth:440, width:'100%', padding:32, animation:'fadeUp 0.35s ease' }}>
          <div style={{ textAlign:'center', marginBottom:28 }}>
            <div style={{ fontFamily:"'Instrument Serif',serif", fontStyle:'italic', fontSize:28, color:'#fff', marginBottom:4 }}>DW<span style={{opacity:0.4}}>.</span>ELLING</div>
            <p style={{ fontFamily:"'Barlow',sans-serif", fontWeight:300, fontSize:13, color:'rgba(255,255,255,0.4)' }}>{mode==='signup'?'Create your account':'Welcome back'}</p>
          </div>
          <div className="liquid-glass" style={{ borderRadius:40, padding:4, display:'flex', marginBottom:24 }}>
            {['signin','signup'].map(m=>(
              <button key={m} onClick={()=>{setMode(m);setError(null)}} style={{ flex:1, padding:'8px', borderRadius:36, border:'none', cursor:'pointer', fontFamily:"'Barlow',sans-serif", fontSize:13, fontWeight:500, transition:'background 0.2s, color 0.2s', background:mode===m?'#fff':'transparent', color:mode===m?'#000':'rgba(255,255,255,0.4)' }}>
                {m==='signin'?'Sign In':'Sign Up'}
              </button>
            ))}
          </div>
          <div style={{ marginBottom:12 }}>
            <label style={{ display:'block', fontSize:11, color:'rgba(255,255,255,0.4)', marginBottom:6, fontFamily:"'Barlow',sans-serif", letterSpacing:'0.08em', textTransform:'uppercase' }}>Email</label>
            <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" style={inp} onFocus={focus} onBlur={unfocus} />
          </div>
          <div style={{ marginBottom:mode==='signup'?16:20 }}>
            <label style={{ display:'block', fontSize:11, color:'rgba(255,255,255,0.4)', marginBottom:6, fontFamily:"'Barlow',sans-serif", letterSpacing:'0.08em', textTransform:'uppercase' }}>Password</label>
            <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Min. 6 characters" style={inp} onFocus={focus} onBlur={unfocus} onKeyDown={e=>e.key==='Enter'&&submit()} />
          </div>
          {mode==='signup'&&(
            <div className="liquid-glass" style={{ borderRadius:12, padding:16, marginBottom:16 }}>
              <label style={{ display:'flex', alignItems:'flex-start', gap:10, cursor:'pointer' }}>
                <input type="checkbox" checked={terms} onChange={e=>setTerms(e.target.checked)} style={{ width:16, height:16, marginTop:2, accentColor:'#fff', flexShrink:0 }} />
                <span style={{ fontFamily:"'Barlow',sans-serif", fontWeight:300, fontSize:12, color:'rgba(255,255,255,0.7)', lineHeight:1.6 }}>
                  I accept the{' '}
                  <span onClick={e=>{e.preventDefault();setShowTerms(true)}} style={{ color:'#fff', textDecoration:'underline', cursor:'pointer' }}>Terms & Conditions</span>.
                  {' '}All data is informational only, not financial advice.
                </span>
              </label>
            </div>
          )}
          {error&&(
            <div className="liquid-glass" style={{ borderRadius:10, padding:'10px 14px', marginBottom:16, border:'1px solid rgba(248,113,113,0.3)', background:'rgba(248,113,113,0.08)' }}>
              <p style={{ fontFamily:"'Barlow',sans-serif", fontSize:12, color:'#f87171' }}>⚠ {error}</p>
            </div>
          )}
          <button onClick={submit} disabled={loading} style={{ width:'100%', padding:'14px', background:loading?'rgba(255,255,255,0.06)':'#fff', border:'none', borderRadius:40, color:loading?'rgba(255,255,255,0.3)':'#000', fontFamily:"'Barlow',sans-serif", fontWeight:600, fontSize:14, cursor:loading?'not-allowed':'pointer', transition:'background 0.2s' }}>
            {loading?'Please wait...':(mode==='signup'?'Create Account →':'Sign In →')}
          </button>
        </div>
      </div>
      {showTerms&&(
        <div style={{ position:'fixed', inset:0, zIndex:1100, background:'rgba(0,0,0,0.95)', backdropFilter:'blur(8px)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }} onClick={()=>setShowTerms(false)}>
          <div onClick={e=>e.stopPropagation()} className="liquid-glass-strong" style={{ borderRadius:20, maxWidth:640, width:'100%', height:'75vh', display:'flex', flexDirection:'column' }}>
            <div style={{ padding:'16px 24px', borderBottom:'1px solid rgba(255,255,255,0.08)', display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0 }}>
              <span style={{ fontFamily:"'Instrument Serif',serif", fontStyle:'italic', fontSize:20, color:'#fff' }}>Terms & Conditions</span>
              <button onClick={()=>setShowTerms(false)} style={{ background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:8, color:'#fff', fontFamily:"'Barlow',sans-serif", fontSize:12, padding:'6px 12px', cursor:'pointer' }}>✕</button>
            </div>
            <div style={{ flex:1, overflowY:'scroll', padding:'24px 28px' }}>
              <p style={{ fontFamily:"'Barlow',sans-serif", fontWeight:300, fontSize:11, color:'rgba(255,255,255,0.3)', marginBottom:20 }}>Last updated: June 2025.</p>
              {TERMS.map(({title,body})=>(
                <div key={title} style={{ marginBottom:20 }}>
                  <div style={{ fontFamily:"'Instrument Serif',serif", fontStyle:'italic', fontSize:16, color:'#fff', marginBottom:8 }}>{title}</div>
                  <p style={{ fontFamily:"'Barlow',sans-serif", fontWeight:300, fontSize:13, color:'rgba(255,255,255,0.6)', lineHeight:1.8 }}>{body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
