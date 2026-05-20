import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../lib/store.js'
import { analyzeRepo, fetchGraph, getBranches } from '../lib/api.js'
import { buildArchGraph, buildFallbackGraph } from '../lib/archBuilder.js'

const EXAMPLES = [
  'fastapi/fastapi', 'tiangolo/sqlmodel', 'supabase/supabase', 'facebook/react',
]

function parseUrl(raw) {
  let s = raw.trim().replace(/\/$/, '')
  for (const p of ['https://github.com/','http://github.com/','github.com/']) if (s.startsWith(p)) { s = s.slice(p.length); break }
  const parts = s.split('/')
  if (parts.length < 2 || !parts[0] || !parts[1]) return null
  return { owner: parts[0], repo: parts[1], repoKey: `${parts[0]}/${parts[1]}` }
}

export default function Landing() {
  const navigate = useNavigate()
  const [url, setUrl] = useState('')
  const [error, setError] = useState('')
  const [branches, setBranches] = useState([])
  const [branch, setBranch] = useState('')
  const [loadingBranches, setLoadingBranches] = useState(false)
  const debRef = useRef(null)
  const { isLoading, loadingStep, loadingSteps, setIsLoading, setLoadingStep, setRepoData, setArchitecture, reset } = useStore()

  useEffect(() => { reset() }, [])
  useEffect(() => {
    if (!isLoading) return
    const t = setInterval(() => setLoadingStep(s => Math.min(s+1, loadingSteps.length-1)), 2800)
    return () => clearInterval(t)
  }, [isLoading])

  useEffect(() => {
    clearTimeout(debRef.current)
    const p = parseUrl(url)
    if (!p) { setBranches([]); setBranch(''); return }
    debRef.current = setTimeout(async () => {
      setLoadingBranches(true)
      try {
        const data = await getBranches(p.repoKey)
        if (Array.isArray(data)) {
          setBranches(data.map(b => b.name))
          const def = data.find(b => ['main','master'].includes(b.name)) || data[0]
          setBranch(def?.name || '')
        }
      } catch { setBranches([]); setBranch('main') }
      setLoadingBranches(false)
    }, 700)
  }, [url])

  async function analyze(targetUrl) {
    const raw = targetUrl || url
    const p = parseUrl(raw)
    if (!p) { setError('Enter a valid GitHub URL — https://github.com/owner/repo'); return }
    setError(''); setIsLoading(true); setLoadingStep(0)
    try {
      const data = await analyzeRepo(`https://github.com/${p.repoKey}`)
      setRepoData({ ...data, selectedBranch: branch })
      let g = { nodes: [], edges: [] }
      try { g = buildArchGraph(await fetchGraph(data.repo_key)) } catch {}
      if (!g.nodes.length) g = buildFallbackGraph(data)
      setArchitecture(g.nodes, g.edges)
      setIsLoading(false)
      navigate('/repo')
    } catch { setIsLoading(false); setError('Could not reach the backend. Start FastAPI on port 8000.') }
  }

  return (
    <div className="landing">
      <div className="landing-bg"/>
      <div className="landing-card animate-in">
        {/* Logo */}
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:20 }}>
          <div className="app-logo-mark" style={{ width:36, height:36 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round">
              <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
            </svg>
          </div>
          <span className="app-logo-text" style={{ fontSize:18 }}>Repo<span>Intel</span></span>
          <span className="badge badge-blue" style={{ marginLeft:2 }}>Beta</span>
        </div>

        <div className="landing-eyebrow">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
          Graph · Explorer · Documentation · Context Builder · Multi-agent Chat
        </div>

        <h1 className="landing-h1">Understand any<br/><span className="accent">GitHub repo</span><br/>in seconds.</h1>
        <p className="landing-sub">Paste a GitHub link. Get an interactive dependency graph, file explorer, AI-generated docs, context builder, and multi-agent chat — all in one workspace.</p>

        {!isLoading ? (
          <>
            <div className="landing-form">
              <div className={`landing-input-wrap ${error?'error':''}`}>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="#9ca3af" style={{ flexShrink:0 }}>
                  <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
                </svg>
                <input value={url} onChange={e=>{ setUrl(e.target.value); setError('') }} onKeyDown={e=>e.key==='Enter'&&analyze()} placeholder="https://github.com/owner/repo" autoFocus/>
              </div>
              <button className="btn btn-primary" onClick={()=>analyze()} style={{ padding:'0 22px', borderRadius:8, fontSize:14 }}>Analyze →</button>
            </div>

            {error && <p style={{ color:'var(--red)', fontSize:12, marginBottom:10 }}>⚠ {error}</p>}

            {/* Branch selector */}
            {branches.length > 0 && (
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12, padding:'7px 12px', background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'var(--radius)', fontSize:13 }}>
                <svg width="13" height="13" viewBox="0 0 16 16" fill="var(--green)"><path d="M11.75 2.5a.75.75 0 100 1.5.75.75 0 000-1.5zm-2.25.75a2.25 2.25 0 113 2.122V6A2.5 2.5 0 0110 8.5H6a1 1 0 00-1 1v1.128a2.251 2.251 0 11-1.5 0V9.5A2.5 2.5 0 016 7h4a1 1 0 001-1v-.628A2.25 2.25 0 019.5 3.25zM4.25 12a.75.75 0 100 1.5.75.75 0 000-1.5zM3.5 3.25a.75.75 0 111.5 0 .75.75 0 01-1.5 0z"/></svg>
                <span style={{ color:'var(--text2)', fontWeight:500 }}>Branch:</span>
                <select value={branch} onChange={e=>setBranch(e.target.value)} style={{ border:'none', background:'transparent', color:'var(--blue)', fontSize:13, fontWeight:600, cursor:'pointer', outline:'none', fontFamily:'var(--font-mono)' }}>
                  {branches.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
                <span style={{ marginLeft:'auto', fontSize:11, color:'var(--text3)' }}>{branches.length} branches</span>
              </div>
            )}
            {loadingBranches && <div style={{ fontSize:12, color:'var(--text3)', marginBottom:10, display:'flex', alignItems:'center', gap:6 }}><div className="spinner-sm"/> Fetching branches…</div>}

            <div className="landing-examples">
              <span style={{ fontSize:12, color:'var(--text3)' }}>Try:</span>
              {EXAMPLES.map(ex => (
                <button key={ex} className="landing-example-btn" onClick={() => analyze(`https://github.com/${ex}`)}>{ex}</button>
              ))}
            </div>
          </>
        ) : (
          <div className="load-card" style={{ marginBottom:16 }}>
            <div className="load-row">
              <div className="spinner"/>
              <div>
                <div style={{ fontSize:14, fontWeight:600, color:'var(--text)', marginBottom:2 }}>{loadingSteps[loadingStep]}</div>
                <div style={{ fontSize:12, color:'var(--text3)' }}>Step {loadingStep+1} of {loadingSteps.length}</div>
              </div>
            </div>
            <div className="load-track">
              {loadingSteps.map((s,i) => <div key={s} className="load-step" style={{ background:i<=loadingStep?'var(--blue)':'var(--bg2)' }}/>)}
            </div>
          </div>
        )}

        <div className="landing-features">
          {[['⬡','Dependency graph'],['🌿','Branch selector'],['📁','File explorer'],['📚','AI docs'],['📋','Context builder'],['🤖','Multi-agent chat'],['🐛','Issue guidance'],['📊','PM dashboard']].map(([i,l]) => (
            <div key={l} className="landing-feat"><span>{i}</span><span>{l}</span></div>
          ))}
        </div>
      </div>
      <div style={{ position:'absolute', bottom:16, fontSize:11, color:'var(--text3)' }}>
        Built with FastAPI · ChromaDB · React · PostgreSQL · Multi-agent AI
      </div>
    </div>
  )
}
