import { useState, useRef } from "react"
import { downloadAnalysisHTML } from "../lib/exportHTML"

const SECTIONS = [
  { key: "overview",    label: "Overview / AI Summary" },
  { key: "market",     label: "Market & Property Estimate" },
  { key: "investment", label: "Investment Analysis" },
  { key: "col",        label: "Cost of Living" },
  { key: "scores",     label: "Liveability Scores" },
  { key: "hood",       label: "Neighbourhood" },
  { key: "proscons",   label: "Pros & Cons" },
  { key: "risk",       label: "Environmental & Risk" },
  { key: "climate",    label: "Climate & Weather" },
  { key: "insights",   label: "Local Insights" },
]

export default function ExportModal({ result, onClose }) {
  const [brandName, setBrandName] = useState("Dwelling")
  const [clientName, setClientName] = useState("")
  const [logoUrl, setLogoUrl] = useState("")
  const [logoPreview, setLogoPreview] = useState("")
  const fileRef = useRef(null)
  const [sections, setSections] = useState(
    Object.fromEntries(SECTIONS.map((s) => [s.key, true]))
  )
  const [downloading, setDownloading] = useState(false)

  const area = result?.geo?.displayName || "Area"

  const toggleSection = (key) =>
    setSections((prev) => ({ ...prev, [key]: !prev[key] }))

  const handleExport = () => {
    setDownloading(true)
    const config = { brandName, clientName, logoUrl, sections }
    try {
      downloadAnalysisHTML(result, config)
      // Save to localStorage export history
      const entry = {
        id: Date.now().toString(),
        area,
        clientName,
        brandName,
        timestamp: new Date().toISOString(),
        result,
        config,
      }
      const prev = JSON.parse(localStorage.getItem("dwelling_exports") || "[]")
      localStorage.setItem(
        "dwelling_exports",
        JSON.stringify([entry, ...prev].slice(0, 50))
      )
    } finally {
      setDownloading(false)
      onClose()
    }
  }

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 900,
        background: "rgba(0,0,0,0.88)", backdropFilter: "blur(14px)",
        overflowY: "auto", overscrollBehavior: "contain",
        padding: "20px",
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={{ display: "flex", justifyContent: "center", minHeight: "100%" }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div
        className="liquid-glass-strong"
        style={{
          borderRadius: 20, width: "100%", maxWidth: 560,
          padding: 32, position: "relative",
          border: "1px solid rgba(255,255,255,0.1)",
          alignSelf: "flex-start", marginTop: "auto", marginBottom: "auto",
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: "absolute", top: 16, right: 16,
            background: "none", border: "none", cursor: "pointer",
            color: "rgba(255,255,255,0.35)", fontSize: 20,
          }}
        >✕</button>

        <div style={{ fontFamily: "'Instrument Serif',serif", fontStyle: "italic", fontSize: 22, color: "#fff", marginBottom: 4 }}>
          Export HTML Report
        </div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", fontFamily: "'Barlow',sans-serif", marginBottom: 28 }}>
          {area}
        </div>

        {/* Branding */}
        <div style={{ marginBottom: 22 }}>
          <label style={labelStyle}>Brand / Company Name</label>
          <input
            value={brandName}
            onChange={(e) => setBrandName(e.target.value)}
            placeholder="Your company name"
            style={inputStyle}
            onFocus={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.3)")}
            onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.1)")}
          />
        </div>

        <div style={{ marginBottom: 22 }}>
          <label style={labelStyle}>Client Name <span style={{ color: "rgba(255,255,255,0.25)" }}>(optional)</span></label>
          <input
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            placeholder="e.g. John & Sarah Smith"
            style={inputStyle}
            onFocus={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.3)")}
            onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.1)")}
          />
        </div>

        <div style={{ marginBottom: 28 }}>
          <label style={labelStyle}>Logo <span style={{ color: "rgba(255,255,255,0.25)" }}>(PNG or JPEG, optional)</span></label>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
            style={{ display: "none" }}
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (!file) return
              const reader = new FileReader()
              reader.onload = (ev) => {
                setLogoUrl(ev.target.result)
                setLogoPreview(ev.target.result)
              }
              reader.readAsDataURL(file)
            }}
          />
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              style={{
                ...inputStyle,
                cursor: "pointer", textAlign: "left",
                color: logoPreview ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.3)",
                display: "flex", alignItems: "center", gap: 8, width: "auto", flex: 1,
              }}
            >
              <span style={{ fontSize: 16 }}>🖼</span>
              {logoPreview ? "Logo uploaded — click to change" : "Upload logo file"}
            </button>
            {logoPreview && (
              <>
                <img src={logoPreview} alt="Logo preview" style={{ height: 36, width: "auto", objectFit: "contain", borderRadius: 6, border: "1px solid rgba(255,255,255,0.1)", padding: 4, background: "rgba(255,255,255,0.05)" }} />
                <button type="button" onClick={() => { setLogoUrl(""); setLogoPreview(""); fileRef.current.value = "" }}
                  style={{ background: "none", border: "none", color: "rgba(255,255,255,0.3)", cursor: "pointer", fontSize: 16 }}>×</button>
              </>
            )}
          </div>
        </div>

        {/* Section picker */}
        <div style={{ marginBottom: 28 }}>
          <div style={labelStyle}>Include Sections</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 10 }}>
            {SECTIONS.map((s) => (
              <label
                key={s.key}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "9px 12px", borderRadius: 10, cursor: "pointer",
                  background: sections[s.key] ? "rgba(251,191,36,0.08)" : "rgba(255,255,255,0.03)",
                  border: `1px solid ${sections[s.key] ? "rgba(251,191,36,0.25)" : "rgba(255,255,255,0.06)"}`,
                  transition: "all 0.15s",
                }}
              >
                <div
                  style={{
                    width: 16, height: 16, borderRadius: 4, flexShrink: 0,
                    background: sections[s.key] ? "#fbbf24" : "rgba(255,255,255,0.08)",
                    border: sections[s.key] ? "none" : "1px solid rgba(255,255,255,0.15)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}
                >
                  {sections[s.key] && <span style={{ fontSize: 9, color: "#000", fontWeight: 900 }}>✓</span>}
                </div>
                <input
                  type="checkbox"
                  checked={sections[s.key]}
                  onChange={() => toggleSection(s.key)}
                  style={{ display: "none" }}
                />
                <span style={{ fontFamily: "'Barlow',sans-serif", fontSize: 12, color: sections[s.key] ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.35)" }}>
                  {s.label}
                </span>
              </label>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <button onClick={() => setSections(Object.fromEntries(SECTIONS.map(s => [s.key, true])))} style={tinyBtn}>Select all</button>
            <button onClick={() => setSections(Object.fromEntries(SECTIONS.map(s => [s.key, false])))} style={tinyBtn}>Clear all</button>
          </div>
        </div>

        <button
          onClick={handleExport}
          disabled={downloading}
          style={{
            width: "100%", padding: "14px", borderRadius: 40, border: "none",
            cursor: downloading ? "wait" : "pointer",
            fontFamily: "'Barlow',sans-serif", fontWeight: 700, fontSize: 14,
            background: "linear-gradient(90deg, #fbbf24, #d97706)",
            color: "#000", transition: "opacity 0.15s",
            opacity: downloading ? 0.6 : 1,
          }}
          onMouseEnter={(e) => { if (!downloading) e.currentTarget.style.opacity = "0.88" }}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = downloading ? "0.6" : "1")}
        >
          {downloading ? "Generating..." : "Download HTML Report →"}
        </button>
      </div>
      </div>
    </div>
  )
}

const labelStyle = {
  display: "block",
  fontFamily: "'Barlow',sans-serif",
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: "0.09em",
  textTransform: "uppercase",
  color: "rgba(255,255,255,0.4)",
  marginBottom: 8,
}

const inputStyle = {
  width: "100%",
  padding: "11px 14px",
  borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.1)",
  background: "rgba(255,255,255,0.05)",
  color: "#fff",
  fontFamily: "'Barlow',sans-serif",
  fontSize: 13,
  outline: "none",
  transition: "border-color 0.2s",
  boxSizing: "border-box",
}

const tinyBtn = {
  padding: "4px 12px",
  borderRadius: 20,
  border: "none",
  background: "rgba(255,255,255,0.06)",
  color: "rgba(255,255,255,0.35)",
  fontSize: 11,
  fontFamily: "'Barlow',sans-serif",
  cursor: "pointer",
}
