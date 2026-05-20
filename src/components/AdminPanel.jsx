import { useState, useEffect } from "react"
import { getAuthToken } from "../lib/localAuth"

export default function AdminPanel({ onClose }) {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState("")

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

  const filtered = users.filter(u => {
    if (search && !u.email.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const s = {
    overlay: { position: "fixed", inset: 0, zIndex: 800, background: "rgba(0,0,0,0.92)", backdropFilter: "blur(14px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, overflow: "hidden" },
    panel: { background: "#0d1117", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20, width: "100%", maxWidth: 900, maxHeight: "90vh", display: "flex", flexDirection: "column", overflow: "hidden" },
    header: { padding: "20px 24px", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 },
    body: { flex: 1, overflow: "auto", overscrollBehavior: "contain", padding: 24 },
    input: { padding: "9px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", color: "#fff", fontFamily: "'Barlow',sans-serif", fontSize: 13, outline: "none", transition: "border-color 0.2s" },
  }

  return (
    <div style={s.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={s.panel}>

        <div style={s.header}>
          <div>
            <div style={{ fontFamily: "'Instrument Serif',serif", fontStyle: "italic", fontSize: 22, color: "#fff" }}>⚡ Admin Panel</div>
            <div style={{ fontSize: 11, fontFamily: "'Barlow',sans-serif", color: "rgba(255,255,255,0.3)", marginTop: 2 }}>User directory</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.35)", fontSize: 22, cursor: "pointer" }}>×</button>
        </div>

        <div style={s.body}>

          <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: "12px 16px", marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 9, fontFamily: "'Barlow',sans-serif", letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: 4 }}>Registered Users</div>
              <div style={{ fontSize: 24, fontWeight: 700, fontFamily: "'Barlow',sans-serif", color: "#fff" }}>{users.length}</div>
            </div>
            <button onClick={loadUsers} style={{ padding: "9px 14px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.65)", cursor: "pointer", fontSize: 12, fontFamily: "'Barlow',sans-serif" }}>↻ Refresh</button>
          </div>

          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by email…"
              style={{ ...s.input, flex: 1 }}
              onFocus={e => (e.target.style.borderColor = "rgba(255,255,255,0.3)")}
              onBlur={e => (e.target.style.borderColor = "rgba(255,255,255,0.1)")} />
          </div>

          {error ? (
            <div style={{ padding: 20, textAlign: "center", color: "#f87171", fontFamily: "'Barlow',sans-serif", fontSize: 13 }}>{error}</div>
          ) : loading ? (
            <div style={{ padding: 20, textAlign: "center", color: "rgba(255,255,255,0.3)", fontFamily: "'Barlow',sans-serif", fontSize: 13 }}>Loading…</div>
          ) : (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 120px 120px 120px", gap: 10, padding: "0 10px 8px", borderBottom: "1px solid rgba(255,255,255,0.07)", marginBottom: 6 }}>
                {["Email", "Role", "Team", "Joined"].map(h => (
                  <div key={h} style={{ fontSize: 9, fontFamily: "'Barlow',sans-serif", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)" }}>{h}</div>
                ))}
              </div>

              {filtered.length === 0 ? (
                <div style={{ padding: "24px 0", textAlign: "center", color: "rgba(255,255,255,0.3)", fontFamily: "'Barlow',sans-serif", fontSize: 13 }}>No users match</div>
              ) : (
                filtered.map(u => (
                  <div key={u.id} style={{ display: "grid", gridTemplateColumns: "1fr 120px 120px 120px", gap: 10, padding: "10px 10px", borderRadius: 8, marginBottom: 4 }}>
                    <div style={{ fontFamily: "'Barlow',sans-serif", fontSize: 12, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={u.email}>{u.email}</div>
                    <div style={{ fontFamily: "'Barlow',sans-serif", fontSize: 11, color: u.is_admin ? "#a78bfa" : "rgba(255,255,255,0.4)", fontWeight: 600 }}>{u.is_admin ? "Admin" : "User"}</div>
                    <div style={{ fontFamily: "'Barlow',sans-serif", fontSize: 11, color: "rgba(255,255,255,0.4)" }}>{u.team_id ? "✓" : "—"}</div>
                    <div style={{ fontFamily: "'Barlow',sans-serif", fontSize: 11, color: "rgba(255,255,255,0.4)" }}>{u.created_at ? new Date(u.created_at).toLocaleDateString() : "—"}</div>
                  </div>
                ))
              )}
              <div style={{ marginTop: 12, fontFamily: "'Barlow',sans-serif", fontSize: 11, color: "rgba(255,255,255,0.2)", textAlign: "right" }}>
                Showing {filtered.length} of {users.length} users
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
