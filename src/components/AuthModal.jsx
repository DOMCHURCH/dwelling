import { useState } from 'react'
import { signIn, signUp } from '../lib/localAuth'

const TERMS = [
  {
    title: '1. Acceptance of Terms',
    body: 'By creating an account or accessing Dwelling (the "Platform"), you agree to be legally bound by these Terms and Conditions ("Terms"). If you do not agree to all of these Terms, you must not use the Platform. These Terms constitute a binding legal agreement between you ("User") and Dwelling ("Company," "we," "us," or "our"). We reserve the right to modify these Terms at any time. Continued use of the Platform after modifications constitutes acceptance of the revised Terms. It is your responsibility to review these Terms periodically.'
  },
  {
    title: '2. No Professional or Financial Advice',
    body: 'ALL CONTENT PROVIDED BY THE PLATFORM IS FOR INFORMATIONAL AND EDUCATIONAL PURPOSES ONLY. Nothing on the Platform constitutes, and should not be construed as, financial advice, real estate advice, investment advice, legal advice, tax advice, insurance advice, or any other professional advice of any kind. The Platform does not recommend the purchase, sale, or holding of any real property, security, or investment. You should consult with a qualified and licensed professional — including but not limited to a licensed real estate agent, mortgage broker, financial advisor, lawyer, or accountant — before making any financial or real estate decision. The Company is not a licensed real estate brokerage, financial institution, investment dealer, or professional advisory firm.'
  },
  {
    title: '3. Accuracy and Reliability of Data',
    body: 'The Platform aggregates data from third-party sources including, but not limited to, Realtor.ca, Statistics Canada, OpenStreetMap, Open-Meteo, and AI-generated analysis. THE COMPANY MAKES NO REPRESENTATIONS, WARRANTIES, OR GUARANTEES OF ANY KIND, EXPRESS OR IMPLIED, REGARDING THE ACCURACY, COMPLETENESS, RELIABILITY, CURRENTNESS, SUITABILITY, OR AVAILABILITY OF ANY DATA, REPORT, SCORE, ESTIMATE, ANALYSIS, OR OTHER CONTENT PROVIDED BY THE PLATFORM. Market conditions, property values, neighbourhood characteristics, climate data, demographic information, and all other data points may be inaccurate, incomplete, outdated, or inapplicable to your specific circumstances. Algorithmic estimates, AI verdicts, stability scores, market temperature indicators, investment scores, and all other generated outputs are approximations only and may differ materially from actual market conditions or property values. The Company expressly disclaims all liability arising from reliance on Platform content.'
  },
  {
    title: '4. AI-Generated Content Disclaimer',
    body: 'The Platform uses artificial intelligence and machine learning systems to generate reports, analyses, verdicts, scores, and other content. AI-generated content may contain errors, hallucinations, outdated information, or outputs that are inappropriate for your specific circumstances. AI verdicts and investment scores are NOT predictive of future market performance. Past data used to train AI systems may not reflect current or future conditions. You acknowledge that AI-generated content is experimental in nature and should not be relied upon as a sole basis for any decision. The Company is not liable for any loss or damage resulting from AI-generated content.'
  },
  {
    title: '5. Limitation of Liability',
    body: 'TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL THE COMPANY, ITS DIRECTORS, OFFICERS, EMPLOYEES, AGENTS, CONTRACTORS, LICENSORS, OR AFFILIATES BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, EXEMPLARY, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO LOSS OF PROFITS, LOSS OF REVENUE, LOSS OF DATA, LOSS OF GOODWILL, BUSINESS INTERRUPTION, OR ANY OTHER INTANGIBLE LOSSES, ARISING OUT OF OR IN CONNECTION WITH YOUR USE OF OR INABILITY TO USE THE PLATFORM OR ITS CONTENT, EVEN IF THE COMPANY HAS BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES. TO THE EXTENT THAT LIABILITY CANNOT BE EXCLUDED UNDER APPLICABLE LAW, THE TOTAL CUMULATIVE LIABILITY OF THE COMPANY TO YOU FOR ANY AND ALL CLAIMS ARISING OUT OF OR IN CONNECTION WITH THESE TERMS OR THE PLATFORM SHALL NOT EXCEED THE GREATER OF: (A) THE TOTAL AMOUNT PAID BY YOU TO THE COMPANY IN THE THREE (3) MONTHS PRECEDING THE EVENT GIVING RISE TO THE CLAIM; OR (B) TWENTY-FIVE CANADIAN DOLLARS (CAD $25.00).'
  },
  {
    title: '6. No Warranty',
    body: 'THE PLATFORM IS PROVIDED ON AN "AS IS" AND "AS AVAILABLE" BASIS WITHOUT ANY WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED. THE COMPANY EXPRESSLY DISCLAIMS ALL WARRANTIES, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, AND NON-INFRINGEMENT. THE COMPANY DOES NOT WARRANT THAT THE PLATFORM WILL BE UNINTERRUPTED, ERROR-FREE, SECURE, OR FREE OF VIRUSES OR OTHER HARMFUL COMPONENTS. THE COMPANY DOES NOT WARRANT THAT ANY DEFECTS WILL BE CORRECTED OR THAT THE PLATFORM OR THE SERVERS MAKING IT AVAILABLE ARE FREE OF VIRUSES OR OTHER HARMFUL MECHANISMS.'
  },
  {
    title: '7. User Obligations and Prohibited Conduct',
    body: 'You agree to use the Platform only for lawful purposes and in accordance with these Terms. You shall not: (a) use the Platform in any way that violates applicable federal, provincial, or local laws or regulations; (b) scrape, crawl, index, or systematically extract data from the Platform without express written permission; (c) reproduce, distribute, sell, resell, or commercially exploit Platform content without authorization; (d) reverse engineer, decompile, or attempt to extract the source code of the Platform; (e) use the Platform to transmit any advertising or promotional material without consent; (f) impersonate any person or entity or misrepresent your affiliation; (g) interfere with or disrupt the integrity or performance of the Platform; (h) attempt to gain unauthorized access to any systems or networks. Violation of these prohibitions may result in immediate account termination and legal action.'
  },
  {
    title: '8. Intellectual Property',
    body: 'The Platform and all of its content, features, and functionality — including but not limited to text, graphics, logos, icons, images, audio clips, data compilations, software, and the arrangement thereof — are owned by the Company or its licensors and are protected by Canadian and international copyright, trademark, patent, trade secret, and other intellectual property laws. You are granted a limited, non-exclusive, non-transferable, revocable licence to access and use the Platform solely for your personal, non-commercial use. Nothing in these Terms grants you any ownership interest in the Platform or its content.'
  },
  {
    title: '9. Privacy and Data Collection',
    body: 'By using the Platform, you acknowledge and agree that we collect and process certain personal information including your email address, account activity, and usage data for the purposes of providing the Platform services, improving the Platform, and communicating with you. Search queries are processed in real time and are not retained beyond what is necessary for report generation. We do not sell your personal information to third parties. Your Cerebras AI API key, if provided, is stored in encrypted form and used solely to forward requests to the Cerebras AI API on your behalf. We employ reasonable technical and organizational measures to protect your data but cannot guarantee absolute security. By creating an account, you consent to the collection and processing of your data as described herein and in our Privacy Policy.'
  },
  {
    title: '10. Third-Party Services and Data Sources',
    body: 'The Platform integrates with and relies upon third-party data providers and services, including Realtor.ca/CREA, Statistics Canada, OpenStreetMap/Overpass API, Open-Meteo, Cerebras AI, Turso, and Vercel. The Company is not responsible for the accuracy, availability, or reliability of any third-party service or data. Third-party terms of service may apply. The Company is not affiliated with, endorsed by, or sponsored by any of these third parties. Links to third-party websites are provided for convenience only and do not constitute an endorsement.'
  },
  {
    title: '11. Subscription, Billing, and Refunds',
    body: 'Certain features of the Platform require a paid subscription. Subscription fees are charged in advance on a monthly or annual basis. All fees are in Canadian dollars (CAD) unless otherwise stated. You authorize us to charge your designated payment method for all fees incurred. Subscriptions automatically renew unless cancelled before the renewal date. We reserve the right to modify pricing with reasonable notice. Refund eligibility is at the sole discretion of the Company. Analysis availability under paid plans is subject to platform capacity and fair use limitations and does not constitute a guarantee of any specific volume of analyses.'
  },
  {
    title: '12. Account Termination',
    body: 'The Company reserves the right, in its sole discretion, to suspend or terminate your account and access to the Platform at any time, with or without notice, for any reason, including breach of these Terms. Upon termination, your right to use the Platform ceases immediately. The Company is not liable to you or any third party for any termination of your access. All provisions of these Terms which by their nature should survive termination shall survive, including without limitation ownership provisions, warranty disclaimers, indemnity, and limitations of liability.'
  },
  {
    title: '13. Indemnification',
    body: 'You agree to defend, indemnify, and hold harmless the Company and its officers, directors, employees, contractors, agents, licensors, and suppliers from and against any claims, liabilities, damages, judgments, awards, losses, costs, expenses, or fees (including reasonable legal fees) arising out of or relating to your violation of these Terms or your use of the Platform, including but not limited to your reliance on Platform content for any financial or real estate decision, your violation of any third-party right, or any claim that your use of the Platform caused damage to a third party.'
  },
  {
    title: '14. Dispute Resolution and Governing Law',
    body: 'These Terms are governed by and construed in accordance with the laws of the Province of Ontario and the federal laws of Canada applicable therein, without regard to conflict of law principles. Any dispute arising out of or relating to these Terms or the Platform shall first be subject to good-faith negotiation between the parties. If such negotiation fails, disputes shall be submitted to binding arbitration administered in accordance with the Arbitration Act, 1991 (Ontario). Arbitration shall take place in Ottawa, Ontario, Canada. You waive any right to participate in any class action lawsuit or class-wide arbitration against the Company. Notwithstanding the foregoing, the Company may seek injunctive or other equitable relief in any court of competent jurisdiction.'
  },
  {
    title: '15. Severability and Entire Agreement',
    body: 'If any provision of these Terms is found to be invalid, illegal, or unenforceable under applicable law, such provision shall be modified to the minimum extent necessary to make it enforceable, and the remaining provisions shall continue in full force and effect. These Terms, together with any applicable subscription agreements and our Privacy Policy, constitute the entire agreement between you and the Company with respect to the Platform and supersede all prior agreements, representations, and understandings. The Company\'s failure to enforce any right or provision of these Terms shall not constitute a waiver of such right or provision.'
  },
  {
    title: '16. Contact Information',
    body: 'If you have any questions regarding these Terms, please contact us at: 01dominique.c@gmail.com. For legal notices, please use the email above with the subject line "Legal Notice — Dwelling." These Terms were last updated on March 28, 2026.'
  },
]

