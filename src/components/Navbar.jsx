import { useState, useEffect } from 'react'
import { LOGO, scrollTo } from '../lib/appHelpers'

export default function Navbar({ user, userRecord, analysesLeft, isInTrial, trialDaysLeft, onSignOut, onHome, onOpenKeyModal, hasOwnKey, previewPlan, onTogglePreview, onDeleteAccount, onOpenAuth }) {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const h = () => { const s = window.scrollY > 50; setScrolled(prev => prev === s ? prev : s) }
    window.addEventListener('scroll', h, { passive: true })
    return () => window.removeEventListener('scroll', h)
  }, [])
  const links = [
    { label: 'Features', id: 'features' },
    { label: 'How It Works', id: 'how-it-works' },
    { label: 'Pricing', id: 'pricing' },
    { label: 'FAQ', id: 'faq' },
  ]
  const low = typeof analysesLeft === 'number' && analysesLeft <= 3
  return (
    <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, padding: '14px 24px', background: scrolled ? 'rgba(0,0,0,0.85)' : 'transparent', backdropFilter: scrolled ? 'blur(16px)' : 'none', WebkitBackdropFilter: scrolled ? 'blur(16px)' : 'none', borderBottom: scrolled ? '1px solid rgba(255,255,255,0.06)' : '1px solid transparent', transition: 'background 0.3s, border-color 0.3s' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <button onClick={onHome} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
          <img src={LOGO} alt="Dwelling" style={{ width: 36, height: 36, borderRadius: 8 }} />
          <span style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 20, color: '#fff' }}>Dwelling</span>
        </button>
        <div className="liquid-glass nav-links-desktop" style={{ borderRadius: 40, padding: '6px 8px', display: 'flex', alignItems: 'center', gap: 4 }}>
          {links.map(link => (
            <button key={link.id} onClick={() => scrollTo(link.id)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'Barlow',sans-serif", fontWeight: 400, fontSize: 13, color: 'rgba(255,255,255,0.8)', padding: '6px 14px', borderRadius: 40, transition: 'background 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.07)'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}>
              {link.label}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {user ? (
            <>
              <span className="liquid-glass" style={{ borderRadius: 40, padding: '5px 12px', fontSize: 12, fontFamily: "'Barlow',sans-serif", color: user?.is_admin ? '#a78bfa' : userRecord?.is_pro ? '#fbbf24' : low ? '#f87171' : 'rgba(255,255,255,0.5)' }}>
                {user?.is_admin ? '⚡ Admin' : userRecord?.is_pro ? '★ Pro' : `${analysesLeft} / 10 left`}
              </span>
              {user?.is_admin && (
                <button onClick={onTogglePreview} style={{ background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.25)', cursor: 'pointer', fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 11, color: '#a78bfa', padding: '5px 10px', borderRadius: 20 }}>
                  Preview: {previewPlan === 'pro' ? 'Pro' : 'Free'}
                </button>
              )}
              <button onClick={onOpenKeyModal} title="Use your own Cerebras API key" style={{ background: hasOwnKey ? 'rgba(74,222,128,0.1)' : 'none', border: hasOwnKey ? '1px solid rgba(74,222,128,0.25)' : 'none', cursor: 'pointer', fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 11, color: hasOwnKey ? '#4ade80' : 'rgba(255,255,255,0.35)', padding: '5px 10px', borderRadius: 20, transition: 'color 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.color = hasOwnKey ? '#4ade80' : 'rgba(255,255,255,0.7)'}
                onMouseLeave={e => e.currentTarget.style.color = hasOwnKey ? '#4ade80' : 'rgba(255,255,255,0.35)'}>{hasOwnKey ? '🔑 Own Key' : '🔑 API Key'}</button>
              <button onClick={onSignOut} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 12, color: 'rgba(255,255,255,0.35)', padding: '5px 8px', transition: 'color 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.7)'}
                onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.35)'}>Sign out</button>
              <button onClick={onDeleteAccount} title="Delete account" style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 11, color: 'rgba(248,113,113,0.35)', padding: '5px 8px', transition: 'color 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.color = 'rgba(248,113,113,0.8)'}
                onMouseLeave={e => e.currentTarget.style.color = 'rgba(248,113,113,0.35)'}>Delete account</button>
            </>
          ) : (
            <button onClick={onOpenAuth} style={{ background: '#fff', color: '#000', border: 'none', cursor: 'pointer', fontFamily: "'Barlow',sans-serif", fontWeight: 600, fontSize: 13, borderRadius: 40, padding: '8px 18px', display: 'flex', alignItems: 'center', gap: 6, transition: 'transform 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
              Get Started ↗
            </button>
          )}
        </div>
      </div>
    </nav>
  )
}
