import React, { useState, useRef, useEffect } from 'react'
import { useStore } from '../lib/store.js'

const TYPE_META = {
  github:  { label: 'GitHub',  dot: '#4d9fff' },
  backend: { label: 'Backend', dot: '#3dd68c' },
  openai:  { label: 'OpenAI',  dot: '#a78bfa' },
}
const METHOD_COLORS = {
  GET:  { color: '#3dd68c', bg: 'rgba(61,214,140,0.10)' },
  POST: { color: '#4d9fff', bg: 'rgba(77,159,255,0.10)' },
}
const AGENT_COLORS = {
  Orchestrator:   '#4d9fff',
  CodeAgent:      '#22d3ee',
  ArchitectAgent: '#3dd68c',
  ActivityAgent:  '#f0a429',
  Synthesizer:    '#a78bfa',
}

function statusColor(s) {
  if (!s || s === 0) return '#f05454'
  if (s < 300)       return '#3dd68c'
  if (s < 400)       return '#f0a429'
  return '#f05454'
}
function fmt(bytes) {
  if (!bytes) return '0 B'
  if (bytes < 1024)       return bytes + ' B'
  if (bytes < 1024*1024)  return (bytes/1024).toFixed(1) + ' KB'
  return (bytes/(1024*1024)).toFixed(2) + ' MB'
}
function fmtTs(iso) {
  const d = new Date(iso)
  return d.toLocaleTimeString('en-US', { hour12:false, hour:'2-digit', minute:'2-digit', second:'2-digit' }) +
    '.' + String(d.getMilliseconds()).padStart(3,'0')
}

