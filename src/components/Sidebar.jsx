import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../lib/store.js'

const NAV = [
  { id:'overview',      label:'Overview',          icon: BookIcon },
  { id:'graph',         label:'Graph',             icon: GraphIcon },
  { id:'explorer',      label:'Explorer',          icon: TreeIcon },
  { id:'documentation', label:'Documentation',     icon: DocIcon },
  { id:'context',       label:'Context Builder',   icon: ContextIcon },
  { id:'chat',          label:'Chat',              icon: ChatIcon },
  { id:'contribute',    label:'Contribute',        icon: IssueIcon },
  { id:'code',          label:'Code setup',        icon: CodeIcon },
  { id:'pm',            label:'PM dashboard',      icon: ChartIcon },
  { id:'collaborators', label:'Collaborators',     icon: PeopleIcon },
]

function fmt(n) {
  if (!n && n !== 0) return '—'
  if (n >= 1_000_000) return (n/1_000_000).toFixed(1)+'m'
  if (n >= 1000) return (n/1000).toFixed(1)+'k'
  return String(n)
}

export default function Sidebar() {
  const navigate = useNavigate()
  const { repoData, activeTab, setActiveTab, setSandbox, setShareModal, setColabOpen, setObsOpen, obsLogs, reset } = useStore()
  const name   = repoData?.name || ''
  const owner  = name.split('/')[0]
  const repo   = name.split('/')[1] || name
  const errors = obsLogs.filter(l => l.error).length

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo-mark">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round">
            <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
          </svg>
        </div>
        <span className="sidebar-logo-text">Repo<span>Intel</span></span>
      </div>

      {repoData && (
        <div className="sidebar-repo">
          <div style={{ display:'flex',alignItems:'center',gap:6,marginBottom:3 }}>
            <svg width="12" height="12" viewBox="0 0 16 16" fill="var(--text3)"><path d="M2 2.5A2.5 2.5 0 014.5 0h8.75a.75.75 0 01.75.75v12.5a.75.75 0 01-.75.75h-2.5a.75.75 0 010-1.5h1.75v-2h-8a1 1 0 00-.714 1.7.75.75 0 01-1.072 1.05A2.495 2.495 0 012 11.5v-9zm10.5-1V9h-8c-.356 0-.694.074-1 .208V2.5a1 1 0 011-1h8z"/></svg>
            <span style={{ fontSize:11,color:'var(--text3)' }}>{owner}</span>
          </div>
          <div className="sidebar-repo-name">{repo}</div>
          {repoData.selectedBranch && <div style={{ fontSize:11,color:'var(--green)',marginBottom:5 }}>🌿 {repoData.selectedBranch}</div>}
          <div className="sidebar-stats">
            <div className="sidebar-stat">⭐ <strong>{fmt(repoData?.stars)}</strong></div>
            <div className="sidebar-stat">⑂ <strong>{fmt(repoData?.forks)}</strong></div>
            <div className="sidebar-stat">📄 <strong>{fmt(repoData?.file_count)}</strong></div>
          </div>
        </div>
      )}

      <nav className="sidebar-nav">
        <span className="nav-section-label">Analysis</span>
        {NAV.slice(0,6).map(item => (
          <button key={item.id} className={`nav-item ${activeTab===item.id?'active':''}`} onClick={()=>setActiveTab(item.id)}>
            <item.icon />{item.label}
          </button>
        ))}
        <div className="nav-divider"/>
        <span className="nav-section-label">Tools</span>
        {NAV.slice(6).map(item => (
          <button key={item.id} className={`nav-item ${activeTab===item.id?'active':''}`} onClick={()=>setActiveTab(item.id)}>
            <item.icon />{item.label}
          </button>
        ))}
        <div className="nav-divider"/>
        <button className="nav-item" onClick={()=>setObsOpen(true)} style={{ color:errors>0?'var(--red)':undefined }}>
          <RadarIcon/>Network logs
          {obsLogs.length>0&&<span style={{ marginLeft:'auto',fontSize:10,padding:'0 5px',borderRadius:100,fontFamily:'var(--font-mono)',background:errors>0?'var(--red-dim)':'var(--bg2)',color:errors>0?'var(--red)':'var(--text3)',border:`1px solid ${errors>0?'rgba(207,34,46,0.2)':'var(--border)'}`}}>{obsLogs.length}</span>}
        </button>
      </nav>

      <div className="sidebar-footer">
        <button className="sidebar-footer-btn" onClick={()=>setSandbox(true)}>
          <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M2.75 3.25a.75.75 0 00-.75.75v7.5c0 .414.336.75.75.75h10.5a.75.75 0 00.75-.75V4a.75.75 0 00-.75-.75H2.75zM0 4A2.25 2.25 0 012.25 1.75h11.5A2.25 2.25 0 0116 4v7.5a2.25 2.25 0 01-2.25 2.25H2.25A2.25 2.25 0 010 11.5V4z"/><path d="M4 7.25a.75.75 0 01.75-.75h6.5a.75.75 0 010 1.5h-6.5A.75.75 0 014 7.25z"/></svg>
          Try in sandbox
        </button>
        <button className="sidebar-footer-btn" onClick={()=>setColabOpen(true)}>
          <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M1.75 1A1.75 1.75 0 000 2.75v10.5C0 14.216.784 15 1.75 15h12.5A1.75 1.75 0 0016 13.25V2.75A1.75 1.75 0 0014.25 1H1.75zm0 1.5h12.5a.25.25 0 01.25.25v10.5a.25.25 0 01-.25.25H1.75a.25.25 0 01-.25-.25V2.75a.25.25 0 01.25-.25z"/></svg>
          Open in Colab
        </button>
        <button className="sidebar-footer-btn" onClick={()=>setShareModal(true)}>
          <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M11.75 2.5a.75.75 0 100 1.5.75.75 0 000-1.5zm-2.25.75a2.25 2.25 0 113 2.122V6A2.5 2.5 0 0110 8.5H6a1 1 0 00-1 1v1.128a2.251 2.251 0 11-1.5 0V9.5A2.5 2.5 0 016 7h4a1 1 0 001-1v-.628A2.25 2.25 0 019.5 3.25zM4.25 12a.75.75 0 100 1.5.75.75 0 000-1.5zM3.5 3.25a.75.75 0 111.5 0 .75.75 0 01-1.5 0z"/></svg>
          Share workspace
        </button>
        <div className="nav-divider" style={{ margin:'4px 0' }}/>
        <button className="sidebar-footer-btn" onClick={()=>{ reset(); navigate('/') }} style={{ color:'var(--text3)' }}>
          ← New repo
        </button>
      </div>
    </aside>
  )
}

