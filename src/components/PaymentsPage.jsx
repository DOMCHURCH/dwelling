import { useState, useEffect } from "react"
import { getAuthToken, getCachedCerebrasKey, saveCerebrasKey } from "../lib/localAuth"

const MONO = "'JetBrains Mono','Fira Mono','Courier New',monospace"
const SANS = "'Barlow',sans-serif"
const AMBER = "#f59e0b"
const BLUE = "#38bdf8"
const BG = "#07090f"
const BORDER = "rgba(255,255,255,0.07)"

function Row({ label, value, accent }) {
  return (
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 0", borderBottom:`1px solid ${BORDER}` }}>
      <span style={{ fontFamily:MONO, fontSize:12, color:"rgba(255,255,255,0.45)" }}>{label}</span>
      <span style={{ fontFamily:MONO, fontSize:12, fontWeight:600, color:accent||"#e5e7eb" }}>{value}</span>
    </div>
  )
}

function Panel({ title, badge, children, locked, style={} }) {
  return (
    <div style={{ background:"rgba(255,255,255,0.025)", border:`1px solid ${BORDER}`, borderRadius:10, padding:"20px 24px", position:"relative", ...style }}>
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:18, paddingBottom:12, borderBottom:`1px solid ${BORDER}` }}>
        <span style={{ fontFamily:MONO, fontSize:11, fontWeight:700, letterSpacing:"0.1em", color:"rgba(255,255,255,0.5)" }}>{title}</span>
        {badge && (
          <span style={{ fontFamily:MONO, fontSize:10, fontWeight:600, letterSpacing:"0.08em", color:badge.color||AMBER, background:`${badge.color||AMBER}18`, border:`1px solid ${badge.color||AMBER}33`, borderRadius:4, padding:"1px 6px" }}>{badge.label}</span>
        )}
        {locked && (
          <span style={{ marginLeft:"auto", fontFamily:MONO, fontSize:10, color:"rgba(255,255,255,0.25)" }}>🔒 Paid plans only</span>
        )}
      </div>
      {locked ? (
        <div style={{ textAlign:"center", padding:"24px 0" }}>
          <div style={{ fontFamily:MONO, fontSize:12, color:"rgba(255,255,255,0.3)", marginBottom:16 }}>Upgrade to Pro or Business to manage your subscription here.</div>
        </div>
      ) : children}
    </div>
  )
}

function Btn({ children, onClick, disabled, danger, variant="primary", style={} }) {
  const bg = danger ? "rgba(248,113,113,0.1)" : variant==="primary" ? AMBER : "rgba(255,255,255,0.06)"
  const color = danger ? "#f87171" : variant==="primary" ? "#000" : "rgba(255,255,255,0.7)"
  const border = danger ? "1px solid rgba(248,113,113,0.25)" : variant==="secondary" ? `1px solid ${BORDER}` : "none"
  return (
    <button onClick={onClick} disabled={disabled} style={{ background:bg, color, border, borderRadius:6, fontFamily:MONO, fontWeight:600, fontSize:12, padding:"9px 20px", cursor:disabled?"not-allowed":"pointer", opacity:disabled?0.5:1, transition:"opacity 0.15s", ...style }}>
      {children}
    </button>
  )
}

function FieldInput({ label, value, onChange, type="text", placeholder, disabled }) {
  return (
    <div style={{ marginBottom:12 }}>
      {label && <div style={{ fontFamily:MONO, fontSize:10, color:"rgba(255,255,255,0.4)", marginBottom:5, textTransform:"uppercase", letterSpacing:"0.08em" }}>{label}</div>}
      <input type={type} value={value} onChange={onChange} placeholder={placeholder} disabled={disabled}
        style={{ width:"100%", background:"rgba(255,255,255,0.04)", border:`1px solid ${BORDER}`, borderRadius:6, color:"#e5e7eb", fontFamily:MONO, fontSize:12, padding:"9px 12px", outline:"none", boxSizing:"border-box", opacity:disabled?0.5:1 }}
      />
    </div>
  )
}