export default function ObsPanel() {
  const { obsLogs, obsFilter, obsOpen, setObsOpen, setObsFilter,
          clearObsLogs, agentTraces } = useStore()
  const [selected, setSelected]  = useState(null)
  const [view, setView]          = useState('requests') // 'requests' | 'agents'
  const [search, setSearch]      = useState('')
  const listRef = useRef(null)
  const prevCount = useRef(obsLogs.length)

  useEffect(() => {
    if (obsLogs.length !== prevCount.current) {
      prevCount.current = obsLogs.length
      if (view === 'requests') listRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [obsLogs.length])

  const filtered = obsLogs.filter(l => {
    if (obsFilter === 'error'  && !l.error)          return false
    if (obsFilter !== 'all' && obsFilter !== 'error' && l.type !== obsFilter) return false
    if (search && !l.url.toLowerCase().includes(search.toLowerCase()) &&
        !l.label.toLowerCase().includes(search.toLowerCase()))               return false
    return true
  })

  const totalTokens = agentTraces.reduce((a, t) => a + (t.totalTokens || 0), 0)
  const errors = obsLogs.filter(l => l.error).length
  const avgMs  = obsLogs.length
    ? Math.round(obsLogs.reduce((a, l) => a + l.duration, 0) / obsLogs.length) : 0

  if (!obsOpen) {
    return (
      <button className="obs-fab"
        onClick={() => setObsOpen(true)}
        title="Open Network Observability"
        style={{
          background: errors > 0 ? 'rgba(240,84,84,0.15)' : 'rgba(240,164,41,0.12)',
          border: `1px solid ${errors > 0 ? 'rgba(240,84,84,0.4)' : 'rgba(240,164,41,0.3)'}`,
        }}
      >
        <RadarIcon color={errors > 0 ? '#f05454' : '#f0a429'} />
        {obsLogs.length > 0 && (
          <span className="obs-fab-badge" style={{
            background: errors > 0 ? '#f05454' : '#f0a429', color: '#000',
          }}>
            {obsLogs.length > 99 ? '99+' : obsLogs.length}
          </span>
        )}
      </button>
    )
  }

  return (
    <>
      <div onClick={e => e.target === e.currentTarget && setObsOpen(false)}
        style={{ position:'fixed', inset:0, zIndex:900, background:'rgba(0,0,0,0.5)', backdropFilter:'blur(2px)' }} />

      <div style={{
        position:'fixed', right:0, top:0, bottom:0, width:840, zIndex:910,
        background:'var(--bg)', borderLeft:'1px solid var(--border)',
        display:'flex', flexDirection:'column',
        boxShadow:'-20px 0 60px rgba(0,0,0,0.6)', animation:'slideInRight 0.25s ease',
        fontFamily:'var(--font-mono)',
      }}>
        {/* Header */}
        <div style={{ padding:'16px 20px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:14, flexShrink:0 }}>
          <div style={{ width:32, height:32, borderRadius:8, background:'rgba(240,164,41,0.12)', border:'1px solid rgba(240,164,41,0.25)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <RadarIcon />
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:14, fontWeight:600, color:'var(--text)', fontFamily:'var(--font-display)' }}>Network Observability</div>
            <div style={{ fontSize:11, color:'var(--text3)' }}>
              {obsLogs.length} requests · avg {avgMs}ms · {fmt(obsLogs.reduce((a,l)=>a+l.size,0))} · 🪙 {totalTokens.toLocaleString()} tokens
            </div>
          </div>
          <button onClick={clearObsLogs} style={gBtn}>Clear</button>
          <button onClick={() => setObsOpen(false)} style={{ ...gBtn, fontSize:18 }}>×</button>
        </div>

        {/* View toggle */}
        <div style={{ display:'flex', borderBottom:'1px solid var(--border)', flexShrink:0 }}>
          {[
            { key:'requests', label:`Network requests  ${obsLogs.length}` },
            { key:'agents',   label:`Agent traces  ${agentTraces.length}` },
          ].map(v => (
            <button key={v.key} onClick={() => setView(v.key)} style={{
              flex:1, padding:'10px 0', border:'none', background:'transparent',
              borderBottom:`2px solid ${view === v.key ? 'var(--amber)' : 'transparent'}`,
              color: view === v.key ? 'var(--amber)' : 'var(--text3)',
              fontSize:12, cursor:'pointer', fontFamily:'var(--font-mono)',
            }}>
              {v.label}
            </button>
          ))}
        </div>

        {view === 'requests' ? (
          <>
            {/* Filters */}
            <div style={{ display:'flex', borderBottom:'1px solid var(--border)', flexShrink:0 }}>
              {[
                { key:'all',     label:`All  ${obsLogs.length}` },
                { key:'github',  label:`GitHub  ${obsLogs.filter(l=>l.type==='github').length}` },
                { key:'backend', label:`Backend  ${obsLogs.filter(l=>l.type==='backend').length}` },
                { key:'error',   label:`Errors  ${errors}` },
              ].map(f => (
                <button key={f.key} onClick={() => setObsFilter(f.key)} style={{
                  flex:1, padding:'9px 0', border:'none', background:'transparent',
                  borderBottom:`2px solid ${obsFilter===f.key ? 'var(--blue)' : 'transparent'}`,
                  color: obsFilter===f.key ? 'var(--blue)' : 'var(--text3)',
                  fontSize:11, cursor:'pointer', fontFamily:'var(--font-mono)',
                }}>
                  {f.label}
                </button>
              ))}
            </div>

            {/* Search */}
            <div style={{ padding:'8px 14px', borderBottom:'1px solid var(--border)', flexShrink:0 }}>
              <input value={search} onChange={e=>setSearch(e.target.value)}
                placeholder="Filter by URL or label…"
                style={{ width:'100%', padding:'6px 10px', fontSize:12, fontFamily:'var(--font-mono)', background:'var(--bg)', border:'1px solid var(--border)', borderRadius:6, color:'var(--text)' }} />
            </div>

            {/* Split — list + detail */}
            <div style={{ flex:1, display:'flex', overflow:'hidden' }}>
              <div ref={listRef} style={{ flex: selected ? '0 0 340px' : 1, overflow:'auto', borderRight: selected ? '1px solid var(--border)' : 'none' }}>
                {filtered.length === 0 && (
                  <div style={{ padding:'40px 20px', textAlign:'center', color:'var(--text3)', fontSize:13 }}>
                    {obsLogs.length === 0 ? 'No requests yet. Analyze a repo to start.' : 'No requests match this filter.'}
                  </div>
                )}
                {filtered.map(log => (
                  <LogRow key={log.id} log={log}
                    selected={selected?.id===log.id}
                    onClick={() => setSelected(selected?.id===log.id ? null : log)} />
                ))}
              </div>
              {selected && (
                <div style={{ flex:1, overflow:'auto', padding:16 }}>
                  <DetailPane log={selected} onClose={() => setSelected(null)} />
                </div>
              )}
            </div>

            {/* Waterfall */}
            {obsLogs.length > 0 && !selected && <Waterfall logs={obsLogs.slice(0,20)} />}
          </>
        ) : (
          /* Agent traces view */
          <div style={{ flex:1, overflow:'auto', padding:16 }}>
            {agentTraces.length === 0 ? (
              <div style={{ padding:40, textAlign:'center', color:'var(--text3)', fontSize:13 }}>
                No agent traces yet. Ask a question in Chat to see agent activity.
              </div>
            ) : (
              agentTraces.map(trace => <TraceCard key={trace.id} trace={trace} />)
            )}
          </div>
        )}
      </div>
    </>
  )
}

function TraceCard({ trace }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ marginBottom:12, background:'var(--bg)', border:'1px solid var(--border)', borderRadius:12, overflow:'hidden' }}>
      <button onClick={() => setOpen(!open)} style={{
        width:'100%', padding:'12px 16px', background:'none', border:'none', cursor:'pointer',
        display:'flex', alignItems:'center', gap:12, textAlign:'left',
      }}>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:13, color:'var(--text)', marginBottom:4, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
            {trace.question}
          </div>
          <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
            <span style={{ fontSize:10, color:'var(--blue)', fontFamily:'var(--font-mono)' }}>🪙 {(trace.totalTokens||0).toLocaleString()} tokens</span>
            <span style={{ fontSize:10, color:'var(--text3)', fontFamily:'var(--font-mono)' }}>⏱ {trace.totalMs||0}ms</span>
            <span style={{ fontSize:10, color:'var(--purple)', fontFamily:'var(--font-mono)' }}>🤖 {(trace.agentsUsed||[]).length} agents</span>
            <span style={{ fontSize:10, color:'var(--cyan)', fontFamily:'var(--font-mono)' }}>📄 {(trace.sources||[]).length} sources</span>
            <span style={{ fontSize:10, color:'var(--text3)', fontFamily:'var(--font-mono)' }}>🔻 {trace.tokensIn||0} in / 🔺 {trace.tokensOut||0} out</span>
          </div>
        </div>
        <span style={{ color:'var(--text3)', fontSize:12, flexShrink:0 }}>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div style={{ borderTop:'1px solid var(--border)', padding:'12px 16px', animation:'fadeIn 0.2s ease' }}>
          {(trace.steps||[]).map((step, i) => {
            const color = AGENT_COLORS[step.agent] || 'var(--text3)'
            return (
              <div key={i} style={{ display:'flex', gap:10, paddingBottom:8, borderBottom: i<trace.steps.length-1 ? '1px solid var(--border)' : 'none', marginBottom:8 }}>
                <div style={{ width:6, height:6, borderRadius:'50%', background:color, marginTop:5, flexShrink:0 }} />
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:2 }}>
                    <span style={{ fontSize:11, fontWeight:700, color }}>{step.agent}</span>
                    <span style={{ fontSize:10, color:'var(--text3)' }}>{step.action}</span>
                    {step.ms > 0 && <span style={{ marginLeft:'auto', fontSize:10, color:'var(--text3)' }}>{step.ms}ms</span>}
                  </div>
                  <div style={{ fontSize:12, color:'var(--text2)' }}>{step.detail}</div>
                  {step.result && <div style={{ fontSize:11, color:'var(--text3)', marginTop:2 }}>→ {step.result}</div>}
                </div>
              </div>
            )
          })}

          {(trace.sources||[]).length > 0 && (
            <div style={{ marginTop:8, display:'flex', gap:6, flexWrap:'wrap' }}>
              {trace.sources.map(s => (
                <span key={s} style={{ fontSize:10, padding:'2px 8px', borderRadius:100, background:'var(--surface2)', color:'var(--text3)', fontFamily:'var(--font-mono)' }}>
                  📄 {s.split('/').pop()}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function LogRow({ log, selected, onClick }) {
  const mc  = METHOD_COLORS[log.method] || METHOD_COLORS.GET
  const sc  = statusColor(log.status)
  const pct = Math.min((log.duration / 5000) * 100, 100)
  return (
    <div onClick={onClick} style={{
      padding:'9px 14px', cursor:'pointer',
      background: selected ? 'var(--surface)' : 'transparent',
      borderBottom:'1px solid var(--border)',
      borderLeft:`3px solid ${log.error ? '#f05454' : 'transparent'}`,
      transition:'background 0.1s',
    }}
    onMouseEnter={e => { if (!selected) e.currentTarget.style.background='var(--surface)' }}
    onMouseLeave={e => { if (!selected) e.currentTarget.style.background='transparent' }}
    >
      <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:4 }}>
        <span style={{ fontSize:10, fontWeight:700, padding:'2px 5px', borderRadius:3, background:mc.bg, color:mc.color, flexShrink:0 }}>{log.method}</span>
        <span style={{ width:6, height:6, borderRadius:'50%', background:TYPE_META[log.type]?.dot||'#888', flexShrink:0 }} />
        <span style={{ fontSize:12, color:log.error?'#f05454':'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flex:1 }}>{log.label}</span>
        <span style={{ fontSize:11, color:sc, flexShrink:0, fontWeight:700 }}>{log.status||'ERR'}</span>
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:7 }}>
        <span style={{ fontSize:10, color:'var(--text3)', flexShrink:0 }}>{fmtTs(log.ts)}</span>
        <div style={{ flex:1, height:3, background:'var(--surface2)', borderRadius:2, overflow:'hidden' }}>
          <div style={{ height:'100%', width:pct+'%', borderRadius:2, background: log.error?'#f05454':log.duration>2000?'#f0a429':'#3dd68c', transition:'width 0.3s' }} />
        </div>
        <span style={{ fontSize:10, color:'var(--text3)', flexShrink:0, minWidth:40, textAlign:'right' }}>{log.duration}ms</span>
        {log.size > 0 && <span style={{ fontSize:10, color:'var(--text3)', flexShrink:0 }}>{fmt(log.size)}</span>}
      </div>
      <div style={{ fontSize:10, color:'var(--text3)', marginTop:2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{log.url}</div>
    </div>
  )
}

function DetailPane({ log, onClose }) {
  const [tab, setTab] = useState('response')
  const mc = METHOD_COLORS[log.method] || METHOD_COLORS.GET
  const sc = statusColor(log.status)
  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <span style={{ fontSize:11, fontWeight:700, padding:'2px 7px', borderRadius:4, background:mc.bg, color:mc.color }}>{log.method}</span>
          <span style={{ fontSize:13, fontWeight:600, color:sc }}>{log.status||'ERR'}</span>
          <span style={{ fontSize:11, color:'var(--text3)' }}>{log.duration}ms · {fmt(log.size)}</span>
        </div>
        <button onClick={onClose} style={gBtn}>×</button>
      </div>
      <div style={{ fontSize:11, padding:'7px 10px', background:'var(--bg)', border:'1px solid var(--border)', borderRadius:6, color:'var(--text2)', wordBreak:'break-all', marginBottom:12, lineHeight:1.5 }}>
        {log.url}
      </div>
      {log.error && (
        <div style={{ padding:'8px 10px', background:'rgba(240,84,84,0.10)', border:'1px solid rgba(240,84,84,0.25)', borderRadius:6, fontSize:12, color:'#f05454', marginBottom:12 }}>
          ⚠ {log.error}
        </div>
      )}
      <div style={{ display:'flex', borderBottom:'1px solid var(--border)', marginBottom:10 }}>
        {['response','payload','timing'].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding:'6px 12px', border:'none', background:'transparent',
            borderBottom:`2px solid ${tab===t?'var(--blue)':'transparent'}`,
            color:tab===t?'var(--blue)':'var(--text3)',
            fontSize:11, cursor:'pointer', fontFamily:'var(--font-mono)', textTransform:'capitalize',
          }}>{t}</button>
        ))}
      </div>
      {tab==='response' && <JsonViewer data={log.response} />}
      {tab==='payload'  && (log.payload ? <JsonViewer data={log.payload} /> : <div style={{ fontSize:12, color:'var(--text3)', padding:10 }}>No request payload (GET)</div>)}
      {tab==='timing'   && <TimingBlock log={log} />}
    </div>
  )
}

function JsonViewer({ data }) {
  const json = typeof data === 'string' ? data : JSON.stringify(data, null, 2)
  return (
    <pre style={{ fontSize:11, lineHeight:1.7, background:'var(--bg)', border:'1px solid var(--border)', borderRadius:8, padding:12, overflow:'auto', maxHeight:380, color:'var(--text2)', whiteSpace:'pre-wrap', wordBreak:'break-word' }}>
      {json}
    </pre>
  )
}

function TimingBlock({ log }) {
  const stages = [
    { label:'DNS lookup',       ms:Math.round(log.duration*0.05), color:'#a78bfa' },
    { label:'TCP connect',      ms:Math.round(log.duration*0.10), color:'#4d9fff' },
    { label:'Request sent',     ms:Math.round(log.duration*0.03), color:'#f0a429' },
    { label:'Waiting (TTFB)',  ms:Math.round(log.duration*0.60), color:'#22d3ee' },
    { label:'Content download', ms:Math.round(log.duration*0.22), color:'#3dd68c' },
  ]
  const total = stages.reduce((a,s)=>a+s.ms, 0)
  return (
    <div>
      {stages.map(s => (
        <div key={s.label} style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
          <div style={{ width:120, fontSize:11, color:'var(--text3)', flexShrink:0 }}>{s.label}</div>
          <div style={{ flex:1, height:5, background:'var(--surface2)', borderRadius:3 }}>
            <div style={{ height:'100%', width:(s.ms/total*100)+'%', background:s.color, borderRadius:3 }} />
          </div>
          <div style={{ width:48, fontSize:11, color:s.color, textAlign:'right', flexShrink:0 }}>{s.ms}ms</div>
        </div>
      ))}
    </div>
  )
}

function Waterfall({ logs }) {
  const rev      = [...logs].reverse()
  const earliest = Math.min(...rev.map(l => new Date(l.ts).getTime()))
  const latest   = Math.max(...rev.map(l => new Date(l.ts).getTime() + l.duration))
  const span     = Math.max(latest - earliest, 100)
  return (
    <div style={{ borderTop:'1px solid var(--border)', padding:'10px 14px', background:'var(--bg2)', flexShrink:0, maxHeight:160, overflow:'auto' }}>
      <div style={{ fontSize:10, color:'var(--text3)', marginBottom:7, letterSpacing:'0.05em' }}>TIMELINE — last {rev.length} requests</div>
      {rev.map(log => {
        const left  = ((new Date(log.ts).getTime()-earliest)/span)*100
        const width = Math.max((log.duration/span)*100, 0.5)
        const color = log.error ? '#f05454' : TYPE_META[log.type]?.dot || '#4d9fff'
        return (
          <div key={log.id} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:3 }}>
            <div style={{ width:150, fontSize:10, color:'var(--text3)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flexShrink:0 }}>{log.label.slice(0,28)}</div>
            <div style={{ flex:1, position:'relative', height:12 }}>
              <div style={{ position:'absolute', top:2, height:8, borderRadius:2, left:left+'%', width:Math.max(width,0.5)+'%', background:color+'cc', minWidth:4 }} />
            </div>
            <div style={{ fontSize:10, color:'var(--text3)', width:38, textAlign:'right', flexShrink:0 }}>{log.duration}ms</div>
          </div>
        )
      })}
    </div>
  )
}

const gBtn = { background:'none', border:'1px solid var(--border)', borderRadius:6, color:'var(--text3)', fontSize:12, padding:'4px 9px', cursor:'pointer', fontFamily:'var(--font-mono)' }

function RadarIcon({ color='#f0a429', size=16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round">
      <circle cx="12" cy="12" r="2"/>
      <path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14"/>
    </svg>
  )
}
