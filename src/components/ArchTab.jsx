import React, { useState, useCallback, useMemo } from 'react'
import ReactFlow, {
  Background, Controls, MiniMap,
  useNodesState, useEdgesState, MarkerType, Panel,
  Handle, Position,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { useStore } from '../lib/store.js'
import { agentQuery } from '../lib/api.js'
import ReactMarkdown from 'react-markdown'
import { LAYER_META } from '../lib/archBuilder.js'

// ── File type icons ─────────────────────────────────────────
const FILE_ICONS = {
  py:'🐍', js:'🟨', jsx:'⚛️', ts:'🔷', tsx:'⚛️',
  html:'🌐', css:'🎨', scss:'🎨', sass:'🎨',
  json:'📋', yaml:'⚙️', yml:'⚙️', toml:'⚙️',
  md:'📝', mdx:'📝', rst:'📝', txt:'📄',
  go:'🔵', rs:'🦀', java:'☕', rb:'💎', sh:'💻',
  dockerfile:'🐳', env:'🔐', vue:'💚', svelte:'🧡',
}

function fileIcon(filename) {
  const ext = filename.split('.').pop().toLowerCase()
  if (filename.toLowerCase() === 'dockerfile') return '🐳'
  return FILE_ICONS[ext] || '📄'
}

// ── File node component ─────────────────────────────────────
function FileNode({ data, selected }) {
  const [hovered, setHovered] = useState(false)
  const active = selected || hovered
  const color  = data.color || '#6b7280'

  return (
    <>
      <Handle type="target" position={Position.Top}
        style={{ background: color, width:8, height:8, border:'2px solid white' }} />

      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          background: '#ffffff',
          border: `1.5px solid ${active ? color : '#e5e7eb'}`,
          borderRadius: 10,
          padding: '10px 14px',
          minWidth: 155, maxWidth: 185,
          cursor: 'pointer',
          transition: 'all 0.15s',
          boxShadow: selected
            ? `0 0 0 3px ${color}22, 0 8px 24px ${color}18`
            : active
              ? `0 4px 16px rgba(0,0,0,0.10)`
              : '0 1px 3px rgba(0,0,0,0.07)',
          position: 'relative',
        }}
      >
        {/* Colour accent bar at top */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 3,
          background: color, borderRadius: '10px 10px 0 0',
          opacity: active ? 1 : 0.5, transition: 'opacity 0.15s',
        }} />

        {/* Icon + filename */}
        <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:6 }}>
          <span style={{ fontSize:15, lineHeight:1, flexShrink:0 }}>
            {fileIcon(data.label)}
          </span>
          <span style={{
            fontSize:12, fontWeight:700, color:'#111827',
            overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
            flex:1, fontFamily:'var(--font-mono)',
          }}>
            {data.label}
          </span>
        </div>

        {/* Layer badge */}
        <span style={{
          display:'inline-block',
          fontSize:9, fontWeight:700, padding:'1px 7px', borderRadius:100,
          background: color + '14', color,
          textTransform:'uppercase', letterSpacing:'0.05em',
          fontFamily:'var(--font-mono)',
        }}>
          {data.sublabel || data.layer}
        </span>
      </div>

      <Handle type="source" position={Position.Bottom}
        style={{ background: color, width:8, height:8, border:'2px solid white' }} />
    </>
  )
}

const nodeTypes = { arch: FileNode }

