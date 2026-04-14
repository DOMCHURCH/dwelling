import { useState, useEffect } from "react"
import { getAuthToken } from "../lib/localAuth"
import { downloadAnalysisHTML } from "../lib/exportHTML"
import AccountSettings from "./AccountSettings"

const DAILY_LIMIT = 200

const c = {
  bg: "#07090f",
  panel: "rgba(255,255,255,0.035)",
  border: "rgba(255,255,255,0.07)",
  amber: "#f59e0b",
  amberDim: "rgba(245,158,11,0.15)",
  amberBorder: "rgba(245,158,11,0.25)",
  green: "#22c55e",
  red: "#ef4444",
  blue: "#38bdf8",
  muted: "rgba(255,255,255,0.35)",
  label: "rgba(255,255,255,0.22)",
}

function Ticker({ label, value, accent, sub }) {
  return (
    <div style={{ padding: "14px 16px", background: c.panel, border: `1px solid ${c.border}`, borderRadius: 10 }}>
      <div style={{ fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: c.label, marginBottom: 6, fontFamily: "monospace" }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: accent || "#fff", fontFamily: "monospace" }}>{value}</div>
      {sub && <div style={{ fontSize: 9, color: c.muted, marginTop: 3, fontFamily: "monospace" }}>{sub}</div>}
    </div>
  )
}

function UsageBar({ used, limit, label }) {
  const pct = limit ? Math.min((used / limit) * 100, 100) : 0
  const color = pct > 80 ? c.red : pct > 55 ? c.amber : c.green
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
        <span style={{ fontSize: 9, fontFamily: "monospace", color: c.muted, letterSpacing: "0.1em", textTransform: "uppercase" }}>{label}</span>
        <span style={{ fontSize: 9, fontFamily: "monospace", color }}>{(used ?? 0).toLocaleString()} / {(limit ?? 0).toLocaleString()}</span>
      </div>
      <div style={{ height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 2, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 2, transition: "width 0.6s ease" }} />
      </div>
    </div>
  )
}

function TabBtn({ active, onClick, children }) {
  return (
    <button onClick={onClick} style={{
      background: active ? c.amberDim : "none",
      border: `1px solid ${active ? c.amberBorder : "transparent"}`,
      color: active ? c.amber : c.muted,
      fontFamily: "monospace", fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase",
      padding: "7px 16px", borderRadius: 6, cursor: "pointer", transition: "all 0.15s",
    }}>{children}</button>
  )
}

function aBtn(color, withText = false) {
  return {
    padding: withText ? "6px 14px" : "6px 10px",
    borderRadius: 6, border: `1px solid ${color}`,
    background: "transparent", color,
    fontFamily: "monospace", fontSize: 9,
    letterSpacing: "0.1em", textTransform: "uppercase",
    cursor: "pointer", transition: "all 0.15s",
    whiteSpace: "nowrap",
  }
}

const termInput = {
  padding: "9px 12px", borderRadius: 6,
  border: `1px solid ${c.border}`,
  background: "rgba(255,255,255,0.04)",
  color: "#fff", fontFamily: "monospace", fontSize: 12,
  outline: "none", transition: "border-color 0.15s",
  boxSizing: "border-box",
}