function Flash({ msg }) {
  if (!msg) return null
  return (
    <div style={{ padding:"10px 14px", borderRadius:8, marginBottom:16, fontFamily:MONO, fontSize:12, background:msg.err?"rgba(239,68,68,0.12)":"rgba(34,197,94,0.12)", border:`1px solid ${msg.err?"rgba(239,68,68,0.25)":"rgba(34,197,94,0.25)"}`, color:msg.err?"#f87171":"#4ade80" }}>
      {msg.text}
    </div>
  )
}

// ── Change Password ───────────────────────────────────────────────────────────
function ChangePassword() {
  const [cur, setCur] = useState("")
  const [next, setNext] = useState("")
  const [confirm, setConfirm] = useState("")
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)

  const flash = (text, err=false) => { setMsg({text,err}); setTimeout(()=>setMsg(null),4000) }

  const handleSave = async () => {
    if (next !== confirm) { flash("New passwords don't match", true); return }
    if (next.length < 8) { flash("Password must be at least 8 characters", true); return }
    setSaving(true)
    try {
      const token = await getAuthToken()
      const res = await fetch("/api/auth", {
        method:"POST",
        headers:{"Content-Type":"application/json", Authorization:`Bearer ${token}`},
        body:JSON.stringify({ action:"change-password", currentPassword:cur, newPassword:next }),
      })
      const data = await res.json()
      if (!res.ok) { flash(data.error||"Failed to change password", true); return }
      flash("✓ Password updated")
      setCur(""); setNext(""); setConfirm("")
    } catch { flash("Network error", true) }
    setSaving(false)
  }

  return (
    <Panel title="CHANGE PASSWORD">
      <Flash msg={msg} />
      <FieldInput label="Current password" type="password" value={cur} onChange={e=>setCur(e.target.value)} placeholder="Current password" />
      <FieldInput label="New password" type="password" value={next} onChange={e=>setNext(e.target.value)} placeholder="Min. 8 characters" />
      <FieldInput label="Confirm new password" type="password" value={confirm} onChange={e=>setConfirm(e.target.value)} placeholder="Repeat new password" />
      <Btn onClick={handleSave} disabled={saving||!cur||!next||!confirm}>{saving?"Saving…":"Update Password"}</Btn>
    </Panel>
  )
}

