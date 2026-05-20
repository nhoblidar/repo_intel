import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import ReactFlow, {
  Background, Controls, MiniMap,
  useNodesState, useEdgesState, MarkerType, Panel,
  Handle, Position,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { useStore } from '../lib/store.js'
import { agentQuery, getFileContent } from '../lib/api.js'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { LAYER_META } from '../lib/archBuilder.js'

const EXT_ICON = { py:'🐍',js:'🟨',jsx:'⚛️',ts:'🔷',tsx:'⚛️',html:'🌐',css:'🎨',scss:'🎨',json:'📋',yaml:'⚙️',yml:'⚙️',toml:'⚙️',md:'📝',go:'🔵',rs:'🦀',java:'☕',rb:'💎',sh:'💻',dockerfile:'🐳',vue:'💚',svelte:'🧡' }
function fIcon(name='') { const e=name.split('.').pop()?.toLowerCase(); return name.toLowerCase()==='dockerfile'?'🐳':EXT_ICON[e]||'📄' }

// ── File node ────────────────────────────────────────────────
function FileNode({ data, selected }) {
  const [hov, setHov] = useState(false)
  const active = selected||hov
  const color  = data.color||'#6b7280'
  return (
    <>
      <Handle type="target" position={Position.Top} style={{ width:7,height:7,background:color,border:'2px solid white' }}/>
      <div onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)} style={{
        background:'var(--surface)', border:`1.5px solid ${active?color:'var(--border)'}`,
        borderRadius:9, padding:'9px 12px', minWidth:148, maxWidth:180,
        cursor:'pointer', transition:'all 0.15s',
        boxShadow: selected?`0 0 0 3px ${color}20,var(--shadow-lg)`:active?'var(--shadow)':'var(--shadow-xs)',
        position:'relative',
      }}>
        <div style={{ position:'absolute',top:0,left:0,right:0,height:3,background:color,borderRadius:'9px 9px 0 0',opacity:active?1:0.35,transition:'opacity 0.15s' }}/>
        <div style={{ display:'flex',alignItems:'center',gap:6,marginBottom:4 }}>
          <span style={{ fontSize:13,lineHeight:1,flexShrink:0 }}>{fIcon(data.label)}</span>
          <span style={{ fontSize:12,fontWeight:700,color:'var(--text)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',flex:1,fontFamily:'var(--font-mono)' }}>{data.label}</span>
        </div>
        <span style={{ fontSize:9,fontWeight:600,padding:'1px 6px',borderRadius:100,background:color+'14',color,textTransform:'uppercase',letterSpacing:'0.04em',fontFamily:'var(--font-mono)' }}>
          {LAYER_META[data.layer]?.label||data.layer}
        </span>
      </div>
      <Handle type="source" position={Position.Bottom} style={{ width:7,height:7,background:color,border:'2px solid white' }}/>
    </>
  )
}
const nodeTypes = { arch: FileNode }

