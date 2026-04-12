import { useState, useRef } from "react"
import { getBrandLogo, getBrandName } from "./BrandingModal"

export default function BusinessSettings() {
  const [brandName, setBrandName] = useState(getBrandName)
  const [logoPreview, setLogoPreview] = useState(getBrandLogo)
  const [saved, setSaved] = useState(false)
  const fileInputRef = useRef(null)

  const readFileAsDataURL = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!["image/png", "image/jpeg"].includes(file.type)) {
      alert("Please upload PNG or JPEG")
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      alert("Image must be under 2MB")
      return
    }
    const dataUrl = await readFileAsDataURL(file)
    setLogoPreview(dataUrl)
  }

  const handleSave = () => {
    if (logoPreview) localStorage.setItem("dw_brand_logo", logoPreview)
    else localStorage.removeItem("dw_brand_logo")
    if (brandName) localStorage.setItem("dw_brand_name", brandName)
    else localStorage.removeItem("dw_brand_name")
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleClear = () => {
    localStorage.removeItem("dw_brand_logo")
    localStorage.removeItem("dw_brand_name")
    setLogoPreview("")
    setBrandName("")
  }

  return (
    <div style={{ padding: 32, maxWidth: 1200 }}>
      <div style={{ marginBottom: 32 }}>
        <h1
          style={{
            fontFamily: "'Instrument Serif',serif",
            fontStyle: "italic",
            fontSize: 32,
            color: "#fff",
            marginBottom: 8,
          }}
        >
          Settings
        </h1>
        <p style={{ fontSize: 14, color: "rgba(255,255,255,0.4)", fontFamily: "'Barlow',sans-serif" }}>
          Configure your business branding
        </p>
      </div>

      <div
        style={{
          background: "#141414",
          borderRadius: 16,
          padding: 24,
          border: "1px solid rgba(255,255,255,0.06)",
          marginBottom: 16,
          maxHeight: "70vh",
          overflowY: "auto",
        }}
      >
        <div style={{ fontSize: 14, fontWeight: 500, color: "#fff", marginBottom: 20 }}>Brand Settings</div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,0.5)", marginBottom: 8 }}>
            Company Name
          </label>
          <input
            type="text"
            value={brandName}
            onChange={(e) => setBrandName(e.target.value)}
            placeholder="Your company name"
            style={{
              width: "100%",
              padding: "12px 16px",
              borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.1)",
              background: "rgba(255,255,255,0.05)",
              color: "#fff",
              fontSize: 14,
              outline: "none",
            }}
          />
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,0.5)", marginBottom: 8 }}>
            Logo (PNG or JPEG)
          </label>
          <input
            type="file"
            ref={fileInputRef}
            accept="image/png,image/jpeg"
            onChange={handleFileChange}
            style={{ display: "none" }}
          />
          <div
            onClick={() => fileInputRef.current?.click()}
            style={{
              width: "100%",
              padding: 40,
              borderRadius: 12,
              border: "2px dashed rgba(255,255,255,0.15)",
              background: "rgba(255,255,255,0.02)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
              cursor: "pointer",
            }}
          >
            {logoPreview ? (
              <img src={logoPreview} alt="logo" style={{ maxHeight: 60, objectFit: "contain" }} />
            ) : (
              <>
                <div style={{ fontSize: 24 }}>🖼</div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>Click to upload logo</div>
              </>
            )}
          </div>
        </div>

        <div style={{ display: "flex", gap: 12 }}>
          <button
            onClick={handleSave}
            style={{
              padding: "12px 24px",
              borderRadius: 8,
              border: "none",
              background: saved ? "#4ade80" : "#fbbf24",
              color: saved ? "#000" : "#000",
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "'Barlow',sans-serif",
            }}
          >
            {saved ? "Saved!" : "Save"}
          </button>
          <button
            onClick={handleClear}
            style={{
              padding: "12px 24px",
              borderRadius: 8,
              border: "none",
              background: "rgba(255,255,255,0.06)",
              color: "rgba(255,255,255,0.5)",
              cursor: "pointer",
              fontFamily: "'Barlow',sans-serif",
            }}
          >
            Clear
          </button>
        </div>
      </div>
    </div>
  )
}
