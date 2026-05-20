import React, { useState, useMemo, useCallback } from 'react'
import { useStore } from '../lib/store.js'
import { getFileContent } from '../lib/api.js'
import { LAYER_META } from '../lib/archBuilder.js'

const EXT_ICON = { py:'🐍',js:'🟨',jsx:'⚛️',ts:'🔷',tsx:'⚛️',html:'🌐',css:'🎨',json:'📋',yaml:'⚙️',yml:'⚙️',md:'📝',go:'🔵',rs:'🦀',java:'☕',dockerfile:'🐳',vue:'💚',svelte:'🧡' }
function fIcon(name='') { const e=name.split('.').pop()?.toLowerCase(); return name.toLowerCase()==='dockerfile'?'🐳':EXT_ICON[e]||'📄' }

// Rough token estimate (cl100k-style: ~4 chars = 1 token)
function estimateTokens(text) { return Math.ceil(text.length/4) }
function fmtTokens(n) { if(n>=1000) return (n/1000).toFixed(1)+'k'; return String(n) }

// Group files by layer
function groupByLayer(nodes) {
  const groups = {}
  nodes.forEach(n => {
    const l = n.data.layer||'other'
    if (!groups[l]) groups[l] = []
    groups[l].push(n)
  })
  return groups
}

// Get unique extensions
function uniqueExts(nodes) {
  const exts = new Set()
  nodes.forEach(n => {
    const e = n.data.label.split('.').pop()?.toLowerCase()
    if (e) exts.add(e)
  })
  return [...exts].sort()
}