/* ── Overview ── */
function OverviewTab({ usage, keys }) {
  const todayUsed = usage?.totalUsage ?? 0
  const remaining = Math.max(0, DAILY_LIMIT - todayUsed)
  const monthlyUsed = usage?.monthlyUsage ?? 0
  const activeKeys = keys.filter(k => !k.revokedAt).length
  const exportCount = (() => { try { return JSON.parse(localStorage.getItem("dwelling_exports") || "[]").length } catch { return 0 } })()
  const now = new Date()
  const hour = now.getHours()
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening"

  return (
    <div>
      <div style={{ marginBottom: 22, paddingBottom: 14, borderBottom: `1px solid ${c.border}` }}>
        <div style={{ fontFamily: "monospace", fontSize: 11, color: c.muted, letterSpacing: "0.06em" }}>
          {greeting} · {now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
        </div>
        <div style={{ fontFamily: "monospace", fontSize: 9, color: c.label, marginTop: 4, letterSpacing: "0.12em", textTransform: "uppercase" }}>
          DWELLING BUSINESS TERMINAL · REAL-TIME INTELLIGENCE
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 22 }}>
        <Ticker label="Today Used" value={todayUsed} accent={todayUsed > DAILY_LIMIT * 0.8 ? c.red : c.green} sub="requests today" />
        <Ticker label="Remaining" value={remaining} accent={remaining < 20 ? c.red : remaining < 60 ? c.amber : c.green} sub={`of ${DAILY_LIMIT} daily`} />
        <Ticker label="Reports" value={exportCount} accent={c.amber} sub="all time exports" />
        <Ticker label="API Keys" value={`${activeKeys}/5`} accent={c.blue} sub="active slots" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 22 }}>
        {/* Usage quotas */}
        <div style={{ background: c.panel, border: `1px solid ${c.border}`, borderRadius: 12, padding: "18px 20px" }}>
          <div style={{ fontSize: 9, fontFamily: "monospace", color: c.label, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 16 }}>Usage Quotas</div>
          <UsageBar used={todayUsed} limit={DAILY_LIMIT} label="Daily requests" />
          <UsageBar used={monthlyUsed} limit={3000} label="Monthly requests" />
          <UsageBar used={activeKeys} limit={5} label="API key slots" />
        </div>

        {/* Key health */}
        <div style={{ background: c.panel, border: `1px solid ${c.border}`, borderRadius: 12, padding: "18px 20px" }}>
          <div style={{ fontSize: 9, fontFamily: "monospace", color: c.label, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 16 }}>Key Health</div>
          {keys.filter(k => !k.revokedAt).length === 0 ? (
            <div style={{ fontFamily: "monospace", fontSize: 11, color: c.label, paddingTop: 12 }}>No active keys. Create one in the API Keys tab.</div>
          ) : keys.filter(k => !k.revokedAt).map(k => {
            const rem = k.remaining ?? 200
            const pct = Math.max(0, (rem / 200) * 100)
            const col = rem > 80 ? c.green : rem > 30 ? c.amber : c.red
            return (
              <div key={k.id} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: col, flexShrink: 0 }} />
                <div style={{ flex: 1, fontFamily: "monospace", fontSize: 11, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{k.name}</div>
                <div style={{ width: 80, height: 3, background: "rgba(255,255,255,0.06)", borderRadius: 2, flexShrink: 0 }}>
                  <div style={{ height: "100%", width: `${pct}%`, background: col, borderRadius: 2 }} />
                </div>
                <div style={{ fontFamily: "monospace", fontSize: 9, color: col, width: 42, textAlign: "right", flexShrink: 0 }}>{rem}/200</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Plan details */}
      <div style={{ background: c.panel, border: `1px solid ${c.amberBorder}`, borderRadius: 12, padding: "16px 20px", display: "flex", gap: 32, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 9, fontFamily: "monospace", color: c.label, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>Plan</div>
          <div style={{ fontFamily: "monospace", fontSize: 13, color: c.amber }}>BUSINESS</div>
        </div>
        <div>
          <div style={{ fontSize: 9, fontFamily: "monospace", color: c.label, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>Daily Limit</div>
          <div style={{ fontFamily: "monospace", fontSize: 13, color: "#fff" }}>200–1,000 req/day</div>
        </div>
        <div>
          <div style={{ fontSize: 9, fontFamily: "monospace", color: c.label, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>Monthly</div>
          <div style={{ fontFamily: "monospace", fontSize: 13, color: "#fff" }}>1,000–3,000 reports</div>
        </div>
        <div>
          <div style={{ fontSize: 9, fontFamily: "monospace", color: c.label, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>Team</div>
          <div style={{ fontFamily: "monospace", fontSize: 13, color: "#fff" }}>3–10 members</div>
        </div>
        <div>
          <div style={{ fontSize: 9, fontFamily: "monospace", color: c.label, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>Support</div>
          <div style={{ fontFamily: "monospace", fontSize: 13, color: c.green }}>DEDICATED</div>
        </div>
      </div>
    </div>
  )
}

/* ── Reports ── */
function ReportsTab() {
  const [exports, setExports] = useState([])
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    try { setExports(JSON.parse(localStorage.getItem("dwelling_exports") || "[]")) }
    catch { setExports([]) }
  }, [])

  const del = (id) => {
    const upd = exports.filter(e => e.id !== id)
    setExports(upd)
    localStorage.setItem("dwelling_exports", JSON.stringify(upd))
    if (selected?.id === id) setSelected(null)
  }

  const redownload = (entry) => downloadAnalysisHTML(entry.result, entry.config || {})

  if (exports.length === 0) {
    return (
      <div style={{ padding: "64px 0", textAlign: "center" }}>
        <div style={{ fontFamily: "monospace", fontSize: 11, color: c.label, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 10 }}>No exports on record</div>
        <div style={{ fontFamily: "monospace", fontSize: 11, color: c.muted, lineHeight: 1.7 }}>
          Run an analysis and click "Export HTML" to generate a client report.<br />All exports will be archived here for re-download.
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: selected ? "1fr 340px" : "1fr", gap: 16 }}>
      <div>
        <div style={{ fontSize: 9, fontFamily: "monospace", color: c.label, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 12 }}>
          {exports.length} Exported Report{exports.length !== 1 ? "s" : ""}
        </div>

        {/* Column headers */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 160px 90px 70px", gap: 10, padding: "0 12px 8px", borderBottom: `1px solid ${c.border}`, marginBottom: 8 }}>
          {["Area", "Client", "Date", ""].map(h => (
            <div key={h} style={{ fontFamily: "monospace", fontSize: 9, color: c.label, letterSpacing: "0.1em", textTransform: "uppercase" }}>{h}</div>
          ))}
        </div>

        {exports.map(entry => (
          <div
            key={entry.id}
            onClick={() => setSelected(selected?.id === entry.id ? null : entry)}
            style={{
              display: "grid", gridTemplateColumns: "1fr 160px 90px 70px", gap: 10,
              padding: "11px 12px", borderRadius: 8, marginBottom: 4, cursor: "pointer",
              background: selected?.id === entry.id ? c.amberDim : "transparent",
              border: `1px solid ${selected?.id === entry.id ? c.amberBorder : "transparent"}`,
              transition: "all 0.12s",
            }}
            onMouseEnter={e => { if (selected?.id !== entry.id) e.currentTarget.style.background = c.panel }}
            onMouseLeave={e => { if (selected?.id !== entry.id) e.currentTarget.style.background = "transparent" }}
          >
            <div style={{ fontFamily: "monospace", fontSize: 12, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{entry.area}</div>
            <div style={{ fontFamily: "monospace", fontSize: 11, color: c.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{entry.clientName || "—"}</div>
            <div style={{ fontFamily: "monospace", fontSize: 11, color: c.label }}>{new Date(entry.timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</div>
            <div style={{ display: "flex", gap: 5 }}>
              <button onClick={e => { e.stopPropagation(); redownload(entry) }} style={aBtn(c.amber)}>↓</button>
              <button onClick={e => { e.stopPropagation(); del(entry.id) }} style={aBtn(c.red)}>×</button>
            </div>
          </div>
        ))}
      </div>

      {selected && (
        <div style={{ background: c.panel, border: `1px solid ${c.border}`, borderRadius: 12, padding: "18px 20px", alignSelf: "start" }}>
          <div style={{ fontSize: 9, fontFamily: "monospace", color: c.label, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 16 }}>Report Details</div>
          {[
            ["Area", selected.area],
            ["Client", selected.clientName || "—"],
            ["Brand", selected.brandName || "—"],
            ["Generated", new Date(selected.timestamp).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })],
          ].map(([k, v]) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", paddingBottom: 8, marginBottom: 8, borderBottom: `1px solid ${c.border}` }}>
              <span style={{ fontFamily: "monospace", fontSize: 9, color: c.label, textTransform: "uppercase", letterSpacing: "0.08em" }}>{k}</span>
              <span style={{ fontFamily: "monospace", fontSize: 11, color: "#fff", textAlign: "right", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v}</span>
            </div>
          ))}
          {selected.config?.sections && (
            <div style={{ marginTop: 8, marginBottom: 16 }}>
              <div style={{ fontFamily: "monospace", fontSize: 9, color: c.label, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>Sections Included</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {Object.entries(selected.config.sections).filter(([, v]) => v).map(([k]) => (
                  <span key={k} style={{ fontFamily: "monospace", fontSize: 9, color: c.amber, background: c.amberDim, border: `1px solid ${c.amberBorder}`, padding: "2px 8px", borderRadius: 4 }}>{k}</span>
                ))}
              </div>
            </div>
          )}
          <button
            onClick={() => redownload(selected)}
            style={{ width: "100%", padding: "11px", borderRadius: 8, border: "none", cursor: "pointer", background: `linear-gradient(90deg, ${c.amber}, #d97706)`, fontFamily: "monospace", fontWeight: 700, fontSize: 11, color: "#000", letterSpacing: "0.08em" }}
          >↓ RE-DOWNLOAD HTML</button>
        </div>
      )}
    </div>
  )
}

/* ── API Keys ── */
function ApiKeysTab({ keys, loading, error, onRefresh }) {
  const [showCreate, setShowCreate] = useState(false)
  const [name, setName] = useState("")
  const [creating, setCreating] = useState(false)
  const [newKey, setNewKey] = useState(null)
  const [localErr, setLocalErr] = useState(null)

  const create = async () => {
    if (!name.trim()) return
    setCreating(true); setLocalErr(null)
    try {
      const token = await getAuthToken()
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "createApiKey", name: name.trim() }),
      })
      const data = await res.json()
      if (res.ok && data.key) { setNewKey(data.key); setName(""); setShowCreate(false); onRefresh() }
      else setLocalErr(data.error || "Failed to create key")
    } catch { setLocalErr("Network error") }
    finally { setCreating(false) }
  }

  const revoke = async (keyId) => {
    if (!confirm("Revoke this key? Cannot be undone.")) return
    try {
      const token = await getAuthToken()
      await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "revokeApiKey", keyId }),
      })
      onRefresh()
    } catch { setLocalErr("Failed to revoke") }
  }

  const err = error || localErr

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ fontFamily: "monospace", fontSize: 9, color: c.label, letterSpacing: "0.12em", textTransform: "uppercase" }}>
          API Keys · {keys.length}/5 slots
        </div>
        {keys.length < 5 && !showCreate && (
          <button onClick={() => setShowCreate(true)} style={aBtn(c.amber, true)}>+ NEW KEY</button>
        )}
      </div>

      {err && <div style={{ padding: "10px 14px", borderRadius: 8, background: "rgba(239,68,68,0.1)", border: `1px solid rgba(239,68,68,0.2)`, color: c.red, fontFamily: "monospace", fontSize: 11, marginBottom: 14 }}>{err}</div>}

      {newKey && (
        <div style={{ padding: 16, borderRadius: 12, background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)", marginBottom: 16 }}>
          <div style={{ fontFamily: "monospace", fontSize: 9, color: c.green, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 8 }}>KEY CREATED — COPY NOW, WON'T SHOW AGAIN</div>
          <code style={{ display: "block", fontSize: 11, color: "#fff", wordBreak: "break-all", background: "rgba(0,0,0,0.4)", padding: 12, borderRadius: 6 }}>{newKey}</code>
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button onClick={() => { navigator.clipboard.writeText(newKey); setNewKey(null) }} style={aBtn(c.green, true)}>COPY & CLOSE</button>
            <button onClick={() => setNewKey(null)} style={aBtn(c.muted)}>DISMISS</button>
          </div>
        </div>
      )}

      {showCreate && (
        <div style={{ background: c.panel, border: `1px solid ${c.border}`, borderRadius: 10, padding: 14, marginBottom: 14, display: "flex", gap: 8 }}>
          <input autoFocus type="text" value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === "Enter" && create()} placeholder="Key name — e.g. Production"
            style={{ ...termInput, flex: 1 }} onFocus={e => (e.target.style.borderColor = c.amber)} onBlur={e => (e.target.style.borderColor = c.border)} />
          <button onClick={create} disabled={creating || !name.trim()} style={aBtn(c.amber, true)}>{creating ? "..." : "CREATE"}</button>
          <button onClick={() => { setShowCreate(false); setName("") }} style={aBtn(c.muted)}>CANCEL</button>
        </div>
      )}

      {loading ? (
        <div style={{ padding: "30px 0", textAlign: "center", fontFamily: "monospace", fontSize: 11, color: c.label }}>LOADING...</div>
      ) : keys.length === 0 ? (
        <div style={{ padding: "40px 0", textAlign: "center" }}>
          <div style={{ fontFamily: "monospace", fontSize: 11, color: c.label, letterSpacing: "0.1em", textTransform: "uppercase" }}>No API keys yet</div>
          <div style={{ fontFamily: "monospace", fontSize: 11, color: c.muted, marginTop: 6 }}>Create your first key above.</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {keys.map(k => {
            const rem = k.remaining ?? 200
            const pct = Math.max(0, (rem / 200) * 100)
            const col = rem > 80 ? c.green : rem > 30 ? c.amber : c.red
            return (
              <div key={k.id} style={{ padding: "14px 16px", borderRadius: 10, background: c.panel, border: `1px solid ${k.revokedAt ? "rgba(239,68,68,0.15)" : c.border}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 7, height: 7, borderRadius: "50%", background: k.revokedAt ? c.red : col, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: "monospace", fontSize: 13, color: k.revokedAt ? c.muted : "#fff" }}>{k.name}</div>
                    <div style={{ fontFamily: "monospace", fontSize: 9, color: c.label, marginTop: 3 }}>
                      Created {k.createdAt ? new Date(k.createdAt).toLocaleDateString() : "N/A"}
                      {k.revokedAt && " · REVOKED"}
                    </div>
                  </div>
                  {!k.revokedAt && (
                    <>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontFamily: "monospace", fontSize: 12, color: col }}>{rem}<span style={{ fontSize: 9, color: c.label }}>/200</span></div>
                        <div style={{ fontSize: 9, fontFamily: "monospace", color: c.label }}>today</div>
                      </div>
                      <div style={{ width: 72, height: 3, background: "rgba(255,255,255,0.06)", borderRadius: 2, flexShrink: 0 }}>
                        <div style={{ height: "100%", width: `${pct}%`, background: col, borderRadius: 2 }} />
                      </div>
                      <button onClick={() => revoke(k.id)} style={aBtn(c.red)}>REVOKE</button>
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ── Users ── */
function UsersTab() {
  const [team, setTeam] = useState(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(null)
  const [teamName, setTeamName] = useState("")
  const [creating, setCreating] = useState(false)
  const [copied, setCopied] = useState(false)

  const load = async () => {
    setLoading(true); setErr(null)
    try {
      const token = await getAuthToken()
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "get-team" }),
      })
      const data = await res.json()
      if (res.ok) setTeam(data.team || null)
      else setErr(data.error || "Failed to load team")
    } catch { setErr("Network error") }
    finally { setLoading(false) }
  }

  const createTeam = async () => {
    if (!teamName.trim()) return
    setCreating(true)
    try {
      const token = await getAuthToken()
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "create-team", name: teamName.trim() }),
      })
      const data = await res.json()
      if (res.ok) { await load() }
      else setErr(data.error)
    } catch { setErr("Failed to create team") }
    finally { setCreating(false) }
  }

  const copyCode = () => {
    if (!team?.invite_code) return
    navigator.clipboard.writeText(team.invite_code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  useEffect(() => { load() }, [])

  if (loading) return <div style={{ padding: "40px 0", textAlign: "center", fontFamily: "monospace", fontSize: 11, color: c.label }}>LOADING...</div>

  if (err) return <div style={{ padding: "16px", borderRadius: 8, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: c.red, fontFamily: "monospace", fontSize: 11 }}>{err}</div>

  /* No team yet — create one */
  if (!team) return (
    <div>
      <div style={{ fontSize: 9, fontFamily: "monospace", color: c.label, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 20 }}>No Team Yet</div>
      <div style={{ background: c.panel, border: `1px solid ${c.border}`, borderRadius: 12, padding: "24px", maxWidth: 440 }}>
        <div style={{ fontFamily: "monospace", fontSize: 13, color: "#fff", marginBottom: 6 }}>Create your team workspace</div>
        <div style={{ fontFamily: "monospace", fontSize: 10, color: c.muted, marginBottom: 20, lineHeight: 1.6 }}>
          Give your team a name. You'll get an invite code to share with up to 9 other members.
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            autoFocus value={teamName} onChange={e => setTeamName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && createTeam()}
            placeholder="e.g. Northstar Realty"
            style={{ ...termInput, flex: 1 }}
            onFocus={e => (e.target.style.borderColor = c.amber)}
            onBlur={e => (e.target.style.borderColor = c.border)}
          />
          <button onClick={createTeam} disabled={creating || !teamName.trim()} style={aBtn(c.amber, true)}>
            {creating ? "..." : "CREATE"}
          </button>
        </div>
      </div>
    </div>
  )

  const members = team.members || []
  const owner = members.find(m => m.role === "owner")
  const nonOwners = members.filter(m => m.role !== "owner")

  return (
    <div>
      {/* Team header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 22, paddingBottom: 16, borderBottom: `1px solid ${c.border}` }}>
        <div>
          <div style={{ fontFamily: "monospace", fontSize: 18, color: "#fff", marginBottom: 4 }}>{team.name}</div>
          <div style={{ fontFamily: "monospace", fontSize: 9, color: c.label, letterSpacing: "0.1em", textTransform: "uppercase" }}>
            {members.length} / 10 members · Business Team
          </div>
        </div>
        {/* Invite code */}
        <div style={{ background: c.amberDim, border: `1px solid ${c.amberBorder}`, borderRadius: 10, padding: "10px 14px", textAlign: "right" }}>
          <div style={{ fontFamily: "monospace", fontSize: 8, color: c.amber, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 4 }}>Invite Code</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontFamily: "monospace", fontSize: 18, color: "#fff", letterSpacing: "0.2em", fontWeight: 700 }}>{team.invite_code}</span>
            <button onClick={copyCode} style={{ ...aBtn(c.amber), fontSize: 8 }}>{copied ? "✓ COPIED" : "COPY"}</button>
          </div>
          <div style={{ fontFamily: "monospace", fontSize: 8, color: c.muted, marginTop: 4 }}>Share with team members to join</div>
        </div>
      </div>

      {/* Slot bar */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ fontFamily: "monospace", fontSize: 9, color: c.muted, letterSpacing: "0.1em", textTransform: "uppercase" }}>Team Slots</span>
          <span style={{ fontFamily: "monospace", fontSize: 9, color: members.length >= 10 ? c.red : c.green }}>{members.length}/10 used</span>
        </div>
        <div style={{ height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 2 }}>
          <div style={{ height: "100%", width: `${(members.length / 10) * 100}%`, background: members.length >= 10 ? c.red : c.amber, borderRadius: 2, transition: "width 0.4s" }} />
        </div>
      </div>

      {/* Column headers */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 120px 140px 60px", gap: 10, padding: "0 12px 8px", borderBottom: `1px solid ${c.border}`, marginBottom: 8 }}>
        {["Email", "Role", "Joined", ""].map(h => (
          <div key={h} style={{ fontFamily: "monospace", fontSize: 8, color: c.label, letterSpacing: "0.12em", textTransform: "uppercase" }}>{h}</div>
        ))}
      </div>

      {/* Members */}
      {members.length === 0 ? (
        <div style={{ padding: "32px 0", textAlign: "center", fontFamily: "monospace", fontSize: 11, color: c.label }}>No members yet — share the invite code above.</div>
      ) : members.map((m, i) => (
        <div key={m.email + i} style={{ display: "grid", gridTemplateColumns: "1fr 120px 140px 60px", gap: 10, padding: "10px 12px", borderRadius: 8, marginBottom: 4, background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.015)" }}>
          <div style={{ fontFamily: "monospace", fontSize: 12, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={m.email}>{m.email}</div>
          <div>
            <span style={{
              fontFamily: "monospace", fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase",
              padding: "3px 8px", borderRadius: 4,
              background: m.role === "owner" ? c.amberDim : "rgba(255,255,255,0.06)",
              border: `1px solid ${m.role === "owner" ? c.amberBorder : c.border}`,
              color: m.role === "owner" ? c.amber : c.muted,
            }}>{m.role}</span>
          </div>
          <div style={{ fontFamily: "monospace", fontSize: 10, color: c.label, alignSelf: "center" }}>
            {m.joined_at ? new Date(m.joined_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}
          </div>
          <div style={{ alignSelf: "center" }}>
            {m.role !== "owner" && (
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: c.green }} title="Active" />
            )}
          </div>
        </div>
      ))}

      <div style={{ marginTop: 20, padding: "12px 16px", background: c.panel, border: `1px solid ${c.border}`, borderRadius: 10 }}>
        <div style={{ fontFamily: "monospace", fontSize: 9, color: c.label, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>How to Add Members</div>
        <div style={{ fontFamily: "monospace", fontSize: 11, color: c.muted, lineHeight: 1.7 }}>
          Share the invite code <span style={{ color: c.amber, letterSpacing: "0.1em" }}>{team.invite_code}</span> with your team.
          They sign in to Dwelling and enter the code to join your workspace automatically.
          Only the team owner can view and manage API keys.
        </div>
      </div>
    </div>
  )
}

/* ── MAIN ── */
export default function BusinessDashboard({ onClose, user, userRecord }) {
  const [tab, setTab] = useState("overview")
  const [keys, setKeys] = useState([])
  const [usage, setUsage] = useState({ totalUsage: 0, dailyLimit: DAILY_LIMIT, monthlyUsage: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const loadData = async () => {
    setLoading(true); setError(null)
    try {
      const token = await getAuthToken()
      const [kr, ur] = await Promise.all([
        fetch("/api/auth", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ action: "listApiKeys" }) }),
        fetch("/api/auth", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ action: "getUsage" }) }),
      ])
      const kd = await kr.json()
      const ud = await ur.json()
      setKeys(kd.apiKeys || [])
      setUsage({ totalUsage: ud.totalUsage ?? 0, dailyLimit: ud.dailyLimit ?? DAILY_LIMIT, monthlyUsage: ud.monthlyUsage ?? 0 })
    } catch { setError("API unavailable — showing cached data") }
    finally { setLoading(false) }
  }

  useEffect(() => { loadData() }, [])

  const now = new Date()
  const ts = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 500, background: c.bg, display: "flex", flexDirection: "column" }}>

      {/* Terminal title bar */}
      <div style={{ height: 44, flexShrink: 0, background: "rgba(0,0,0,0.55)", borderBottom: `1px solid ${c.border}`, display: "flex", alignItems: "center", padding: "0 20px", gap: 14 }}>
        <div style={{ display: "flex", gap: 6 }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#ef4444", cursor: "pointer" }} onClick={onClose} title="Close" />
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#f59e0b" }} />
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#22c55e" }} />
        </div>
        <div style={{ flex: 1, fontFamily: "monospace", fontSize: 11, color: c.amber, letterSpacing: "0.18em", textTransform: "uppercase", fontWeight: 700 }}>
          DWELLING · BUSINESS TERMINAL
        </div>
        <div style={{ fontFamily: "monospace", fontSize: 10, color: c.label, letterSpacing: "0.06em" }}>
          {now.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} · {ts}
        </div>
        <div style={{ width: 7, height: 7, borderRadius: "50%", background: error ? c.red : c.green }} title={error ? "Offline" : "Live"} />
      </div>

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

        {/* Sidebar */}
        <div style={{ width: 190, flexShrink: 0, background: "rgba(0,0,0,0.3)", borderRight: `1px solid ${c.border}`, padding: "18px 10px", display: "flex", flexDirection: "column", gap: 3 }}>
          <div style={{ fontSize: 8, fontFamily: "monospace", color: c.label, letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: 10, paddingLeft: 4 }}>Navigation</div>
          {[["overview", "📊  Overview"], ["reports", "📁  Reports"], ["apikeys", "🔑  API Keys"], ["users", "👥  Users"], ["settings", "⚙️  Settings"]].map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)} style={{
              padding: "9px 12px", borderRadius: 6, textAlign: "left", cursor: "pointer", transition: "all 0.13s",
              background: tab === id ? c.amberDim : "none",
              border: `1px solid ${tab === id ? c.amberBorder : "transparent"}`,
              color: tab === id ? c.amber : c.muted,
              fontFamily: "monospace", fontSize: 11, letterSpacing: "0.04em",
            }}>{label}</button>
          ))}

          <div style={{ marginTop: "auto", padding: 12, background: c.panel, borderRadius: 8, border: `1px solid ${c.border}` }}>
            <div style={{ fontSize: 8, fontFamily: "monospace", color: c.label, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 10 }}>System</div>
            {[["API", error ? "ERR" : "OK", error ? c.red : c.green], ["Storage", "OK", c.green], ["Plan", "BUSINESS", c.amber]].map(([k, v, col]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                <span style={{ fontFamily: "monospace", fontSize: 9, color: c.muted }}>{k}</span>
                <span style={{ fontFamily: "monospace", fontSize: 9, color: col }}>{v}</span>
              </div>
            ))}
            <button onClick={loadData} style={{ marginTop: 10, width: "100%", padding: "5px", borderRadius: 4, border: `1px solid ${c.border}`, background: "none", color: c.muted, fontFamily: "monospace", fontSize: 8, letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer" }}>
              ↻ REFRESH
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: "auto", padding: "24px 28px" }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 22, paddingBottom: 16, borderBottom: `1px solid ${c.border}` }}>
            <TabBtn active={tab === "overview"} onClick={() => setTab("overview")}>📊 Overview</TabBtn>
            <TabBtn active={tab === "reports"} onClick={() => setTab("reports")}>📁 Reports</TabBtn>
            <TabBtn active={tab === "apikeys"} onClick={() => setTab("apikeys")}>🔑 API Keys</TabBtn>
            <TabBtn active={tab === "users"} onClick={() => setTab("users")}>👥 Users</TabBtn>
            <TabBtn active={tab === "settings"} onClick={() => setTab("settings")}>⚙️ Settings</TabBtn>
          </div>

          {tab === "overview" && <OverviewTab usage={usage} keys={keys} />}
          {tab === "reports" && <ReportsTab />}
          {tab === "apikeys" && <ApiKeysTab keys={keys} loading={loading} error={error} onRefresh={loadData} />}
          {tab === "users" && <UsersTab />}
          {tab === "settings" && <AccountSettings user={user || userRecord} onClose={() => {}} />}
        </div>
      </div>
    </div>
  )
}
