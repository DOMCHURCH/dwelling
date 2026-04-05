import { useState } from 'react'
import { deleteAccount } from '../lib/localAuth'

export default function DeleteAccountModal({ onClose, onDeleted }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [confirmed, setConfirmed] = useState(false)

  async function handleDelete(e) {
    e.preventDefault()
    if (!password) { setError('Enter your password to confirm.'); return }
    setLoading(true)
    setError('')
    try {
      await deleteAccount(password)
      onDeleted()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 1100,
      background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <div onClick={e => e.stopPropagation()} className="liquid-glass-strong" style={{
        borderRadius: 24, maxWidth: 420, width: '100%', padding: '32px 28px',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>⚠️</div>
          <div style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 22, color: '#fff', marginBottom: 8 }}>
            Delete your account?
          </div>
          <p style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }}>
            This permanently deletes your account and all data. This cannot be undone.
          </p>
        </div>

        {!confirmed ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button onClick={() => setConfirmed(true)} style={{
              width: '100%', padding: '13px', borderRadius: 40, border: '1px solid rgba(248,113,113,0.4)',
              background: 'rgba(248,113,113,0.1)', color: '#f87171',
              fontFamily: "'Barlow',sans-serif", fontWeight: 600, fontSize: 14, cursor: 'pointer',
            }}>
              Yes, delete my account
            </button>
            <button onClick={onClose} style={{
              width: '100%', padding: '13px', borderRadius: 40, border: 'none',
              background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.6)',
              fontFamily: "'Barlow',sans-serif", fontWeight: 400, fontSize: 14, cursor: 'pointer',
            }}>
              Cancel
            </button>
          </div>
        ) : (
          <form onSubmit={handleDelete} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontFamily: "'Barlow',sans-serif", fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>
                Confirm with your password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => { setPassword(e.target.value); setError('') }}
                placeholder="Your password"
                autoFocus
                style={{
                  width: '100%', padding: '11px 14px', borderRadius: 12,
                  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
                  color: '#fff', fontFamily: "'Barlow',sans-serif", fontSize: 14, outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            {error && (
              <p style={{ fontFamily: "'Barlow',sans-serif", fontSize: 12, color: '#f87171', margin: 0 }}>{error}</p>
            )}
            <button type="submit" disabled={loading} style={{
              width: '100%', padding: '13px', borderRadius: 40, border: 'none',
              background: loading ? 'rgba(248,113,113,0.3)' : '#f87171', color: '#000',
              fontFamily: "'Barlow',sans-serif", fontWeight: 700, fontSize: 14,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}>
              {loading ? 'Deleting…' : 'Delete account permanently'}
            </button>
            <button type="button" onClick={() => { setConfirmed(false); setError('') }} style={{
              background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)',
              fontFamily: "'Barlow',sans-serif", fontSize: 12, cursor: 'pointer', padding: '4px 0',
            }}>
              ← Go back
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
