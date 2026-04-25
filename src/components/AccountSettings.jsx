import { useState, useEffect } from 'react'
import { getAuthToken, getUserApiKey, setUserApiKey } from '../lib/localAuth'

export default function AccountSettings({ user, onClose }) {
  const [keyInput, setKeyInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [msg, setMsg] = useState(null)
  const [teamData, setTeamData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [inviting, setInviting] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteNickname, setInviteNickname] = useState('')
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [changingPw, setChangingPw] = useState(false)

  const flash = (text, err = false) => {
    setMsg({ text, err })
    setTimeout(() => setMsg(null), 4000)
  }

  useEffect(() => { loadAll() }, [])

  const loadAll = async () => {
    setLoading(true)
    try {
      const token = await getAuthToken()
      await loadTeamData(token)
    } catch {}
    finally { setLoading(false) }
  }

  const loadTeamData = async (token) => {
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: 'get-team' }),
      })
      if (res.ok) setTeamData(await res.json())
    } catch {}
  }

  const handleSaveKey = () => {
    if (!keyInput.trim()) return
    setSaving(true)
    setUserApiKey(keyInput.trim())
    flash('API key saved successfully')
    setKeyInput('')
    setSaving(false)
  }

  const handleDeleteKey = () => {
    setDeleting(true)
    setUserApiKey('')
    flash('API key removed')
    setDeleting(false)
  }

  const handleChangePassword = async () => {
    if (!currentPw) { flash('Enter your current password', true); return }
    if (newPw.length < 8) { flash('New password must be at least 8 characters', true); return }
    if (newPw !== confirmPw) { flash('New passwords do not match', true); return }
    setChangingPw(true)
    try {
      const token = await getAuthToken()
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: 'change-password', currentPassword: currentPw, newPassword: newPw }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      flash('Password updated successfully')
      setCurrentPw(''); setNewPw(''); setConfirmPw('')
      setShowPasswordForm(false)
    } catch (e) {
      flash(e.message, true)
    } finally { setChangingPw(false) }
  }

  const handleInvite = async () => {
    if (!inviteEmail.trim()) { flash('Enter email address', true); return }
    setInviting(true)
    try {
      const token = await getAuthToken()
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: 'invite-member', email: inviteEmail.trim(), nickname: inviteNickname.trim() || undefined }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      flash(`Invite sent to ${inviteEmail}`)
      setInviteEmail(''); setInviteNickname('')
      loadTeamData(await getAuthToken())
    } catch (e) {
      flash(e.message, true)
    } finally { setInviting(false) }
  }

  const email = user?.email || ''
  const initials = email ? email.slice(0, 2).toUpperCase() : '??'
  const isAdmin = !!user?.is_admin
  const planLabel = isAdmin ? 'Admin' : 'Free BYOK'
  const planColor = isAdmin ? '#a78bfa' : 'rgba(255,255,255,0.35)'
  const storedKey = getUserApiKey()
  const hasKey = !!storedKey
  const displayKey = storedKey ? `${storedKey.slice(0, 8)}•••••••••••${storedKey.slice(-4)}` : null
  const isBusinessOwner = teamData?.team && teamData?.members

  const card = {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 12,
    padding: '20px 24px',
    marginBottom: 16,
  }

  const label = {
    fontFamily: "'Barlow', sans-serif",
    fontSize: 10,
    color: 'rgba(255,255,255,0.4)',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    marginBottom: 6,
  }

  const inputStyle = {
    width: '100%',
    padding: '9px 12px',
    borderRadius: 8,
    border: '1px solid rgba(255,255,255,0.1)',
    background: 'rgba(255,255,255,0.04)',
    color: '#fff',
    fontFamily: "'Barlow', sans-serif",
    fontSize: 13,
    outline: 'none',
    boxSizing: 'border-box',
  }

  const btn = (accent = '#fff', bg = 'rgba(255,255,255,0.08)') => ({
    padding: '8px 16px',
    borderRadius: 8,
    border: 'none',
    background: bg,
    color: accent,
    fontFamily: "'Barlow', sans-serif",
    fontWeight: 600,
    fontSize: 12,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  })

  return (
    <div style={{ padding: '24px 24px 48px', maxWidth: 720, margin: '0 auto' }}>

      {msg && (
        <div style={{
          padding: '10px 14px', borderRadius: 8, marginBottom: 16,
          fontFamily: "'Barlow',sans-serif", fontSize: 12,
          background: msg.err ? 'rgba(239,68,68,0.12)' : 'rgba(34,197,94,0.12)',
          border: `1px solid ${msg.err ? 'rgba(239,68,68,0.25)' : 'rgba(34,197,94,0.25)'}`,
          color: msg.err ? '#f87171' : '#4ade80',
        }}>
          {msg.text}
        </div>
      )}

      {/* ── Profile ─────────────────────────────────────────────────────── */}
      <div style={{ ...card, display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{
          width: 56, height: 56, borderRadius: '50%', flexShrink: 0,
          background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 22, fontWeight: 700, color: '#fff', fontFamily: "'Barlow', sans-serif",
          userSelect: 'none',
        }}>
          {initials}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "'Instrument Serif', serif", fontSize: 18, color: '#fff', marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {email}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{
              padding: '2px 10px', borderRadius: 99,
              background: `${planColor}22`, border: `1px solid ${planColor}55`,
              color: planColor, fontFamily: "'Barlow', sans-serif",
              fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em',
            }}>
              {planLabel}
            </span>
            {!isAdmin && (
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontFamily: "'Barlow', sans-serif" }}>
                Unlimited analyses with your API key
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── API Key ─────────────────────────────────────────────────────── */}
      <div style={card}>
        <h3 style={{ fontFamily: "'Instrument Serif', serif", fontSize: 18, color: '#fff', margin: '0 0 4px' }}>
          AI API Key
        </h3>
        <p style={{ ...label, marginBottom: 16, textTransform: 'none', letterSpacing: 0, fontSize: 12 }}>
          Your key is stored locally only — never sent to our servers. Supports Cerebras (csk-), OpenAI (sk-), Anthropic (sk-ant-), Groq (gsk_), OpenRouter (sk-or-).
        </p>

        {hasKey && displayKey && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
            background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.18)',
            borderRadius: 8, padding: '10px 14px', marginBottom: 12,
          }}>
            <div>
              <div style={{ ...label, marginBottom: 2 }}>Current Key</div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: '#4ade80' }}>
                {displayKey}
              </div>
            </div>
            <button
              onClick={handleDeleteKey}
              disabled={deleting}
              style={{ ...btn('#f87171', 'rgba(239,68,68,0.1)'), border: '1px solid rgba(239,68,68,0.2)', opacity: deleting ? 0.6 : 1 }}
            >
              {deleting ? 'Removing…' : 'Remove'}
            </button>
          </div>
        )}

        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="password"
            value={keyInput}
            onChange={e => setKeyInput(e.target.value)}
            placeholder={hasKey ? 'Paste new key to replace…' : 'csk-… / sk-… / sk-ant-… / gsk_…'}
            style={inputStyle}
            onKeyDown={e => e.key === 'Enter' && handleSaveKey()}
          />
          <button
            onClick={handleSaveKey}
            disabled={saving || !keyInput.trim()}
            style={{ ...btn('#000', '#4ade80'), opacity: saving || !keyInput.trim() ? 0.5 : 1 }}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      {/* ── Password ────────────────────────────────────────────────────── */}
      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: showPasswordForm ? 16 : 0 }}>
          <div>
            <h3 style={{ fontFamily: "'Instrument Serif', serif", fontSize: 18, color: '#fff', margin: 0 }}>
              Password
            </h3>
            {!showPasswordForm && (
              <p style={{ ...label, marginTop: 4, textTransform: 'none', letterSpacing: 0, fontSize: 12 }}>
                ••••••••••••
              </p>
            )}
          </div>
          <button
            onClick={() => { setShowPasswordForm(v => !v); setCurrentPw(''); setNewPw(''); setConfirmPw('') }}
            style={{ ...btn('rgba(255,255,255,0.7)', 'rgba(255,255,255,0.06)'), border: '1px solid rgba(255,255,255,0.1)' }}
          >
            {showPasswordForm ? 'Cancel' : 'Change password'}
          </button>
        </div>

        {showPasswordForm && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <div style={label}>Current Password</div>
              <input
                type="password"
                value={currentPw}
                onChange={e => setCurrentPw(e.target.value)}
                placeholder="Enter current password"
                style={inputStyle}
                autoComplete="current-password"
              />
            </div>
            <div>
              <div style={label}>New Password</div>
              <input
                type="password"
                value={newPw}
                onChange={e => setNewPw(e.target.value)}
                placeholder="Min. 8 characters"
                style={inputStyle}
                autoComplete="new-password"
              />
            </div>
            <div>
              <div style={label}>Confirm New Password</div>
              <input
                type="password"
                value={confirmPw}
                onChange={e => setConfirmPw(e.target.value)}
                placeholder="Repeat new password"
                style={inputStyle}
                autoComplete="new-password"
                onKeyDown={e => e.key === 'Enter' && handleChangePassword()}
              />
            </div>
            <button
              onClick={handleChangePassword}
              disabled={changingPw || !currentPw || !newPw || !confirmPw}
              style={{
                ...btn('#000', '#a78bfa'),
                opacity: changingPw || !currentPw || !newPw || !confirmPw ? 0.5 : 1,
                marginTop: 4,
              }}
            >
              {changingPw ? 'Updating…' : 'Update password'}
            </button>
          </div>
        )}
      </div>

      {/* ── Team (Business owners only) ─────────────────────────────────── */}
      {isBusinessOwner && (
        <div style={card}>
          <h3 style={{ fontFamily: "'Instrument Serif', serif", fontSize: 18, color: '#fff', margin: '0 0 4px' }}>
            Team Members
          </h3>
          <p style={{ ...label, marginBottom: 16, textTransform: 'none', letterSpacing: 0, fontSize: 12 }}>
            {teamData?.members?.length || 1} / 10 members
          </p>

          {teamData?.members && (
            <div style={{ marginBottom: 20 }}>
              {teamData.members.map((m, i) => (
                <div key={i} style={{
                  padding: '12px 16px', borderRadius: 8,
                  background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
                  marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <div>
                    <div style={{ color: '#fff', fontFamily: "'Barlow', sans-serif", fontSize: 13 }}>{m.email}</div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2, textTransform: 'capitalize' }}>
                      {m.role} · Joined {new Date(m.joined_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '16px 18px' }}>
            <div style={{ ...label, marginBottom: 12 }}>Invite Member</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input
                type="email"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                placeholder="teammate@company.com"
                style={inputStyle}
                onKeyDown={e => e.key === 'Enter' && handleInvite()}
              />
              <input
                type="text"
                value={inviteNickname}
                onChange={e => setInviteNickname(e.target.value)}
                placeholder="Nickname (optional)"
                style={inputStyle}
              />
              <button
                onClick={handleInvite}
                disabled={inviting || !inviteEmail.trim()}
                style={{ ...btn('#000', '#f59e0b'), opacity: inviting || !inviteEmail.trim() ? 0.5 : 1 }}
              >
                {inviting ? 'Sending…' : 'Send Invite →'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
