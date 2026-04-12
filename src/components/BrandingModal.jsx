import { useState, useRef } from 'react'

const LOGO_KEY = 'dw_brand_logo'
const NAME_KEY = 'dw_brand_name'

export function getBrandLogo() { return localStorage.getItem(LOGO_KEY) || '' }
export function getBrandName() { return localStorage.getItem(NAME_KEY) || '' }

export default function BrandingModal({ onClose }) {
  const [logoUrl, setLogoUrl] = useState(getBrandLogo)
  const [brandName, setBrandName] = useState(getBrandName)
  const [saved, setSaved] = useState(false)
  const [logoError, setLogoError] = useState('')
  const fileInputRef = useRef(null)

  const handleLogoFile = (e) => {
    setLogoError('')
    const file = e.target.files[0]
    if (!file) return
    if (!['image/png', 'image/jpeg'].includes(file.type)) {
      setLogoError('Only PNG or JPEG files are supported.')
      e.target.value = ''
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      setLogoError('File too large (max 2MB).')
      e.target.value = ''
      return
    }
    const reader = new FileReader()
    reader.onload = (evt) => {
      const base64 = evt.target.result
      localStorage.setItem(LOGO_KEY, base64)
      setLogoUrl(base64)
    }
    reader.readAsDataURL(file)
  }

  const handleSave = () => {
    if (brandName.trim()) localStorage.setItem(NAME_KEY, brandName.trim())
    else localStorage.removeItem(NAME_KEY)
    if (!logoUrl) localStorage.removeItem(LOGO_KEY)
    setSaved(true)
    setTimeout(() => { setSaved(false); onClose() }, 800)
  }

  const handleClear = () => {
    localStorage.removeItem(LOGO_KEY)
    localStorage.removeItem(NAME_KEY)
    setLogoUrl('')
    setBrandName('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="liquid-glass-strong" style={{ borderRadius: 24, width: '100%', maxWidth: 420, padding: '28px 24px', border: '1px solid rgba(255,255,255,0.1)', animation: 'fadeUp 0.25s ease' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <span style={{ fontSize: 20 }}>🏢</span>
          <div style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 22, color: '#fff' }}>Brand Settings</div>
        </div>
        <p style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 24, lineHeight: 1.6 }}>
          Your logo and name appear in PDF report headers shared with clients.
        </p>

        <label style={labelStyle}>Company / Brand Name</label>
        <input
          type="text" value={brandName} onChange={e => setBrandName(e.target.value)}
          placeholder="e.g. Smith Real Estate Group"
          style={inputStyle}
          onFocus={e => e.target.style.borderColor = 'rgba(255,255,255,0.3)'}
          onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
        />

        <label style={{ ...labelStyle, marginTop: 16 }}>Logo (PNG or JPEG)</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            style={{ ...btnSecondary, flex: '0 0 auto', fontSize: 12, padding: '10px 14px' }}
          >
            {logoUrl ? 'Change Logo' : 'Upload Logo'}
          </button>
          {logoUrl && (
            <span style={{ fontFamily: "'Barlow',sans-serif", fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
              Logo loaded ✓
            </span>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg"
          onChange={handleLogoFile}
          style={{ display: 'none' }}
        />
        {logoError && (
          <p style={{ fontFamily: "'Barlow',sans-serif", fontSize: 11, color: '#f87171', marginTop: 6 }}>{logoError}</p>
        )}

        {(logoUrl || brandName) && (
          <div style={{ marginTop: 16, padding: '12px 16px', borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', fontFamily: "'Barlow',sans-serif", textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Preview</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {logoUrl && <img src={logoUrl} alt="Logo" style={{ height: 28, borderRadius: 4, objectFit: 'contain' }} onError={e => e.target.style.display = 'none'} />}
              {brandName && <span style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 600, fontSize: 14, color: '#fff' }}>{brandName}</span>}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, marginTop: 22 }}>
          {(logoUrl || brandName) && (
            <button onClick={handleClear} style={{ ...btnSecondary, flex: '0 0 auto' }}>Clear</button>
          )}
          <button onClick={handleSave} style={{ ...btnPrimary, flex: 1 }}>
            {saved ? 'Saved ✓' : 'Save Brand Settings'}
          </button>
        </div>
      </div>
    </div>
  )
}

const labelStyle = {
  display: 'block', fontFamily: "'Barlow',sans-serif", fontWeight: 400, fontSize: 11,
  color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6,
}
const inputStyle = {
  width: '100%', padding: '11px 14px', borderRadius: 12, boxSizing: 'border-box',
  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
  color: '#fff', fontFamily: "'Barlow',sans-serif", fontSize: 13, outline: 'none', transition: 'border-color 0.2s',
}
const btnPrimary = {
  padding: '12px', borderRadius: 40, border: 'none', cursor: 'pointer',
  fontFamily: "'Barlow',sans-serif", fontWeight: 600, fontSize: 13,
  background: 'linear-gradient(90deg, #38bdf8, #818cf8)', color: '#000',
}
const btnSecondary = {
  padding: '12px 16px', borderRadius: 40, border: 'none', cursor: 'pointer',
  fontFamily: "'Barlow',sans-serif", fontWeight: 400, fontSize: 13,
  background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.45)',
}
