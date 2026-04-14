import { useState, useEffect } from "react"
import { getAuthToken } from "../lib/localAuth"

const PLAN_LABEL = (u) => u.is_business ? "Business" : u.is_pro ? "Pro" : "Free"
const PLAN_COLOR = (u) => u.is_business ? "#f59e0b" : u.is_pro ? "#38bdf8" : "rgba(255,255,255,0.35)"
const FREE_LIMIT = 10

export default function AdminPanel({ onClose }) {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState("all") // all | free | pro | business
  const [editing, setEditing] = useState(null) // { user, field, value }
  const [saving, setSaving] = useState(false)
  const [grantTarget, setGrantTarget] = useState("")
  const [grantPlan, setGrantPlan] = useState("pro")
  const [granting, setGranting] = useState(false)
  const [msg, setMsg] = useState(null)

  const flash = (text, err = false) => {
    setMsg({ text, err })
    setTimeout(() => setMsg(null), 3000)
  }

  const loadUsers = async () => {
    setLoading(true); setError(null)
    try {
      const token = await getAuthToken()
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "admin-list-users" }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setUsers(data.users || [])
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  useEffect(() => { loadUsers() }, [])

  const grantPlanAction = async () => {
    if (!grantTarget.trim()) return
    setGranting(true)
    try {
      const token = await getAuthToken()
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "admin-grant-pro", targetEmail: grantTarget.trim(), plan: grantPlan }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      flash(`✓ ${grantTarget.trim()} → ${grantPlan}`)
      setGrantTarget("")
      loadUsers()
    } catch (e) { flash(e.message, true) }
    finally { setGranting(false) }
  }

  const cancelSubscriptionAction = async (email) => {
    if (!window.confirm(`Cancel subscription for ${email}?`)) return
    setSaving(true)
    try {
      const token = await getAuthToken()
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "admin-cancel-subscription", targetEmail: email }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      flash(`✓ ${email} reverted to free`)
      loadUsers()
    } catch (e) { flash(e.message, true) }
    finally { setSaving(false) }
  }

  const saveUsage = async (email, value) => {
    setSaving(true)
    try {
      const token = await getAuthToken()
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "admin-adjust-usage", targetEmail: email, analysesUsed: value }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      flash(`✓ Updated ${email}`)
      setEditing(null)
      loadUsers()
    } catch (e) { flash(e.message, true) }
    finally { setSaving(false) }
  }

  const filtered = users.filter(u => {
    if (filter === "pro" && (!u.is_pro || u.is_business)) return false
    if (filter === "business" && !u.is_business) return false
    if (filter === "free" && (u.is_pro || u.is_business)) return false
    if (search && !u.email.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const counts = {
    total: users.length,
    free: users.filter(u => !u.is_pro && !u.is_business).length,
    pro: users.filter(u => u.is_pro && !u.is_business).length,
    business: users.filter(u => u.is_business).length,
  }

  const s = {
    overlay: { position: "fixed", inset: 0, zIndex: 800, background: "rgba(0,0,0,0.92)", backdropFilter: "blur(14px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 },
    panel: { background: "#0d1117", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20, width: "100%", maxWidth: 900, maxHeight: "90vh", display: "flex", flexDirection: "column", overflow: "hidden" },
    header: { padding: "20px 24px", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 },
    body: { flex: 1, overflow: "auto", padding: 24 },
    label: { fontSize: 10, fontFamily: "'Barlow',sans-serif", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)", marginBottom: 6, display: "block" },
    input: { padding: "9px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", color: "#fff", fontFamily: "'Barlow',sans-serif", fontSize: 13, outline: "none", transition: "border-color 0.2s" },
  }

  return (
    <div style={s.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={s.panel}>

        {/* Header */}
        <div style={s.header}>
          <div>
            <div style={{ fontFamily: "'Instrument Serif',serif", fontStyle: "italic", fontSize: 22, color: "#fff" }}>⚡ Admin Panel</div>
            <div style={{ fontSize: 11, fontFamily: "'Barlow',sans-serif", color: "rgba(255,255,255,0.3)", marginTop: 2 }}>User management · Usage control</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.35)", fontSize: 22, cursor: "pointer" }}>×</button>
        </div>

        <div style={s.body}>

          {/* Flash */}
          {msg && (
            <div style={{ padding: "10px 14px", borderRadius: 8, marginBottom: 16, fontFamily: "'Barlow',sans-serif", fontSize: 12, background: msg.err ? "rgba(239,68,68,0.12)" : "rgba(34,197,94,0.12)", border: `1px solid ${msg.err ? "rgba(239,68,68,0.25)" : "rgba(34,197,94,0.25)"}`, color: msg.err ? "#f87171" : "#4ade80" }}>
              {msg.text}
            </div>
          )}

          {/* Stats row */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 24 }}>
            {[["Total Users", counts.total, "#fff"], ["Free", counts.free, "rgba(255,255,255,0.45)"], ["Pro", counts.pro, "#38bdf8"], ["Business", counts.business, "#f59e0b"]].map(([l, v, c]) => (
              <div key={l} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: "12px 16px" }}>
                <div style={{ fontSize: 9, fontFamily: "'Barlow',sans-serif", letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: 4 }}>{l}</div>
                <div style={{ fontSize: 24, fontWeight: 700, fontFamily: "'Barlow',sans-serif", color: c }}>{v}</div>
              </div>
            ))}
          </div>

          {/* Grant plan */}
          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "16px 20px", marginBottom: 24 }}>
            <div style={{ ...s.label, marginBottom: 12 }}>Grant Plan to User</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <input
                value={grantTarget} onChange={e => setGrantTarget(e.target.value)}
                placeholder="user@email.com"
                style={{ ...s.input, flex: 1, minWidth: 200 }}
                onFocus={e => (e.target.style.borderColor = "rgba(255,255,255,0.3)")}
                onBlur={e => (e.target.style.borderColor = "rgba(255,255,255,0.1)")}
                onKeyDown={e => e.key === "Enter" && grantPlanAction()}
              />
              {["free", "pro", "business"].map(p => (
                <button key={p} onClick={() => setGrantPlan(p)} style={{ padding: "9px 14px", borderRadius: 8, border: "none", cursor: "pointer", fontFamily: "'Barlow',sans-serif", fontWeight: grantPlan === p ? 700 : 400, fontSize: 12, background: grantPlan === p ? (p === "business" ? "#f59e0b" : p === "pro" ? "#38bdf8" : "rgba(255,255,255,0.15)") : "rgba(255,255,255,0.06)", color: grantPlan === p ? (p === "free" ? "#fff" : "#000") : "rgba(255,255,255,0.5)", transition: "all 0.15s", textTransform: "capitalize" }}>{p}</button>
              ))}
              <button onClick={grantPlanAction} disabled={granting || !grantTarget.trim()} style={{ padding: "9px 18px", borderRadius: 8, border: "none", cursor: "pointer", fontFamily: "'Barlow',sans-serif", fontWeight: 600, fontSize: 12, background: granting ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.12)", color: granting ? "rgba(255,255,255,0.3)" : "#fff" }}>
                {granting ? "Saving…" : "Grant →"}
              </button>
            </div>
          </div>

          {/* Search + filter */}
          <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by email…"
              style={{ ...s.input, flex: 1, minWidth: 200 }}
              onFocus={e => (e.target.style.borderColor = "rgba(255,255,255,0.3)")}
              onBlur={e => (e.target.style.borderColor = "rgba(255,255,255,0.1)")} />
            {["all", "free", "pro", "business"].map(f => (
              <button key={f} onClick={() => setFilter(f)} style={{ padding: "9px 14px", borderRadius: 8, border: "none", cursor: "pointer", fontFamily: "'Barlow',sans-serif", fontSize: 12, fontWeight: filter === f ? 600 : 400, background: filter === f ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.04)", color: filter === f ? "#fff" : "rgba(255,255,255,0.4)", transition: "all 0.15s", textTransform: "capitalize" }}>{f}</button>
            ))}
            <button onClick={loadUsers} style={{ padding: "9px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.08)", background: "none", color: "rgba(255,255,255,0.35)", cursor: "pointer", fontSize: 12, fontFamily: "'Barlow',sans-serif" }}>↻</button>
          </div>

          {/* Table */}
          {error ? (
            <div style={{ padding: 20, textAlign: "center", color: "#f87171", fontFamily: "'Barlow',sans-serif", fontSize: 13 }}>{error}</div>
          ) : loading ? (
            <div style={{ padding: 20, textAlign: "center", color: "rgba(255,255,255,0.3)", fontFamily: "'Barlow',sans-serif", fontSize: 13 }}>Loading…</div>
          ) : (
            <>
              {/* Column headers */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 90px 100px 120px 140px", gap: 10, padding: "0 10px 8px", borderBottom: "1px solid rgba(255,255,255,0.07)", marginBottom: 6 }}>
                {["Email", "Plan", "Used", "Analyses Left", "Actions"].map(h => (
                  <div key={h} style={{ fontSize: 9, fontFamily: "'Barlow',sans-serif", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)" }}>{h}</div>
                ))}
              </div>

              {filtered.length === 0 ? (
                <div style={{ padding: "24px 0", textAlign: "center", color: "rgba(255,255,255,0.3)", fontFamily: "'Barlow',sans-serif", fontSize: 13 }}>No users match</div>
              ) : (
                filtered.map(u => {
                  const limit = u.is_pro ? "∞" : FREE_LIMIT
                  const used = u.analyses_used ?? 0
                  const left = u.is_pro ? "∞" : Math.max(0, FREE_LIMIT - used)
                  const isEdit = editing?.userId === u.id
                  return (
                    <div key={u.id} style={{ display: "grid", gridTemplateColumns: "1fr 90px 100px 120px 140px", gap: 10, padding: "10px 10px", borderRadius: 8, marginBottom: 4, background: isEdit ? "rgba(255,255,255,0.04)" : "transparent", transition: "background 0.15s" }}
                      onMouseEnter={e => { if (!isEdit) e.currentTarget.style.background = "rgba(255,255,255,0.025)" }}
                      onMouseLeave={e => { if (!isEdit) e.currentTarget.style.background = "transparent" }}>

                      {/* Email */}
                      <div style={{ fontFamily: "'Barlow',sans-serif", fontSize: 12, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", alignSelf: "center" }} title={u.email}>{u.email}</div>

                      {/* Plan */}
                      <div style={{ fontFamily: "'Barlow',sans-serif", fontSize: 11, color: PLAN_COLOR(u), fontWeight: 600, alignSelf: "center" }}>{PLAN_LABEL(u)}</div>

                      {/* Used */}
                      <div style={{ alignSelf: "center" }}>
                        {isEdit ? (
                          <input
                            autoFocus
                            type="number" min={0} max={9999}
                            value={editing.value}
                            onChange={e => setEditing(ed => ({ ...ed, value: e.target.value }))}
                            onKeyDown={e => { if (e.key === "Enter") saveUsage(u.email, editing.value); if (e.key === "Escape") setEditing(null) }}
                            style={{ ...s.input, padding: "5px 8px", fontSize: 12, width: "80px" }}
                          />
                        ) : (
                          <span style={{ fontFamily: "'Barlow',sans-serif", fontSize: 12, color: "rgba(255,255,255,0.6)" }}>{used}</span>
                        )}
                      </div>

                      {/* Analyses left */}
                      <div style={{ fontFamily: "'Barlow',sans-serif", fontSize: 12, color: typeof left === "number" && left <= 2 ? "#f87171" : "rgba(255,255,255,0.5)", alignSelf: "center" }}>
                        {left}{typeof left === "number" ? ` / ${limit}` : ""}
                      </div>

                      {/* Actions */}
                      <div style={{ display: "flex", gap: 4, alignSelf: "center" }}>
                        {isEdit ? (
                          <>
                            <button onClick={() => saveUsage(u.email, editing.value)} disabled={saving} style={{ padding: "4px 8px", borderRadius: 6, border: "none", background: "#4ade80", color: "#000", fontFamily: "'Barlow',sans-serif", fontSize: 10, fontWeight: 700, cursor: "pointer" }}>✓</button>
                            <button onClick={() => setEditing(null)} style={{ padding: "4px 8px", borderRadius: 6, border: "none", background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)", fontFamily: "'Barlow',sans-serif", fontSize: 10, cursor: "pointer" }}>✕</button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => setEditing({ userId: u.id, value: String(used) })} style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.1)", background: "none", color: "rgba(255,255,255,0.4)", fontFamily: "'Barlow',sans-serif", fontSize: 10, cursor: "pointer" }}>Edit</button>
                            {u.is_pro && (
                              <button onClick={() => cancelSubscriptionAction(u.email)} style={{ padding: "4px 8px", borderRadius: 6, border: "none", background: "rgba(239,68,68,0.15)", color: "#fca5a5", fontFamily: "'Barlow',sans-serif", fontSize: 10, cursor: "pointer" }}>Cancel</button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
              <div style={{ marginTop: 12, fontFamily: "'Barlow',sans-serif", fontSize: 11, color: "rgba(255,255,255,0.2)", textAlign: "right" }}>
                Showing {filtered.length} of {users.length} users · Click "Edit" to adjust analyses_used
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
