import { useState } from "react"
import { getUserApiKey, setUserApiKey } from "../lib/localAuth"

const PROVIDERS = [
  { label: 'Cerebras', note: 'Free · 1M tok/min', url: 'https://cloud.cerebras.ai', prefix: 'csk-' },
  { label: 'Groq', note: 'Free tier', url: 'https://console.groq.com/keys', prefix: 'gsk_' },
  { label: 'OpenRouter', note: 'Pay-per-use', url: 'https://openrouter.ai/keys', prefix: 'sk-or-' },
  { label: 'OpenAI', note: 'Pay-per-use', url: 'https://platform.openai.com/api-keys', prefix: 'sk-' },
  { label: 'Anthropic', note: 'Pay-per-use', url: 'https://console.anthropic.com/keys', prefix: 'sk-ant-' },
]

function detectProvider(key) {
  if (!key) return null
  return PROVIDERS.find(p => key.startsWith(p.prefix))
}

export default function BusinessBilling() {
  const [keyInput, setKeyInput] = useState("")
  const [msg, setMsg] = useState(null)
  const sessionKey = getUserApiKey()
  const detected = detectProvider(keyInput.trim())

  const flash = (text, err = false) => { setMsg({ text, err }); setTimeout(() => setMsg(null), 3500) }

  const handleSave = () => {
    const trimmed = keyInput.trim()
    if (!trimmed) return
    setUserApiKey(trimmed)
    flash("✓ AI provider key saved")
    setKeyInput("")
  }

  const handleRemove = () => {
    setUserApiKey("")
    flash("✓ Key removed")
  }

  return (
    <div style={{ padding: 32, maxWidth: 760 }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontFamily: "'Instrument Serif',serif", fontStyle: "italic", fontSize: 32, color: "#fff", marginBottom: 8 }}>
          AI Provider
        </h1>
        <p style={{ fontSize: 14, color: "rgba(255,255,255,0.4)", fontFamily: "'Barlow',sans-serif" }}>
          Connect your own API key — no platform subscription required.
        </p>
      </div>

      {/* Current key */}
      {sessionKey && (
        <div style={{ background: "rgba(74,222,128,0.06)", border: "1px solid rgba(74,222,128,0.2)", borderRadius: 12, padding: "16px 20px", marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 4, fontFamily: "'Barlow',sans-serif", textTransform: "uppercase", letterSpacing: "0.08em" }}>Active Key</div>
            <div style={{ fontFamily: "monospace", fontSize: 14, color: "#4ade80" }}>{sessionKey.slice(0, 10)}•••••{sessionKey.slice(-4)}</div>
          </div>
          <button onClick={handleRemove} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.1)", color: "#f87171", fontFamily: "'Barlow',sans-serif", fontSize: 12, cursor: "pointer" }}>Remove</button>
        </div>
      )}

      {msg && (
        <div style={{ padding: "10px 16px", borderRadius: 8, marginBottom: 16, fontFamily: "'Barlow',sans-serif", fontSize: 13, background: msg.err ? "rgba(239,68,68,0.12)" : "rgba(34,197,94,0.12)", border: `1px solid ${msg.err ? "rgba(239,68,68,0.25)" : "rgba(34,197,94,0.25)"}`, color: msg.err ? "#f87171" : "#4ade80" }}>
          {msg.text}
        </div>
      )}

      {/* Input */}
      <div style={{ background: "#141414", borderRadius: 16, padding: 24, border: "1px solid rgba(255,255,255,0.06)", marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: "#fff", marginBottom: 16 }}>
          {detected ? `${detected.label} key detected ✓` : "Connect API Key"}
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <input
            type="password"
            value={keyInput}
            onChange={e => setKeyInput(e.target.value)}
            placeholder="csk-… / sk-… / sk-ant-… / gsk_… / sk-or-…"
            onKeyDown={e => e.key === "Enter" && keyInput.trim() && handleSave()}
            style={{ flex: 1, padding: "11px 14px", borderRadius: 8, border: `1px solid ${detected ? "rgba(74,222,128,0.4)" : "rgba(255,255,255,0.1)"}`, background: "rgba(255,255,255,0.04)", color: "#fff", fontFamily: "monospace", fontSize: 13, outline: "none" }}
          />
          <button onClick={handleSave} disabled={!keyInput.trim()} style={{ padding: "11px 22px", borderRadius: 8, border: "none", background: !keyInput.trim() ? "rgba(255,255,255,0.06)" : "#fff", color: !keyInput.trim() ? "rgba(255,255,255,0.3)" : "#000", fontFamily: "'Barlow',sans-serif", fontWeight: 600, fontSize: 13, cursor: !keyInput.trim() ? "not-allowed" : "pointer" }}>
            Save
          </button>
        </div>
      </div>

      {/* Providers */}
      <div style={{ background: "#141414", borderRadius: 16, padding: 24, border: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: "#fff", marginBottom: 16 }}>Supported Providers</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          {PROVIDERS.map(p => (
            <a key={p.label} href={p.url} target="_blank" rel="noreferrer"
              style={{ padding: "8px 16px", borderRadius: 40, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)", fontFamily: "'Barlow',sans-serif", fontSize: 12, color: "rgba(255,255,255,0.65)", textDecoration: "none", display: "flex", gap: 6, alignItems: "center", transition: "opacity 0.15s" }}
              onMouseEnter={e => e.currentTarget.style.opacity = "0.75"}
              onMouseLeave={e => e.currentTarget.style.opacity = "1"}
            >
              {p.label}
              <span style={{ fontSize: 10, color: p.note.startsWith("Free") ? "#4ade80" : "rgba(255,255,255,0.35)" }}>{p.note}</span>
            </a>
          ))}
        </div>
        <div style={{ marginTop: 16, fontSize: 12, color: "rgba(255,255,255,0.3)", fontFamily: "'Barlow',sans-serif", lineHeight: 1.7 }}>
          Your key is stored in your browser session and proxied securely to the AI provider. It is never stored in Dwelling's database. Team members each supply their own key.
        </div>
      </div>
    </div>
  )
}
