import { useState, useEffect } from "react"
import { Routes, Route, NavLink, useNavigate, useLocation } from "react-router-dom"
import { getAuthToken, getCurrentUser, getUsage } from "../lib/localAuth"
import BusinessSidebar from "./BusinessSidebar"
import BusinessOverview from "./BusinessOverview"
import BusinessSaved from "./BusinessSaved"
import BusinessTeam from "./BusinessTeam"
import BusinessApiKeys from "./BusinessApiKeys"
import BusinessUsage from "./BusinessUsage"
import BusinessBilling from "./BusinessBilling"
import BusinessSettings from "./BusinessSettings"

export default function BusinessLayout() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const u = getCurrentUser()
      if (!u) {
        navigate("/?auth=required")
        return
      }
      const token = await getAuthToken()
      if (!token) {
        navigate("/?auth=required")
        return
      }
      setUser(u)
    } catch (e) {
      navigate("/?auth=required")
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          background: "#000",
          color: "#fff",
        }}
      >
        <div style={{ fontFamily: "'Barlow',sans-serif", fontSize: 14, color: "rgba(255,255,255,0.5)" }}>
          Loading...
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#0a0a0a" }}>
      <BusinessSidebar />
      <main style={{ flex: 1, overflow: "auto", maxHeight: "100vh" }}>
        <Routes>
          <Route path="/" element={<BusinessOverview user={user} />} />
          <Route path="/saved" element={<BusinessSaved />} />
          <Route path="/team" element={<BusinessTeam />} />
          <Route path="/api-keys" element={<BusinessApiKeys />} />
          <Route path="/usage" element={<BusinessUsage />} />
          <Route path="/billing" element={<BusinessBilling />} />
          <Route path="/settings" element={<BusinessSettings />} />
        </Routes>
      </main>
    </div>
  )
}
