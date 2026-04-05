import { useState, useEffect } from 'react'

const STORAGE_KEY = 'dwelling_cookie_consent'
const GA_ID = 'G-P02023D4E6'

function enableAnalytics() {
  // Dynamically inject GA4 script only after explicit consent (Basic Consent Mode)
  // This prevents any data transmission to Google before the user opts in
  if (document.querySelector(`script[src*="${GA_ID}"]`)) return // already loaded

  window.dataLayer = window.dataLayer || []
  window.gtag = function () { window.dataLayer.push(arguments) }
  window.gtag('js', new Date())
  window.gtag('config', GA_ID, { anonymize_ip: true })

  const script = document.createElement('script')
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`
  script.async = true
  document.head.appendChild(script)
}

export default function CookieBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) {
      setVisible(true)
    } else if (stored === 'accepted') {
      enableAnalytics()
    }
  }, [])

  function accept() {
    localStorage.setItem(STORAGE_KEY, 'accepted')
    enableAnalytics()
    setVisible(false)
  }

  function decline() {
    localStorage.setItem(STORAGE_KEY, 'declined')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div style={{
      position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
      zIndex: 9000, width: 'calc(100% - 48px)', maxWidth: 560,
      background: 'rgba(10,16,30,0.96)', backdropFilter: 'blur(16px)',
      border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16,
      padding: '18px 22px', display: 'flex', alignItems: 'center',
      gap: 16, flexWrap: 'wrap',
      boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
    }}>
      <p style={{
        flex: 1, minWidth: 200,
        fontFamily: "'Barlow', sans-serif", fontWeight: 300, fontSize: 13,
        color: 'rgba(255,255,255,0.55)', lineHeight: 1.6, margin: 0,
      }}>
        We use cookies to understand how you use Dwelling. No data is collected without your consent.{' '}
        <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>PIPEDA compliant</span>
      </p>
      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
        <button onClick={decline} style={{
          padding: '8px 18px', borderRadius: 40, border: '1px solid rgba(255,255,255,0.12)',
          background: 'none', color: 'rgba(255,255,255,0.4)',
          fontFamily: "'Barlow', sans-serif", fontWeight: 400, fontSize: 13,
          cursor: 'pointer', transition: 'color 0.15s, border-color 0.15s',
        }}
          onMouseEnter={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)' }}
          onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.4)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)' }}
        >Decline</button>
        <button onClick={accept} style={{
          padding: '8px 20px', borderRadius: 40, border: 'none',
          background: '#fff', color: '#000',
          fontFamily: "'Barlow', sans-serif", fontWeight: 600, fontSize: 13,
          cursor: 'pointer', transition: 'opacity 0.15s',
        }}
          onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
        >Accept</button>
      </div>
    </div>
  )
}
