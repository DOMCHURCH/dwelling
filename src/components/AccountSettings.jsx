import { useState, useEffect } from 'react'
import { getAuthToken, getCachedCerebrasKey, saveCerebrasKey } from '../lib/localAuth'

export default function AccountSettings({ user, onClose }) {
  const [keyInput, setKeyInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)
  const [teamData, setTeamData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [inviting, setInviting] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteNickname, setInviteNickname] = useState('')

  const flash = (text, err = false) => {
    setMsg({ text, err })
    setTimeout(() => setMsg(null), 3000)
  }

  useEffect(() => {
    loadTeamData()
  }, [])

  const loadTeamData = async () => {
    setLoading(true)
    try {
      const token = await getAuthToken()
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: 'get-team' }),
      })
      if (res.ok) {
        const data = await res.json()
        setTeamData(data)
      }
    } catch (e) {
      console.error('Failed to load team data:', e)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveKey = async () => {
    if (!keyInput.trim()) return
    setSaving(true)
    try {
      await saveCerebrasKey(keyInput.trim())
      flash('✓ API key saved')
      setKeyInput('')
      setTimeout(() => loadTeamData(), 500)
    } catch (e) {
      flash(e.message, true)
    } finally {
      setSaving(false)
    }
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
      flash(`✓ Invite sent to ${inviteEmail}`)
      setInviteEmail('')
      setInviteNickname('')
      loadTeamData()
    } catch (e) {
      flash(e.message, true)
    } finally {
      setInviting(false)
    }
  }

  const existingKey = getCachedCerebrasKey()
  const isBusinessOwner = user?.is_business && teamData?.team?.owner_id === user?.id

  return (
    <div style={{ padding: 24, maxWidth: 800, margin: '0 auto' }}>
      {msg && (
        <div style={{
          padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontFamily: "'Barlow',sans-serif", fontSize: 12,
          background: msg.err ? 'rgba(239,68,68,0.12)' : 'rgba(34,197,94,0.12)',
          border: `1px solid ${msg.err ? 'rgba(239,68,68,0.25)' : 'rgba(34,197,94,0.25)'}`,
          color: msg.err ? '#f87171' : '#4ade80'
        }}>
          {msg.text}
        </div>
      )}

      {/* API Keys Section */}
      <div style={{ marginBottom: 32 }}>
        <h3 style={{ fontFamily: "'Instrument Serif', serif", fontSize: 20, color: '#fff', marginBottom: 4 }}>
          API Keys
        </h3>
        <p style={{ fontFamily: "'Barlow', sans-serif", fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 16 }}>
          You have <strong style={{ color: '#fbbf24' }}>4 remaining slots</strong> to add Cerebras API keys
        </p>

        {existingKey && (
          <div style={{
            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 8, padding: '12px 16px', marginBottom: 12
          }}>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Saved Key
            </div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: '#4ade80' }}>
              {existingKey.slice(0, 8)}•••••••••••••{existingKey.slice(-4)}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="password"
            value={keyInput}
            onChange={e => setKeyInput(e.target.value)}
            placeholder="sk_... (Cerebras API key)"
            style={{
              flex: 1, padding: '9px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.04)', color: '#fff', fontFamily: "'Barlow', sans-serif", fontSize: 12,
              outline: 'none'
            }}
            onKeyDown={e => e.key === 'Enter' && handleSaveKey()}
          />
          <button
            onClick={handleSaveKey}
            disabled={saving || !keyInput.trim()}
            style={{
              padding: '9px 18px', borderRadius: 8, border: 'none', background: '#4ade80', color: '#000',
              fontFamily: "'Barlow', sans-serif", fontWeight: 600, fontSize: 12, cursor: 'pointer',
              opacity: saving || !keyInput.trim() ? 0.5 : 1
            }}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      {/* Team Section */}
      {isBusinessOwner && (
        <div>
          <h3 style={{ fontFamily: "'Instrument Serif', serif", fontSize: 20, color: '#fff', marginBottom: 4 }}>
            Team Members
          </h3>
          <p style={{ fontFamily: "'Barlow', sans-serif", fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 16 }}>
            {teamData?.members?.length || 1} / 10 team members
          </p>

          {/* Members List */}
          {!loading && teamData?.members && (
            <div style={{ marginBottom: 20 }}>
              {teamData.members.map((m, i) => (
                <div key={i} style={{
                  padding: '12px 16px', borderRadius: 8, background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.08)', marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                }}>
                  <div>
                    <div style={{ color: '#fff', fontFamily: "'Barlow', sans-serif", fontSize: 12 }}>{m.email}</div>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 2, textTransform: 'capitalize' }}>
                      {m.role} • Joined {new Date(m.joined_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Invite Form */}
          <div style={{
            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 12, padding: '16px 20px'
          }}>
            <div style={{ fontFamily: "'Barlow', sans-serif", fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Invite Team Member
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input
                type="email"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                placeholder="teammate@company.com"
                style={{
                  padding: '9px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)',
                  background: 'rgba(255,255,255,0.04)', color: '#fff', fontFamily: "'Barlow', sans-serif", fontSize: 12,
                  outline: 'none'
                }}
                onKeyDown={e => e.key === 'Enter' && handleInvite()}
              />
              <input
                type="text"
                value={inviteNickname}
                onChange={e => setInviteNickname(e.target.value)}
                placeholder="Nickname (optional)"
                style={{
                  padding: '9px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)',
                  background: 'rgba(255,255,255,0.04)', color: '#fff', fontFamily: "'Barlow', sans-serif", fontSize: 12,
                  outline: 'none'
                }}
              />
              <button
                onClick={handleInvite}
                disabled={inviting || !inviteEmail.trim()}
                style={{
                  padding: '9px 18px', borderRadius: 8, border: 'none', background: '#f59e0b', color: '#000',
                  fontFamily: "'Barlow', sans-serif", fontWeight: 600, fontSize: 12, cursor: 'pointer',
                  opacity: inviting || !inviteEmail.trim() ? 0.5 : 1
                }}
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
