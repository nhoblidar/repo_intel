import React, { useState } from 'react'
import { useStore } from '../lib/store.js'
import { Overlay, ModalHeader } from './SandboxModal.jsx'
import { inviteCollaborator } from '../lib/api.js'

const ROLES = [
  { id:'viewer',      label:'Viewer',      desc:'Read-only access.' },
  { id:'contributor', label:'Contributor', desc:'Can use chat and suggest edits.' },
  { id:'admin',       label:'Admin',       desc:'Full access and can invite others.' },
]

export default function ShareModal() {
  const { setShareModal, repoData, addCollaborator } = useStore()
  const [email, setEmail]   = useState('')
  const [role, setRole]     = useState('viewer')
  const [sending, setSending] = useState(false)
  const [copied, setCopied] = useState(false)
  const [err, setErr]       = useState('')

  const shareLink = `${window.location.origin}/share/${repoData?.share_token || 'demo'}`

  function copyLink() {
    navigator.clipboard.writeText(shareLink).catch(() => {})
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  async function handleInvite() {
    if (!email.trim()) return
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setErr('Enter a valid email.'); return }
    setErr(''); setSending(true)
    try {
      if (repoData?.workspace_id) await inviteCollaborator(repoData.workspace_id, 'system', email.trim(), role)
    } catch {}
    addCollaborator({ email: email.trim(), role, status:'pending', ts: new Date().toISOString() })
    setEmail(''); setSending(false)
  }

  return (
    <Overlay onClose={() => setShareModal(false)}>
      <ModalHeader icon="↗" title="Share workspace" sub={`Invite people to ${repoData?.name}`} onClose={() => setShareModal(false)} />
      <div style={{ padding:'20px 24px' }}>

        {/* Share link */}
        <div style={{ marginBottom:20 }}>
          <div className="section-label">Shareable link</div>
          <div style={{ display:'flex', gap:8 }}>
            <div style={{ flex:1, padding:'9px 12px', background:'var(--bg)', border:'1.5px solid var(--border2)', borderRadius:8, fontSize:12, fontFamily:'var(--font-mono)', color:'var(--text2)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
              {shareLink}
            </div>
            <button onClick={copyLink} className="btn" style={{ background: copied ? 'var(--green-dim)' : 'var(--surface)', color: copied ? 'var(--green)' : 'var(--text)', border:'1.5px solid var(--border2)', flexShrink:0 }}>
              {copied ? '✓ Copied' : 'Copy'}
            </button>
          </div>
        </div>

        {/* Invite */}
        <div style={{ marginBottom:16 }}>
          <div className="section-label">Invite by email</div>
          <div style={{ display:'flex', gap:5, marginBottom:12 }}>
            {ROLES.map(r => (
              <button key={r.id} onClick={() => setRole(r.id)} style={{
                flex:1, padding:'7px 0', borderRadius:7, border:'1.5px solid', fontSize:12, fontWeight:500, cursor:'pointer', transition:'all 0.15s',
                borderColor: role === r.id ? 'var(--blue)' : 'var(--border2)',
                background: role === r.id ? 'var(--blue-dim)' : 'var(--bg)',
                color: role === r.id ? 'var(--blue)' : 'var(--text2)',
              }}>
                {r.label}
              </button>
            ))}
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <input className="input" value={email} onChange={e => { setEmail(e.target.value); setErr('') }} onKeyDown={e => e.key === 'Enter' && handleInvite()} placeholder="colleague@company.com" style={{ flex:1 }} />
            <button onClick={handleInvite} disabled={!email || sending} className="btn btn-primary" style={{ flexShrink:0 }}>
              {sending ? 'Sending…' : 'Invite'}
            </button>
          </div>
          {err && <div style={{ fontSize:12, color:'var(--red)', marginTop:5 }}>{err}</div>}
        </div>

        <div style={{ padding:'10px 14px', background:'var(--purple-dim)', border:'1px solid rgba(124,58,237,0.15)', borderRadius:8, fontSize:12, color:'var(--text2)' }}>
          🔒 Full auth and real-time collaboration coming in Sprint 3.
        </div>
      </div>
    </Overlay>
  )
}
