import React, { useEffect, useState } from 'react'
import { useStore } from '../lib/store.js'
import { getLanguages, getContributors } from '../lib/api.js'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
dayjs.extend(relativeTime)

const LANG_COLORS = {
  Python:'#3572a5', JavaScript:'#f1e05a', TypeScript:'#3178c6',
  Go:'#00add8', Rust:'#dea584', Java:'#b07219', Ruby:'#701516',
  'C++':'#f34b7d', C:'#555555', Swift:'#f05138', Kotlin:'#a97bff',
  HTML:'#e34c26', CSS:'#563d7c', Shell:'#89e051', Dart:'#00b4ab',
  Vue:'#41b883', Svelte:'#ff3e00', PHP:'#4f5d95',
}

function fmt(n) {
  if (!n && n !== 0) return '—'
  if (n >= 1000) return (n/1000).toFixed(1)+'k'
  return String(n)
}

export default function OverviewTab() {
  const { repoData, repoKey, setActiveTab } = useStore()
  const [langs,    setLangs]    = useState({})
  const [contribs, setContribs] = useState([])

  useEffect(() => {
    if (!repoKey) return
    getLanguages(repoKey).then(setLangs).catch(() => {})
    getContributors(repoKey).then(d => Array.isArray(d) && setContribs(d)).catch(() => {})
  }, [repoKey])

  const totalBytes = Object.values(langs).reduce((a, b) => a + b, 0)

  return (
    <div className="tab-body tab-padded">

      {/* Repo header */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:20, gap:16 }}>
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:5 }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="var(--text2)">
              <path d="M2 2.5A2.5 2.5 0 014.5 0h8.75a.75.75 0 01.75.75v12.5a.75.75 0 01-.75.75h-2.5a.75.75 0 010-1.5h1.75v-2h-8a1 1 0 00-.714 1.7.75.75 0 01-1.072 1.05A2.495 2.495 0 012 11.5v-9zm10.5-1V9h-8c-.356 0-.694.074-1 .208V2.5a1 1 0 011-1h8zM5 12.25v3.25a.25.25 0 00.4.2l1.45-1.087a.25.25 0 01.3 0L8.6 15.7a.25.25 0 00.4-.2v-3.25a.25.25 0 00-.25-.25h-3.5a.25.25 0 00-.25.25z"/>
            </svg>
            <span style={{ fontSize:20, fontWeight:700, color:'var(--text)', letterSpacing:'-0.3px' }}>
              {repoData?.name}
            </span>
            <span className="badge badge-gray">Public</span>
          </div>
          <p style={{ fontSize:14, color:'var(--text2)', maxWidth:600, lineHeight:1.6 }}>
            {repoData?.description || 'No description provided.'}
          </p>
        </div>
        <a href={`https://github.com/${repoData?.name}`} target="_blank" rel="noreferrer"
          className="btn btn-secondary btn-sm" style={{ flexShrink:0 }}>
          View on GitHub ↗
        </a>
      </div>

      {/* Topics */}
      {repoData?.topics?.length > 0 && (
        <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:16 }}>
          {repoData.topics.map(t => (
            <span key={t} className="badge badge-blue" style={{ fontSize:12 }}>{t}</span>
          ))}
        </div>
      )}

      {/* Stats */}
      <div className="grid-4" style={{ marginBottom:18 }}>
        {[
          { label:'Stars',         value: fmt(repoData?.stars),      icon:'⭐' },
          { label:'Forks',         value: fmt(repoData?.forks),      icon:'⑂'  },
          { label:'Files indexed', value: fmt(repoData?.file_count), icon:'📁' },
          { label:'Language',      value: repoData?.language||'Mixed', icon:'💻' },
        ].map(s => (
          <div key={s.label} className="card stat-card">
            <div className="stat-label">{s.label}</div>
            <div className="stat-value" style={{ fontSize:20 }}>{s.icon} {s.value}</div>
          </div>
        ))}
      </div>

      {/* AI Summary */}
      <div className="card" style={{ marginBottom:18 }}>
        <div className="card-header">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="var(--blue)">
            <path d="M8 1.5A6.5 6.5 0 108 14.5 6.5 6.5 0 008 1.5zM0 8a8 8 0 1116 0A8 8 0 010 8zm6.5-.25A.75.75 0 017.25 7h1a.75.75 0 01.75.75v2.75h.25a.75.75 0 010 1.5h-2a.75.75 0 010-1.5h.25v-2h-.25a.75.75 0 01-.75-.75zM8 6a1 1 0 100-2 1 1 0 000 2z"/>
          </svg>
          <span className="card-title">AI Summary</span>
        </div>
        <div className="card-body">
          <p style={{ fontSize:14, color:'var(--text2)', lineHeight:1.75, marginBottom:14 }}>
            {repoData?.summary || 'Generating summary…'}
          </p>
          <div style={{ display:'flex', gap:7, flexWrap:'wrap' }}>
            {[
              { label:'View architecture', tab:'architecture' },
              { label:'Chat with repo',    tab:'chat' },
              { label:'Browse issues',     tab:'contribute' },
            ].map(b => (
              <button key={b.tab} onClick={() => setActiveTab(b.tab)}
                className="btn btn-secondary btn-sm">
                {b.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid-2" style={{ marginBottom:18 }}>
        {/* Languages */}
        <div className="card">
          <div className="card-header"><span className="card-title">Languages</span></div>
          <div className="card-body">
            {totalBytes > 0 ? (
              <>
                <div style={{ display:'flex', height:8, borderRadius:4, overflow:'hidden', marginBottom:14, gap:1 }}>
                  {Object.entries(langs).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([lang,bytes]) => (
                    <div key={lang} title={`${lang}: ${((bytes/totalBytes)*100).toFixed(1)}%`}
                      style={{ flex:bytes/totalBytes, background:LANG_COLORS[lang]||'#9ca3af', minWidth:3 }}/>
                  ))}
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {Object.entries(langs).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([lang,bytes]) => (
                    <div key={lang} style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                        <div style={{ width:10, height:10, borderRadius:'50%', background:LANG_COLORS[lang]||'#9ca3af' }}/>
                        <span style={{ fontSize:13, color:'var(--text)' }}>{lang}</span>
                      </div>
                      <span style={{ fontSize:12, color:'var(--text3)' }}>{((bytes/totalBytes)*100).toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              </>
            ) : <div style={{ color:'var(--text3)', fontSize:13 }}>Loading languages…</div>}
          </div>
        </div>

        {/* Contributors */}
        <div className="card">
          <div className="card-header"><span className="card-title">Top contributors</span></div>
          <div className="card-body">
            {contribs.length > 0 ? (
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {contribs.slice(0,6).map(c => (
                  <a key={c.login} href={c.html_url} target="_blank" rel="noreferrer"
                    style={{ display:'flex', alignItems:'center', gap:9, textDecoration:'none' }}>
                    <img src={c.avatar_url} alt={c.login}
                      style={{ width:26, height:26, borderRadius:'50%', border:'1px solid var(--border)' }}/>
                    <span style={{ fontSize:13, color:'var(--text)', flex:1 }}>{c.login}</span>
                    <span style={{ fontSize:12, color:'var(--text3)', fontFamily:'var(--font-mono)' }}>
                      {fmt(c.contributions)} commits
                    </span>
                  </a>
                ))}
              </div>
            ) : <div style={{ color:'var(--text3)', fontSize:13 }}>Loading contributors…</div>}
          </div>
        </div>
      </div>

      {/* Commits + PRs */}
      <div className="grid-2">
        <div className="card">
          <div className="card-header"><span className="card-title">Recent commits</span></div>
          <div style={{ padding:0 }}>
            {(repoData?.commits||[]).slice(0,6).map((c,i,arr) => (
              <div key={i} style={{ padding:'10px 16px', borderBottom: i<arr.length-1 ? '1px solid var(--border)' : 'none' }}>
                <div style={{ fontSize:13, color:'var(--text)', marginBottom:2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                  {c.message}
                </div>
                <div style={{ fontSize:11, color:'var(--text3)' }}>
                  <span style={{ fontFamily:'var(--font-mono)', color:'var(--blue)' }}>{c.sha}</span>
                  {' · '}{c.author}{' · '}{dayjs(c.date).fromNow()}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-header"><span className="card-title">Pull requests</span></div>
          <div style={{ padding:0 }}>
            {(repoData?.prs||[]).slice(0,6).map((p,i,arr) => {
              const col = p.state==='open' ? 'var(--green)' : 'var(--purple)'
              return (
                <div key={i} style={{ padding:'10px 16px', borderBottom: i<arr.length-1 ? '1px solid var(--border)' : 'none', display:'flex', gap:8, alignItems:'flex-start' }}>
                  <span style={{ fontSize:10, fontWeight:600, color:col, background:col.replace('var','rgba').replace(')',',0.1)').replace('--green','26,127,55').replace('--purple','102,57,186'), border:`1px solid ${col.replace(')',',0.25)').replace('var(','rgba(').replace('--green','26,127,55').replace('--purple','102,57,186')}`, borderRadius:100, padding:'1px 7px', flexShrink:0, marginTop:2, textTransform:'uppercase' }}>
                    {p.state}
                  </span>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:13, color:'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      #{p.number} {p.title}
                    </div>
                    <div style={{ fontSize:11, color:'var(--text3)' }}>{p.author} · {dayjs(p.created).fromNow()}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
