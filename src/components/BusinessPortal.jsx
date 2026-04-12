import { useState, useEffect, useCallback } from 'react'
import { getAuthToken } from '../lib/localAuth'

export default function BusinessPortal({ onClose }) {
  const [team, setTeam] = useState(null)
  const [members, setMembers] = useState([])
  const [reports, setReports] = useState([])
  const [logoData, setLogoData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [copied, setCopied] = useState(false)
  const [joiningCode, setJoiningCode] = useState('')
  const [joining, setJoining] = useState(false)
  const [teamName, setTeamName] = useState('')
  const [creating, setCreating] = useState(false)
  const [view, setView] = useState('portal') // 'portal' | 'create' | 'join'

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  const fetchTeam = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const token = await getAuthToken()
      if (!token) { setError('Not authenticated'); setLoading(false); return }
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: 'get-team' }),
      })
      if (res.status === 404) { setView('create'); setLoading(false); return }
      if (!res.ok) { setError('Failed to load team'); setLoading(false); return }
      const data = await res.json()
      setTeam(data.team)
      setMembers(data.members || [])
      setReports(data.reports || [])
      setLogoData(data.logoData || null)
      setInviteCode(data.team?.invite_code || '')
    } catch { setError('Network error') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchTeam() }, [fetchTeam])

  const handleCreate = async () => {
    if (!teamName.trim()) return
    setCreating(true)
    try {
      const token = await getAuthToken()
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: 'create-team', name: teamName.trim() }),
      })
      if (res.ok) { await fetchTeam(); setView('portal') }
      else { const d = await res.json(); setError(d.error || 'Failed to create team') }
    } catch { setError('Network error') }
    finally { setCreating(false) }
  }

  const handleJoin = async () => {
    if (!joiningCode.trim()) return
    setJoining(true)
    try {
      const token = await getAuthToken()
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: 'join-team', inviteCode: joiningCode.trim() }),
      })
      if (res.ok) { await fetchTeam(); setView('portal') }
      else { const d = await res.json(); setError(d.error || 'Invalid invite code') }
    } catch { setError('Network error') }
    finally { setJoining(false) }
  }

  const copyInvite = () => {
    navigator.clipboard.writeText(inviteCode).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
  }

  const usagePct = team ? Math.min(100, ((team.usage_today || 0) / (team.daily_limit || 3000)) * 100) : 0
  const barColor = usagePct > 80 ? '#f87171' : usagePct > 50 ? '#fbbf24' : '#4ade80'

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(16px)', overflowY: 'auto', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '24px 16px' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{ width: '100%', maxWidth: 720, margin: 'auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {logoData && <img src={logoData} alt="Logo" style={{ height: 32, borderRadius: 6, objectFit: 'contain' }} />}
            <div>
              <div style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 26, color: '#fff', lineHeight: 1.1 }}>
                {team?.name || 'Team Portal'}
              </div>
              <div style={{ fontFamily: "'Barlow',sans-serif", fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>Business Plan · Shared workspace</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', fontSize: 22, lineHeight: 1 }}>×</button>
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'rgba(255,255,255,0.3)', fontFamily: "'Barlow',sans-serif", fontSize: 13 }}>Loading…</div>
        )}

        {error && (
          <div style={{ padding: '12px 16px', borderRadius: 12, background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)', marginBottom: 16, fontFamily: "'Barlow',sans-serif", fontSize: 12, color: '#f87171' }}>{error}</div>
        )}

        {/* Create team view */}
        {!loading && view === 'create' && (
          <div className="liquid-glass-strong" style={{ borderRadius: 24, padding: '32px 28px', border: '1px solid rgba(255,255,255,0.1)', animation: 'fadeUp 0.25s ease' }}>
            <div style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 22, color: '#fff', marginBottom: 6 }}>Create your team</div>
            <p style={{ fontFamily: "'Barlow',sans-serif", fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 24 }}>Set up a shared workspace for your team. Share the invite code so teammates can join.</p>
            <input
              value={teamName} onChange={e => setTeamName(e.target.value)}
              placeholder="Team or agency name"
              style={{ width: '100%', boxSizing: 'border-box', padding: '12px 14px', borderRadius: 12, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', fontFamily: "'Barlow',sans-serif", fontSize: 13, outline: 'none', marginBottom: 12 }}
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleCreate} disabled={creating || !teamName.trim()} style={{ flex: 1, padding: '12px', borderRadius: 40, border: 'none', cursor: 'pointer', fontFamily: "'Barlow',sans-serif", fontWeight: 700, fontSize: 13, background: 'linear-gradient(90deg, #fbbf24, #d97706)', color: '#000', opacity: creating || !teamName.trim() ? 0.5 : 1 }}>
                {creating ? 'Creating…' : 'Create Team →'}
              </button>
              <button onClick={() => setView('join')} style={{ padding: '12px 18px', borderRadius: 40, border: 'none', cursor: 'pointer', fontFamily: "'Barlow',sans-serif", fontSize: 13, background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' }}>
                Join existing
              </button>
            </div>
          </div>
        )}

        {/* Join team view */}
        {!loading && view === 'join' && (
          <div className="liquid-glass-strong" style={{ borderRadius: 24, padding: '32px 28px', border: '1px solid rgba(255,255,255,0.1)', animation: 'fadeUp 0.25s ease' }}>
            <div style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 22, color: '#fff', marginBottom: 6 }}>Join a team</div>
            <p style={{ fontFamily: "'Barlow',sans-serif", fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 24 }}>Enter the invite code shared by your team owner.</p>
            <input
              value={joiningCode} onChange={e => setJoiningCode(e.target.value)}
              placeholder="Invite code (e.g. A1B2C3)"
              style={{ width: '100%', boxSizing: 'border-box', padding: '12px 14px', borderRadius: 12, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', fontFamily: "'Barlow',sans-serif", fontSize: 13, outline: 'none', marginBottom: 12 }}
              onKeyDown={e => e.key === 'Enter' && handleJoin()}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleJoin} disabled={joining || !joiningCode.trim()} style={{ flex: 1, padding: '12px', borderRadius: 40, border: 'none', cursor: 'pointer', fontFamily: "'Barlow',sans-serif", fontWeight: 700, fontSize: 13, background: 'linear-gradient(90deg, #fbbf24, #d97706)', color: '#000', opacity: joining || !joiningCode.trim() ? 0.5 : 1 }}>
                {joining ? 'Joining…' : 'Join Team →'}
              </button>
              <button onClick={() => setView('create')} style={{ padding: '12px 18px', borderRadius: 40, border: 'none', cursor: 'pointer', fontFamily: "'Barlow',sans-serif", fontSize: 13, background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' }}>
                Create instead
              </button>
            </div>
          </div>
        )}

        {/* Main portal view */}
        {!loading && view === 'portal' && team && (
          <>
            {/* Stats row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 20 }}>
              <StatCard label="Analyses Today" value={`${team.usage_today || 0} / ${team.daily_limit || 3000}`}>
                <div style={{ marginTop: 8, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.08)' }}>
                  <div style={{ height: '100%', width: `${usagePct}%`, borderRadius: 2, background: barColor, transition: 'width 0.4s ease' }} />
                </div>
              </StatCard>
              <StatCard label="Team Members" value={members.length} />
              <StatCard label="Total Analyses" value={reports.length} />
              <div className="liquid-glass" style={{ borderRadius: 16, padding: '16px', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div style={{ fontFamily: "'Barlow',sans-serif", fontSize: 10, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Invite Code</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <code style={{ fontFamily: 'monospace', fontSize: 18, color: '#fbbf24', letterSpacing: '0.12em', flex: 1 }}>{inviteCode}</code>
                  <button onClick={copyInvite} style={{ padding: '5px 10px', borderRadius: 20, border: 'none', cursor: 'pointer', fontFamily: "'Barlow',sans-serif", fontSize: 10, background: copied ? 'rgba(74,222,128,0.15)' : 'rgba(255,255,255,0.08)', color: copied ? '#4ade80' : 'rgba(255,255,255,0.5)', transition: 'all 0.2s' }}>
                    {copied ? 'Copied ✓' : 'Copy'}
                  </button>
                </div>
              </div>
            </div>

            {/* Members */}
            <Section title="Team Members" count={members.length}>
              {members.map(m => (
                <div key={m.email} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', marginBottom: 6 }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Barlow',sans-serif", fontSize: 12, color: 'rgba(255,255,255,0.5)', flexShrink: 0 }}>
                    {m.email[0].toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: "'Barlow',sans-serif", fontSize: 13, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.email}</div>
                    <div style={{ fontFamily: "'Barlow',sans-serif", fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 1 }}>
                      {new Date(m.joined_at).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                  </div>
                  <div style={{ padding: '3px 10px', borderRadius: 20, background: m.role === 'owner' ? 'rgba(251,191,36,0.12)' : 'rgba(255,255,255,0.06)', flexShrink: 0 }}>
                    <span style={{ fontFamily: "'Barlow',sans-serif", fontSize: 10, fontWeight: 600, color: m.role === 'owner' ? '#fbbf24' : 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{m.role}</span>
                  </div>
                </div>
              ))}
            </Section>

            {/* Analyses */}
            <Section title="Team Analyses" count={reports.length} style={{ marginTop: 16 }}>
              {reports.length === 0 && (
                <div style={{ textAlign: 'center', padding: '28px 0', fontFamily: "'Barlow',sans-serif", fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>
                  No analyses yet — run a report to see it here.
                </div>
              )}
              {reports.map(r => (
                <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', marginBottom: 6 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 14, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.city}</div>
                    <div style={{ fontFamily: "'Barlow',sans-serif", fontSize: 10, color: 'rgba(255,255,255,0.3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 1 }}>{r.address}</div>
                    <div style={{ fontFamily: "'Barlow',sans-serif", fontSize: 10, color: 'rgba(255,255,255,0.2)', marginTop: 2 }}>{r.user_email} · {new Date(r.created_at).toLocaleDateString('en', { month: 'short', day: 'numeric' })}</div>
                  </div>
                  {r.score != null && (
                    <div style={{ textAlign: 'center', flexShrink: 0 }}>
                      <div style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 20, color: r.score >= 70 ? '#4ade80' : r.score >= 45 ? '#fbbf24' : '#f87171', lineHeight: 1 }}>{r.score}</div>
                      <div style={{ fontFamily: "'Barlow',sans-serif", fontSize: 9, color: 'rgba(255,255,255,0.25)', marginTop: 2 }}>SCORE</div>
                    </div>
                  )}
                  {r.verdict && (
                    <div style={{ padding: '3px 10px', borderRadius: 20, flexShrink: 0, background: r.verdict === 'Excellent' || r.verdict === 'Good' ? 'rgba(74,222,128,0.1)' : r.verdict === 'Caution' ? 'rgba(251,191,36,0.1)' : 'rgba(248,113,113,0.1)' }}>
                      <span style={{ fontFamily: "'Barlow',sans-serif", fontSize: 10, fontWeight: 600, color: r.verdict === 'Excellent' || r.verdict === 'Good' ? '#4ade80' : r.verdict === 'Caution' ? '#fbbf24' : '#f87171' }}>{r.verdict}</span>
                    </div>
                  )}
                </div>
              ))}
            </Section>
          </>
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value, children }) {
  return (
    <div className="liquid-glass" style={{ borderRadius: 16, padding: '16px', border: '1px solid rgba(255,255,255,0.07)' }}>
      <div style={{ fontFamily: "'Barlow',sans-serif", fontSize: 10, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{label}</div>
      <div style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 26, color: '#fff', lineHeight: 1 }}>{value}</div>
      {children}
    </div>
  )
}

function Section({ title, count, children, style }) {
  return (
    <div className="liquid-glass-strong" style={{ borderRadius: 20, padding: '20px', border: '1px solid rgba(255,255,255,0.07)', ...style }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <div style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 18, color: '#fff' }}>{title}</div>
        <div style={{ padding: '2px 8px', borderRadius: 20, background: 'rgba(255,255,255,0.06)', fontFamily: "'Barlow',sans-serif", fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>{count}</div>
      </div>
      {children}
    </div>
  )
}
