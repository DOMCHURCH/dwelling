import { NavLink, useNavigate } from "react-router-dom"
import { getCurrentUser, signOut } from "../lib/localAuth"

const navItems = [
  { path: "/dashboard", label: "Overview", icon: "◉" },
  { path: "/dashboard/saved", label: "Saved Reports", icon: "◇" },
  { path: "/dashboard/team", label: "Team", icon: "◎" },
  { path: "/dashboard/api-keys", label: "API Keys", icon: "◆" },
  { path: "/dashboard/usage", label: "Usage", icon: "▣" },
  { path: "/dashboard/billing", label: "Billing", icon: "◈" },
  { path: "/dashboard/settings", label: "Settings", icon: "▧" },
]

export default function BusinessSidebar() {
  const navigate = useNavigate()
  const user = getCurrentUser()

  const handleSignOut = () => {
    signOut()
    navigate("/")
  }

  return (
    <aside
      style={{
        width: 240,
        background: "#111",
        borderRight: "1px solid rgba(255,255,255,0.08)",
        display: "flex",
        flexDirection: "column",
        padding: "24px 16px",
        flexShrink: 0,
      }}
    >
      <div style={{ marginBottom: 32, padding: "0 12px" }}>
        <NavLink to="/" style={{ textDecoration: "none" }}>
          <div style={{ fontFamily: "'Instrument Serif',serif", fontStyle: "italic", fontSize: 24, color: "#fff" }}>
            DW<span style={{ opacity: 0.4 }}>.</span>ELLING
          </div>
          <div
            style={{
              fontSize: 10,
              color: "rgba(255,255,255,0.3)",
              marginTop: 2,
              fontFamily: "'Barlow',sans-serif",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
          >
            Business
          </div>
        </NavLink>
      </div>

      <nav style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === "/dashboard"}
            style={({ isActive }) => ({
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 12px",
              borderRadius: 8,
              color: isActive ? "#fff" : "rgba(255,255,255,0.5)",
              background: isActive ? "rgba(255,255,255,0.08)" : "transparent",
              textDecoration: "none",
              fontSize: 13,
              fontFamily: "'Barlow',sans-serif",
              fontWeight: isActive ? 500 : 300,
              transition: "all 0.15s",
            })}
          >
            <span style={{ fontSize: 14, opacity: 0.7 }}>{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 20, marginTop: 8 }}>
        <div style={{ padding: "0 12px", marginBottom: 12 }}>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", marginBottom: 4 }}>
            {user?.email || "user@example.com"}
          </div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.25)" }}>Business Plan</div>
        </div>
        <button
          onClick={handleSignOut}
          style={{
            width: "100%",
            padding: "10px",
            borderRadius: 8,
            border: "none",
            background: "rgba(255,255,255,0.04)",
            color: "rgba(255,255,255,0.5)",
            fontSize: 12,
            cursor: "pointer",
            fontFamily: "'Barlow',sans-serif",
          }}
        >
          Sign Out
        </button>
      </div>
    </aside>
  )
}
