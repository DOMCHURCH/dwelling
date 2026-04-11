import { useState } from 'react'
import { getBrandLogo, getBrandName } from './BrandingModal'

const SECTIONS = [
  { id: 'verdict',      label: 'Area Verdict & AI Analysis', icon: '🎯', defaultOn: true },
  { id: 'market',       label: 'Market Intelligence',        icon: '📊', defaultOn: true },
  { id: 'estimate',     label: 'Market Estimate',            icon: '🏠', defaultOn: true },
  { id: 'investment',   label: 'Investment Analysis',        icon: '📈', defaultOn: true },
  { id: 'neighborhood', label: 'Neighborhood Scores',        icon: '🏘', defaultOn: true },
  { id: 'pricehistory', label: 'Price History & Projection', icon: '📉', defaultOn: true },
  { id: 'costliving',   label: 'Cost of Living',             icon: '💰', defaultOn: true },
  { id: 'climate',      label: 'Climate',                    icon: '🌤', defaultOn: true },
  { id: 'risk',         label: 'Environmental Risk',         icon: '🛡', defaultOn: true },
  { id: 'news',         label: 'Local Market News',          icon: '📰', defaultOn: false },
  { id: 'insights',     label: 'Local Insights',             icon: '🗺', defaultOn: false },
]

