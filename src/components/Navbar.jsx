import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { LOGO, scrollTo } from "../lib/appHelpers"

export default function Navbar({
  user,
  userRecord,
  analysesLeft,
  isInTrial,
  trialDaysLeft,
  onSignOut,
  onHome,
  onOpenSaved,
  savedCount,
  isPro,
  onOpenDashboard,
  onOpenAdmin,
  previewPlan,
  onSetPlan,
  onTogglePreview,
  onDeleteAccount,
  onOpenAuth,
  isBusiness,
  onOpenPayments,
  isTeamOwner,
  quotaData,
}) {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const h = () => {
      const s = window.scrollY > 50
      setScrolled((prev) => (prev === s ? prev : s))
    }
    window.addEventListener("scroll", h, { passive: true })
    return () => window.removeEventListener("scroll", h)
  }, [])
  const low = typeof analysesLeft === "number" && analysesLeft <= 3
  const canAccessDashboard = isBusiness
  return (
    <nav
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        padding: "14px 24px",
        background: scrolled ? "rgba(0,0,0,0.85)" : "transparent",
        backdropFilter: scrolled ? "blur(16px)" : "none",
        WebkitBackdropFilter: scrolled ? "blur(16px)" : "none",
        borderBottom: scrolled ? "1px solid rgba(255,255,255,0.06)" : "1px solid transparent",
        transition: "background 0.3s, border-color 0.3s",
      }}
    >
      <div
        style={{
          maxWidth: 1280,
          margin: "0 auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
        }}
      >
        <button
          onClick={onHome}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <img src={LOGO} alt="Dwelling" style={{ width: 36, height: 36, borderRadius: 8 }} />
          <span style={{ fontFamily: "'Instrument Serif',serif", fontStyle: "italic", fontSize: 20, color: "#fff" }}>
            Dwelling
          </span>
        </button>
        <div
          className="liquid-glass nav-links-desktop"
          style={{ borderRadius: 40, padding: "6px 8px", display: "flex", alignItems: "center", gap: 4 }}
        >
          {/* Home */}
          <button
            onClick={onHome}
            style={{
              background: "none", border: "none", cursor: "pointer",
              fontFamily: "'Barlow',sans-serif", fontWeight: 400, fontSize: 13,
              color: "rgba(255,255,255,0.8)", padding: "6px 14px", borderRadius: 40,
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.07)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
          >
            Home
          </button>

          {/* Saved Analysis */}
          <button
            onClick={onOpenSaved}
            style={{
              background: "none", border: "none", cursor: "pointer",
              fontFamily: "'Barlow',sans-serif", fontWeight: 400, fontSize: 13,
              color: "rgba(255,255,255,0.8)", padding: "6px 14px", borderRadius: 40,
              transition: "background 0.15s",
              display: "flex", alignItems: "center", gap: 6,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.07)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
          >
            Saved Analysis
            {savedCount > 0 && (
              <span style={{
                background: "rgba(56,189,248,0.2)", border: "1px solid rgba(56,189,248,0.3)",
                borderRadius: 20, padding: "1px 7px", fontSize: 11, color: "#38bdf8",
              }}>{savedCount}</span>
            )}
          </button>

          {/* Dashboard — business only */}
          <button
            onClick={canAccessDashboard ? onOpenDashboard : undefined}
            disabled={!canAccessDashboard}
            title={canAccessDashboard ? "Business Dashboard" : "Dashboard — Business only"}
            style={{
              background: "none", border: "none",
              cursor: canAccessDashboard ? "pointer" : "default",
              fontFamily: "'Barlow',sans-serif", fontWeight: 400, fontSize: 13,
              color: canAccessDashboard ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.25)",
              padding: "6px 14px", borderRadius: 40,
              transition: "background 0.15s",
              userSelect: "none",
            }}
            onMouseEnter={(e) => {
              if (canAccessDashboard) e.currentTarget.style.background = "rgba(255,255,255,0.07)"
            }}
            onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
          >
            Dashboard{!canAccessDashboard && <span style={{ marginLeft: 4, fontSize: 10 }}>🔒</span>}
          </button>

          {/* Account — all logged-in users */}
          {user && (
            <button
              onClick={onOpenPayments}
              style={{
                background: "none", border: "none", cursor: "pointer",
                fontFamily: "'Barlow',sans-serif", fontWeight: 400, fontSize: 13,
                color: "rgba(255,255,255,0.8)", padding: "6px 14px", borderRadius: 40,
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.07)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
            >
              Account
            </button>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {user ? (
            <>
              <span
                className="liquid-glass"
                style={{
                  borderRadius: 40,
                  padding: "5px 12px",
                  fontSize: 12,
                  fontFamily: "'Barlow',sans-serif",
                  color: user?.is_admin
                    ? "#a78bfa"
                    : userRecord?.is_business
                      ? "#f59e0b"
                      : userRecord?.is_pro
                        ? "#38bdf8"
                        : low
                          ? "#f87171"
                          : "rgba(255,255,255,0.5)",
                  cursor: user?.is_admin ? "pointer" : "default",
                }}
                onClick={user?.is_admin ? onOpenAdmin : undefined}
                title={user?.is_admin ? "Open Admin Panel" : undefined}
              >
                {user?.is_admin
                  ? "⚡ Admin"
                  : userRecord?.is_business
                    ? quotaData?.limits?.monthly != null
                      ? `★ ${Math.max(0, quotaData.limits.monthly - (quotaData.monthly ?? 0))} / ${quotaData.limits.monthly} left`
                      : "★ Business"
                    : userRecord?.is_pro
                      ? quotaData?.limits?.monthly != null
                        ? `★ ${Math.max(0, quotaData.limits.monthly - (quotaData.monthly ?? 0))} / ${quotaData.limits.monthly} left`
                        : "★ Pro"
                      : `${analysesLeft} / 3 left`}
              </span>
              {user?.is_admin && (
                <div
                  className="liquid-glass"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    borderRadius: 40,
                    padding: "3px",
                    gap: 2,
                  }}
                >
                  {[["free", "Free"], ["pro", "Pro"], ["business", "Business"]].map(([val, label]) => (
                    <button
                      key={val}
                      onClick={() => onSetPlan(val)}
                      style={{
                        borderRadius: 40,
                        padding: "4px 12px",
                        fontSize: 11,
                        fontFamily: "'Barlow',sans-serif",
                        fontWeight: previewPlan === val ? 600 : 300,
                        border: "none",
                        cursor: "pointer",
                        background: previewPlan === val ? "#fff" : "transparent",
                        color: previewPlan === val ? "#000" : "rgba(255,255,255,0.45)",
                        transition: "all 0.15s",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
              <button
                onClick={onSignOut}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontFamily: "'Barlow',sans-serif",
                  fontWeight: 300,
                  fontSize: 12,
                  color: "rgba(255,255,255,0.35)",
                  padding: "5px 8px",
                  transition: "color 0.2s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.7)")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.35)")}
              >
                Sign out
              </button>
              <button
                onClick={onDeleteAccount}
                title="Delete account"
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontFamily: "'Barlow',sans-serif",
                  fontWeight: 300,
                  fontSize: 11,
                  color: "rgba(248,113,113,0.35)",
                  padding: "5px 8px",
                  transition: "color 0.2s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(248,113,113,0.8)")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(248,113,113,0.35)")}
              >
                Delete account
              </button>
            </>
          ) : (
            <button
              onClick={onOpenAuth}
              style={{
                background: "#fff",
                color: "#000",
                border: "none",
                cursor: "pointer",
                fontFamily: "'Barlow',sans-serif",
                fontWeight: 600,
                fontSize: 13,
                borderRadius: 40,
                padding: "8px 18px",
                display: "flex",
                alignItems: "center",
                gap: 6,
                transition: "transform 0.15s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
            >
              Get Started ↗
            </button>
          )}
        </div>
      </div>
    </nav>
  )
}
