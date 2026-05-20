import { useState, useEffect } from "react"
import { getAuthToken, getUserApiKey, setUserApiKey } from "../lib/localAuth"

const MONO = "'JetBrains Mono','Fira Mono','Courier New',monospace"
const SANS = "'Barlow',sans-serif"
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

function Panel({ title, badge, children, style={} }) {
  return (
    <div style={{ background:"rgba(255,255,255,0.025)", border:`1px solid ${BORDER}`, borderRadius:10, padding:"20px 24px", position:"relative", ...style }}>
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:18, paddingBottom:12, borderBottom:`1px solid ${BORDER}` }}>
        <span style={{ fontFamily:MONO, fontSize:11, fontWeight:700, letterSpacing:"0.1em", color:"rgba(255,255,255,0.5)" }}>{title}</span>
        {badge && (
          <span style={{ fontFamily:MONO, fontSize:10, fontWeight:600, letterSpacing:"0.08em", color:badge.color||BLUE, background:`${badge.color||BLUE}18`, border:`1px solid ${badge.color||BLUE}33`, borderRadius:4, padding:"1px 6px" }}>{badge.label}</span>
        )}
      </div>
      {children}
    </div>
  )
}

function Btn({ children, onClick, disabled, danger, variant="primary", style={} }) {
  const bg = danger ? "rgba(248,113,113,0.1)" : variant==="primary" ? BLUE : "rgba(255,255,255,0.06)"
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

const PROVIDERS = [
  { label: 'Cerebras', note: 'Free · 1M tok/min', url: 'https://cloud.cerebras.ai', prefix: 'csk-', color: '#4ade80' },
  { label: 'Groq', note: 'Free tier', url: 'https://console.groq.com/keys', prefix: 'gsk_', color: '#4ade80' },
  { label: 'OpenRouter', note: 'Pay-per-use', url: 'https://openrouter.ai/keys', prefix: 'sk-or-', color: 'rgba(255,255,255,0.4)' },
  { label: 'OpenAI', note: 'Pay-per-use', url: 'https://platform.openai.com/api-keys', prefix: 'sk-', color: 'rgba(255,255,255,0.4)' },
  { label: 'Anthropic', note: 'Pay-per-use', url: 'https://console.anthropic.com/keys', prefix: 'sk-ant-', color: 'rgba(255,255,255,0.4)' },
]

// ── API Key Panel ─────────────────────────────────────────────────────────────
function ApiKeyPanel() {
  const [keyInput, setKeyInput] = useState("")
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)

  const flash = (text, err=false) => { setMsg({text,err}); setTimeout(()=>setMsg(null),4000) }

  const sessionKey = getUserApiKey()

  const handleSave = async () => {
    const trimmed = keyInput.trim()
    if (!trimmed) return
    setSaving(true)
    try {
      setUserApiKey(trimmed)
      flash("✓ API key saved")
      setKeyInput("")
    } catch (e) { flash(e.message, true) }
    setSaving(false)
  }

  const handleDelete = () => {
    setUserApiKey("")
    flash("✓ API key removed")
  }

  const hasKey = !!sessionKey
  const displayKey = sessionKey ? `${sessionKey.slice(0,10)}•••••${sessionKey.slice(-4)}` : null

  const detected = PROVIDERS.find(p => keyInput.startsWith(p.prefix))

  return (
    <Panel title="AI PROVIDER KEY" badge={{ label: hasKey ? "CONNECTED" : "NOT SET", color: hasKey ? "#4ade80" : "rgba(255,255,255,0.3)" }}>
      <Flash msg={msg} />
      <div style={{ fontFamily:MONO, fontSize:11, color:"rgba(255,255,255,0.35)", marginBottom:16, lineHeight:1.7 }}>
        Dwelling proxies AI generation through your own key — the platform never stores costs against your usage. Keys live in your browser session and are sent only to the AI provider.
      </div>

      {hasKey && displayKey && (
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:12, background:"rgba(74,222,128,0.06)", border:"1px solid rgba(74,222,128,0.15)", borderRadius:8, padding:"10px 14px", marginBottom:14 }}>
          <div>
            <div style={{ fontFamily:MONO, fontSize:10, color:"rgba(255,255,255,0.35)", marginBottom:4, textTransform:"uppercase", letterSpacing:"0.08em" }}>Active Key</div>
            <div style={{ fontFamily:MONO, fontSize:13, color:"#4ade80" }}>{displayKey}</div>
          </div>
          <Btn onClick={handleDelete} danger>Remove</Btn>
        </div>
      )}

      <div style={{ display:"flex", gap:8, marginBottom:14 }}>
        <input
          type="password"
          value={keyInput}
          onChange={e=>setKeyInput(e.target.value)}
          placeholder={hasKey ? "Paste new key to replace…" : "csk-… / sk-… / sk-ant-… / gsk_… / sk-or-…"}
          onKeyDown={e=>e.key==="Enter"&&keyInput.trim()&&handleSave()}
          style={{ flex:1, background:"rgba(255,255,255,0.04)", border:`1px solid ${detected ? 'rgba(74,222,128,0.4)' : BORDER}`, borderRadius:6, color:"#e5e7eb", fontFamily:MONO, fontSize:12, padding:"9px 12px", outline:"none" }}
        />
        <Btn onClick={handleSave} disabled={saving||!keyInput.trim()}>{saving?"Saving…":"Save"}</Btn>
      </div>
      {detected && (
        <div style={{ fontFamily:MONO, fontSize:11, color:"#4ade80", marginBottom:10 }}>✓ {detected.label} key detected</div>
      )}

      <div style={{ fontFamily:MONO, fontSize:10, color:"rgba(255,255,255,0.3)", marginBottom:10, textTransform:"uppercase", letterSpacing:"0.08em" }}>Supported providers</div>
      <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
        {PROVIDERS.map(p => (
          <a key={p.label} href={p.url} target="_blank" rel="noreferrer"
            style={{ padding:"5px 12px", borderRadius:40, background:"rgba(255,255,255,0.04)", border:`1px solid ${BORDER}`, fontFamily:MONO, fontSize:11, color:"rgba(255,255,255,0.55)", textDecoration:"none", display:"flex", alignItems:"center", gap:6, transition:"opacity 0.15s" }}
            onMouseEnter={e=>e.currentTarget.style.opacity='0.75'}
            onMouseLeave={e=>e.currentTarget.style.opacity='1'}>
            {p.label}
            <span style={{ color:p.color, fontSize:10 }}>{p.note}</span>
          </a>
        ))}
      </div>
    </Panel>
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

