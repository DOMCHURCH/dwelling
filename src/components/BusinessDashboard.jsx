import { useState, useEffect } from "react"
import { getAuthToken } from "../lib/localAuth"

export default function BusinessDashboard({ onClose }) {
  const [keys, setKeys] = useState([])
  const [usage, setUsage] = useState({ totalUsage: 0, keys: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showCreate, setShowCreate] = useState(false)
  const [newKeyName, setNewKeyName] = useState("")
  const [creating, setCreating] = useState(false)
  const [newKey, setNewKey] = useState(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const token = await getAuthToken()
      const [keysRes, usageRes] = await Promise.all([
        fetch("/api/auth", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ action: "listApiKeys" }),
        }),
        fetch("/api/auth", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ action: "getUsage" }),
        }),
      ])
      const keysData = await keysRes.json()
      const usageData = await usageRes.json()
      setKeys(keysData.apiKeys || [])
      setUsage(usageData)
    } catch (e) {
      setError("Failed to load dashboard")
    } finally {
      setLoading(false)
    }
  }

  const createKey = async () => {
    if (!newKeyName.trim()) return
    setCreating(true)
    try {
      const token = await getAuthToken()
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "createApiKey", name: newKeyName.trim() }),
      })
      const data = await res.json()
      if (res.ok && data.key) {
        setNewKey(data.key)
      } else {
        setError(data.error || "Failed to create key")
      }
    } catch (e) {
      setError("Failed to create key")
    } finally {
      setCreating(false)
    }
  }

  const revokeKey = async (keyId) => {
    if (!confirm("Revoke this API key? This cannot be undone.")) return
    try {
      const token = await getAuthToken()
      await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "revokeApiKey", keyId }),
      })
      loadData()
    } catch (e) {
      setError("Failed to revoke key")
    }
  }

  const close = () => {
    onClose()
  }

  const today = new Date().toISOString().split("T")[0]

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 500,
        background: "rgba(0,0,0,0.92)",
        backdropFilter: "blur(12px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
      onClick={(e) => e.target === e.currentTarget && close()}
    >
      <div
        className="liquid-glass-strong"
        style={{ borderRadius: 24, maxWidth: 600, width: "100%", maxHeight: "85vh", overflow: "auto", padding: 32 }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <div style={{ fontFamily: "'Instrument Serif',serif", fontStyle: "italic", fontSize: 24, color: "#fff" }}>
            Business Dashboard
          </div>
          <button
            onClick={close}
            style={{
              background: "none",
              border: "none",
              color: "rgba(255,255,255,0.5)",
              fontSize: 24,
              cursor: "pointer",
            }}
          >
            ×
          </button>
        </div>

        {error && (
          <div
            style={{
              padding: "12px 16px",
              borderRadius: 12,
              background: "rgba(248,113,113,0.1)",
              color: "#f87171",
              marginBottom: 16,
            }}
          >
            {error}
          </div>
        )}

        {newKey && (
          <div style={{ padding: "16px", borderRadius: 12, background: "rgba(74,222,128,0.1)", marginBottom: 16 }}>
            <div
              style={{
                fontSize: 11,
                color: "#4ade80",
                marginBottom: 8,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
              }}
            >
              API Key Created
            </div>
            <code
              style={{
                display: "block",
                fontSize: 12,
                color: "#fff",
                wordBreak: "break-all",
                background: "rgba(0,0,0,0.3)",
                padding: 12,
                borderRadius: 8,
              }}
            >
              {newKey}
            </code>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 8 }}>
              Copy this now. You won't see it again.
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(newKey)
                setNewKey(null)
              }}
              style={{
                marginTop: 12,
                padding: "8px 16px",
                borderRadius: 8,
                border: "none",
                background: "#4ade80",
                color: "#000",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Copy to Clipboard
            </button>
            <button
              onClick={() => setNewKey(null)}
              style={{
                marginTop: 12,
                marginLeft: 8,
                padding: "8px 16px",
                borderRadius: 8,
                border: "none",
                background: "rgba(255,255,255,0.1)",
                color: "#fff",
                cursor: "pointer",
              }}
            >
              Done
            </button>
          </div>
        )}

        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 8 }}>Today's Usage</div>
          <div style={{ display: "flex", gap: 16 }}>
            <div
              style={{
                flex: 1,
                padding: "16px 20px",
                borderRadius: 16,
                background: "rgba(255,255,255,0.04)",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 32, fontFamily: "'Instrument Serif',serif", color: "#fff" }}>
                {usage.totalUsage || 0}
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: "rgba(255,255,255,0.35)",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                }}
              >
                Requests
              </div>
            </div>
            <div
              style={{
                flex: 1,
                padding: "16px 20px",
                borderRadius: 16,
                background: "rgba(255,255,255,0.04)",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 32, fontFamily: "'Instrument Serif',serif", color: "#fff" }}>
                {usage.dailyLimit - (usage.totalUsage || 0)}
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: "rgba(255,255,255,0.35)",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                }}
              >
                Remaining
              </div>
            </div>
          </div>
        </div>

        <div style={{ marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>API Keys ({keys.length}/5)</div>
          {keys.length < 5 && !showCreate && (
            <button
              onClick={() => setShowCreate(true)}
              style={{
                padding: "6px 12px",
                borderRadius: 20,
                border: "none",
                background: "rgba(251,191,36,0.2)",
                color: "#fbbf24",
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              + New Key
            </button>
          )}
        </div>

        {showCreate && (
          <div
            style={{
              padding: 16,
              borderRadius: 12,
              background: "rgba(255,255,255,0.04)",
              marginBottom: 16,
              display: "flex",
              gap: 8,
            }}
          >
            <input
              type="text"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              placeholder="Key name (e.g. Production)"
              style={{
                flex: 1,
                padding: "10px 14px",
                borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.1)",
                background: "rgba(255,255,255,0.05)",
                color: "#fff",
                fontSize: 13,
                outline: "none",
              }}
              onFocus={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.3)")}
              onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.1)")}
            />
            <button
              onClick={createKey}
              disabled={creating || !newKeyName.trim()}
              style={{
                padding: "10px 16px",
                borderRadius: 8,
                border: "none",
                background: creating ? "rgba(255,255,255,0.1)" : "#fbbf24",
                color: creating ? "rgba(255,255,255,0.3)" : "#000",
                fontWeight: 600,
                cursor: creating ? "default" : "pointer",
              }}
            >
              {creating ? "..." : "Create"}
            </button>
            <button
              onClick={() => {
                setShowCreate(false)
                setNewKeyName("")
              }}
              style={{
                padding: "10px 14px",
                borderRadius: 8,
                border: "none",
                background: "rgba(255,255,255,0.06)",
                color: "rgba(255,255,255,0.5)",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {loading ? (
            <div style={{ padding: 24, textAlign: "center", color: "rgba(255,255,255,0.3)" }}>Loading...</div>
          ) : keys.length === 0 ? (
            <div style={{ padding: 24, textAlign: "center", color: "rgba(255,255,255,0.3)" }}>No API keys yet</div>
          ) : (
            keys.map((k) => (
              <div
                key={k.id}
                style={{
                  padding: 14,
                  borderRadius: 12,
                  background: "rgba(255,255,255,0.04)",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, color: "#fff", marginBottom: 4 }}>{k.name}</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>
                    {k.remaining} / 200 remaining today · Created{" "}
                    {k.createdAt ? new Date(k.createdAt).toLocaleDateString() : "N/A"}
                  </div>
                </div>
                {!k.revokedAt && (
                  <div
                    style={{
                      width: 80,
                      height: 6,
                      borderRadius: 3,
                      background: "rgba(255,255,255,0.08)",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${(k.remaining / 200) * 100}%`,
                        height: "100%",
                        background: k.remaining > 50 ? "#4ade80" : k.remaining > 20 ? "#fbbf24" : "#f87171",
                      }}
                    />
                  </div>
                )}
                {k.revokedAt && <span style={{ fontSize: 11, color: "#f87171" }}>Revoked</span>}
                {!k.revokedAt && (
                  <button
                    onClick={() => revokeKey(k.id)}
                    style={{
                      padding: "6px 10px",
                      borderRadius: 6,
                      border: "none",
                      background: "rgba(248,113,113,0.1)",
                      color: "#f87171",
                      fontSize: 11,
                      cursor: "pointer",
                    }}
                  >
                    Revoke
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