export default function PDFExportModal({ result, onClose }) {
  const [selected, setSelected] = useState(() =>
    Object.fromEntries(SECTIONS.map(s => [s.id, s.defaultOn]))
  )
  const [clientEmail, setClientEmail] = useState('')
  const [clientName, setClientName] = useState('')
  const [printing, setPrinting] = useState(false)

  const toggle = (id) => setSelected(p => ({ ...p, [id]: !p[id] }))
  const allOn  = SECTIONS.every(s => selected[s.id])
  const toggleAll = () => {
    const next = !allOn
    setSelected(Object.fromEntries(SECTIONS.map(s => [s.id, next])))
  }

  const handlePrint = () => {
    setPrinting(true)

    // --- inject client info into print header ---
    const printHeader = document.getElementById('print-header')
    let injected = []

    if (printHeader) {
      if (clientName || clientEmail) {
        const el = document.createElement('div')
        el.id = '__pdf_client'
        el.style.cssText = `
          font-family: 'Barlow', sans-serif;
          font-size: 11px;
          color: rgba(255,255,255,0.45);
          text-align: right;
          line-height: 1.5;
        `
        if (clientName) el.innerHTML += `<div style="font-weight:500;color:#fff">${clientName}</div>`
        if (clientEmail) el.innerHTML += `<div>${clientEmail}</div>`
        printHeader.appendChild(el)
        injected.push(el)
      }
    }

    // --- hide deselected sections ---
    const deselected = SECTIONS.filter(s => !selected[s.id]).map(s => s.id)
    const hidden = []
    deselected.forEach(id => {
      document.querySelectorAll(`[data-pdf-section="${id}"]`).forEach(el => {
        el.setAttribute('data-print-hidden', 'true')
        hidden.push(el)
      })
    })

    // --- cleanup after print dialog closes ---
    const cleanup = () => {
      hidden.forEach(el => el.removeAttribute('data-print-hidden'))
      injected.forEach(el => el.remove())
      setPrinting(false)
      onClose()
    }
    window.addEventListener('afterprint', cleanup, { once: true })

    // Small delay to let DOM settle before dialog opens
    setTimeout(() => { window.print() }, 80)
  }

  const area = result?.geo?.displayName?.split(',')[0] || 'Report'

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(14px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div
        className="liquid-glass-strong"
        style={{ borderRadius: 24, width: '100%', maxWidth: 460, padding: '28px 24px', border: '1px solid rgba(255,255,255,0.1)', animation: 'fadeUp 0.25s ease', maxHeight: '90vh', overflowY: 'auto' }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <span style={{ fontSize: 20 }}>↓</span>
          <div style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 22, color: '#fff' }}>Export PDF</div>
        </div>
        <p style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 22, lineHeight: 1.6 }}>
          {area} — customise what appears in the report.
        </p>

        {/* Branding preview */}
        {(getBrandLogo() || getBrandName()) && (
          <div style={{ marginBottom: 18, padding: '10px 14px', borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', gap: 10 }}>
            {getBrandLogo() && <img src={getBrandLogo()} alt="Logo" style={{ height: 24, objectFit: 'contain', borderRadius: 3 }} />}
            {getBrandName() && <span style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 600, fontSize: 13, color: '#fff' }}>{getBrandName()}</span>}
            <span style={{ marginLeft: 'auto', fontFamily: "'Barlow',sans-serif", fontSize: 10, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Brand header</span>
          </div>
        )}

        {/* Client info */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 400, fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Prepared For (optional)</div>
          <input
            type="text" value={clientName} onChange={e => setClientName(e.target.value)}
            placeholder="Client name"
            style={inputStyle}
            onFocus={e => e.target.style.borderColor = 'rgba(255,255,255,0.3)'}
            onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
          />
          <input
            type="email" value={clientEmail} onChange={e => setClientEmail(e.target.value)}
            placeholder="client@email.com"
            style={{ ...inputStyle, marginTop: 8 }}
            onFocus={e => e.target.style.borderColor = 'rgba(255,255,255,0.3)'}
            onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
          />
        </div>

        {/* Section toggles */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 400, fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Report Sections</div>
            <button onClick={toggleAll} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'Barlow',sans-serif", fontSize: 11, color: 'rgba(255,255,255,0.35)', transition: 'color 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.7)'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.35)'}>
              {allOn ? 'Deselect all' : 'Select all'}
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {SECTIONS.map(s => (
              <button key={s.id} onClick={() => toggle(s.id)} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px',
                borderRadius: 10, border: 'none', cursor: 'pointer', textAlign: 'left',
                background: selected[s.id] ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.02)',
                outline: selected[s.id] ? '1px solid rgba(255,255,255,0.15)' : '1px solid rgba(255,255,255,0.04)',
                transition: 'all 0.12s',
              }}
                onMouseEnter={e => { if (!selected[s.id]) e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
                onMouseLeave={e => { if (!selected[s.id]) e.currentTarget.style.background = 'rgba(255,255,255,0.02)' }}
              >
                <span style={{ fontSize: 14, flexShrink: 0 }}>{s.icon}</span>
                <span style={{ fontFamily: "'Barlow',sans-serif", fontSize: 13, fontWeight: 300, color: selected[s.id] ? '#fff' : 'rgba(255,255,255,0.4)', flex: 1, transition: 'color 0.12s' }}>{s.label}</span>
                <span style={{ width: 16, height: 16, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: selected[s.id] ? '#fff' : 'rgba(255,255,255,0.1)', transition: 'background 0.12s' }}>
                  {selected[s.id] && <span style={{ fontSize: 9, color: '#000', fontWeight: 700 }}>✓</span>}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Count */}
        <div style={{ textAlign: 'center', fontFamily: "'Barlow',sans-serif", fontSize: 11, color: 'rgba(255,255,255,0.25)', marginBottom: 18 }}>
          {SECTIONS.filter(s => selected[s.id]).length} of {SECTIONS.length} sections selected
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onClose} style={btnSecondary}>Cancel</button>
          <button
            onClick={handlePrint}
            disabled={printing || SECTIONS.filter(s => selected[s.id]).length === 0}
            style={{
              ...btnPrimary, flex: 1,
              opacity: SECTIONS.filter(s => selected[s.id]).length === 0 ? 0.4 : 1,
              cursor: SECTIONS.filter(s => selected[s.id]).length === 0 ? 'default' : 'pointer',
            }}
          >
            {printing ? 'Opening...' : '↓ Generate PDF'}
          </button>
        </div>
      </div>
    </div>
  )
}

const inputStyle = {
  width: '100%', padding: '10px 14px', borderRadius: 10, boxSizing: 'border-box',
  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
  color: '#fff', fontFamily: "'Barlow',sans-serif", fontSize: 13, outline: 'none', transition: 'border-color 0.2s',
}
const btnPrimary = {
  padding: '12px', borderRadius: 40, border: 'none',
  fontFamily: "'Barlow',sans-serif", fontWeight: 600, fontSize: 13,
  background: 'linear-gradient(90deg, #38bdf8, #818cf8)', color: '#000',
}
const btnSecondary = {
  padding: '12px 18px', borderRadius: 40, border: 'none', cursor: 'pointer',
  fontFamily: "'Barlow',sans-serif", fontWeight: 400, fontSize: 13,
  background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.45)',
}
