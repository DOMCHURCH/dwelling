import { useState, useEffect } from "react"
import { getAuthToken } from "../lib/localAuth"

export default function BusinessUsage() {
  const [usage, setUsage] = useState({ totalUsage: 0, keys: [], dailyLimit: 200 })
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState("today")

  useEffect(() => {
    loadUsage()
  }, [period])

  const loadUsage = async () => {
    try {
      const token = await getAuthToken()
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "getUsage" }),
      })
      const data = await res.json()
      setUsage(data)
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
          Usage
        </h1>
        <p style={{ fontSize: 14, color: "rgba(255,255,255,0.4)", fontFamily: "'Barlow',sans-serif" }}>
          Track your API usage
        </p>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        {["today", "7days", "30days"].map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              border: "none",
              background: period === p ? "rgba(56,189,248,0.15)" : "rgba(255,255,255,0.04)",
              color: period === p ? "#38bdf8" : "rgba(255,255,255,0.5)",
              fontSize: 12,
              cursor: "pointer",
              fontFamily: "'Barlow',sans-serif",
            }}
          >
            {p === "today" ? "Today" : p === "7days" ? "7 Days" : "30 Days"}
          </button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 32 }}>
        <div
          style={{ background: "#141414", borderRadius: 16, padding: 24, border: "1px solid rgba(255,255,255,0.06)" }}
        >
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 8 }}>Total Requests</div>
          <div style={{ fontSize: 36, fontFamily: "'Instrument Serif',serif", color: "#fff" }}>
            {loading ? "..." : usage.totalUsage || 0}
          </div>
        </div>
        <div
          style={{ background: "#141414", borderRadius: 16, padding: 24, border: "1px solid rgba(255,255,255,0.06)" }}
        >
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 8 }}>Stars Used</div>
          <div style={{ fontSize: 36, fontFamily: "'Instrument Serif',serif", color: "#fff" }}>
            {loading ? "..." : usage.totalUsage || 0}
          </div>
        </div>
        <div
          style={{ background: "#141414", borderRadius: 16, padding: 24, border: "1px solid rgba(255,255,255,0.06)" }}
        >
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 8 }}>Rate Limit</div>
          <div style={{ fontSize: 36, fontFamily: "'Instrument Serif',serif", color: "#fff" }}>
            {usage.dailyLimit || 200}
          </div>
        </div>
      </div>

      <div style={{ background: "#141414", borderRadius: 16, padding: 24, border: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: "#fff", marginBottom: 16 }}>Usage by API Key</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {loading ? (
            <div style={{ padding: 20, textAlign: "center", color: "rgba(255,255,255,0.3)" }}>Loading...</div>
          ) : (usage.keys || []).length === 0 ? (
            <div style={{ padding: 20, textAlign: "center", color: "rgba(255,255,255,0.3)" }}>No usage data</div>
          ) : (
            usage.keys.map((k) => (
              <div
                key={k.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 0",
                  borderBottom: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <div>
                  <div style={{ fontSize: 14, color: "#fff" }}>{k.name}</div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>Active</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 18, fontFamily: "'Instrument Serif',serif", color: "#fff" }}>
                    {k.usage || 0} / {k.limit || 200}
                  </div>
                  <div
                    style={{
                      width: 100,
                      height: 4,
                      borderRadius: 2,
                      background: "rgba(255,255,255,0.08)",
                      marginTop: 4,
                    }}
                  >
                    <div
                      style={{
                        width: `${Math.min(((k.usage || 0) / (k.limit || 200)) * 100, 100)}%`,
                        height: "100%",
                        background: k.remaining > 50 ? "#4ade80" : k.remaining > 20 ? "#fbbf24" : "#f87171",
                      }}
                    />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