const inp = {
  width:'100%', padding:'13px 16px',
  background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)',
  borderRadius:12, color:'#fff', fontSize:14, outline:'none',
  fontFamily:"'Barlow',sans-serif", fontWeight:300, transition:'border-color 0.15s, background 0.15s',
  boxSizing:'border-box',
}

export default function AuthModal({ onAuth, onDemo }) {
  const [mode, setMode] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [terms, setTerms] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [showTerms, setShowTerms] = useState(false)
  const [scrolledToBottom, setScrolledToBottom] = useState(false)

  const submit = async () => {
    if (!email || !password) return setError('Please fill in all fields.')
    if (mode === 'signup' && !terms) return setError('You must read and accept the Terms & Conditions to create an account.')
    if (password.length < 8) return setError('Password must be at least 8 characters.')
    setLoading(true); setError(null)
    try {
      let user
      if (mode === 'signup') {
        user = await signUp(email.trim(), password)
      } else {
        user = await signIn(email.trim(), password)
      }
      onAuth(user)
    } catch(e) {
      setError(e.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleTermsScroll = (e) => {
    const el = e.target
    const atBottom = el.scrollHeight - el.scrollTop <= el.clientHeight + 40
    if (atBottom) setScrolledToBottom(true)
  }

  const focus = e => { e.target.style.borderColor='rgba(255,255,255,0.3)'; e.target.style.background='rgba(255,255,255,0.08)' }
  const unfocus = e => { e.target.style.borderColor='rgba(255,255,255,0.1)'; e.target.style.background='rgba(255,255,255,0.05)' }

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
            <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Min. 8 characters" style={inp} onFocus={focus} onBlur={unfocus} onKeyDown={e=>e.key==='Enter'&&submit()} />
          </div>
          {mode==='signup'&&(
            <div className="liquid-glass" style={{ borderRadius:12, padding:16, marginBottom:16, border: terms ? '1px solid rgba(74,222,128,0.25)' : '1px solid rgba(255,255,255,0.06)' }}>
              <label style={{ display:'flex', alignItems:'flex-start', gap:10, cursor:'pointer' }}>
                <div
                  onClick={() => setTerms(t => !t)}
                  style={{
                    width:18, height:18, marginTop:1, flexShrink:0, borderRadius:5, cursor:'pointer',
                    border: terms ? '2px solid #4ade80' : '2px solid rgba(255,255,255,0.3)',
                    background: terms ? '#4ade80' : 'transparent',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    transition:'all 0.2s ease',
                  }}
                >
                  {terms && <span style={{ color:'#000', fontSize:11, fontWeight:700, lineHeight:1 }}>✓</span>}
                </div>
                <span style={{ fontFamily:"'Barlow',sans-serif", fontWeight:300, fontSize:12, color:'rgba(255,255,255,0.7)', lineHeight:1.6 }}>
                  I have read and agree to the{' '}
                  <span onClick={e=>{e.preventDefault();e.stopPropagation();setShowTerms(true);setScrolledToBottom(false)}} style={{ color:'#fff', textDecoration:'underline', cursor:'pointer' }}>Terms & Conditions</span>.
                  {' '}I understand all data is informational only and does not constitute professional, financial, or real estate advice.
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
          {onDemo && (
            <div style={{ textAlign:'center', marginTop:16 }}>
              <button onClick={onDemo} style={{ background:'none', border:'none', cursor:'pointer', fontFamily:"'Barlow',sans-serif", fontWeight:300, fontSize:13, color:'rgba(255,255,255,0.35)', textDecoration:'underline', textUnderlineOffset:3, padding:'4px 8px', transition:'color 0.2s' }}
                onMouseEnter={e=>e.currentTarget.style.color='rgba(255,255,255,0.65)'}
                onMouseLeave={e=>e.currentTarget.style.color='rgba(255,255,255,0.35)'}>
                Just want to see how it works? View a sample report →
              </button>
            </div>
          )}
        </div>
      </div>

      {showTerms&&(
        <div style={{ position:'fixed', inset:0, zIndex:1100, background:'rgba(0,0,0,0.95)', backdropFilter:'blur(8px)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }} onClick={()=>setShowTerms(false)}>
          <div onClick={e=>e.stopPropagation()} className="liquid-glass-strong" style={{ borderRadius:20, maxWidth:680, width:'100%', height:'82vh', display:'flex', flexDirection:'column' }}>
            {/* Header */}
            <div style={{ padding:'18px 28px', borderBottom:'1px solid rgba(255,255,255,0.08)', display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0 }}>
              <div>
                <span style={{ fontFamily:"'Instrument Serif',serif", fontStyle:'italic', fontSize:20, color:'#fff' }}>Terms & Conditions</span>
                <span style={{ marginLeft:12, fontFamily:"'Barlow',sans-serif", fontSize:10, color:'rgba(255,255,255,0.3)', textTransform:'uppercase', letterSpacing:'0.08em' }}>Last updated: March 28, 2026</span>
              </div>
              <button onClick={()=>setShowTerms(false)} style={{ background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:8, color:'#fff', fontFamily:"'Barlow',sans-serif", fontSize:12, padding:'6px 12px', cursor:'pointer' }}>✕</button>
            </div>

            {/* Scrollable body */}
            <div onScroll={handleTermsScroll} style={{ flex:1, overflowY:'scroll', padding:'24px 28px' }}>
              <div style={{ fontFamily:"'Barlow',sans-serif", fontWeight:400, fontSize:12, color:'rgba(255,255,255,0.5)', lineHeight:1.7, marginBottom:24, padding:'12px 16px', background:'rgba(251,191,36,0.06)', border:'1px solid rgba(251,191,36,0.15)', borderRadius:10 }}>
                ⚠ Please read these Terms carefully before creating an account. By checking the acceptance box, you acknowledge that you have read, understood, and agree to be bound by all of the following terms and conditions.
              </div>
              {TERMS.map(({title,body})=>(
                <div key={title} style={{ marginBottom:24, paddingBottom:24, borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ fontFamily:"'Instrument Serif',serif", fontStyle:'italic', fontSize:15, color:'#fff', marginBottom:8 }}>{title}</div>
                  <p style={{ fontFamily:"'Barlow',sans-serif", fontWeight:300, fontSize:12.5, color:'rgba(255,255,255,0.6)', lineHeight:1.85 }}>{body}</p>
                </div>
              ))}
              <div style={{ height:1, background:'rgba(255,255,255,0.06)', marginBottom:20 }} />
              <p style={{ fontFamily:"'Barlow',sans-serif", fontWeight:300, fontSize:11, color:'rgba(255,255,255,0.25)', lineHeight:1.7, marginBottom:20 }}>
                These Terms and Conditions were last updated on March 28, 2026 and are effective immediately upon account creation. Your acceptance of these Terms is recorded with a timestamp and associated with your account email address for legal compliance purposes.
              </p>
            </div>

            {/* Footer with accept button */}
            <div style={{ padding:'16px 28px', borderTop:'1px solid rgba(255,255,255,0.08)', flexShrink:0, display:'flex', gap:10, alignItems:'center' }}>
              {!scrolledToBottom && (
                <span style={{ fontFamily:"'Barlow',sans-serif", fontSize:11, color:'rgba(255,255,255,0.3)', flex:1 }}>
                  ↓ Scroll to read the full Terms before accepting
                </span>
              )}
              <button
                onClick={() => { setTerms(true); setShowTerms(false) }}
                style={{
                  padding:'11px 24px', borderRadius:40, border:'none', cursor:'pointer',
                  fontFamily:"'Barlow',sans-serif", fontWeight:600, fontSize:13,
                  background: '#fff', color: '#000',
                  marginLeft: scrolledToBottom ? 'auto' : undefined,
                  opacity: scrolledToBottom ? 1 : 0.5,
                  transition: 'opacity 0.3s ease',
                }}
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
