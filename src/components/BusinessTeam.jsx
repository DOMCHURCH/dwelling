import { useState, useEffect } from "react"
import { getAuthToken } from "../lib/localAuth"

export default function BusinessTeam() {
  const [team, setTeam] = useState({ name: "", users: [] })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadTeam()
  }, [])

  const loadTeam = async () => {
    try {
      const token = await getAuthToken()
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "listTeams" }),
      })
      const data = await res.json()
      setTeam({ name: data.teams?.[0]?.name || "My Team", users: [] })
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
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
          Team
        </h1>
        <p style={{ fontSize: 14, color: "rgba(255,255,255,0.4)", fontFamily: "'Barlow',sans-serif" }}>
          Manage your team members
        </p>
      </div>

      <div style={{ background: "#141414", borderRadius: 16, padding: 24, border: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: "#fff", marginBottom: 16 }}>Team Name</div>
        <div style={{ fontSize: 24, color: "#fff", marginBottom: 24 }}>{team.name}</div>

        <div style={{ fontSize: 14, fontWeight: 500, color: "#fff", marginBottom: 16 }}>Members (1/10)</div>
        <div style={{ padding: "16px 0", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0" }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: "rgba(251,191,36,0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fbbf24",
                fontSize: 14,
              }}
            >
              Y
            </div>
            <div>
              <div style={{ fontSize: 14, color: "#fff" }}>You (Owner)</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>Owner</div>
            </div>
          </div>
        </div>

        <button
          style={{
            marginTop: 20,
            padding: "10px 16px",
            borderRadius: 8,
            border: "1px solid rgba(255,255,255,0.15)",
            background: "transparent",
            color: "rgba(255,255,255,0.5)",
            fontSize: 13,
            cursor: "pointer",
            fontFamily: "'Barlow',sans-serif",
          }}
        >
          + Invite Member
        </button>
      </div>
    </div>
  )
}