// ── Team Panel (team owners only) ─────────────────────────────────────────────
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

  return (
    <Panel title="TEAM MEMBERS" badge={{label:`${seatsUsed}/${seatsTotal} SEATS`, color:seatsUsed>=seatsTotal?"#f87171":"#fbbf24"}}>
      {loading ? (
        <div style={{ fontFamily:MONO, fontSize:12, color:"rgba(255,255,255,0.3)", padding:"8px 0" }}>Loading…</div>
      ) : (
        <div style={{ marginBottom:16 }}>
          {members.length===0 ? (
            <div style={{ fontFamily:MONO, fontSize:12, color:"rgba(255,255,255,0.3)", padding:"8px 0" }}>No team members yet.</div>
          ) : members.map((m,i)=>(
            <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"9px 0", borderBottom:i<members.length-1?`1px solid ${BORDER}`:"none" }}>
              <span style={{ fontFamily:MONO, fontSize:12, color:"#e5e7eb" }}>{m.email}</span>
              <span style={{ fontFamily:MONO, fontSize:10, fontWeight:600, color:m.role==="owner"?"#fbbf24":"rgba(255,255,255,0.4)", background:m.role==="owner"?"rgba(251,191,36,0.12)":"rgba(255,255,255,0.05)", border:`1px solid ${m.role==="owner"?"rgba(251,191,36,0.3)":BORDER}`, borderRadius:4, padding:"2px 7px" }}>
                {m.role.toUpperCase()}
              </span>
            </div>
          ))}
        </div>
      )}
      {seatsUsed < seatsTotal && (
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
        </>
      )}
      {seatsUsed >= seatsTotal && (
        <div style={{ fontFamily:MONO, fontSize:11, color:"#f87171" }}>Team is full (10/10 seats used).</div>
      )}
    </Panel>
  )
}

// ── Main Account Page ─────────────────────────────────────────────────────────
export default function PaymentsPage({ onClose, user, isTeamOwner }) {
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
          {user?.is_admin && (
            <span style={{ fontFamily:MONO, fontSize:10, fontWeight:700, color:"#a78bfa", background:"rgba(167,139,250,0.12)", border:"1px solid rgba(167,139,250,0.3)", borderRadius:4, padding:"2px 7px" }}>ADMIN</span>
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
              <span style={{ fontFamily:MONO, fontSize:10, fontWeight:700, letterSpacing:"0.1em", color:user?.is_admin?"#a78bfa":BLUE, background:user?.is_admin?"rgba(167,139,250,0.12)":"rgba(56,189,248,0.1)", border:`1px solid ${user?.is_admin?"rgba(167,139,250,0.3)":"rgba(56,189,248,0.25)"}`, borderRadius:4, padding:"2px 8px" }}>
                {user?.is_admin ? "ADMIN" : "BYOK WORKSPACE"}
              </span>
            </div>
          </div>
        </div>

        <ApiKeyPanel />
        <ChangePassword />
        {isTeamOwner && <TeamPanel user={user} />}
      </div>
    </div>
  )
}
