import React from 'react'
import { useStore } from '../lib/store.js'

const SANDBOXES = [
  { id:'stackblitz', name:'StackBlitz', icon:'⚡', color:'#2563eb', desc:'Full dev environment in browser. Best for JS/TS, React, Node.', langs:['JavaScript','TypeScript'], url: n => `https://stackblitz.com/github/${n}` },
  { id:'githubdev',  name:'GitHub.dev', icon:'🖥', color:'#374151', desc:'VS Code in the browser. Browse, read and edit — no execution.', langs:['All'],                  url: n => `https://github.dev/${n}` },
  { id:'gitpod',     name:'Gitpod',     icon:'☁️', color:'#f59e0b', desc:'Cloud Linux workspace. Works for any language or stack.',    langs:['All'],                  url: n => `https://gitpod.io/#https://github.com/${n}` },
  { id:'colab',      name:'Colab',      icon:'🔬', color:'#f59e0b', desc:'GPU notebooks. Best for ML, data science, and Python.',      langs:['Python'],               url: n => `https://colab.research.google.com/github/${n}` },
]

export default function SandboxModal() {
  const { setSandbox, repoData } = useStore()
  const lang = repoData?.language || ''
  const name = repoData?.name || ''

  return (
    <Overlay onClose={() => setSandbox(false)}>
      <ModalHeader icon="▶" title="Try in sandbox" sub={`${name} · ${lang}`} onClose={() => setSandbox(false)} />
      <div style={{ padding:'20px 24px' }}>
        <p style={{ fontSize:13, color:'var(--text2)', marginBottom:18 }}>
          Launch this repo in a cloud environment — no local setup needed.
        </p>
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {SANDBOXES.map(sb => {
            const recommended = sb.langs.some(l => l === 'All' || lang.toLowerCase().includes(l.toLowerCase()))
            return (
              <a key={sb.id} href={sb.url(name)} target="_blank" rel="noreferrer" style={{
                display:'flex', gap:14, padding:'14px 16px',
                background: recommended ? sb.color + '08' : 'var(--bg)',
                border:`1.5px solid ${recommended ? sb.color + '40' : 'var(--border2)'}`,
                borderRadius:10, textDecoration:'none', transition:'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = sb.color + '80' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = recommended ? sb.color + '40' : 'var(--border2)' }}
              >
                <div style={{ width:38, height:38, borderRadius:9, background: sb.color + '12', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>
                  {sb.icon}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:3 }}>
                    <span style={{ fontSize:14, fontWeight:600, color:'var(--text)' }}>{sb.name}</span>
                    {recommended && <span className="badge badge-blue">Recommended</span>}
                  </div>
                  <div style={{ fontSize:12, color:'var(--text3)' }}>{sb.desc}</div>
                </div>
                <span style={{ color:'var(--text3)', alignSelf:'center' }}>↗</span>
              </a>
            )
          })}
        </div>
        <div style={{ marginTop:16, padding:'10px 14px', background:'var(--amber-dim)', border:'1px solid rgba(217,119,6,0.2)', borderRadius:8, fontSize:12, color:'var(--text2)' }}>
          💡 Check for a <code style={{ fontFamily:'var(--font-mono)', fontSize:11 }}>Dockerfile</code> or <code style={{ fontFamily:'var(--font-mono)', fontSize:11 }}>.gitpod.yml</code> for the best sandbox experience.
        </div>
      </div>
    </Overlay>
  )
}

export function Overlay({ children, onClose }) {
  return (
    <div onClick={e => e.target === e.currentTarget && onClose()} style={{
      position:'fixed', inset:0, background:'rgba(0,0,0,0.35)', backdropFilter:'blur(4px)',
      display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, animation:'fadeIn 0.2s ease',
    }}>
      <div style={{ width:'min(580px,95vw)', background:'var(--surface)', borderRadius:18, overflow:'hidden', boxShadow:'var(--shadow-xl)', border:'1px solid var(--border)' }}>
        {children}
      </div>
    </div>
  )
}

export function ModalHeader({ icon, title, sub, onClose }) {
  return (
    <div style={{ padding:'20px 24px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:14 }}>
      <div style={{ width:38, height:38, borderRadius:10, background:'var(--blue-dim)', border:'1px solid rgba(37,99,235,0.2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>
        {icon}
      </div>
      <div style={{ flex:1 }}>
        <div style={{ fontSize:16, fontWeight:700, color:'var(--text)' }}>{title}</div>
        <div style={{ fontSize:12, color:'var(--text3)' }}>{sub}</div>
      </div>
      <button onClick={onClose} className="btn-icon">×</button>
    </div>
  )
}
