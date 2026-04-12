import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { getAuthToken, getCurrentUser } from "../lib/localAuth"

export default function BusinessOverview({ user }) {
  const [stats, setStats] = useState({ totalUsage: 0, stars: 0, keys: [] })
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      const token = await getAuthToken()
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "getUsage" }),
      })
      const data = await res.json()
      setStats(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const cards = [
    { label: "Stars Remaining", value: stats.dailyLimit - (stats.totalUsage || 0), color: "#38bdf8", icon: "★" },
    { label: "API Keys", value: stats.keys?.length || 0, color: "#f472b6", icon: "◆" },
    { label: "Team Members", value: 1, color: "#fbbf24", icon: "◎" },
    { label: "Reports Today", value: stats.totalUsage || 0, color: "#4ade80", icon: "▤" },
  ]

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
          Dashboard
        </h1>
        <p style={{ fontSize: 14, color: "rgba(255,255,255,0.4)", fontFamily: "'Barlow',sans-serif" }}>
          Welcome back, {user?.email || "user"}
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 32 }}>
        {cards.map((card) => (
          <div
            key={card.label}
            style={{ background: "#141414", borderRadius: 16, padding: 24, border: "1px solid rgba(255,255,255,0.06)" }}
          >
            <div style={{ fontSize: 12, color: card.color, marginBottom: 8 }}>{card.label}</div>
            <div style={{ fontSize: 36, fontFamily: "'Instrument Serif',serif", color: "#fff" }}>
              {loading ? "..." : card.value}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16 }}>
        <div
          style={{ background: "#141414", borderRadius: 16, padding: 24, border: "1px solid rgba(255,255,255,0.06)" }}
        >
          <div style={{ fontSize: 14, fontWeight: 500, color: "#fff", marginBottom: 16 }}>Quick Actions</div>
          <div style={{ display: "flex", gap: 12 }}>
            <button
              onClick={() => navigate("/")}
              style={{
                padding: "12px 20px",
                borderRadius: 10,
                border: "none",
                background: "rgba(56,189,248,0.15)",
                color: "#38bdf8",
                fontSize: 13,
                cursor: "pointer",
                fontFamily: "'Barlow',sans-serif",
              }}
            >
              + New Analysis
            </button>
            <button
              onClick={() => navigate("/dashboard/saved")}
              style={{
                padding: "12px 20px",
                borderRadius: 10,
                border: "none",
                background: "rgba(255,255,255,0.06)",
                color: "#fff",
                fontSize: 13,
                cursor: "pointer",
                fontFamily: "'Barlow',sans-serif",
              }}
            >
              View Reports
            </button>
            <button
              onClick={() => navigate("/dashboard/api-keys")}
              style={{
                padding: "12px 20px",
                borderRadius: 10,
                border: "none",
                background: "rgba(255,255,255,0.06)",
                color: "#fff",
                fontSize: 13,
                cursor: "pointer",
                fontFamily: "'Barlow',sans-serif",
              }}
            >
              Manage Keys
            </button>
          </div>
        </div>

        <div
          style={{ background: "#141414", borderRadius: 16, padding: 24, border: "1px solid rgba(255,255,255,0.06)" }}
        >
          <div style={{ fontSize: 14, fontWeight: 500, color: "#fff", marginBottom: 16 }}>Plan Info</div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginBottom: 8 }}>Current Plan</div>
          <div style={{ fontSize: 18, color: "#fbbf24", fontWeight: 600, marginBottom: 16 }}>Business</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>
            {stats.dailyLimit || 0} stars/day · Renews daily
          </div>
        </div>
      </div>
    </div>
  )
}
