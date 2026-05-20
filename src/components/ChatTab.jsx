import React, { useState, useEffect, useRef, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useStore } from '../lib/store.js'
import { agentQuery } from '../lib/api.js'
import { Light as SyntaxHighlighter } from 'react-syntax-highlighter'
import { githubGist } from 'react-syntax-highlighter/dist/esm/styles/hljs'

const SUGGESTIONS = [
  'How does authentication work?',
  'What is the overall architecture?',
  'How do I set up this project locally?',
  'What are the main API endpoints?',
  'Walk me through the data flow',
  'Where should I add a new feature?',
  'What testing strategy is used?',
  'Explain the database schema',
]

function MdContent({ content }) {
  return (
    <div className="md-body">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ node, inline, className, children }) {
            const lang = (className || '').replace('language-', '')
            if (inline) return <code>{children}</code>
            return (
              <div style={{ margin:'8px 0', borderRadius:6, overflow:'hidden', border:'1px solid var(--border)' }}>
                {lang && <div style={{ background:'var(--bg2)', padding:'4px 12px', fontSize:11, color:'var(--text3)', fontFamily:'var(--font-mono)', borderBottom:'1px solid var(--border)' }}>{lang}</div>}
                <SyntaxHighlighter language={lang||'text'} style={githubGist}
                  customStyle={{ margin:0, fontSize:12.5, padding:14, background:'var(--bg)' }}>
                  {String(children).replace(/\n$/, '')}
                </SyntaxHighlighter>
              </div>
            )
          },
          p: ({children}) => <p style={{ margin:'4px 0' }}>{children}</p>,
          ul: ({children}) => <ul style={{ margin:'4px 0 4px 18px' }}>{children}</ul>,
          ol: ({children}) => <ol style={{ margin:'4px 0 4px 18px' }}>{children}</ol>,
          li: ({children}) => <li style={{ marginBottom:2 }}>{children}</li>,
          a: ({href,children}) => <a href={href} target="_blank" rel="noreferrer" style={{ color:'var(--blue)', textDecoration:'underline' }}>{children}</a>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}