function BookIcon()    { return <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M0 1.75A.75.75 0 01.75 1h4.253c1.227 0 2.317.59 3 1.501A3.744 3.744 0 0111.006 1h4.245a.75.75 0 01.75.75v10.5a.75.75 0 01-.75.75h-4.507a2.25 2.25 0 00-1.591.659l-.622.621a.75.75 0 01-1.06 0l-.622-.621A2.25 2.25 0 005.258 13H.75a.75.75 0 01-.75-.75zm7.251 10.324l.004-5.073-.002-2.253A2.25 2.25 0 005.003 2.5H1.5v9h3.757a3.75 3.75 0 011.994.574zM8.755 4.75l-.004 7.322a3.752 3.752 0 011.992-.572H14.5v-9h-3.495a2.25 2.25 0 00-2.25 2.25z"/></svg> }
function GraphIcon()   { return <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M1.5 1.75a.75.75 0 01.75-.75h11.5a.75.75 0 01.75.75v11.5a.75.75 0 01-.75.75H2.25a.75.75 0 01-.75-.75V1.75zM3 3v10h10V3H3z"/><path d="M5.75 5a.75.75 0 00-1.5 0v6a.75.75 0 001.5 0V5zm2.5 2a.75.75 0 00-1.5 0v4a.75.75 0 001.5 0V7zm2.5-1a.75.75 0 00-1.5 0v5a.75.75 0 001.5 0V6z"/></svg> }
function TreeIcon()    { return <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M1.75 1A1.75 1.75 0 000 2.75v4.5C0 8.216.784 9 1.75 9H7v1H4.992a.75.75 0 000 1.5H7v1.25C7 13.992 7.784 15 9.25 15h4A1.75 1.75 0 0015 13.25v-4.5A1.75 1.75 0 0013.25 7H12V2.75A1.75 1.75 0 0010.25 1h-8.5z"/></svg> }
function DocIcon()     { return <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M2 1.75A1.75 1.75 0 013.75 0h8.5A1.75 1.75 0 0114 1.75v12.5A1.75 1.75 0 0112.25 16h-8.5A1.75 1.75 0 012 14.25V1.75zm1.75-.25a.25.25 0 00-.25.25v12.5c0 .138.112.25.25.25h8.5a.25.25 0 00.25-.25V1.75a.25.25 0 00-.25-.25h-8.5zM4.75 8a.75.75 0 000 1.5h6.5a.75.75 0 000-1.5h-6.5zm0-2.5a.75.75 0 000 1.5h6.5a.75.75 0 000-1.5h-6.5zm0-2.5a.75.75 0 000 1.5h6.5a.75.75 0 000-1.5h-6.5z"/></svg> }
function ContextIcon() { return <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M2 1.75A1.75 1.75 0 013.75 0h8.5A1.75 1.75 0 0114 1.75v11.5A1.75 1.75 0 0112.25 15H9.5a.75.75 0 010-1.5h2.75a.25.25 0 00.25-.25V1.75a.25.25 0 00-.25-.25h-8.5a.25.25 0 00-.25.25V5.5A.75.75 0 012 5.5V1.75zM.22 10.47a.75.75 0 011.06 0L3 12.19V7.75a.75.75 0 011.5 0v4.44l1.72-1.72a.75.75 0 111.06 1.06l-3 3a.75.75 0 01-1.06 0l-3-3a.75.75 0 010-1.06z"/></svg> }
function ChatIcon()    { return <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M1 2.75A1.75 1.75 0 012.75 1h10.5c.966 0 1.75.784 1.75 1.75v7.5A1.75 1.75 0 0113.25 12H9.06l-2.573 2.573A1.457 1.457 0 014 13.543V12H2.75A1.75 1.75 0 011 10.25v-7.5z"/></svg> }
function IssueIcon()   { return <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M8 9.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3z"/><path d="M8 0a8 8 0 100 16A8 8 0 008 0zM1.5 8a6.5 6.5 0 1113 0 6.5 6.5 0 01-13 0z"/></svg> }
function CodeIcon()    { return <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M4.72 3.22a.75.75 0 011.06 1.06L2.06 8l3.72 3.72a.75.75 0 11-1.06 1.06L.47 8.53a.75.75 0 010-1.06l4.25-4.25zm6.56 0a.75.75 0 10-1.06 1.06L13.94 8l-3.72 3.72a.75.75 0 101.06 1.06l4.25-4.25a.75.75 0 000-1.06l-4.25-4.25z"/></svg> }
function ChartIcon()   { return <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M1.5 1.75a.75.75 0 00-1.5 0v12.5c0 .414.336.75.75.75h14.5a.75.75 0 000-1.5H1.5V1.75zm14.28 2.53a.75.75 0 00-1.06-1.06L10 7.94 7.53 5.47a.75.75 0 00-1.06 0L3.22 8.72a.75.75 0 001.06 1.06L7 7.06l2.47 2.47a.75.75 0 001.06 0l5.25-5.25z"/></svg> }
function PeopleIcon()  { return <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M2 5.5a3.5 3.5 0 115.898 2.549 5.507 5.507 0 013.034 4.084.75.75 0 11-1.482.235 4.001 4.001 0 00-7.9 0 .75.75 0 01-1.482-.236A5.507 5.507 0 013.102 8.05 3.49 3.49 0 012 5.5zM11 4a.75.75 0 100 1.5 1.5 1.5 0 01.667 2.843.75.75 0 00-.417.71v.008a.75.75 0 00.574.73c1.2.232 2.104.982 2.396 1.957a.75.75 0 101.44-.42 4.003 4.003 0 00-2.066-2.383A3 3 0 0011 4zm-5.5-.5a2 2 0 100 4 2 2 0 000-4z"/></svg> }
function RadarIcon()   { return <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0a8 8 0 100 16A8 8 0 008 0zm0 1.5a6.5 6.5 0 110 13 6.5 6.5 0 010-13z"/><path d="M8 6.5a1.5 1.5 0 100 3 1.5 1.5 0 000-3z"/><path d="M8.22 2.53l4.25 4.25a.75.75 0 010 1.06L8.22 12.47a.75.75 0 01-1.06-1.06L10.44 8 7.16 4.72a.75.75 0 011.06-1.06-.002-.003-.002-.002-.002-.002z"/></svg> }