// ── Subscription Panel ────────────────────────────────────────────────────────
function SubscriptionPanel({ user, userRecord, isTeamOwner }) {
  const [sub, setSub] = useState(null)
  const [loading, setLoading] = useState(true)
  const [portalLoading, setPortalLoading] = useState(false)
  const [cancelLoading, setCancelLoading] = useState(false)
  const [msg, setMsg] = useState(null)
  const isPaid = userRecord?.is_pro || userRecord?.is_business
  const isBusiness = userRecord?.is_business

  const flash = (text, err=false) => { setMsg({text,err}); setTimeout(()=>setMsg(null),5000) }

  useEffect(() => {
    if (!isPaid) { setLoading(false); return }
    const load = async () => {
      try {
        const token = await getAuthToken()
        const res = await fetch("/api/auth", {
          method:"POST",
          headers:{"Content-Type":"application/json", Authorization:`Bearer ${token}`},
          body:JSON.stringify({ action:"get-subscription" }),
        })
        if (res.ok) { const d = await res.json(); setSub(d.subscription) }
      } catch {}
      setLoading(false)
    }
    load()
  }, [isPaid])

  const openPortal = async () => {
    setPortalLoading(true)
    try {
      const token = await getAuthToken()
      const res = await fetch("/api/auth", {
        method:"POST",
        headers:{"Content-Type":"application/json", Authorization:`Bearer ${token}`},
        body:JSON.stringify({ action:"portal" }),
      })
      const data = await res.json()
      if (data.url) { window.location.href = data.url; return }
      flash(data.error||"Could not open billing portal", true)
    } catch { flash("Network error", true) }
    setPortalLoading(false)
  }

  const handleCancel = async () => {
    if (!confirm("Cancel your subscription? It will stay active until the end of the billing period.")) return
    setCancelLoading(true)
    try {
      const token = await getAuthToken()
      const res = await fetch("/api/auth", {
        method:"POST",
        headers:{"Content-Type":"application/json", Authorization:`Bearer ${token}`},
        body:JSON.stringify({ action:"cancel-subscription" }),
      })
      const data = await res.json()
      if (!res.ok) { flash(data.error||"Failed to cancel", true); return }
      flash("✓ Subscription will cancel at end of billing period")
      setSub(s => s ? {...s, cancel_at_period_end:true} : s)
    } catch { flash("Network error", true) }
    setCancelLoading(false)
  }

  const planLabel = isBusiness ? "Business" : "Pro"
  const planColor = isBusiness ? AMBER : BLUE
  const intervalLabel = sub?.interval === "year" ? "yearly" : "monthly"
  const nextDate = sub?.current_period_end
    ? new Date(sub.current_period_end * 1000).toLocaleDateString("en-CA", { year:"numeric", month:"long", day:"numeric" })
    : "—"

  return (
    <Panel title="SUBSCRIPTION" badge={isPaid ? {label:planLabel.toUpperCase(), color:planColor} : null} locked={!isPaid}>
      {isPaid && (
        <>
          <Flash msg={msg} />
          {loading ? (
            <div style={{ fontFamily:MONO, fontSize:12, color:"rgba(255,255,255,0.3)", padding:"8px 0" }}>Loading…</div>
          ) : (
            <>
              <Row label="Plan" value={planLabel} accent={planColor} />
              {sub ? (
                <>
                  <Row label="Status" value={sub.cancel_at_period_end ? "Cancelling" : sub.status} accent={sub.cancel_at_period_end ? "#f87171" : "#4ade80"} />
                  <Row label="Billing" value={intervalLabel} />
                  <Row label="Amount" value={`$${sub.amount?.toFixed(2)} ${sub.currency?.toUpperCase()}/${sub.interval==="year"?"yr":"mo"}`} />
                  <Row label={sub.cancel_at_period_end ? "Access ends" : "Next invoice"} value={nextDate} accent={sub.cancel_at_period_end?"#f87171":undefined} />
                </>
              ) : (
                <Row label="Details" value="Managed via Stripe" accent="rgba(255,255,255,0.3)" />
              )}
              <div style={{ display:"flex", gap:10, marginTop:16, flexWrap:"wrap" }}>
                <Btn variant="secondary" onClick={openPortal} disabled={portalLoading}>
                  {portalLoading ? "Opening…" : "Manage Billing & Invoices →"}
                </Btn>
                {!sub?.cancel_at_period_end && (
                  <Btn danger onClick={handleCancel} disabled={cancelLoading}>
                    {cancelLoading ? "Cancelling…" : "Cancel Subscription"}
                  </Btn>
                )}
              </div>
              <div style={{ fontFamily:MONO, fontSize:10, color:"rgba(255,255,255,0.25)", marginTop:10 }}>
                The billing portal lets you view all invoices, update your payment method, and manage your subscription.
              </div>
            </>
          )}
        </>
      )}
    </Panel>
  )
}