export default function ChatTab() {
  const {
    repoKey, repoData, messages, isChatLoading,
    addMessage, setIsChatLoading, pendingQuestion,
    addAgentTrace, aiProvider,
  } = useStore()

  const [input, setInput]             = useState('')
  const [expandedTrace, setExpanded]  = useState(null)
  const bottomRef  = useRef(null)
  const inputRef   = useRef(null)
  const pendingRef = useRef(null)  // track which pendingQuestion we already handled

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isChatLoading])

  // Handle pendingQuestion — use ref to prevent double-fire
  useEffect(() => {
    if (pendingQuestion && pendingQuestion !== pendingRef.current) {
      pendingRef.current = pendingQuestion
      useStore.setState({ pendingQuestion: null })
      sendMessage(pendingQuestion)
    }
  }, [pendingQuestion])

  const sendMessage = useCallback(async (text) => {
    const question = (text || input).trim()
    if (!question || !repoKey || isChatLoading) return
    setInput('')
    addMessage({ id: Date.now(), role: 'user', content: question })
    setIsChatLoading(true)

    try {
      const res = await agentQuery(repoKey, question, repoData?.workspace_id, null)
      addAgentTrace({
        question,
        steps: res.steps || [], totalTokens: res.total_tokens || 0,
        tokensIn: res.tokens_in || 0, tokensOut: res.tokens_out || 0,
        totalMs: res.total_ms || 0, sources: res.sources || [],
        agentsUsed: res.agents_used || [],
      })
      addMessage({
        id: Date.now() + 1, role: 'assistant',
        content: res.answer,
        sources: res.sources || [], steps: res.steps || [],
        totalTokens: res.total_tokens || 0, totalMs: res.total_ms || 0,
        agentsUsed: res.agents_used || [],
      })
    } catch {
      addMessage({ id: Date.now() + 1, role: 'assistant', content: 'Could not reach the backend. Make sure the FastAPI server is running on port 8000.', sources: [], error: true })
    }
    setIsChatLoading(false)
    inputRef.current?.focus()
  }, [input, repoKey, isChatLoading, repoData, addMessage, setIsChatLoading, addAgentTrace])

  const isEmpty = messages.length === 0

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', overflow:'hidden' }}>

      {/* Header */}
      <div style={{ padding:'12px 20px', borderBottom:'1px solid var(--border)', background:'var(--surface)', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:9 }}>
          <div style={{ width:28, height:28, borderRadius:7, background:'var(--blue-dim)', border:'1px solid rgba(9,105,218,0.2)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <svg width="13" height="13" viewBox="0 0 16 16" fill="var(--blue)">
              <path d="M1 2.75A1.75 1.75 0 012.75 1h10.5c.966 0 1.75.784 1.75 1.75v7.5A1.75 1.75 0 0113.25 12H9.06l-2.573 2.573A1.457 1.457 0 014 13.543V12H2.75A1.75 1.75 0 011 10.25v-7.5z"/>
            </svg>
          </div>
          <div>
            <div style={{ fontSize:13, fontWeight:600, color:'var(--text)' }}>Chat with codebase</div>
            <div style={{ fontSize:11, color:'var(--text3)' }}>
              Multi-agent · Code + Architect + Activity → Synthesizer · repo content embedded
            </div>
          </div>
        </div>
        <div style={{ display:'flex', gap:4 }}>
          {['openai','claude'].map(p => (
            <button key={p}
              onClick={() => useStore.getState().setAiProvider(p)}
              className={`btn btn-sm ${aiProvider===p ? 'btn-primary' : 'btn-ghost'}`}
              style={{ fontSize:11 }}>
              {p==='openai' ? 'GPT-4o' : 'Claude'}
            </button>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex:1, overflow:'auto', padding:'16px 20px', background:'var(--bg)' }}>
        {isEmpty && (
          <div style={{ textAlign:'center', paddingTop:28 }}>
            <div style={{ fontSize:28, marginBottom:8 }}>💬</div>
            <div style={{ fontSize:16, fontWeight:600, color:'var(--text)', marginBottom:4 }}>
              Ask anything about {repoData?.name?.split('/')[1] || 'this repo'}
            </div>
            <div style={{ fontSize:13, color:'var(--text3)', marginBottom:22, maxWidth:400, margin:'0 auto 22px' }}>
              The agent searches the actual indexed codebase and synthesises a real answer with file citations.
            </div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:6, justifyContent:'center', maxWidth:560, margin:'0 auto' }}>
              {SUGGESTIONS.map(s => (
                <button key={s} onClick={() => sendMessage(s)} style={{
                  padding:'6px 12px', background:'var(--surface)',
                  border:'1px solid var(--border)', borderRadius:100,
                  fontSize:12, color:'var(--text2)', cursor:'pointer', transition:'all 0.12s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor='var(--blue)'; e.currentTarget.style.color='var(--blue)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.color='var(--text2)' }}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map(msg => (
          <MessageBubble key={msg.id} msg={msg}
            expanded={expandedTrace===msg.id}
            onToggle={() => setExpanded(expandedTrace===msg.id ? null : msg.id)} />
        ))}

        {isChatLoading && <ThinkingBubble />}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ padding:'10px 20px 14px', borderTop:'1px solid var(--border)', background:'var(--surface)', flexShrink:0 }}>
        <div style={{ display:'flex', gap:8, background:'var(--bg)', border:'1px solid var(--border)', borderRadius:9, padding:'3px 3px 3px 14px', transition:'border-color 0.15s' }}
          onFocusCapture={e => e.currentTarget.style.borderColor='var(--blue)'}
          onBlurCapture={e => e.currentTarget.style.borderColor='var(--border)'}>
          <input ref={inputRef} value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key==='Enter' && !e.shiftKey && sendMessage()}
            placeholder={`Ask about ${repoData?.name || 'this codebase'}…`}
            style={{ flex:1, background:'transparent', border:'none', outline:'none', fontSize:14, color:'var(--text)', padding:'9px 0' }} />
          <button onClick={() => sendMessage()} disabled={!input.trim()||isChatLoading}
            className={`btn ${input.trim()&&!isChatLoading ? 'btn-primary' : 'btn-secondary'} btn-sm`}>
            Send ↑
          </button>
        </div>
        <div style={{ fontSize:11, color:'var(--text3)', marginTop:5, textAlign:'center' }}>
          Answers grounded in indexed source code · agents search ChromaDB in real time
        </div>
      </div>
    </div>
  )
}

function ThinkingBubble() {
  const STEPS = ['Orchestrating…','Searching code…','Analysing…','Synthesising…']
  const [step, setStep] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setStep(s => (s+1) % STEPS.length), 1400)
    return () => clearInterval(t)
  }, [])
  return (
    <div style={{ display:'flex', gap:8, marginBottom:16, animation:'fadeIn 0.3s ease' }}>
      <BotAvatar />
      <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'4px 10px 10px 10px', padding:'10px 14px', display:'flex', alignItems:'center', gap:10 }}>
        <div style={{ display:'flex', gap:3 }}>
          {[0,1,2].map(i => <div key={i} style={{ width:5, height:5, borderRadius:'50%', background:'var(--blue)', animation:`pulse 1.2s ease ${i*0.2}s infinite` }} />)}
        </div>
        <span style={{ fontSize:12, color:'var(--text3)' }}>{STEPS[step]}</span>
      </div>
    </div>
  )
}

