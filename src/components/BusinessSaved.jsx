import { useState, useEffect } from "react"
import { getAuthToken } from "../lib/localAuth"
import { useSavedReports } from "../lib/useSavedReports"

export default function BusinessSaved() {
  const { saved, deleteReport, isReportSaved } = useSavedReports()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(false)
  }, [])

  const handleLoad = (report) => {
    window.location.href = `/?load=${report.id}`
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
          Saved Reports
        </h1>
        <p style={{ fontSize: 14, color: "rgba(255,255,255,0.4)", fontFamily: "'Barlow',sans-serif" }}>
          {saved.length} reports saved
        </p>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: "rgba(255,255,255,0.3)" }}>Loading...</div>
      ) : saved.length === 0 ? (
        <div style={{ textAlign: "center", padding: 60, color: "rgba(255,255,255,0.3)" }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>📂</div>
          <div style={{ fontSize: 18, marginBottom: 8 }}>No saved reports</div>
          <div style={{ fontSize: 13 }}>Run an analysis and save it to see it here.</div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
          {saved.map((r) => (
            <div
              key={r.id}
              style={{
                background: "#141414",
                borderRadius: 16,
                padding: 20,
                border: "1px solid rgba(255,255,255,0.06)",
                cursor: "pointer",
                transition: "all 0.15s",
              }}
              onClick={() => handleLoad(r)}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)")}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)")}
            >
              <div
                style={{
                  fontSize: 16,
                  color: "#fff",
                  marginBottom: 8,
                  fontFamily: "'Instrument Serif',serif",
                  fontStyle: "italic",
                }}
              >
                {r.city || "Unknown"}
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: "rgba(255,255,255,0.4)",
                  marginBottom: 12,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {r.address || ""}
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                {r.score != null && (
                  <div
                    style={{
                      fontSize: 24,
                      fontFamily: "'Instrument Serif',serif",
                      color: r.score >= 70 ? "#4ade80" : r.score >= 45 ? "#fbbf24" : "#f87171",
                    }}
                  >
                    {r.score}
                  </div>
                )}
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.25)" }}>
                  {r.savedAt ? new Date(r.savedAt).toLocaleDateString() : ""}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
