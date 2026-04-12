import { useState, useEffect } from "react"
import { getAuthToken } from "../lib/localAuth"

export default function BusinessApiKeys() {
  const [keys, setKeys] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [newKeyName, setNewKeyName] = useState("")
  const [creating, setCreating] = useState(false)
  const [newKey, setNewKey] = useState(null)

  useEffect(() => {
    loadKeys()
  }, [])

  const loadKeys = async () => {
    try {
      const token = await getAuthToken()
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "listApiKeys" }),
      })
      const data = await res.json()
      setKeys(data.apiKeys || [])
    } catch (e) {
      console.error(e)
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
        loadKeys()
      }
    } catch (e) {
      console.error(e)
    } finally {
      setCreating(false)
    }
  }

  const revokeKey = async (keyId) => {
    if (!confirm("Revoke this API key?")) return
    try {
      const token = await getAuthToken()
      await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "revokeApiKey", keyId }),
      })
      loadKeys()
    } catch (e) {
      console.error(e)
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
          API Keys
        </h1>
        <p style={{ fontSize: 14, color: "rgba(255,255,255,0.4)", fontFamily: "'Barlow',sans-serif" }}>
          Manage your API keys ({keys.length}/5)
        </p>
      </div>

      {newKey && (
        <div
          style={{
            padding: 20,
            borderRadius: 16,
            background: "rgba(74,222,128,0.1)",
            marginBottom: 24,
            border: "1px solid rgba(74,222,128,0.3)",
          }}
        >
          <div
            style={{
              fontSize: 12,
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
              fontSize: 13,
              color: "#fff",
              wordBreak: "break-all",
              background: "rgba(0,0,0,0.3)",
              padding: 16,
              borderRadius: 8,
              marginBottom: 12,
            }}
          >
            {newKey}
          </code>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginBottom: 12 }}>
            Copy this now. You won't see it again.
          </div>
          <button
            onClick={() => {
              navigator.clipboard.writeText(newKey)
              setNewKey(null)
            }}
            style={{
              marginRight: 8,
              padding: "8px 16px",
              borderRadius: 8,
              border: "none",
              background: "#4ade80",
              color: "#000",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Copy
          </button>
          <button
            onClick={() => setNewKey(null)}
            style={{
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

      {showCreate && (
        <div
          style={{
            padding: 20,
            borderRadius: 16,
            background: "#141414",
            marginBottom: 24,
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 500, color: "#fff", marginBottom: 12 }}>Create New Key</div>
          <input
            type="text"
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            placeholder="Key name (e.g. Production)"
            style={{
              width: "100%",
              padding: "12px 16px",
              borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.1)",
              background: "rgba(255,255,255,0.05)",
              color: "#fff",
              fontSize: 14,
              outline: "none",
              marginBottom: 12,
            }}
          />
          <button
            onClick={createKey}
            disabled={creating || !newKeyName.trim()}
            style={{
              padding: "10px 20px",
              borderRadius: 8,
              border: "none",
              background: creating ? "rgba(255,255,255,0.1)" : "#fbbf24",
              color: creating ? "rgba(255,255,255,0.3)" : "#000",
              fontWeight: 600,
              cursor: creating ? "default" : "pointer",
            }}
          >
            {creating ? "Creating..." : "Create"}
          </button>
          <button
            onClick={() => {
              setShowCreate(false)
              setNewKeyName("")
            }}
            style={{
              marginLeft: 8,
              padding: "10px 20px",
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

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: 40, color: "rgba(255,255,255,0.3)" }}>Loading...</div>
        ) : keys.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40, color: "rgba(255,255,255,0.3)" }}>No API keys yet</div>
        ) : (
          keys.map((k) => (
            <div
              key={k.id}
              style={{
                background: "#141414",
                borderRadius: 12,
                padding: 20,
                border: "1px solid rgba(255,255,255,0.06)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div>
                <div style={{ fontSize: 15, color: "#fff", marginBottom: 4 }}>{k.name}</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>
                  {k.remaining}/200 remaining today · Created{" "}
                  {k.createdAt ? new Date(k.createdAt).toLocaleDateString() : "N/A"}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div
                  style={{
                    width: 100,
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
                {!k.revokedAt ? (
                  <button
                    onClick={() => revokeKey(k.id)}
                    style={{
                      padding: "6px 12px",
                      borderRadius: 6,
                      border: "none",
                      background: "rgba(248,113,113,0.1)",
                      color: "#f87171",
                      fontSize: 12,
                      cursor: "pointer",
                    }}
                  >
                    Revoke
                  </button>
                ) : (
                  <span style={{ fontSize: 12, color: "#f87171" }}>Revoked</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {keys.length < 5 && !showCreate && (
        <button
          onClick={() => setShowCreate(true)}
          style={{
            marginTop: 20,
            padding: "12px 20px",
            borderRadius: 8,
            border: "1px solid rgba(251,191,36,0.3)",
            background: "rgba(251,191,36,0.1)",
            color: "#fbbf24",
            fontSize: 13,
            cursor: "pointer",
            fontFamily: "'Barlow',sans-serif",
          }}
        >
          + Create API Key
        </button>
      )}
    </div>
  )
}