function MessageBubble({ msg, expanded, onToggle }) {
  const isUser = msg.role === 'user'
  return (
    <div style={{ display:'flex', flexDirection:isUser?'row-reverse':'row', gap:8, marginBottom:18, animation:'fadeIn 0.3s ease' }}>
      {!isUser && <BotAvatar />}
      <div style={{ maxWidth:isUser?'70%':'82%', minWidth:0 }}>
        <div style={{
          background: isUser ? 'var(--blue)' : 'var(--surface)',
          border: isUser ? 'none' : `1px solid ${msg.error ? 'rgba(207,34,46,0.25)' : 'var(--border)'}`,
          borderRadius: isUser ? '10px 3px 10px 10px' : '3px 10px 10px 10px',
          padding:'10px 14px', color: isUser ? '#fff' : 'var(--text)',
        }}>
          {isUser
            ? <p style={{ fontSize:14, margin:0 }}>{msg.content}</p>
            : <MdContent content={msg.content||''} />
          }
        </div>

        {/* Meta */}
        {!isUser && (msg.totalTokens>0 || msg.sources?.length>0) && (
          <div style={{ marginTop:6, display:'flex', flexWrap:'wrap', gap:5, alignItems:'center' }}>
            {msg.totalTokens>0 && <Chip color="var(--blue)" bg="var(--blue-dim)">🪙 {msg.totalTokens.toLocaleString()} tokens</Chip>}
            {msg.totalMs>0    && <Chip color="var(--text3)" bg="var(--bg2)">⏱ {msg.totalMs}ms</Chip>}
            {(msg.sources||[]).map(s => <Chip key={s} color="var(--text3)" bg="var(--bg2)">📄 {s.split('/').pop()}</Chip>)}
            {msg.steps?.length>0 && (
              <button onClick={onToggle} style={{ fontSize:11, padding:'2px 8px', borderRadius:100, background:expanded?'var(--amber-dim)':'var(--bg2)', color:expanded?'var(--amber)':'var(--text3)', border:'none', cursor:'pointer' }}>
                {expanded ? '▲ Hide trace' : '▼ Agent trace'}
              </button>
            )}
          </div>
        )}

        {/* Agent trace */}
        {expanded && msg.steps?.length>0 && (
          <div style={{ marginTop:6, background:'var(--surface)', border:'1px solid var(--border)', borderRadius:8, padding:'10px 12px', animation:'fadeIn 0.2s ease' }}>
            {msg.steps.map((step,i) => (
              <div key={i} style={{ display:'flex', gap:8, paddingBottom:i<msg.steps.length-1?7:0, borderBottom:i<msg.steps.length-1?'1px solid var(--border)':'none', marginBottom:i<msg.steps.length-1?7:0 }}>
                <div style={{ width:5, height:5, borderRadius:'50%', background:AGENT_COLORS[step.agent]||'var(--text3)', marginTop:5, flexShrink:0 }} />
                <div style={{ flex:1 }}>
                  <div style={{ display:'flex', gap:7, alignItems:'center', marginBottom:1 }}>
                    <span style={{ fontSize:11, fontWeight:600, color:AGENT_COLORS[step.agent]||'var(--text3)', fontFamily:'var(--font-mono)' }}>{step.agent}</span>
                    <span style={{ fontSize:10, color:'var(--text3)' }}>{step.action}</span>
                    {step.ms>0 && <span style={{ marginLeft:'auto', fontSize:10, color:'var(--text3)' }}>{step.ms}ms</span>}
                  </div>
                  <div style={{ fontSize:12, color:'var(--text2)' }}>{step.detail}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

const AGENT_COLORS = { Orchestrator:'#0969da', CodeAgent:'#0891b2', ArchitectAgent:'#1a7f37', ActivityAgent:'#9a6700', Synthesizer:'#6639ba' }

function Chip({ color, bg, children }) {
  return <span style={{ fontSize:11, padding:'2px 8px', borderRadius:100, background:bg, color, fontFamily:'var(--font-mono)' }}>{children}</span>
}

function BotAvatar() {
  return (
    <div style={{ width:26, height:26, borderRadius:7, flexShrink:0, background:'var(--blue-dim)', border:'1px solid rgba(9,105,218,0.2)', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" strokeWidth="2.2" strokeLinecap="round">
        <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
      </svg>
    </div>
  )
}
