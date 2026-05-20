import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../lib/store.js'
import GraphExplorer from '../components/GraphExplorer.jsx'
import ContextBuilder from '../components/ContextBuilder.jsx'
import ChatTab from '../components/ChatTab.jsx'
import ContributeTab from '../components/ContributeTab.jsx'
import PMDashboard from '../components/PMDashboard.jsx'
import CollaboratorsTab from '../components/CollaboratorsTab.jsx'
import CodeSetupTab from '../components/CodeSetupTab.jsx'
import SandboxModal from '../components/SandboxModal.jsx'
import ShareModal from '../components/ShareModal.jsx'
import ColabModal from '../components/ColabModal.jsx'
import ObsPanel from '../components/ObsPanel.jsx'
import ContentTab from '../components/ContentTab.jsx'

const TABS = [
  { id:'graph',         label:'Graph',            icon: <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M1.5 1.75a.75.75 0 01.75-.75h11.5a.75.75 0 01.75.75v11.5a.75.75 0 01-.75.75H2.25a.75.75 0 01-.75-.75V1.75zM3 3v10h10V3H3z"/><path d="M5.75 5a.75.75 0 00-1.5 0v6a.75.75 0 001.5 0V5zm2.5 2a.75.75 0 00-1.5 0v4a.75.75 0 001.5 0V7zm2.5-1a.75.75 0 00-1.5 0v5a.75.75 0 001.5 0V6z"/></svg> },
  { id:'context',       label:'Context',          icon: <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M2 1.75A1.75 1.75 0 013.75 0h8.5A1.75 1.75 0 0114 1.75v11.5A1.75 1.75 0 0112.25 15H9.5a.75.75 0 010-1.5h2.75a.25.25 0 00.25-.25V1.75a.25.25 0 00-.25-.25h-8.5a.25.25 0 00-.25.25V5.5A.75.75 0 012 5.5V1.75zM.22 10.47a.75.75 0 011.06 0L3 12.19V7.75a.75.75 0 011.5 0v4.44l1.72-1.72a.75.75 0 111.06 1.06l-3 3a.75.75 0 01-1.06 0l-3-3a.75.75 0 010-1.06z"/></svg> },
  { id:'content',       label:'Content',          icon: <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M2 1.75A1.75 1.75 0 013.75 0h8.5A1.75 1.75 0 0114 1.75v12.5A1.75 1.75 0 0112.25 16H3.75A1.75 1.75 0 012 14.25V1.75z"/></svg> },
  { id:'chat',          label:'Chat',             icon: <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M1 2.75A1.75 1.75 0 012.75 1h10.5c.966 0 1.75.784 1.75 1.75v7.5A1.75 1.75 0 0113.25 12H9.06l-2.573 2.573A1.457 1.457 0 014 13.543V12H2.75A1.75 1.75 0 011 10.25v-7.5z"/></svg> },
  null,
  { id:'contribute',    label:'Contribute',       icon: <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M8 9.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3z"/><path d="M8 0a8 8 0 100 16A8 8 0 008 0zM1.5 8a6.5 6.5 0 1113 0 6.5 6.5 0 01-13 0z"/></svg> },
  { id:'pm',            label:'PM',               icon: <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M1.5 1.75a.75.75 0 00-1.5 0v12.5c0 .414.336.75.75.75h14.5a.75.75 0 000-1.5H1.5V1.75zm14.28 2.53a.75.75 0 00-1.06-1.06L10 7.94 7.53 5.47a.75.75 0 00-1.06 0L3.22 8.72a.75.75 0 001.06 1.06L7 7.06l2.47 2.47a.75.75 0 001.06 0l5.25-5.25z"/></svg> },
  { id:'collaborators', label:'Collaborators',    icon: <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M2 5.5a3.5 3.5 0 115.898 2.549 5.507 5.507 0 013.034 4.084.75.75 0 11-1.482.235 4.001 4.001 0 00-7.9 0 .75.75 0 01-1.482-.236A5.507 5.507 0 013.102 8.05 3.49 3.49 0 012 5.5z"/><path d="M9.5-.5a2 2 0 100 4 2 2 0 000-4zm-5.5.5a2 2 0 100 4 2 2 0 000-4z"/></svg> },
  { id:'code',          label:'Code setup',       icon: <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M4.72 3.22a.75.75 0 011.06 1.06L2.06 8l3.72 3.72a.75.75 0 11-1.06 1.06L.47 8.53a.75.75 0 010-1.06l4.25-4.25zm6.56 0a.75.75 0 10-1.06 1.06L13.94 8l-3.72 3.72a.75.75 0 101.06 1.06l4.25-4.25a.75.75 0 000-1.06l-4.25-4.25z"/></svg> },
]

export default function Workspace() {
  const navigate = useNavigate()
  const { repoData, activeTab, setActiveTab, sandboxOpen, shareModalOpen, colabOpen, setSandbox, setShareModal, setColabOpen, setObsOpen, obsLogs, reset } = useStore()

  useEffect(() => { if (!repoData) navigate('/') }, [repoData])
  if (!repoData) return null

  const owner = repoData.name?.split('/')[0]
  const repo  = repoData.name?.split('/')[1] || repoData.name
  const errors = obsLogs.filter(l=>l.error).length

  return (
    <div className="app">
      <div className="app-header">
        <div className="app-header-left">
          <button onClick={()=>{ reset(); navigate('/') }} style={{ background:'none', border:'none', color:'var(--text2)', cursor:'pointer', padding:'4px 6px', borderRadius:6, display:'flex', alignItems:'center', gap:4, fontSize:13, transition:'all .12s' }}
            onMouseEnter={e=>e.currentTarget.style.background='var(--bg2)'}
            onMouseLeave={e=>e.currentTarget.style.background='none'}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M7.78 12.53a.75.75 0 01-1.06 0L2.47 8.28a.75.75 0 010-1.06l4.25-4.25a.75.75 0 011.06 1.06L4.56 7h8.69a.75.75 0 010 1.5H4.56l3.22 3.22a.75.75 0 010 1.06-.22.22z"/></svg>
          </button>
          <div className="app-logo-mark"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg></div>
          <span className="app-logo-text">Repo<span>Intel</span></span>
          <span style={{ color:'var(--text3)', margin:'0 4px' }}>/</span>
          <div className="app-repo-pill">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="var(--text3)"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>
            {owner} / <strong style={{ color:'var(--text)' }}>{repo}</strong>
            {repoData.selectedBranch && <><span style={{ color:'var(--border)' }}>·</span><svg width="12" height="12" viewBox="0 0 16 16" fill="var(--green)"><path d="M11.75 2.5a.75.75 0 100 1.5.75.75 0 000-1.5zm-2.25.75a2.25 2.25 0 113 2.122V6A2.5 2.5 0 0110 8.5H6a1 1 0 00-1 1v1.128a2.251 2.251 0 11-1.5 0V9.5A2.5 2.5 0 016 7h4a1 1 0 001-1v-.628A2.25 2.25 0 019.5 3.25zM4.25 12a.75.75 0 100 1.5.75.75 0 000-1.5zM3.5 3.25a.75.75 0 111.5 0 .75.75 0 01-1.5 0z"/></svg>{repoData.selectedBranch}</>}
          </div>
          {repoData.language && <span className="badge badge-gray" style={{ fontFamily:'var(--font-mono)', fontSize:11 }}>{repoData.language}</span>}
        </div>
        <div className="app-header-right">
          <button onClick={()=>setObsOpen(true)} className="btn btn-ghost btn-sm" style={{ color:errors>0?'var(--red)':undefined, position:'relative' }}>
            <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0a8 8 0 100 16A8 8 0 008 0zm0 1.5a6.5 6.5 0 110 13 6.5 6.5 0 010-13z"/><path d="M8 6.5a1.5 1.5 0 100 3 1.5 1.5 0 000-3z"/></svg>
            Logs {obsLogs.length>0&&<span style={{ background:errors>0?'var(--red)':'var(--bg2)',color:errors>0?'#fff':'var(--text3)',fontSize:9,fontFamily:'var(--font-mono)',padding:'0 4px',borderRadius:100,border:'1px solid var(--border)' }}>{obsLogs.length}</span>}
          </button>
          <button onClick={()=>setSandbox(true)} className="btn btn-secondary btn-sm">▶ Sandbox</button>
          <button onClick={()=>setShareModal(true)} className="btn btn-secondary btn-sm">↗ Share</button>
          <a href={`https://github.com/${repoData.name}`} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm">GitHub ↗</a>
        </div>
      </div>

      <div className="tab-nav">
        {TABS.map((tab, i) =>
          tab === null ? <div key={i} style={{ flex:1 }} /> : (
            <button key={tab.id} className={`tab-nav-item ${activeTab===tab.id?'active':''}`} onClick={() => setActiveTab(tab.id)}>
              {tab.icon}{tab.label}
            </button>
          )
        )}
      </div>

      <div className="app-body">
        <div className="tab-panel">
          {activeTab==='graph'         && <GraphExplorer/>}
          {activeTab==='context'       && <ContextBuilder/>}
          {activeTab==='content'       && <ContentTab/>}
          {activeTab==='chat'          && <ChatTab/>}
          {activeTab==='contribute'    && <ContributeTab/>}
          {activeTab==='pm'            && <PMDashboard/>}
          {activeTab==='collaborators' && <CollaboratorsTab/>}
          {activeTab==='code'          && <CodeSetupTab/>}
        </div>
      </div>

      {sandboxOpen    && <SandboxModal/>}
      {shareModalOpen && <ShareModal/>}
      {colabOpen      && <ColabModal/>}
      <ObsPanel/>
    </div>
  )
}