// ── Main ───────────────────────────────────────────────────
export default function ArchTab() {
  const {
    archNodes: initNodes,
    archEdges: initEdges,
    repoData, repoKey,
    addMessage, addAgentTrace,
  } = useStore()

  const [nodes, , onNodesChange] = useNodesState(initNodes)
  const [edges, , onEdgesChange] = useEdgesState(
    initEdges.map(e => ({
      ...e,
      type:      'smoothstep',
      style:     { stroke: '#d1d5db', strokeWidth: 1.5 },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#9ca3af', width: 12, height: 12 },
      labelStyle:   { fill: '#9ca3af', fontSize: 9, fontFamily: 'var(--font-mono)' },
      labelBgStyle: { fill: '#f9fafb', fillOpacity: 1, rx: 3 },
      labelBgPadding: [3, 5],
    }))
  )

  const [selected,  setSelected]  = useState(null)
  const [aiText,    setAiText]    = useState('')
  const [analysing, setAnalysing] = useState(false)
  const [filter,    setFilter]    = useState(null) // active layer filter

  const onNodeClick = useCallback((_, n) => {
    setSelected(n.data); setAiText('')
  }, [])
  const onPaneClick = useCallback(() => {
    setSelected(null); setAiText('')
  }, [])

  // Layer stats
  const layerCounts = useMemo(() => {
    const c = {}
    initNodes.forEach(n => { c[n.data.layer] = (c[n.data.layer] || 0) + 1 })
    return c
  }, [initNodes])

  // Filtered nodes (dim others)
  const displayNodes = useMemo(() => {
    if (!filter) return nodes
    return nodes.map(n => ({
      ...n,
      style: { opacity: n.data.layer === filter ? 1 : 0.18 },
    }))
  }, [nodes, filter])

  async function analyseFile(node) {
    if (!repoKey || analysing) return
    setAnalysing(true); setAiText('')
    try {
      const q = `Explain what the file "${node.path}" does in ${repoData?.name}. What is its purpose, key functions, and how does it connect to other files?`
      const res = await agentQuery(repoKey, q, repoData?.workspace_id, null)
      setAiText(res.answer || '')
      addAgentTrace({
        question: q, steps: res.steps || [],
        totalTokens: res.total_tokens || 0, tokensIn: res.tokens_in || 0,
        tokensOut: res.tokens_out || 0, totalMs: res.total_ms || 0,
        sources: res.sources || [], agentsUsed: res.agents_used || [],
      })
    } catch {
      setAiText('Could not reach the backend. Start FastAPI on port 8000.')
    }
    setAnalysing(false)
  }

  function sendToChat(q) {
    addMessage({ id: Date.now(), role: 'user', content: q })
    useStore.setState({ activeTab: 'chat', pendingQuestion: q })
  }

  const selColor = selected?.color || '#2563eb'
  const selMeta  = selected ? (LAYER_META[selected.layer] || LAYER_META.other) : {}
  const noGraph  = initNodes.length === 0

  return (
    <div style={{ display:'flex', height:'100%', overflow:'hidden', background:'#f8f9fb' }}>

      {/* ── Left sidebar — layers + file list ── */}
      <div style={{
        width: 210, background:'#ffffff', borderRight:'1px solid #e5e7eb',
        display:'flex', flexDirection:'column', overflow:'hidden', flexShrink:0,
      }}>
        {/* Layers */}
        <div style={{ padding:'14px 14px 10px', borderBottom:'1px solid #e5e7eb' }}>
          <div style={{ fontSize:10, fontWeight:700, color:'#9ca3af', textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:8 }}>
            Layers
          </div>

          {/* All */}
          <button onClick={() => setFilter(null)} style={{
            width:'100%', display:'flex', alignItems:'center', gap:8,
            padding:'6px 8px', borderRadius:6, border:'none', cursor:'pointer',
            background: filter === null ? '#eff6ff' : 'transparent',
            color: filter === null ? '#2563eb' : '#4b5563',
            fontSize:12.5, fontWeight: filter === null ? 600 : 400,
            marginBottom:1, transition:'all 0.1s',
          }}>
            <div style={{ width:7, height:7, borderRadius:'50%', background:'#9ca3af' }} />
            <span style={{ flex:1, textAlign:'left' }}>All files</span>
            <span style={{ fontSize:10, color:'#9ca3af', fontFamily:'var(--font-mono)' }}>
              {initNodes.length}
            </span>
          </button>

          {/* Per layer */}
          {Object.entries(layerCounts)
            .sort(([,a],[,b]) => b - a)
            .map(([layer, count]) => {
              const meta  = LAYER_META[layer] || LAYER_META.other
              const isAct = filter === layer
              return (
                <button key={layer} onClick={() => setFilter(isAct ? null : layer)} style={{
                  width:'100%', display:'flex', alignItems:'center', gap:8,
                  padding:'6px 8px', borderRadius:6, border:'none', cursor:'pointer',
                  background: isAct ? meta.color + '12' : 'transparent',
                  color: isAct ? meta.color : '#4b5563',
                  fontSize:12.5, fontWeight: isAct ? 600 : 400,
                  marginBottom:1, transition:'all 0.1s',
                }}>
                  <div style={{ width:7, height:7, borderRadius:'50%', background: meta.color, flexShrink:0 }} />
                  <span style={{ flex:1, textAlign:'left' }}>{meta.label}</span>
                  <span style={{ fontSize:10, color:'#9ca3af', fontFamily:'var(--font-mono)' }}>{count}</span>
                </button>
              )
            })
          }
        </div>

        {/* File list */}
        <div style={{ flex:1, overflowY:'auto', padding:'10px 10px' }}>
          <div style={{ fontSize:10, fontWeight:700, color:'#9ca3af', textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:7 }}>
            Files
          </div>
          {initNodes
            .filter(n => !filter || n.data.layer === filter)
            .map(n => {
              const color     = n.data.color || '#6b7280'
              const isSel     = selected?.path === n.data.path
              return (
                <button key={n.id}
                  onClick={() => { setSelected(n.data); setAiText('') }}
                  style={{
                    width:'100%', display:'flex', alignItems:'center', gap:7,
                    padding:'5px 7px', borderRadius:5, border:'none', cursor:'pointer',
                    background: isSel ? color + '10' : 'transparent',
                    color: isSel ? color : '#374151',
                    fontSize:11.5, textAlign:'left', transition:'all 0.1s', marginBottom:1,
                  }}
                  onMouseEnter={e => { if(!isSel) e.currentTarget.style.background='#f3f4f6' }}
                  onMouseLeave={e => { if(!isSel) e.currentTarget.style.background='transparent' }}
                >
                  <div style={{ width:5, height:5, borderRadius:'50%', background:color, flexShrink:0 }} />
                  <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontFamily:'var(--font-mono)' }}>
                    {n.data.label}
                  </span>
                </button>
              )
            })}
        </div>
      </div>

      {/* ── Centre — React Flow graph ── */}
      <div style={{ flex:1, position:'relative' }}>
        {noGraph ? (
          <div style={{
            position:'absolute', inset:0, display:'flex',
            alignItems:'center', justifyContent:'center', flexDirection:'column', gap:12,
            background:'#f8f9fb',
          }}>
            <div style={{ fontSize:40 }}>⬡</div>
            <div style={{ fontSize:14, fontWeight:600, color:'#374151' }}>
              No graph data yet
            </div>
            <div style={{ fontSize:13, color:'#9ca3af', textAlign:'center', maxWidth:300 }}>
              Analyze a repo to generate the real file dependency graph.
              Make sure the FastAPI backend is running.
            </div>
          </div>
        ) : (
          <ReactFlow
            nodes={displayNodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.18 }}
            proOptions={{ hideAttribution: true }}
            style={{ background: '#f8f9fb' }}
          >
            <Background color="#e5e7eb" gap={22} size={1} variant="dots" />
            <Controls style={{
              background:'#ffffff', border:'1px solid #e5e7eb',
              borderRadius:8, boxShadow:'0 2px 8px rgba(0,0,0,0.06)',
            }} />
            <MiniMap
              style={{ background:'#ffffff', border:'1px solid #e5e7eb', borderRadius:8, boxShadow:'0 2px 8px rgba(0,0,0,0.06)' }}
              nodeColor={n => n.data?.color || '#9ca3af'}
              maskColor="rgba(248,249,251,0.8)"
            />

            <Panel position="top-left">
              <div style={{
                background:'#ffffff', border:'1px solid #e5e7eb', borderRadius:10,
                padding:'10px 14px', maxWidth:260, boxShadow:'0 2px 8px rgba(0,0,0,0.06)',
              }}>
                <div style={{ fontSize:13, fontWeight:700, color:'#111827', marginBottom:2 }}>
                  {repoData?.name?.split('/')[1]} — Dependency graph
                </div>
                <div style={{ fontSize:11, color:'#9ca3af' }}>
                  {initNodes.length} files · {initEdges.length} import edges · click a file to inspect
                </div>
              </div>
            </Panel>

            <Panel position="bottom-center">
              <div style={{
                background:'#ffffff', border:'1px solid #e5e7eb', borderRadius:100,
                padding:'6px 18px', fontSize:11, color:'#9ca3af',
                boxShadow:'0 2px 8px rgba(0,0,0,0.06)', display:'flex', gap:14,
              }}>
                <span>Scroll to zoom</span>
                <span style={{ color:'#e5e7eb' }}>·</span>
                <span>Drag to pan</span>
                <span style={{ color:'#e5e7eb' }}>·</span>
                <span>Click file to inspect</span>
              </div>
            </Panel>
          </ReactFlow>
        )}
      </div>

      {/* ── Right — file inspector panel ── */}
      {selected && (
        <div style={{
          width:330, background:'#ffffff', borderLeft:'1px solid #e5e7eb',
          display:'flex', flexDirection:'column', flexShrink:0,
          boxShadow:'-4px 0 20px rgba(0,0,0,0.04)', animation:'fadeInRight 0.2s ease',
        }}>
          {/* Header */}
          <div style={{ padding:'16px 18px 12px', borderBottom:'1px solid #e5e7eb' }}>
            <div style={{ display:'flex', alignItems:'flex-start', gap:10, marginBottom:10 }}>
              <div style={{
                width:38, height:38, borderRadius:9, flexShrink:0,
                background: selColor + '10',
                border: `1.5px solid ${selColor}25`,
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:18,
              }}>
                {fileIcon(selected.label)}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{
                  fontSize:13, fontWeight:700, color:'#111827',
                  wordBreak:'break-all', fontFamily:'var(--font-mono)', marginBottom:2,
                }}>
                  {selected.label}
                </div>
                <div style={{ fontSize:10, color:'#9ca3af', fontFamily:'var(--font-mono)' }}>
                  {selected.path}
                </div>
              </div>
              <button
                onClick={() => { setSelected(null); setAiText('') }}
                style={{
                  background:'none', border:'1px solid #e5e7eb', borderRadius:6,
                  width:26, height:26, cursor:'pointer', color:'#6b7280',
                  fontSize:14, display:'flex', alignItems:'center', justifyContent:'center',
                  flexShrink:0, lineHeight:1,
                }}
              >×</button>
            </div>

            <span style={{
              display:'inline-flex', alignItems:'center',
              fontSize:9, fontWeight:700, padding:'2px 9px', borderRadius:100,
              background: selColor + '10', color: selColor,
              textTransform:'uppercase', letterSpacing:'0.06em',
            }}>
              {selMeta.label || selected.layer}
            </span>
          </div>

          {/* Body */}
          <div style={{ flex:1, overflowY:'auto', padding:'14px 18px' }}>

            {/* AI analyse button */}
            <button
              onClick={() => analyseFile(selected)}
              disabled={analysing}
              style={{
                width:'100%', padding:'9px 14px', marginBottom:14,
                background: analysing ? '#f9fafb' : selColor + '08',
                border: `1.5px solid ${analysing ? '#e5e7eb' : selColor + '28'}`,
                borderRadius:8, color: analysing ? '#9ca3af' : selColor,
                fontSize:13, fontWeight:600,
                cursor: analysing ? 'not-allowed' : 'pointer',
                display:'flex', alignItems:'center', justifyContent:'center', gap:8,
                transition:'all 0.15s',
              }}
            >
              {analysing ? (
                <>
                  <div style={{ width:14, height:14, border:'2px solid #e5e7eb', borderTopColor:selColor, borderRadius:'50%', animation:'spin 0.7s linear infinite' }} />
                  Analysing…
                </>
              ) : '🤖 Analyse with AI agents'}
            </button>

            {/* AI result */}
            {aiText && (
              <div style={{
                background:'#f9fafb',
                border:`1px solid ${selColor}18`,
                borderLeft:`3px solid ${selColor}`,
                borderRadius:'0 8px 8px 0',
                padding:'12px 14px', marginBottom:16,
                maxHeight:280, overflowY:'auto',
                animation:'fadeIn 0.3s ease',
              }}>
                <div className="md-body" style={{ fontSize:12.5 }}>
                  <ReactMarkdown>{aiText}</ReactMarkdown>
                </div>
              </div>
            )}

            {/* Ask in chat */}
            <div style={{ marginBottom:14 }}>
              <div style={{ fontSize:10, fontWeight:700, color:'#9ca3af', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:8 }}>
                Ask in chat
              </div>
              {[
                `What does ${selected.label} do?`,
                `How is ${selected.label} used across the codebase?`,
                `Show me key functions in ${selected.label}`,
              ].map(q => (
                <button key={q} onClick={() => sendToChat(q)} style={{
                  display:'block', width:'100%', textAlign:'left',
                  padding:'8px 11px', marginBottom:5,
                  background:'#f9fafb', border:'1.5px solid #e5e7eb',
                  borderRadius:7, color:'#4b5563', fontSize:12,
                  cursor:'pointer', lineHeight:1.4, transition:'all 0.12s',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = selColor
                  e.currentTarget.style.color = selColor
                  e.currentTarget.style.background = selColor + '06'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = '#e5e7eb'
                  e.currentTarget.style.color = '#4b5563'
                  e.currentTarget.style.background = '#f9fafb'
                }}
                >
                  {q}
                </button>
              ))}
            </div>

            {/* Same-layer files */}
            {initNodes.filter(n => n.data.layer === selected.layer && n.data.path !== selected.path).length > 0 && (
              <div>
                <div style={{ fontSize:10, fontWeight:700, color:'#9ca3af', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:8 }}>
                  Same layer
                </div>
                {initNodes
                  .filter(n => n.data.layer === selected.layer && n.data.path !== selected.path)
                  .slice(0, 5)
                  .map(n => (
                    <button key={n.id}
                      onClick={() => { setSelected(n.data); setAiText('') }}
                      style={{
                        display:'flex', alignItems:'center', gap:7, width:'100%',
                        padding:'5px 8px', marginBottom:3,
                        background:'transparent', border:'none',
                        borderRadius:5, cursor:'pointer', color:'#4b5563',
                        fontSize:11.5, textAlign:'left', transition:'background 0.1s',
                        fontFamily:'var(--font-mono)',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background='#f3f4f6'}
                      onMouseLeave={e => e.currentTarget.style.background='transparent'}
                    >
                      <div style={{ width:5, height:5, borderRadius:'50%', background:selColor, flexShrink:0 }} />
                      {n.data.label}
                    </button>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
