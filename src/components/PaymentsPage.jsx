import { useState, useEffect } from "react"
import { getAuthToken } from "../lib/localAuth"

const MONO = "'JetBrains Mono','Fira Mono','Courier New',monospace"
const AMBER = "#f59e0b"
const BG = "#07090f"
const BORDER = "rgba(255,255,255,0.07)"

function Row({ label, value, accent }) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "10px 0", borderBottom: `1px solid ${BORDER}`,
    }}>
      <span style={{ fontFamily: MONO, fontSize: 12, color: "rgba(255,255,255,0.45)" }}>{label}</span>
      <span style={{ fontFamily: MONO, fontSize: 12, fontWeight: 600, color: accent || "#e5e7eb" }}>{value}</span>
    </div>
  )
}

function Panel({ title, badge, children, style = {} }) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.025)",
      border: `1px solid ${BORDER}`,
      borderRadius: 10,
      padding: "20px 24px",
      ...style,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18, paddingBottom: 12, borderBottom: `1px solid ${BORDER}` }}>
        <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: "rgba(255,255,255,0.5)" }}>
          {title}
        </span>
        {badge && (
          <span style={{
            fontFamily: MONO, fontSize: 10, fontWeight: 600, letterSpacing: "0.08em",
            color: badge.color || AMBER, background: `${badge.color || AMBER}18`,
            border: `1px solid ${badge.color || AMBER}33`,
            borderRadius: 4, padding: "1px 6px",
          }}>{badge.label}</span>
        )}
      </div>
      {children}
    </div>
  )
}

function Btn({ children, onClick, disabled, variant = "primary", danger }) {
  const bg = danger ? "rgba(248,113,113,0.1)"
    : variant === "primary" ? AMBER
    : "rgba(255,255,255,0.06)"
  const color = danger ? "#f87171" : variant === "primary" ? "#000" : "rgba(255,255,255,0.7)"
  const border = danger ? "1px solid rgba(248,113,113,0.25)"
    : variant === "secondary" ? `1px solid ${BORDER}` : "none"
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: bg, color, border, borderRadius: 6,
        fontFamily: MONO, fontWeight: 600, fontSize: 12,
        padding: "9px 20px", cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1, transition: "opacity 0.15s",
      }}
    >
      {children}
    </button>
  )
}

// ── Pro Plan View ────────────────────────────────────────────────────────────
function ProView({ user }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <Panel title="SUBSCRIPTION" badge={{ label: "PRO", color: "#38bdf8" }}>
        <Row label="Plan" value="Pro" accent="#38bdf8" />
        <Row label="Price" value="$29 / month" />
        <Row label="Billing cycle" value="Monthly" />
        <Row label="Next invoice" value="Stripe integration coming soon" accent="rgba(255,255,255,0.25)" />
        <Row label="Status" value="Active" accent="#4ade80" />
      </Panel>

      <Panel title="USAGE">
        <Row label="Analyses / month" value="Unlimited" accent="#4ade80" />
        <Row label="API Keys" value="1 (your own Cerebras key)" />
        <Row label="Saved reports" value="Unlimited" />
      </Panel>

      <Panel title="MANAGE SUBSCRIPTION">
        <p style={{ fontFamily: MONO, fontSize: 12, color: "rgba(255,255,255,0.4)", margin: "0 0 16px", lineHeight: 1.6 }}>
          Payment management, invoice history, and cancellation will be available once Stripe is integrated.
        </p>
        <div style={{ display: "flex", gap: 10 }}>
          <Btn disabled variant="secondary">Download Invoice</Btn>
          <Btn disabled danger>Cancel Subscription</Btn>
        </div>
      </Panel>
    </div>
  )
}