// ── Team Panel (Business owners only) ────────────────────────────────────────
function TeamPanel({ user }) {
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteNickname, setInviteNickname] = useState("")
  const [inviting, setInviting] = useState(false)
  const [inviteStatus, setInviteStatus] = useState(null)

  const loadTeam = async () => {
    try {
      const token = await getAuthToken()
      const res = await fetch("/api/auth", {
        method:"POST",
        headers:{"Content-Type":"application/json", Authorization:`Bearer ${token}`},
        body:JSON.stringify({ action:"get-team" }),
      })
      if (res.ok) { const d = await res.json(); setMembers(d.members||[]) }
    } catch {}
    setLoading(false)
  }

  useEffect(() => { loadTeam() }, [])

  const handleInvite = async () => {
    if (!inviteEmail.trim()||!inviteEmail.includes("@")) { setInviteStatus({ok:false,msg:"Enter a valid email"}); return }
    setInviting(true); setInviteStatus(null)
    try {
      const token = await getAuthToken()
      const res = await fetch("/api/auth", {
        method:"POST",
        headers:{"Content-Type":"application/json", Authorization:`Bearer ${token}`},
        body:JSON.stringify({ action:"invite-member", email:inviteEmail.trim(), nickname:inviteNickname.trim()||undefined }),
      })
      const data = await res.json()
      if (!res.ok) { setInviteStatus({ok:false,msg:data.error||"Failed"}); }
      else { setInviteStatus({ok:true,msg:`✓ Invite sent to ${inviteEmail.trim()}`}); setInviteEmail(""); setInviteNickname(""); loadTeam() }
    } catch { setInviteStatus({ok:false,msg:"Network error"}) }
    setInviting(false)
  }

  const seatsUsed = members.length
  const seatsTotal = 10
  const canInvite = seatsUsed < seatsTotal

  return (
    <Panel title="TEAM MEMBERS" badge={{label:`${seatsUsed}/${seatsTotal} SEATS`, color:seatsUsed>=seatsTotal?"#f87171":AMBER}}>
      {loading ? (
        <div style={{ fontFamily:MONO, fontSize:12, color:"rgba(255,255,255,0.3)", padding:"8px 0" }}>Loading…</div>
      ) : (
        <div style={{ marginBottom:16 }}>
          {members.length===0 ? (
            <div style={{ fontFamily:MONO, fontSize:12, color:"rgba(255,255,255,0.3)", padding:"8px 0" }}>No team members yet.</div>
          ) : members.map((m,i)=>(
            <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"9px 0", borderBottom:i<members.length-1?`1px solid ${BORDER}`:"none" }}>
              <span style={{ fontFamily:MONO, fontSize:12, color:"#e5e7eb" }}>{m.email}</span>
              <span style={{ fontFamily:MONO, fontSize:10, fontWeight:600, color:m.role==="owner"?AMBER:"rgba(255,255,255,0.4)", background:m.role==="owner"?`${AMBER}18`:"rgba(255,255,255,0.05)", border:`1px solid ${m.role==="owner"?`${AMBER}33`:BORDER}`, borderRadius:4, padding:"2px 7px" }}>
                {m.role.toUpperCase()}
              </span>
            </div>
          ))}
        </div>
      )}
      {canInvite && (
        <>
          <div style={{ fontFamily:MONO, fontSize:10, color:"rgba(255,255,255,0.4)", marginBottom:10, textTransform:"uppercase", letterSpacing:"0.08em" }}>Invite Member</div>
          <div style={{ display:"flex", gap:8, marginBottom:8, flexWrap:"wrap" }}>
            <input type="email" value={inviteEmail} onChange={e=>setInviteEmail(e.target.value)} placeholder="teammate@company.com"
              style={{ flex:2, minWidth:180, background:"rgba(255,255,255,0.04)", border:`1px solid ${BORDER}`, borderRadius:6, color:"#e5e7eb", fontFamily:MONO, fontSize:12, padding:"9px 12px", outline:"none" }} />
            <input type="text" value={inviteNickname} onChange={e=>setInviteNickname(e.target.value)} placeholder="Nickname (optional)"
              style={{ flex:1, minWidth:120, background:"rgba(255,255,255,0.04)", border:`1px solid ${BORDER}`, borderRadius:6, color:"#e5e7eb", fontFamily:MONO, fontSize:12, padding:"9px 12px", outline:"none" }} />
            <Btn onClick={handleInvite} disabled={inviting}>{inviting?"Sending…":"Send Invite"}</Btn>
          </div>
          {inviteStatus && <div style={{ fontFamily:MONO, fontSize:11, color:inviteStatus.ok?"#4ade80":"#f87171" }}>{inviteStatus.msg}</div>}
          <div style={{ fontFamily:MONO, fontSize:10, color:"rgba(255,255,255,0.25)", marginTop:8 }}>
            Invitees receive an email to join your workspace. They get full Business access with no separate subscription.
          </div>
        </>
      )}
      {!canInvite && (
        <div style={{ fontFamily:MONO, fontSize:11, color:"#f87171" }}>Team is full (10/10 seats used).</div>
      )}
    </Panel>
  )
}

