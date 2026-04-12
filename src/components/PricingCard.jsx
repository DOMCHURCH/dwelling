import { useState } from "react"

export const PRICING_FREE = [
  "10 free reports / month",
  "Area Verdict & AI Market Intelligence",
  "Investment Score preview",
  "Cost of Living breakdown",
  "Climate & weather data",
  "Local Market News",
  "Area Market Estimate",
  "Walkability & school scores",
  "Full Neighbourhood detail & safety",
  "Own API key — full privacy, no platform limits",
]

export const PRICING_PRO = [
  { text: "100–150 reports / month", highlight: false },
  { text: "Full AI reports — all sections unlocked", highlight: false },
  { text: "Investment Analysis & ROI score", highlight: true },
  { text: "Environmental & flood risk detection", highlight: true },
  { text: "Price history & market projections", highlight: true },
  { text: "Compare up to 3 areas side-by-side", highlight: true },
  { text: "Saved reports", highlight: false },
  { text: "Priority processing", highlight: false },
]

export const PRICING_BUSINESS = [
  { text: "1,000–3,000 reports / month", highlight: false },
  { text: "200 reports / day via API", highlight: false },
  { text: "3–10 team members", highlight: true },
  { text: "Team workspace", highlight: true },
  { text: "Client sharing links", highlight: true },
  { text: "Branded PDF reports", highlight: true },
  { text: "Everything in Pro", highlight: false },
  { text: "Dedicated support", highlight: false },
]

