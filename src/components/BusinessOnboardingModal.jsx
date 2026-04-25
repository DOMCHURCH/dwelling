import { useState } from "react"
import { getAuthToken, getUserApiKey, setUserApiKey } from "../lib/localAuth"
import AccountSettings from "./AccountSettings"

const MONO = "'JetBrains Mono','Fira Mono','Courier New',monospace"
const AMBER = "#f59e0b"
const DIM = "rgba(245,158,11,0.18)"
const BG = "#07090f"

function Badge({ children, color = AMBER }) {
  return (
    <span style={{
      fontFamily: MONO, fontSize: 10, fontWeight: 600, letterSpacing: "0.08em",
      color, background: `${color}18`, border: `1px solid ${color}33`,
      borderRadius: 4, padding: "2px 7px",
    }}>
      {children}
    </span>
  )
}

function Input({ value, onChange, placeholder, type = "text", disabled }) {
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      style={{
        width: "100%",
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 6,
        color: "#e5e7eb",
        fontFamily: MONO,
        fontSize: 12,
        padding: "9px 12px",
        outline: "none",
        boxSizing: "border-box",
        opacity: disabled ? 0.5 : 1,
      }}
    />
  )
}

function Btn({ children, onClick, disabled, variant = "primary", style = {} }) {
  const isPrimary = variant === "primary"
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: isPrimary ? AMBER : "rgba(255,255,255,0.06)",
        color: isPrimary ? "#000" : "rgba(255,255,255,0.7)",
        border: isPrimary ? "none" : "1px solid rgba(255,255,255,0.1)",
        borderRadius: 6,
        fontFamily: MONO,
        fontWeight: 600,
        fontSize: 12,
        padding: "9px 20px",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        transition: "opacity 0.15s",
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      {children}
    </button>
  )
}

// Step 1 — Transfer API key
function StepApiKey({ onNext, onSkip }) {
  const existingKey = getUserApiKey()
  const [transferring, setTransferring] = useState(false)
  const [done, setDone] = useState(false)

  const handleTransfer = async () => {
    if (!existingKey) { setDone(true); return }
    setTransferring(true)
    try {
      await setUserApiKey(existingKey)
      setDone(true)
    } catch {}
    setTransferring(false)
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
        <Badge>STEP 1 / 2</Badge>
        <Badge color="#4ade80">API KEYS</Badge>
      </div>
      <h2 style={{ fontFamily: MONO, fontSize: 18, fontWeight: 700, color: "#fff", margin: "0 0 8px" }}>
        Switch your API to the dashboard
      </h2>
      <p style={{ fontFamily: MONO, fontSize: 12, color: "rgba(255,255,255,0.5)", margin: "0 0 28px", lineHeight: 1.6 }}>
        API keys have moved from the top-right to your dashboard. You have <strong style={{ color: "#fbbf24" }}>4 more slots</strong> to add Cerebras API keys.
        Save your current key now, or add keys anytime in your dashboard.
      </p>

      <div style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 8,
        padding: "14px 16px",
        marginBottom: 24,
        fontFamily: MONO,
        fontSize: 12,
      }}>
        <div style={{ color: "rgba(255,255,255,0.4)", marginBottom: 6, fontSize: 10, letterSpacing: "0.08em" }}>
          CURRENT KEY
        </div>
        <div style={{ color: existingKey ? "#4ade80" : "rgba(255,255,255,0.25)" }}>
          {existingKey
            ? existingKey.slice(0, 8) + "•".repeat(Math.max(0, existingKey.length - 12)) + existingKey.slice(-4)
            : "No API key saved locally"}
        </div>
        <div style={{ color: "rgba(245,158,11,0.6)", fontSize: 10, marginTop: 8 }}>
          {done ? "✓ Saved to dashboard" : "4 more key slots available"}
        </div>
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        {!done && (
          <Btn onClick={handleTransfer} disabled={transferring || !existingKey} variant="primary">
            {transferring ? "Saving…" : existingKey ? "Save to Dashboard" : "No Key to Transfer"}
          </Btn>
        )}
        {done && (
          <Btn onClick={onNext} variant="primary">
            Next → Add Your Team
          </Btn>
        )}
        <Btn onClick={onSkip} variant="secondary">Skip</Btn>
      </div>
    </div>
  )
}