// ── API Key Panel ─────────────────────────────────────────────────────────────
function ApiKeyPanel() {
  const [dbKey, setDbKey] = useState(null)
  const [keyInput, setKeyInput] = useState("")
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [msg, setMsg] = useState(null)

  const flash = (text, err=false) => { setMsg({text,err}); setTimeout(()=>setMsg(null),4000) }

  useEffect(() => { loadDbKey() }, [])

  const loadDbKey = async () => {
    try {
      const token = await getAuthToken()
      const res = await fetch("/api/auth", {
        method:"POST",
        headers:{"Content-Type":"application/json", Authorization:`Bearer ${token}`},
        body:JSON.stringify({ action:"get-key" }),
      })
      if (res.ok) setDbKey(await res.json())
    } catch {}
  }

  const handleSave = async () => {
    if (!keyInput.trim()) return
    setSaving(true)
    try {
      await saveCerebrasKey(keyInput.trim())
      flash("✓ API key saved")
      setKeyInput("")
      await loadDbKey()
    } catch (e) { flash(e.message, true) }
    setSaving(false)
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await saveCerebrasKey("")
      flash("✓ API key removed")
      setDbKey({ key: null, hasKey: false })
    } catch (e) { flash(e.message, true) }
    setDeleting(false)
  }

  const sessionKey = getCachedCerebrasKey()
  const hasKey = dbKey?.hasKey || !!sessionKey
  const displayKey = dbKey?.key || (sessionKey ? `${sessionKey.slice(0,8)}•••••••••••••${sessionKey.slice(-4)}` : null)

  return (
    <Panel title="CEREBRAS API KEY">
      <Flash msg={msg} />
      <div style={{ fontFamily:MONO, fontSize:11, color:"rgba(255,255,255,0.35)", marginBottom:16 }}>
        Required for AI analyses. Get yours at cerebras.ai → Settings → API Keys.
      </div>
      {hasKey && displayKey && (
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:12, background:"rgba(74,222,128,0.06)", border:"1px solid rgba(74,222,128,0.15)", borderRadius:8, padding:"10px 14px", marginBottom:14 }}>
          <div>
            <div style={{ fontFamily:MONO, fontSize:10, color:"rgba(255,255,255,0.35)", marginBottom:4, textTransform:"uppercase", letterSpacing:"0.08em" }}>Saved Key</div>
            <div style={{ fontFamily:MONO, fontSize:13, color:"#4ade80" }}>{displayKey}</div>
          </div>
          <Btn onClick={handleDelete} disabled={deleting} danger>{deleting?"Removing…":"Remove"}</Btn>
        </div>
      )}
      <div style={{ display:"flex", gap:8 }}>
        <input
          type="password"
          value={keyInput}
          onChange={e=>setKeyInput(e.target.value)}
          placeholder={hasKey?"Paste new key to replace…":"csk-…"}
          onKeyDown={e=>e.key==="Enter"&&handleSave()}
          style={{ flex:1, background:"rgba(255,255,255,0.04)", border:`1px solid ${BORDER}`, borderRadius:6, color:"#e5e7eb", fontFamily:MONO, fontSize:12, padding:"9px 12px", outline:"none" }}
        />
        <Btn onClick={handleSave} disabled={saving||!keyInput.trim()}>{saving?"Saving…":"Save"}</Btn>
      </div>
    </Panel>
  )
}