export default function ContextBuilder() {
  const { archNodes, repoData, repoKey } = useStore()

  const [selected,     setSelected]     = useState(() => new Set(archNodes.map(n=>n.id)))
  const [search,       setSearch]       = useState('')
  const [extFilter,    setExtFilter]    = useState(new Set()) // empty = all
  const [loadedContents, setLoadedContents] = useState({}) // id → string content
  const [isGenerating, setIsGenerating] = useState(false)
  const [outputText,   setOutputText]   = useState('')
  const [copied,       setCopied]       = useState(false)
  const [expandedLayers, setExpandedLayers] = useState({})

  const groups = useMemo(()=>groupByLayer(archNodes),[archNodes])
  const allExts = useMemo(()=>uniqueExts(archNodes),[archNodes])

  // Filtered node list
  const filteredNodes = useMemo(()=>{
    return archNodes.filter(n=>{
      const ext = n.data.label.split('.').pop()?.toLowerCase()
      const matchExt = extFilter.size===0 || extFilter.has(ext)
      const matchSearch = !search || n.data.label.toLowerCase().includes(search.toLowerCase()) || (n.data.path||'').toLowerCase().includes(search.toLowerCase())
      return matchExt && matchSearch
    })
  },[archNodes, extFilter, search])

  const selectedNodes = useMemo(()=>filteredNodes.filter(n=>selected.has(n.id)),[filteredNodes,selected])
  const totalSelected = selectedNodes.length
  const totalAll      = archNodes.length

  // Token estimate from output
  const tokenCount = useMemo(()=>estimateTokens(outputText),[outputText])

  function toggleNode(id) {
    setSelected(s=>{ const n=new Set(s); n.has(id)?n.delete(id):n.add(id); return n })
  }
  function toggleLayer(layerNodes) {
    const ids = layerNodes.map(n=>n.id)
    const allSelected = ids.every(id=>selected.has(id))
    setSelected(s=>{ const n=new Set(s); ids.forEach(id=>allSelected?n.delete(id):n.add(id)); return n })
  }
  function selectAll() { setSelected(new Set(filteredNodes.map(n=>n.id))) }
  function deselectAll() { setSelected(new Set()) }
  function toggleExt(ext) { setExtFilter(s=>{ const n=new Set(s); n.has(ext)?n.delete(ext):n.add(ext); return n }) }

  async function generateContext() {
    if (isGenerating||selectedNodes.length===0) return
    setIsGenerating(true)
    setOutputText('')

    const branch = repoData?.selectedBranch||repoData?.default_branch||'main'
    const lines = []

    // Header
    lines.push(`Repository: ${repoData?.name||repoKey}`)
    lines.push(`Branch: ${branch}`)
    lines.push(`Files included: ${selectedNodes.length}/${totalAll}`)
    lines.push(`Generated: ${new Date().toISOString()}`)
    lines.push('')
    lines.push('# File Structure')
    selectedNodes.forEach(n=>lines.push(`  ${n.data.path||n.data.label}`))
    lines.push('')
    lines.push('---')
    lines.push('')

    // Load + append each file
    for (const node of selectedNodes) {
      const id = node.id
      let content = loadedContents[id]

      if (!content) {
        try {
          const res = await getFileContent(repoKey, node.data.path||node.data.label, branch)
          if (res?.content) {
            content = atob(res.content.replace(/\n/g,''))
            setLoadedContents(c=>({ ...c, [id]:content }))
          } else content = '[Could not load file content]'
        } catch { content = '[Error loading file]' }
      }

      lines.push(`---`)
      lines.push(`File: ${node.data.path||node.data.label}`)
      lines.push(`---`)
      lines.push(content.slice(0, 50000)) // cap at 50k chars per file
      lines.push('')
    }

    const text = lines.join('\n')
    setOutputText(text)
    setIsGenerating(false)
  }

  function copy() {
    navigator.clipboard.writeText(outputText).catch(()=>{})
    setCopied(true); setTimeout(()=>setCopied(false),2000)
  }

  function download() {
    const name=(repoData?.name||'repo').replace('/','_')
    const blob=new Blob([outputText],{type:'text/plain'})
    const url=URL.createObjectURL(blob)
    const a=Object.assign(document.createElement('a'),{href:url,download:`${name}-context.txt`})
    a.click(); URL.revokeObjectURL(url)
  }

  return (
    <div style={{ display:'flex',height:'100%',overflow:'hidden' }}>

      {/* ── Left: file selector ── */}
      <div style={{ width:320,background:'var(--surface)',borderRight:'1px solid var(--border)',display:'flex',flexDirection:'column',overflow:'hidden',flexShrink:0 }}>

        {/* Stats bar */}
        <div style={{ padding:'10px 14px',borderBottom:'1px solid var(--border)',background:'var(--bg2)' }}>
          <div style={{ display:'flex',alignItems:'center',gap:10,marginBottom:8 }}>
            <div style={{ background:'var(--surface)',border:'1px solid var(--border)',borderRadius:6,padding:'4px 10px',fontSize:12,color:'var(--text2)' }}>
              Token Count: <strong style={{ color:'var(--text)' }}>~{fmtTokens(tokenCount)}</strong>
            </div>
            <div style={{ fontSize:12,color:'var(--text2)' }}>
              <strong style={{ color:'var(--text)' }}>{totalSelected}</strong> Selected &nbsp;
              <strong style={{ color:'var(--text3)' }}>{totalAll}</strong> Total
            </div>
          </div>

          {/* Extension filters */}
          <div style={{ display:'flex',flexWrap:'wrap',gap:4,marginBottom:6 }}>
            {allExts.map(ext=>{
              const count = archNodes.filter(n=>n.data.label.split('.').pop()?.toLowerCase()===ext).length
              const active = extFilter.size===0||extFilter.has(ext)
              return (
                <button key={ext} onClick={()=>toggleExt(ext)} style={{
                  fontSize:11,padding:'2px 8px',borderRadius:4,cursor:'pointer',fontFamily:'var(--font-mono)',
                  background: active?'var(--blue)':'var(--bg)', color: active?'#fff':'var(--text2)',
                  border:`1px solid ${active?'var(--blue)':'var(--border)'}`,
                  display:'flex',alignItems:'center',gap:4,
                }}>
                  .{ext} <span style={{ opacity:0.75 }}>{count}</span>
                </button>
              )
            })}
          </div>

          {/* Actions */}
          <div style={{ display:'flex',gap:6 }}>
            <button onClick={selectAll} className="btn btn-secondary btn-sm" style={{ fontSize:11 }}>Select All</button>
            <button onClick={deselectAll} className="btn btn-secondary btn-sm" style={{ fontSize:11 }}>Deselect All</button>
            <button onClick={()=>Object.keys(groups).forEach(l=>setExpandedLayers(e=>({...e,[l]:true})))} className="btn btn-secondary btn-sm" style={{ fontSize:11 }}>Expand</button>
            <button onClick={()=>setExpandedLayers({})} className="btn btn-secondary btn-sm" style={{ fontSize:11 }}>Collapse</button>
          </div>
        </div>

        {/* Search */}
        <div style={{ padding:'7px 10px',borderBottom:'1px solid var(--border)' }}>
          <input className="input" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search files and folders…" style={{ fontSize:12 }}/>
        </div>

        {/* File tree by layer */}
        <div style={{ flex:1,overflowY:'auto',padding:'6px 8px' }}>
          <div style={{ fontSize:11,fontWeight:600,color:'var(--text3)',textTransform:'uppercase',letterSpacing:'0.05em',padding:'4px 6px',marginBottom:4 }}>
            Repository Structure
          </div>
          {Object.entries(groups).map(([layer,layerNodes])=>{
            const m = LAYER_META[layer]||LAYER_META.other
            const filtered = layerNodes.filter(n=>filteredNodes.includes(n))
            if (filtered.length===0) return null
            const isExpanded = expandedLayers[layer]!==false  // default open
            const allLayerSel = filtered.every(n=>selected.has(n.id))
            const someLayerSel = filtered.some(n=>selected.has(n.id))
            return (
              <div key={layer} style={{ marginBottom:2 }}>
                <div style={{ display:'flex',alignItems:'center',gap:6,padding:'5px 6px',borderRadius:5,cursor:'pointer' }}
                  onClick={()=>setExpandedLayers(e=>({...e,[layer]:!isExpanded}))}>
                  {/* Checkbox */}
                  <div onClick={e=>{e.stopPropagation();toggleLayer(filtered)}} style={{ width:14,height:14,borderRadius:3,border:`1.5px solid ${allLayerSel?m.color:someLayerSel?m.color:'var(--border)'}`,background:allLayerSel?m.color:someLayerSel?m.color+'40':'transparent',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,cursor:'pointer' }}>
                    {(allLayerSel||someLayerSel)&&<svg width="8" height="8" viewBox="0 0 10 10" fill="white"><path d="M2 5l2.5 2.5L8 2.5" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round"/></svg>}
                  </div>
                  <svg width="10" height="10" viewBox="0 0 16 16" fill="var(--text3)"
                    style={{ transform:isExpanded?'rotate(90deg)':'none',transition:'transform 0.15s',flexShrink:0 }}>
                    <path d="M6.22 3.22a.75.75 0 011.06 0l4.25 4.25a.75.75 0 010 1.06l-4.25 4.25a.75.75 0 01-1.06-1.06L9.94 8 6.22 4.28a.75.75 0 010-1.06z"/>
                  </svg>
                  <div style={{ width:5,height:5,borderRadius:'50%',background:m.color,flexShrink:0 }}/>
                  <span style={{ fontSize:12.5,fontWeight:500,color:'var(--text)',flex:1 }}>{m.label}</span>
                  <span style={{ fontSize:10,color:'var(--text3)',fontFamily:'var(--font-mono)' }}>{filtered.length}</span>
                </div>
                {isExpanded && filtered.map(n=>{
                  const isSel=selected.has(n.id)
                  return (
                    <div key={n.id} style={{ display:'flex',alignItems:'center',gap:7,padding:'4px 6px 4px 28px',borderRadius:5,cursor:'pointer' }}
                      onClick={()=>toggleNode(n.id)}
                      onMouseEnter={e=>e.currentTarget.style.background='var(--bg2)'}
                      onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                      <div style={{ width:14,height:14,borderRadius:3,border:`1.5px solid ${isSel?m.color:'var(--border)'}`,background:isSel?m.color:'transparent',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
                        {isSel&&<svg width="8" height="8" viewBox="0 0 10 10" fill="white"><path d="M2 5l2.5 2.5L8 2.5" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round"/></svg>}
                      </div>
                      <span style={{ fontSize:12,flexShrink:0 }}>{fIcon(n.data.label)}</span>
                      <span style={{ fontSize:12,color:'var(--text2)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',fontFamily:'var(--font-mono)',flex:1 }}>{n.data.label}</span>
                      <span style={{ fontSize:10,color:'var(--text3)',background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:3,padding:'0 4px',fontFamily:'var(--font-mono)',flexShrink:0 }}>
                        {n.data.label.split('.').pop()}
                      </span>
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Right: output ── */}
      <div style={{ flex:1,display:'flex',flexDirection:'column',overflow:'hidden' }}>
        <div style={{ padding:'10px 16px',borderBottom:'1px solid var(--border)',background:'var(--surface)',display:'flex',alignItems:'center',gap:10,flexShrink:0 }}>
          <div style={{ fontSize:14,fontWeight:600,color:'var(--text)' }}>Selected Files Output</div>
          <div style={{ marginLeft:'auto',display:'flex',gap:7 }}>
            <button onClick={generateContext} disabled={isGenerating||totalSelected===0}
              className={`btn btn-sm ${isGenerating||totalSelected===0?'btn-secondary':'btn-primary'}`}>
              {isGenerating?<><span className="spinner-sm"/> Generating…</>:
                <><svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M8.878.392a1.75 1.75 0 00-1.756 0l-5.25 3.045A1.75 1.75 0 001 5.049v5.91c0 .896.471 1.727 1.244 2.181l5.25 3.046a1.75 1.75 0 001.756 0l5.25-3.046A2.5 2.5 0 0015 10.96V5.049a1.75 1.75 0 00-.872-1.517L8.878.392z"/></svg> Generate Text File</>}
            </button>
            <button onClick={download} disabled={!outputText} className="btn btn-secondary btn-sm">
              <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M2.75 14A1.75 1.75 0 011 12.25v-2.5a.75.75 0 011.5 0v2.5c0 .138.112.25.25.25h10.5a.25.25 0 00.25-.25v-2.5a.75.75 0 011.5 0v2.5A1.75 1.75 0 0113.25 14H2.75z"/><path d="M7.25 7.689V2a.75.75 0 011.5 0v5.689l1.97-1.969a.749.749 0 111.06 1.06l-3.25 3.25a.749.749 0 01-1.06 0L4.22 6.78a.749.749 0 111.06-1.06l1.97 1.969z"/></svg>
              Download as .txt
            </button>
            {outputText && (
              <button onClick={copy} className="btn btn-secondary btn-sm">
                {copied?'✓ Copied':'⎘ Copy'}
              </button>
            )}
          </div>
        </div>

        <div style={{ flex:1,overflow:'auto',padding:16,background:'var(--bg)' }}>
          {!outputText ? (
            <div style={{ display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:'100%',gap:12,color:'var(--text3)' }}>
              <div style={{ fontSize:36 }}>📋</div>
              <div style={{ fontSize:14,fontWeight:600,color:'var(--text)' }}>Build context for your LLM</div>
              <div style={{ fontSize:13,textAlign:'center',maxWidth:340,lineHeight:1.6 }}>
                Select files on the left, then click "Generate Text File" to create an LLM-ready context document with all selected file contents.
              </div>
              {totalSelected>0 && (
                <div style={{ fontSize:12,color:'var(--text2)' }}>
                  {totalSelected} files selected · estimated {fmtTokens(totalSelected*300)} tokens
                </div>
              )}
            </div>
          ) : (
            <pre style={{ fontFamily:'var(--font-mono)',fontSize:12,lineHeight:1.65,color:'var(--text2)',background:'var(--surface)',border:'1px solid var(--border)',borderRadius:8,padding:16,margin:0,whiteSpace:'pre-wrap',wordBreak:'break-word' }}>
              {outputText}
            </pre>
          )}
        </div>
      </div>
    </div>
  )
}
