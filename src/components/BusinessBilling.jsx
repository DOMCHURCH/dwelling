import { useState } from "react"

export default function BusinessBilling() {
  const [loading, setLoading] = useState(false)

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
          Billing
        </h1>
        <p style={{ fontSize: 14, color: "rgba(255,255,255,0.4)", fontFamily: "'Barlow',sans-serif" }}>
          Manage your subscription
        </p>
      </div>

      <div
        style={{
          background: "#141414",
          borderRadius: 16,
          padding: 24,
          border: "1px solid rgba(255,255,255,0.06)",
          marginBottom: 16,
        }}
      >
        <div style={{ fontSize: 14, fontWeight: 500, color: "#fff", marginBottom: 16 }}>Current Plan</div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 24, color: "#fbbf24", fontWeight: 600, marginBottom: 4 }}>Business</div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>$150/month · Billed monthly</div>
          </div>
          <button
            style={{
              padding: "10px 20px",
              borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.15)",
              background: "transparent",
              color: "#fff",
              fontSize: 13,
              cursor: "pointer",
              fontFamily: "'Barlow',sans-serif",
            }}
          >
            Manage Plan
          </button>
        </div>
      </div>

      <div style={{ background: "#141414", borderRadius: 16, padding: 24, border: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: "#fff", marginBottom: 16 }}>Payment Method</div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "16px 0",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <div
            style={{
              width: 40,
              height: 26,
              borderRadius: 4,
              background: "linear-gradient(135deg, #1a1f71, #004d40)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontSize: 10,
              fontWeight: 700,
            }}
          >
            VISA
          </div>
          <div style={{ fontSize: 14, color: "#fff" }}>•••• •••• •••• 4242</div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginLeft: "auto" }}>Expires 12/27</div>
        </div>
        <button
          style={{
            marginTop: 16,
            padding: "10px 16px",
            borderRadius: 8,
            border: "none",
            background: "rgba(255,255,255,0.06)",
            color: "rgba(255,255,255,0.5)",
            fontSize: 13,
            cursor: "pointer",
            fontFamily: "'Barlow',sans-serif",
          }}
        >
          + Update Payment Method
        </button>
      </div>
    </div>
  )
}
