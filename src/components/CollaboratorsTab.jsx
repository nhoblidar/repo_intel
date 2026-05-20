import React, { useState } from 'react'
import { useStore } from '../lib/store.js'
import { inviteCollaborator } from '../lib/api.js'

const ROLES = [
  { id: 'viewer',      label: 'Viewer',      desc: 'Read-only — can view architecture, chat history, and issues.' },
  { id: 'contributor', label: 'Contributor', desc: 'Can use chat and suggest architecture edits.' },
  { id: 'admin',       label: 'Admin',       desc: 'Full access — can invite others and manage the workspace.' },
]

const ROLE_COLORS = {
  viewer:      { color: 'var(--text2)',   bg: 'var(--surface2)' },
  contributor: { color: 'var(--blue)',    bg: 'var(--blue-dim)' },
  admin:       { color: 'var(--purple)',  bg: 'var(--purple-dim)' },
}

export default function CollaboratorsTab() {
  const { repoData, collaborators, addCollaborator } = useStore()
  const [email, setEmail]     = useState('')
  const [role, setRole]       = useState('viewer')
  const [sending, setSending] = useState(false)
  const [copied, setCopied]   = useState(false)
  const [error, setError]     = useState('')

  const shareLink = repoData?.share_token
    ? `${window.location.origin}/share/${repoData.share_token}`
    : `${window.location.origin}/share/demo-link`

  async function handleInvite() {
    if (!email.trim()) return
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Enter a valid email address.')
      return
    }
    setError('')
    setSending(true)
    try {
      // Try to save to backend if workspace_id is available
      if (repoData?.workspace_id) {
        await inviteCollaborator(repoData.workspace_id, 'system', email.trim(), role)
      }
      addCollaborator({ email: email.trim(), role, status: 'pending', ts: new Date().toISOString() })
      setEmail('')
    } catch (e) {
      // Store locally even if backend fails
      addCollaborator({ email: email.trim(), role, status: 'pending', ts: new Date().toISOString() })
      setEmail('')
    }
    setSending(false)
  }

  function copyLink() {
    navigator.clipboard.writeText(shareLink).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="tab-content">
      <div className="tab-kicker">Collaborators</div>
      <div className="tab-title">Invite people to {repoData?.name}</div>
      <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 28 }}>
        Everyone you invite sees the same repo-scoped workspace — architecture, chat, issues, and observability.
      </div>

      <div className="two-col" style={{ gap: 24, alignItems: 'flex-start' }}>

        {/* Left — invite form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Share link */}
          <div className="card">
            <div className="card-title">Shareable link</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{
                flex: 1, background: 'var(--bg)', border: '1px solid var(--border)',
                borderRadius: 8, padding: '9px 12px',
                fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text2)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {shareLink}
              </div>
              <button onClick={copyLink} style={{
                padding: '9px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500,
                background: copied ? 'var(--green-dim)' : 'var(--surface2)',
                border: `1px solid ${copied ? 'rgba(61,214,140,0.35)' : 'var(--border)'}`,
                color: copied ? 'var(--green)' : 'var(--text)',
                cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap', flexShrink: 0,
              }}>
                {copied ? '✓ Copied' : 'Copy'}
              </button>
            </div>
          </div>

          {/* Email invite */}
          <div className="card">
            <div className="card-title">Invite by email</div>

            {/* Role selector */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
              {ROLES.map(r => (
                <button key={r.id} onClick={() => setRole(r.id)} style={{
                  display: 'flex', gap: 12, padding: '10px 14px', borderRadius: 10,
                  background: role === r.id ? ROLE_COLORS[r.id].bg : 'var(--bg2)',
                  border: `1px solid ${role === r.id ? ROLE_COLORS[r.id].color + '44' : 'var(--border)'}`,
                  cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
                }}>
                  <div style={{
                    width: 18, height: 18, borderRadius: '50%', flexShrink: 0, marginTop: 1,
                    background: role === r.id ? ROLE_COLORS[r.id].color : 'var(--border)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {role === r.id && (
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--bg)" strokeWidth="3" strokeLinecap="round">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    )}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: role === r.id ? ROLE_COLORS[r.id].color : 'var(--text)', marginBottom: 2 }}>
                      {r.label}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text3)' }}>{r.desc}</div>
                  </div>
                </button>
              ))}
            </div>

            {/* Email input */}
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={email}
                onChange={e => { setEmail(e.target.value); setError('') }}
                onKeyDown={e => e.key === 'Enter' && handleInvite()}
                placeholder="colleague@company.com"
                style={{ flex: 1, padding: '10px 14px', fontSize: 14, borderRadius: 8 }}
              />
              <button onClick={handleInvite} disabled={!email.trim() || sending} style={{
                padding: '10px 18px', background: 'var(--purple)',
                border: 'none', borderRadius: 8, color: 'white',
                fontSize: 14, fontWeight: 600, cursor: sending ? 'not-allowed' : 'pointer',
                opacity: sending ? 0.6 : 1, whiteSpace: 'nowrap', flexShrink: 0,
              }}>
                {sending ? 'Sending…' : 'Invite'}
              </button>
            </div>
            {error && <div style={{ fontSize: 12, color: 'var(--red)', marginTop: 6 }}>⚠ {error}</div>}
          </div>
        </div>

        {/* Right — pending / accepted list */}
        <div>
          <div className="card">
            <div className="card-title">Workspace members ({collaborators.length})</div>

            {collaborators.length === 0 ? (
              <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>
                No collaborators yet. Invite someone above.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {collaborators.map((c, i) => {
                  const rc = ROLE_COLORS[c.role] || ROLE_COLORS.viewer
                  return (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '10px 12px', background: 'var(--bg2)',
                      border: '1px solid var(--border)', borderRadius: 10,
                    }}>
                      <div style={{
                        width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                        background: rc.bg, display: 'flex', alignItems: 'center',
                        justifyContent: 'center', fontSize: 14, fontWeight: 700, color: rc.color,
                      }}>
                        {c.email[0].toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {c.email}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                          {new Date(c.ts).toLocaleDateString()}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexShrink: 0, alignItems: 'center' }}>
                        <span style={{
                          fontSize: 10, padding: '2px 8px', borderRadius: 100,
                          background: rc.bg, color: rc.color, fontWeight: 700, textTransform: 'uppercase',
                        }}>
                          {c.role}
                        </span>
                        <span style={{ fontSize: 10, color: 'var(--amber)', fontWeight: 600 }}>
                          Pending
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Role legend */}
            <div style={{
              marginTop: 16, padding: '10px 12px',
              background: 'var(--purple-dim)', border: '1px solid rgba(167,139,250,0.15)',
              borderRadius: 8, fontSize: 12, color: 'var(--text3)',
            }}>
              🔒 Full auth and real-time collaboration coming in Sprint 3 (GitHub OAuth + Supabase Realtime).
              Invites are saved to the database when a workspace ID is present.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