export default function GraphExplorer() {
  const { archNodes:initNodes, archEdges:initEdges, repoData, repoKey, addMessage, addAgentTrace } = useStore()

  const [nodes,,onNodesChange] = useNodesState(initNodes)
  const [edges,,onEdgesChange] = useEdgesState(
    initEdges.map(e=>({ ...e, type:'smoothstep', style:{ stroke:'var(--border)',strokeWidth:1.5 }, markerEnd:{ type:MarkerType.ArrowClosed,color:'#d0d7de',width:10,height:10 }, labelStyle:{ fill:'var(--text3)',fontSize:9,fontFamily:'var(--font-mono)' }, labelBgStyle:{ fill:'var(--bg)',fillOpacity:1,rx:3 }, labelBgPadding:[3,5] }))
  )

  const [sel,          setSel]          = useState(null)
  const [tab,          setTab]          = useState('info')    // info | content | ai
  const [aiTxt,        setAiTxt]        = useState('')
  const [aiLoading,    setAiLoading]    = useState(false)
  const [fileContent,  setFileContent]  = useState(null)
  const [fileLoading,  setFileLoading]  = useState(false)
  const [search,       setSearch]       = useState('')
  const [layerFilter,  setLayerFilter]  = useState(null)
  const [graphSearch,  setGraphSearch]  = useState('')

  const onNodeClick = useCallback((_,n)=>{ setSel(n.data); setAiTxt(''); setFileContent(null); setTab('info') },[])
  const onPaneClick = useCallback(()=>{ setSel(null) },[])

  const layerCounts = useMemo(()=>{
    const c={}; initNodes.forEach(n=>{ c[n.data.layer]=(c[n.data.layer]||0)+1 }); return c
  },[initNodes])

  // Search highlight — dim non-matching nodes
  const displayNodes = useMemo(()=>{
    const q = (graphSearch||search).toLowerCase()
    const lf = layerFilter
    if (!q && !lf) return nodes
    return nodes.map(n=>({
      ...n,
      style:{ opacity:((!lf||n.data.layer===lf)&&(!q||n.data.label.toLowerCase().includes(q)))?1:0.1 }
    }))
  },[nodes,search,layerFilter,graphSearch])

  async function analyseFile(node) {
    if (!repoKey||aiLoading) return
    setAiLoading(true); setAiTxt(''); setTab('ai')
    try {
      const q=`Explain what "${node.path||node.label}" does in ${repoData?.name}. Cover: purpose, key functions/classes, dependencies it imports, and how it fits into the overall architecture.`
      const res = await agentQuery(repoKey, q, repoData?.workspace_id, null)
      setAiTxt(res.answer||'')
      addAgentTrace({ question:q, steps:res.steps||[], totalTokens:res.total_tokens||0, tokensIn:res.tokens_in||0, tokensOut:res.tokens_out||0, totalMs:res.total_ms||0, sources:res.sources||[], agentsUsed:res.agents_used||[] })
    } catch { setAiTxt('Could not reach the backend.') }
    setAiLoading(false)
  }

  async function loadContent(node) {
    if (!repoKey||fileLoading) return
    setFileLoading(true); setTab('content')
    try {
      const branch = repoData?.selectedBranch||repoData?.default_branch||'main'
      const res = await getFileContent(repoKey, node.path||node.label, branch)
      if (res?.content) {
        setFileContent(atob(res.content.replace(/\n/g,'')))
      } else setFileContent('Could not load file.')
    } catch { setFileContent('Could not load file content.') }
    setFileLoading(false)
  }

  function toChat(q) {
    addMessage({ id:Date.now(), role:'user', content:q })
    useStore.setState({ activeTab:'chat', pendingQuestion:q })
  }

  const selColor = sel?.color||'var(--blue)'
  const noGraph  = initNodes.length===0
  const filteredFiles = initNodes.filter(n=>(!layerFilter||n.data.layer===layerFilter)&&(!search||n.data.label.toLowerCase().includes(search.toLowerCase())))

  return (
    <div style={{ display:'flex',height:'100%',overflow:'hidden',background:'var(--bg)' }}>

      {/* ── Left: layer filter + file list ── */}
      <div style={{ width:200,background:'var(--surface)',borderRight:'1px solid var(--border)',display:'flex',flexDirection:'column',overflow:'hidden',flexShrink:0 }}>
        <div style={{ padding:'10px 12px 6px',borderBottom:'1px solid var(--border)' }}>
          <div className="section-label">Layers</div>
          <button onClick={()=>setLayerFilter(null)} style={{ width:'100%',display:'flex',alignItems:'center',gap:7,padding:'5px 7px',borderRadius:5,border:'none',cursor:'pointer',background:!layerFilter?'var(--blue-dim)':'transparent',color:!layerFilter?'var(--blue)':'var(--text2)',fontSize:12.5,fontWeight:!layerFilter?600:400,marginBottom:1,textAlign:'left' }}>
            <div style={{ width:6,height:6,borderRadius:'50%',background:'#9ca3af' }}/><span style={{ flex:1 }}>All files</span>
            <span style={{ fontSize:10,color:'var(--text3)',fontFamily:'var(--font-mono)' }}>{initNodes.length}</span>
          </button>
          {Object.entries(layerCounts).sort(([,a],[,b])=>b-a).map(([layer,count])=>{
            const m=LAYER_META[layer]||LAYER_META.other; const isAct=layerFilter===layer
            return (
              <button key={layer} onClick={()=>setLayerFilter(isAct?null:layer)} style={{ width:'100%',display:'flex',alignItems:'center',gap:7,padding:'5px 7px',borderRadius:5,border:'none',cursor:'pointer',background:isAct?m.color+'14':'transparent',color:isAct?m.color:'var(--text2)',fontSize:12.5,fontWeight:isAct?600:400,marginBottom:1,textAlign:'left' }}>
                <div style={{ width:6,height:6,borderRadius:'50%',background:m.color,flexShrink:0 }}/><span style={{ flex:1 }}>{m.label}</span>
                <span style={{ fontSize:10,color:'var(--text3)',fontFamily:'var(--font-mono)' }}>{count}</span>
              </button>
            )
          })}
        </div>
        <div style={{ padding:'7px 10px',borderBottom:'1px solid var(--border)' }}>
          <input className="input" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Filter files…" style={{ fontSize:12 }}/>
        </div>
        <div style={{ flex:1,overflowY:'auto',padding:'3px 5px' }}>
          {filteredFiles.map(n=>{
            const color=n.data.color||'#6b7280'; const isSel=sel?.path===n.data.path
            return (
              <button key={n.id} onClick={()=>{setSel(n.data);setAiTxt('');setFileContent(null);setTab('info')}} style={{ width:'100%',display:'flex',alignItems:'center',gap:6,padding:'4px 6px',borderRadius:4,border:'none',cursor:'pointer',background:isSel?color+'12':'transparent',color:isSel?color:'var(--text2)',fontSize:11.5,textAlign:'left',marginBottom:1,transition:'all 0.08s' }}
                onMouseEnter={e=>{if(!isSel)e.currentTarget.style.background='var(--bg2)'}}
                onMouseLeave={e=>{if(!isSel)e.currentTarget.style.background='transparent'}}>
                <div style={{ width:5,height:5,borderRadius:'50%',background:color,flexShrink:0 }}/>
                <span style={{ overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',fontFamily:'var(--font-mono)' }}>{n.data.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Centre: graph ── */}
      <div style={{ flex:1,position:'relative',display:'flex',flexDirection:'column' }}>
        {/* Graph search bar — like GitVizz */}
        <div style={{ padding:'7px 12px',borderBottom:'1px solid var(--border)',background:'var(--surface)',display:'flex',gap:8,alignItems:'center',flexShrink:0 }}>
          <svg width="13" height="13" viewBox="0 0 16 16" fill="var(--text3)"><path d="M10.68 11.74a6 6 0 01-7.922-8.982 6 6 0 018.982 7.922l3.04 3.04a.749.749 0 01-.326 1.275.749.749 0 01-.734-.215zm-1.42-1.096a4.5 4.5 0 10-6.456-6.258 4.5 4.5 0 006.456 6.258z"/></svg>
          <input value={graphSearch} onChange={e=>setGraphSearch(e.target.value)}
            placeholder="Search graph nodes…"
            style={{ flex:1,border:'none',background:'transparent',outline:'none',fontSize:13,color:'var(--text)' }}/>
          {graphSearch && <button onClick={()=>setGraphSearch('')} style={{ background:'none',border:'none',cursor:'pointer',color:'var(--text3)',fontSize:16,lineHeight:1 }}>×</button>}
          <span style={{ fontSize:11,color:'var(--text3)',flexShrink:0 }}>{initNodes.length} nodes · {initEdges.length} edges</span>
        </div>

        <div style={{ flex:1,position:'relative' }}>
          {noGraph ? (
            <div style={{ position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:10 }}>
              <div style={{ fontSize:36 }}>⬡</div>
              <div style={{ fontSize:14,fontWeight:600,color:'var(--text)' }}>No graph data</div>
              <div style={{ fontSize:13,color:'var(--text3)',textAlign:'center',maxWidth:280 }}>Analyze a repo to build the dependency graph.</div>
            </div>
          ) : (
            <ReactFlow nodes={displayNodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
              onNodeClick={onNodeClick} onPaneClick={onPaneClick} nodeTypes={nodeTypes}
              fitView fitViewOptions={{ padding:0.18 }} proOptions={{ hideAttribution:true }}
              style={{ background:'var(--bg)' }}>
              <Background color="var(--border)" gap={22} size={1} variant="dots"/>
              <Controls style={{ background:'var(--surface)',border:'1px solid var(--border)',borderRadius:7,boxShadow:'var(--shadow)' }}/>
              <MiniMap style={{ background:'var(--surface)',border:'1px solid var(--border)',borderRadius:7,boxShadow:'var(--shadow)' }}
                nodeColor={n=>n.data?.color||'#9ca3af'} maskColor="rgba(246,248,250,0.8)"/>
              <Panel position="bottom-center">
                <div style={{ background:'var(--surface)',border:'1px solid var(--border)',borderRadius:100,padding:'5px 16px',fontSize:11,color:'var(--text3)',boxShadow:'var(--shadow)',display:'flex',gap:12 }}>
                  <span>Scroll to zoom</span><span style={{ color:'var(--border)' }}>·</span>
                  <span>Drag to pan</span><span style={{ color:'var(--border)' }}>·</span>
                  <span>Click file to inspect</span>
                </div>
              </Panel>
            </ReactFlow>
          )}
        </div>
      </div>

      {/* ── Right: inspector with 3 tabs ── */}
      {sel && (
        <div style={{ width:340,background:'var(--surface)',borderLeft:'1px solid var(--border)',display:'flex',flexDirection:'column',flexShrink:0,boxShadow:'-2px 0 10px rgba(31,35,40,0.05)',animation:'fadeInRight 0.2s ease' }}>
          {/* Header */}
          <div style={{ padding:'12px 14px 10px',borderBottom:'1px solid var(--border)' }}>
            <div style={{ display:'flex',alignItems:'flex-start',gap:8,marginBottom:8 }}>
              <div style={{ width:32,height:32,borderRadius:7,background:selColor+'12',border:`1px solid ${selColor}25`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,flexShrink:0 }}>{fIcon(sel.label)}</div>
              <div style={{ flex:1,minWidth:0 }}>
                <div style={{ fontSize:12,fontWeight:700,color:'var(--text)',wordBreak:'break-all',fontFamily:'var(--font-mono)',marginBottom:1 }}>{sel.label}</div>
                <div style={{ fontSize:10,color:'var(--text3)',fontFamily:'var(--font-mono)' }}>{sel.path}</div>
              </div>
              <button onClick={()=>setSel(null)} style={{ background:'none',border:'1px solid var(--border)',borderRadius:5,width:22,height:22,cursor:'pointer',color:'var(--text3)',fontSize:12,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>×</button>
            </div>
            <span style={{ fontSize:9,fontWeight:600,padding:'2px 8px',borderRadius:100,background:selColor+'12',color:selColor,textTransform:'uppercase',letterSpacing:'0.05em' }}>
              {LAYER_META[sel.layer]?.label||sel.layer}
            </span>
          </div>

          {/* Tab bar */}
          <div style={{ display:'flex',borderBottom:'1px solid var(--border)',flexShrink:0 }}>
            {[['info','Info'],['content','Content'],['ai','AI Analysis']].map(([id,label])=>(
              <button key={id} onClick={()=>setTab(id)} style={{ flex:1,padding:'7px 0',border:'none',background:'transparent',borderBottom:`2px solid ${tab===id?selColor:'transparent'}`,color:tab===id?selColor:'var(--text3)',fontSize:12,fontWeight:tab===id?600:400,cursor:'pointer',transition:'all 0.1s' }}>
                {label}
              </button>
            ))}
          </div>

          {/* Panel body */}
          <div style={{ flex:1,overflowY:'auto',padding:'12px 14px' }}>

            {/* INFO */}
            {tab==='info' && (
              <div>
                <div style={{ display:'flex',gap:6,marginBottom:14 }}>
                  <button onClick={()=>analyseFile(sel)} disabled={aiLoading} className="btn btn-secondary btn-sm" style={{ flex:1,justifyContent:'center',color:selColor,borderColor:selColor+'30',background:selColor+'08',fontSize:12 }}>
                    {aiLoading?<><span className="spinner-sm" style={{ borderTopColor:selColor }}/> Analysing…</>:'🤖 AI Analysis'}
                  </button>
                  <button onClick={()=>loadContent(sel)} disabled={fileLoading} className="btn btn-secondary btn-sm" style={{ flex:1,justifyContent:'center',fontSize:12 }}>
                    {fileLoading?<><span className="spinner-sm"/> Loading…</>:'📄 View file'}
                  </button>
                </div>
                <div className="section-label">Ask in chat</div>
                {[`What does ${sel.label} do?`,`How is ${sel.label} used across the codebase?`,`Show key functions in ${sel.label}`].map(q=>(
                  <button key={q} onClick={()=>toChat(q)} style={{ display:'block',width:'100%',textAlign:'left',padding:'7px 9px',marginBottom:4,background:'var(--bg)',border:'1px solid var(--border)',borderRadius:6,color:'var(--text2)',fontSize:12,cursor:'pointer',lineHeight:1.4,transition:'all 0.1s' }}
                    onMouseEnter={e=>{e.currentTarget.style.borderColor=selColor;e.currentTarget.style.color=selColor;e.currentTarget.style.background=selColor+'06'}}
                    onMouseLeave={e=>{e.currentTarget.style.borderColor='var(--border)';e.currentTarget.style.color='var(--text2)';e.currentTarget.style.background='var(--bg)'}}>
                    {q}
                  </button>
                ))}
                {/* Same layer files */}
                {initNodes.filter(n=>n.data.layer===sel.layer&&n.data.path!==sel.path).length>0&&(
                  <div style={{ marginTop:12 }}>
                    <div className="section-label">Same layer</div>
                    {initNodes.filter(n=>n.data.layer===sel.layer&&n.data.path!==sel.path).slice(0,5).map(n=>(
                      <button key={n.id} onClick={()=>{setSel(n.data);setAiTxt('');setFileContent(null);setTab('info')}} style={{ display:'flex',alignItems:'center',gap:6,width:'100%',padding:'4px 6px',marginBottom:2,background:'transparent',border:'none',borderRadius:4,cursor:'pointer',color:'var(--text2)',fontSize:11.5,fontFamily:'var(--font-mono)',transition:'background 0.08s' }}
                        onMouseEnter={e=>e.currentTarget.style.background='var(--bg2)'}
                        onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                        <div style={{ width:5,height:5,borderRadius:'50%',background:selColor,flexShrink:0 }}/>{n.data.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* CONTENT */}
            {tab==='content' && (
              <div>
                {fileLoading?<div style={{ display:'flex',justifyContent:'center',padding:30 }}><div className="spinner"/></div>
                :fileContent?(
                  <pre style={{ fontFamily:'var(--font-mono)',fontSize:11.5,lineHeight:1.6,color:'var(--text2)',background:'var(--bg)',border:'1px solid var(--border)',borderRadius:6,padding:12,margin:0,whiteSpace:'pre-wrap',wordBreak:'break-word',maxHeight:480,overflow:'auto' }}>
                    {fileContent.slice(0,10000)}{fileContent.length>10000?'\n\n… (truncated)':''}
                  </pre>
                ):(
                  <div style={{ textAlign:'center',padding:30,color:'var(--text3)',fontSize:13 }}>
                    <div style={{ marginBottom:8 }}>📄</div>Click "View file" in Info tab or:
                    <br/><br/>
                    <button onClick={()=>loadContent(sel)} className="btn btn-secondary btn-sm">Load file content</button>
                  </div>
                )}
              </div>
            )}

            {/* AI ANALYSIS */}
            {tab==='ai' && (
              <div>
                {aiLoading?(
                  <div style={{ display:'flex',flexDirection:'column',alignItems:'center',gap:10,padding:30 }}>
                    <div className="spinner"/>
                    <div style={{ fontSize:12,color:'var(--text3)' }}>Agents analysing {sel.label}…</div>
                  </div>
                ):aiTxt?(
                  <div style={{ background:'var(--bg)',border:`1px solid ${selColor}20`,borderLeft:`3px solid ${selColor}`,borderRadius:'0 7px 7px 0',padding:'12px 13px' }}>
                    <div className="md-body" style={{ fontSize:13 }}>
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{aiTxt}</ReactMarkdown>
                    </div>
                  </div>
                ):(
                  <div style={{ textAlign:'center',padding:30,color:'var(--text3)',fontSize:13 }}>
                    <div style={{ marginBottom:8 }}>🤖</div>
                    <button onClick={()=>analyseFile(sel)} className="btn btn-secondary btn-sm">Analyse with AI agents</button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