// ── Business Plan View ───────────────────────────────────────────────────────
function BusinessOwnerView({ user, onOpenDashboard, onInvite }) {
  const [team, setTeam] = useState(null)
  const [members, setMembers] = useState([])
  const [loadingTeam, setLoadingTeam] = useState(true)
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteNickname, setInviteNickname] = useState("")
  const [inviteStatus, setInviteStatus] = useState(null)
  const [inviting, setInviting] = useState(false)

  useEffect(() => {
    const load = async () => {
      setLoadingTeam(true)
      try {
        const token = await getAuthToken()
        const res = await fetch("/api/auth", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ action: "get-team" }),
        })
        if (res.ok) {
          const data = await res.json()
          setTeam(data.team)
          setMembers(data.members || [])
        }
      } catch {}
      setLoadingTeam(false)
    }
    load()
  }, [])

  const handleInvite = async () => {
    if (!inviteEmail.trim() || !inviteEmail.includes("@")) {
      setInviteStatus({ ok: false, msg: "Enter a valid email address" })
      return
    }
    setInviting(true)
    setInviteStatus(null)
    try {
      const token = await getAuthToken()
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "invite-member", email: inviteEmail.trim(), nickname: inviteNickname.trim() || undefined }),
      })
      const data = await res.json()
      if (!res.ok) setInviteStatus({ ok: false, msg: data.error || "Failed to send invite" })
      else {
        setInviteStatus({ ok: true, msg: `Invite sent to ${inviteEmail.trim()}` })
        setInviteEmail("")
        setInviteNickname("")
        // Refresh members
        const t2 = await getAuthToken()
        const r2 = await fetch("/api/auth", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${t2}` },
          body: JSON.stringify({ action: "get-team" }),
        })
        if (r2.ok) { const d2 = await r2.json(); setMembers(d2.members || []) }
      }
    } catch { setInviteStatus({ ok: false, msg: "Network error" }) }
    setInviting(false)
  }

  const seatsUsed = members.length
  const seatsTotal = 5

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <Panel title="SUBSCRIPTION" badge={{ label: "BUSINESS", color: AMBER }}>
        <Row label="Plan" value="Business" accent={AMBER} />
        <Row label="Price" value="$149 / month" />
        <Row label="Billing cycle" value="Monthly" />
        <Row label="Next invoice" value="Stripe integration coming soon" accent="rgba(255,255,255,0.25)" />
        <Row label="Status" value="Active" accent="#4ade80" />
        <Row label="Team seats" value={`${seatsUsed} / ${seatsTotal} used`} accent={seatsUsed >= seatsTotal ? "#f87171" : "#4ade80"} />
      </Panel>

      <Panel title="TEAM MEMBERS">
        {loadingTeam ? (
          <div style={{ fontFamily: MONO, fontSize: 12, color: "rgba(255,255,255,0.3)", padding: "8px 0" }}>Loading…</div>
        ) : members.length === 0 ? (
          <div style={{ fontFamily: MONO, fontSize: 12, color: "rgba(255,255,255,0.3)", padding: "8px 0" }}>No members yet — invite your team below.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {members.map((m, i) => (
              <div key={i} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "9px 0", borderBottom: i < members.length - 1 ? `1px solid ${BORDER}` : "none",
              }}>
                <span style={{ fontFamily: MONO, fontSize: 12, color: "#e5e7eb" }}>{m.email}</span>
                <span style={{
                  fontFamily: MONO, fontSize: 10, fontWeight: 600,
                  color: m.role === "owner" ? AMBER : "rgba(255,255,255,0.4)",
                  background: m.role === "owner" ? `${AMBER}18` : "rgba(255,255,255,0.05)",
                  border: `1px solid ${m.role === "owner" ? `${AMBER}33` : BORDER}`,
                  borderRadius: 4, padding: "2px 7px",
                }}>{m.role.toUpperCase()}</span>
              </div>
            ))}
          </div>
        )}
      </Panel>

      {seatsUsed < seatsTotal && (
        <Panel title="INVITE MEMBER">
          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            <input
              type="email"
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              placeholder="teammate@company.com"
              style={{
                flex: 2, background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`,
                borderRadius: 6, color: "#e5e7eb", fontFamily: MONO, fontSize: 12,
                padding: "9px 12px", outline: "none",
              }}
            />
            <input
              type="text"
              value={inviteNickname}
              onChange={e => setInviteNickname(e.target.value)}
              placeholder="Nickname (optional)"
              style={{
                flex: 1, background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`,
                borderRadius: 6, color: "#e5e7eb", fontFamily: MONO, fontSize: 12,
                padding: "9px 12px", outline: "none",
              }}
            />
            <Btn onClick={handleInvite} disabled={inviting}>
              {inviting ? "Sending…" : "Send Invite"}
            </Btn>
          </div>
          {inviteStatus && (
            <div style={{ fontFamily: MONO, fontSize: 11, color: inviteStatus.ok ? "#4ade80" : "#f87171" }}>
              {inviteStatus.msg}
            </div>
          )}
          <div style={{ fontFamily: MONO, fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 10 }}>
            Invitees receive an email with a link to create an account and join your team automatically.
            They get full Business access — no separate subscription required.
          </div>
        </Panel>
      )}

      <Panel title="MANAGE SUBSCRIPTION">
        <p style={{ fontFamily: MONO, fontSize: 12, color: "rgba(255,255,255,0.4)", margin: "0 0 16px", lineHeight: 1.6 }}>
          Payment management, invoice history, and cancellation will be available once Stripe is integrated.
        </p>
        <div style={{ display: "flex", gap: 10 }}>
          <Btn variant="secondary" onClick={onOpenDashboard}>Open Dashboard →</Btn>
          <Btn disabled variant="secondary">Download Invoice</Btn>
          <Btn disabled danger>Cancel Subscription</Btn>
        </div>
      </Panel>
    </div>
  )
}

// ── Main Payments Page ───────────────────────────────────────────────────────
export default function PaymentsPage({ onClose, user, userRecord, isTeamOwner, onOpenDashboard }) {
  const isPro = userRecord?.is_pro || userRecord?.is_business
  const isBusiness = userRecord?.is_business

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 100,
      background: BG, overflowY: "auto",
      display: "flex", flexDirection: "column",
    }}>
      {/* Top bar */}
      <div style={{
        position: "sticky", top: 0, zIndex: 10,
        background: BG,
        borderBottom: `1px solid ${BORDER}`,
        padding: "14px 32px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", fontFamily: MONO, fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}
          >
            ← Back
          </button>
          <div style={{ width: 1, height: 16, background: BORDER }} />
          <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", color: "rgba(255,255,255,0.35)" }}>
            PAYMENTS & BILLING
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontFamily: MONO, fontSize: 11, color: "rgba(255,255,255,0.3)" }}>{user?.email}</span>
          <span style={{
            fontFamily: MONO, fontSize: 10, fontWeight: 700,
            color: isBusiness ? AMBER : "#38bdf8",
            background: isBusiness ? `${AMBER}18` : "rgba(56,189,248,0.15)",
            border: `1px solid ${isBusiness ? `${AMBER}33` : "rgba(56,189,248,0.3)"}`,
            borderRadius: 4, padding: "2px 7px",
          }}>
            {isBusiness ? "BUSINESS" : "PRO"}
          </span>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, maxWidth: 720, width: "100%", margin: "0 auto", padding: "40px 32px" }}>
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontFamily: MONO, fontSize: 22, fontWeight: 700, color: "#fff", margin: "0 0 8px" }}>
            Billing & Subscription
          </h1>
          <p style={{ fontFamily: MONO, fontSize: 12, color: "rgba(255,255,255,0.4)", margin: 0 }}>
            Manage your plan, team members, and payment details.
          </p>
        </div>

        {!isPro ? (
          <div style={{ fontFamily: MONO, fontSize: 13, color: "rgba(255,255,255,0.4)", textAlign: "center", padding: "60px 0" }}>
            You don't have an active paid subscription.
          </div>
        ) : isBusiness && isTeamOwner ? (
          <BusinessOwnerView user={user} onOpenDashboard={onOpenDashboard} />
        ) : isBusiness && !isTeamOwner ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <Panel title="YOUR ACCESS" badge={{ label: "BUSINESS MEMBER", color: AMBER }}>
              <p style={{ fontFamily: MONO, fontSize: 12, color: "rgba(255,255,255,0.4)", margin: 0, lineHeight: 1.6 }}>
                You're a member of a Business team. Subscription and billing are managed by your team owner.
                Contact them if you need to make changes.
              </p>
            </Panel>
          </div>
        ) : (
          <ProView user={user} />
        )}
      </div>
    </div>
  )
}