// ── Main Account Page ─────────────────────────────────────────────────────────
export default function PaymentsPage({ onClose, user, userRecord, isTeamOwner }) {
  const isBusiness = userRecord?.is_business
  const isPaid = userRecord?.is_pro || userRecord?.is_business

  return (
    <div style={{ position:"fixed", inset:0, zIndex:100, background:BG, overflowY:"auto", display:"flex", flexDirection:"column" }}>
      {/* Top bar */}
      <div style={{ position:"sticky", top:0, zIndex:10, background:BG, borderBottom:`1px solid ${BORDER}`, padding:"14px 32px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div style={{ display:"flex", alignItems:"center", gap:16 }}>
          <button onClick={onClose} style={{ background:"none", border:"none", color:"rgba(255,255,255,0.4)", cursor:"pointer", fontFamily:MONO, fontSize:12, display:"flex", alignItems:"center", gap:6 }}>← Back</button>
          <div style={{ width:1, height:16, background:BORDER }} />
          <span style={{ fontFamily:MONO, fontSize:11, fontWeight:700, letterSpacing:"0.12em", color:"rgba(255,255,255,0.35)" }}>ACCOUNT</span>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span style={{ fontFamily:MONO, fontSize:11, color:"rgba(255,255,255,0.3)" }}>{user?.email}</span>
          {isPaid && (
            <span style={{ fontFamily:MONO, fontSize:10, fontWeight:700, color:isBusiness?AMBER:BLUE, background:isBusiness?`${AMBER}18`:"rgba(56,189,248,0.15)", border:`1px solid ${isBusiness?`${AMBER}33`:"rgba(56,189,248,0.3)"}`, borderRadius:4, padding:"2px 7px" }}>
              {isBusiness?"BUSINESS":"PRO"}
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex:1, maxWidth:720, width:"100%", margin:"0 auto", padding:"40px 32px", display:"flex", flexDirection:"column", gap:20 }}>
        {/* Profile header */}
        <div style={{ display:"flex", alignItems:"center", gap:16, background:"rgba(255,255,255,0.025)", border:`1px solid ${BORDER}`, borderRadius:10, padding:"20px 24px", marginBottom:8 }}>
          <div style={{ width:52, height:52, borderRadius:"50%", flexShrink:0, background:"linear-gradient(135deg,#7c3aed 0%,#4f46e5 100%)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, fontWeight:700, color:"#fff", fontFamily:MONO, userSelect:"none" }}>
            {(user?.email||"??").slice(0,2).toUpperCase()}
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontFamily:MONO, fontSize:14, fontWeight:600, color:"#fff", marginBottom:6, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{user?.email}</div>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              {(() => {
                const isAdmin = !!user?.is_admin
                const plan = isAdmin ? "Admin" : isBusiness ? "Business" : isPaid ? "Pro" : "Free"
                const color = isAdmin ? "#a78bfa" : isBusiness ? AMBER : isPaid ? BLUE : "rgba(255,255,255,0.35)"
                return <span style={{ fontFamily:MONO, fontSize:10, fontWeight:700, letterSpacing:"0.1em", color, background:`${color}22`, border:`1px solid ${color}44`, borderRadius:4, padding:"2px 8px" }}>{plan.toUpperCase()}</span>
              })()}
            </div>
          </div>
        </div>

        <ApiKeyPanel />
        <ChangePassword />
        <SubscriptionPanel user={user} userRecord={userRecord} isTeamOwner={isTeamOwner} />
        {isBusiness && isTeamOwner && <TeamPanel user={user} />}
      </div>
    </div>
  )
}