export function BusinessCard({ onCta, annual = false }) {
  const [hov, setHov] = useState(false)
  return (
    <div
      className="pricing-card-anim"
      style={{
        flex: "1 1 260px",
        maxWidth: 340,
        padding: 1.5,
        borderRadius: 25.5,
        background:
          "linear-gradient(135deg, rgba(251,191,36,0.45) 0%, rgba(245,158,11,0.35) 50%, rgba(180,83,9,0.3) 100%)",
        boxShadow: "0 0 60px rgba(251,191,36,0.08), 0 24px 60px rgba(0,0,0,0.5)",
        position: "relative",
      }}
    >
      <div
        style={{
          borderRadius: 22.5,
          padding: "28px 24px",
          background: "linear-gradient(135deg, rgba(20,14,4,0.98) 0%, rgba(12,8,2,0.98) 100%)",
          backdropFilter: "blur(24px)",
          display: "flex",
          flexDirection: "column",
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -16,
            left: "50%",
            transform: "translateX(-50%)",
            background: "linear-gradient(90deg, #fbbf24, #f59e0b)",
            borderRadius: 20,
            padding: "5px 18px",
            fontFamily: "'Barlow',sans-serif",
            fontWeight: 700,
            fontSize: 10,
            color: "#000",
            whiteSpace: "nowrap",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            boxShadow: "0 4px 16px rgba(251,191,36,0.35)",
          }}
        >
          For Teams
        </div>

        <div
          style={{
            fontFamily: "'Instrument Serif',serif",
            fontStyle: "italic",
            fontSize: 28,
            color: "#fff",
            marginBottom: 4,
          }}
        >
          Business
        </div>
        <div
          style={{
            fontFamily: "'Barlow',sans-serif",
            fontWeight: 300,
            fontSize: 13,
            color: "rgba(255,255,255,0.4)",
            marginBottom: 20,
          }}
        >
          For agencies, brokers & investment firms
        </div>

        <div style={{ marginBottom: 22, paddingBottom: 18, borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <span
            style={{
              fontFamily: "'Instrument Serif',serif",
              fontStyle: "italic",
              fontSize: 52,
              color: "#fff",
              lineHeight: 1,
            }}
          >
            ${annual ? 120 : 150}
          </span>
          <span
            style={{
              fontFamily: "'Barlow',sans-serif",
              fontWeight: 300,
              fontSize: 13,
              color: "rgba(255,255,255,0.3)",
              marginLeft: 5,
            }}
          >
            /month
          </span>
          <div
            style={{ marginTop: 5, fontFamily: "'Barlow',sans-serif", fontSize: 11, color: "#fbbf24", fontWeight: 500 }}
          >
            {annual ? "Billed $1,440/year — save 20%" : "Up to $249/mo for larger teams"}
          </div>
        </div>

        <div style={{ flex: 1, marginBottom: 22 }}>
          <div
            style={{
              fontFamily: "'Barlow',sans-serif",
              fontSize: 10,
              color: "rgba(255,255,255,0.3)",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              marginBottom: 12,
            }}
          >
            Everything in Pro, plus:
          </div>
          {PRICING_BUSINESS.map((f, i) => {
            const hl = f.highlight
            return (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 11 }}>
                <div
                  style={{
                    width: 17,
                    height: 17,
                    borderRadius: "50%",
                    flexShrink: 0,
                    marginTop: 1,
                    background: hl ? "rgba(251,191,36,0.15)" : "rgba(255,255,255,0.05)",
                    border: hl ? "1px solid rgba(251,191,36,0.4)" : "1px solid rgba(255,255,255,0.08)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <span style={{ fontSize: 9, color: hl ? "#fbbf24" : "rgba(255,255,255,0.3)" }}>✓</span>
                </div>
                <span
                  style={{
                    fontFamily: "'Barlow',sans-serif",
                    fontWeight: hl ? 500 : 300,
                    fontSize: 13,
                    color: hl ? "#fef3c7" : "rgba(255,255,255,0.6)",
                    lineHeight: 1.4,
                  }}
                >
                  {f.text}
                </span>
              </div>
            )
          })}
        </div>

        <button
          onClick={onCta}
          onMouseEnter={() => setHov(true)}
          onMouseLeave={() => setHov(false)}
          style={{
            width: "100%",
            padding: "14px",
            borderRadius: 40,
            border: "none",
            cursor: "pointer",
            fontFamily: "'Barlow',sans-serif",
            fontWeight: 700,
            fontSize: 14,
            background: hov ? "linear-gradient(90deg, #fcd34d, #f59e0b)" : "linear-gradient(90deg, #fbbf24, #d97706)",
            color: "#000",
            transition: "background 0.2s ease, transform 0.15s ease",
            transform: hov ? "scale(1.01)" : "scale(1)",
            letterSpacing: "0.01em",
          }}
        >
          Get Business →
        </button>
        <div style={{ textAlign: "center", marginTop: 10 }}>
          <span
            style={{
              fontFamily: "'Barlow',sans-serif",
              fontSize: 11,
              color: "rgba(255,255,255,0.22)",
              fontWeight: 300,
            }}
          >
            Cancel anytime · From $150/mo
          </span>
        </div>
      </div>
    </div>
  )
}

export default function PricingCard({ plan, price, desc, features, cta, onCta, popular, priceLabel, annualSavings }) {
  const [hov, setHov] = useState(false)
  const MAX_FREE_SHOWN = 5
  const visibleFeatures = popular ? features : features.slice(0, MAX_FREE_SHOWN)
  const hiddenCount = popular ? 0 : features.length - MAX_FREE_SHOWN

  const inner = (
    <div
      style={{
        borderRadius: popular ? 22.5 : 24,
        padding: popular ? 32 : 28,
        background: popular
          ? "linear-gradient(135deg, rgba(14,16,32,0.98) 0%, rgba(8,10,24,0.98) 100%)"
          : "linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      {popular && (
        <div
          style={{
            position: "absolute",
            top: -16,
            left: "50%",
            transform: "translateX(-50%)",
            background: "linear-gradient(90deg, #38bdf8, #818cf8)",
            borderRadius: 20,
            padding: "5px 18px",
            fontFamily: "'Barlow',sans-serif",
            fontWeight: 700,
            fontSize: 10,
            color: "#000",
            whiteSpace: "nowrap",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            boxShadow: "0 4px 16px rgba(56,189,248,0.4)",
          }}
        >
          Best Value
        </div>
      )}

      <div
        style={{
          fontFamily: "'Instrument Serif',serif",
          fontStyle: "italic",
          fontSize: popular ? 30 : 22,
          color: popular ? "#fff" : "rgba(255,255,255,0.5)",
          marginBottom: 4,
        }}
      >
        {plan}
      </div>
      <div
        style={{
          fontFamily: "'Barlow',sans-serif",
          fontWeight: 300,
          fontSize: 13,
          color: popular ? "rgba(255,255,255,0.45)" : "rgba(255,255,255,0.28)",
          marginBottom: popular ? 20 : 14,
        }}
      >
        {desc}
      </div>

      <div
        style={{
          marginBottom: popular ? 24 : 18,
          paddingBottom: popular ? 22 : 16,
          borderBottom: "1px solid rgba(255,255,255,0.07)",
        }}
      >
        <span
          style={{
            fontFamily: "'Instrument Serif',serif",
            fontStyle: "italic",
            fontSize: popular ? 56 : 42,
            color: popular ? "#fff" : "rgba(255,255,255,0.45)",
            lineHeight: 1,
          }}
        >
          ${price}
        </span>
        <span
          style={{
            fontFamily: "'Barlow',sans-serif",
            fontWeight: 300,
            fontSize: 13,
            color: "rgba(255,255,255,0.25)",
            marginLeft: 5,
          }}
        >
          /month
        </span>
        {popular && annualSavings && (
          <div
            style={{ marginTop: 5, fontFamily: "'Barlow',sans-serif", fontSize: 11, color: "#38bdf8", fontWeight: 500 }}
          >
            Billed $144/year — save 37%
          </div>
        )}
      </div>

      <div style={{ flex: 1, marginBottom: popular ? 24 : 18 }}>
        {popular && (
          <div
            style={{
              fontFamily: "'Barlow',sans-serif",
              fontSize: 10,
              color: "rgba(255,255,255,0.3)",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              marginBottom: 12,
            }}
          >
            Everything in Free, plus:
          </div>
        )}
        {visibleFeatures.map((f, i) => {
          const text = typeof f === "string" ? f : f.text
          const hl = popular && typeof f === "object" && f.highlight
          return (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: popular ? 12 : 8 }}>
              <div
                style={{
                  width: 17,
                  height: 17,
                  borderRadius: "50%",
                  flexShrink: 0,
                  marginTop: 1,
                  background: hl ? "rgba(56,189,248,0.15)" : "rgba(255,255,255,0.05)",
                  border: hl ? "1px solid rgba(56,189,248,0.4)" : "1px solid rgba(255,255,255,0.08)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <span style={{ fontSize: 9, color: hl ? "#38bdf8" : "rgba(255,255,255,0.3)" }}>✓</span>
              </div>
              <span
                style={{
                  fontFamily: "'Barlow',sans-serif",
                  fontWeight: hl ? 500 : 300,
                  fontSize: popular ? 13 : 12,
                  color: hl ? "#e2f5ff" : popular ? "rgba(255,255,255,0.65)" : "rgba(255,255,255,0.38)",
                  lineHeight: 1.4,
                }}
              >
                {text}
              </span>
            </div>
          )
        })}
        {hiddenCount > 0 && (
          <div
            style={{
              fontFamily: "'Barlow',sans-serif",
              fontSize: 11,
              color: "rgba(255,255,255,0.22)",
              marginTop: 6,
              paddingLeft: 27,
            }}
          >
            & {hiddenCount} more
          </div>
        )}
      </div>

      <button
        onClick={onCta}
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
        style={{
          width: "100%",
          borderRadius: 40,
          padding: popular ? "14px" : "11px",
          fontFamily: "'Barlow',sans-serif",
          fontWeight: popular ? 700 : 400,
          fontSize: popular ? 14 : 13,
          border: "none",
          background: popular
            ? hov
              ? "linear-gradient(90deg, #60cfff, #a0aeff)"
              : "linear-gradient(90deg, #38bdf8, #818cf8)"
            : hov
              ? "rgba(255,255,255,0.07)"
              : "rgba(255,255,255,0.04)",
          color: popular ? "#000" : "rgba(255,255,255,0.35)",
          cursor: "pointer",
          transition: "background 0.2s ease, transform 0.15s ease",
          transform: hov && popular ? "scale(1.01)" : "scale(1)",
          letterSpacing: popular ? "0.01em" : 0,
        }}
      >
        {cta}
      </button>

      {popular && (
        <div style={{ textAlign: "center", marginTop: 10 }}>
          <span
            style={{
              fontFamily: "'Barlow',sans-serif",
              fontSize: 11,
              color: "rgba(255,255,255,0.22)",
              fontWeight: 300,
            }}
          >
            Cancel anytime
          </span>
        </div>
      )}
    </div>
  )

  if (popular) {
    return (
      <div
        className="pricing-card-anim"
        style={{
          flex: "1 1 280px",
          maxWidth: 380,
          padding: 1.5,
          borderRadius: 25.5,
          background:
            "linear-gradient(135deg, rgba(56,189,248,0.55) 0%, rgba(129,140,248,0.55) 50%, rgba(167,139,250,0.55) 100%)",
          boxShadow: "0 0 80px rgba(56,189,248,0.1), 0 28px 72px rgba(0,0,0,0.5)",
          position: "relative",
        }}
      >
        {inner}
      </div>
    )
  }

  return (
    <div
      className="pricing-card-anim"
      style={{
        flex: "1 1 240px",
        maxWidth: 340,
        borderRadius: 24,
        opacity: 0.68,
        border: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      {inner}
    </div>
  )
}