// Step 2 — Invite team members
function StepTeam({ onDone }) {
  const [rows, setRows] = useState([{ email: "", nickname: "" }])
  const [statuses, setStatuses] = useState({})
  const [sending, setSending] = useState({})

  const updateRow = (i, field, val) => {
    setRows(r => r.map((row, idx) => idx === i ? { ...row, [field]: val } : row))
  }

  const addRow = () => {
    if (rows.length < 9) setRows(r => [...r, { email: "", nickname: "" }])
  }

  const sendInvite = async (i) => {
    const { email, nickname } = rows[i]
    if (!email.trim() || !email.includes("@")) {
      setStatuses(s => ({ ...s, [i]: { ok: false, msg: "Enter a valid email" } }))
      return
    }
    setSending(s => ({ ...s, [i]: true }))
    try {
      const token = await getAuthToken()
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "invite-member", email: email.trim(), nickname: nickname.trim() || undefined }),
      })
      const data = await res.json()
      if (!res.ok) setStatuses(s => ({ ...s, [i]: { ok: false, msg: data.error || "Failed" } }))
      else setStatuses(s => ({ ...s, [i]: { ok: true, msg: "Invite sent!" } }))
    } catch {
      setStatuses(s => ({ ...s, [i]: { ok: false, msg: "Network error" } }))
    }
    setSending(s => ({ ...s, [i]: false }))
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
        <Badge>STEP 2 / 2</Badge>
        <Badge color="#38bdf8">TEAM</Badge>
      </div>
      <h2 style={{ fontFamily: MONO, fontSize: 18, fontWeight: 700, color: "#fff", margin: "0 0 8px" }}>
        Invite your team (1–9 people)
      </h2>
      <p style={{ fontFamily: MONO, fontSize: 12, color: "rgba(255,255,255,0.5)", margin: "0 0 28px", lineHeight: 1.6 }}>
        You're already counted as one team member. Invite 1–9 additional people to collaborate.
        They'll receive an email invite to join your team workspace.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
        {rows.map((row, i) => (
          <div key={i}>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <div style={{ flex: 2 }}>
                <Input
                  value={row.email}
                  onChange={e => updateRow(i, "email", e.target.value)}
                  placeholder="teammate@company.com"
                  type="email"
                  disabled={statuses[i]?.ok}
                />
              </div>
              <div style={{ flex: 1 }}>
                <Input
                  value={row.nickname}
                  onChange={e => updateRow(i, "nickname", e.target.value)}
                  placeholder="Nickname (optional)"
                  disabled={statuses[i]?.ok}
                />
              </div>
              <Btn
                onClick={() => sendInvite(i)}
                disabled={sending[i] || statuses[i]?.ok}
                variant={statuses[i]?.ok ? "secondary" : "primary"}
                style={{ flexShrink: 0 }}
              >
                {sending[i] ? "…" : statuses[i]?.ok ? "✓ Sent" : "Send Invite"}
              </Btn>
            </div>
            {statuses[i] && !statuses[i].ok && (
              <div style={{ fontFamily: MONO, fontSize: 11, color: "#f87171", marginTop: 4, paddingLeft: 2 }}>
                {statuses[i].msg}
              </div>
            )}
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        {rows.length < 9 && (
          <Btn onClick={addRow} variant="secondary">+ Add another</Btn>
        )}
        <div style={{ flex: 1 }} />
        <Btn onClick={onDone} variant="primary">Done — Go to Dashboard →</Btn>
      </div>
      {rows.length >= 9 && (
        <div style={{ marginTop: 12, fontSize: 10, color: "rgba(255,255,255,0.3)", fontFamily: MONO }}>Max 9 team members reached</div>
      )}
    </div>
  )
}

export default function BusinessOnboardingModal({ onClose, onOpenDashboard, user }) {
  const [step, setStep] = useState(1)
  const [showSettings, setShowSettings] = useState(false)

  const handleDone = () => {
    localStorage.setItem("dw_business_onboarded", "1")
    setShowSettings(true)
    // After showing settings, close the modal and open dashboard
    setTimeout(() => {
      onClose()
      onOpenDashboard?.()
    }, 2000)
  }

  if (showSettings) {
    return (
      <div style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(0,0,0,0.75)", backdropFilter: "blur(12px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        overflow: "auto", padding: 24,
      }}>
        <div style={{
          background: BG,
          border: "1px solid rgba(245,158,11,0.25)",
          borderRadius: 12,
          width: "100%",
          maxWidth: 600,
          boxShadow: "0 0 60px rgba(245,158,11,0.08)",
        }}>
          <AccountSettings user={user} onClose={onClose} />
        </div>
      </div>
    )
  }

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(0,0,0,0.75)", backdropFilter: "blur(12px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 24,
      }}
      onClick={e => { if (e.target === e.currentTarget) { localStorage.setItem("dw_business_onboarded","1"); onClose() } }}
    >
      <div style={{
        background: BG,
        border: "1px solid rgba(245,158,11,0.25)",
        borderRadius: 12,
        padding: "36px 40px",
        width: "100%",
        maxWidth: 560,
        boxShadow: "0 0 60px rgba(245,158,11,0.08)",
      }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32 }}>
          <div>
            <div style={{ fontFamily: MONO, fontSize: 10, color: AMBER, letterSpacing: "0.12em", marginBottom: 4 }}>
              DWELLING BUSINESS
            </div>
            <div style={{ fontFamily: MONO, fontSize: 13, color: "rgba(255,255,255,0.4)" }}>
              Welcome to the team workspace
            </div>
          </div>
          <button
            onClick={() => { localStorage.setItem("dw_business_onboarded","1"); onClose() }}
            style={{ background: "none", border: "none", color: "rgba(255,255,255,0.3)", cursor: "pointer", fontSize: 20, lineHeight: 1 }}
          >×</button>
        </div>

        {/* Step progress */}
        <div style={{ display: "flex", gap: 6, marginBottom: 32 }}>
          {[1, 2].map(s => (
            <div key={s} style={{
              flex: 1, height: 2,
              background: s <= step ? AMBER : "rgba(255,255,255,0.08)",
              borderRadius: 2,
              transition: "background 0.3s",
            }} />
          ))}
        </div>

        {step === 1 && (
          <StepApiKey
            onNext={() => setStep(2)}
            onSkip={() => setStep(2)}
          />
        )}
        {step === 2 && (
          <StepTeam onDone={handleDone} />
        )}
      </div>
    </div>
  )
}
