import React, { useState } from 'react'
import { MessageSquare, Send, X } from 'lucide-react'
import { useStore } from '../lib/store.js'
import { agentQuery } from '../lib/api.js'

const GENERAL_QUESTIONS = [
  "How do the files interact?",
  "What is the overall architecture?",
  "What are the main components?",
  "What design patterns are used?",
  "What is the execution flow?"
]

function StructuredResponse({ text }) {
  try {
    let jsonStr = text
    if (text.includes('```json')) {
      jsonStr = text.split('```json')[1].split('```')[0].trim()
    } else if (text.includes('```')) {
      jsonStr = text.split('```')[1].split('```')[0].trim()
    }
    
    const data = JSON.parse(jsonStr)
    
    return (
      <div style={{ fontSize: 12, lineHeight: 1.5 }}>
        {data.summary && (
          <div style={{ 
            background: '#eff6ff', 
            borderLeft: '4px solid #0284c7',
            padding: '10px 12px',
            borderRadius: '4px',
            marginBottom: '10px',
            border: '1px solid #bfdbfe'
          }}>
            <div style={{ fontWeight: '700', color: '#0284c7', marginBottom: '6px', fontSize: '11px' }}>📋 Summary</div>
            <div style={{ color: '#1e40af', fontSize: '11px', lineHeight: '1.5' }}>{data.summary}</div>
          </div>
        )}
        
        {data.key_points && Array.isArray(data.key_points) && data.key_points.length > 0 && (
          <div style={{ 
            background: '#fffbeb', 
            borderLeft: '4px solid #d97706',
            padding: '10px 12px',
            borderRadius: '4px',
            marginBottom: '10px',
            border: '1px solid #fde68a'
          }}>
            <div style={{ fontWeight: '700', color: '#d97706', marginBottom: '8px', fontSize: '11px' }}>🎯 Key Points</div>
            <ul style={{ margin: '0', paddingLeft: '18px', fontSize: '11px' }}>
              {data.key_points.map((point, i) => (
                <li key={i} style={{ marginBottom: '4px', color: '#78350f' }}>{point}</li>
              ))}
            </ul>
          </div>
        )}
        
        {data.components && Array.isArray(data.components) && data.components.length > 0 && (
          <div style={{ marginBottom: '10px' }}>
            <div style={{ fontWeight: '700', color: '#059669', marginBottom: '8px', fontSize: '11px' }}>⚙️ Components</div>
            {data.components.map((comp, i) => (
              <div 
                key={i}
                style={{ 
                  background: '#f0fdf4', 
                  border: '1px solid #bbf7d0',
                  borderLeft: '3px solid #10b981',
                  padding: '8px 10px',
                  borderRadius: '4px',
                  marginBottom: '6px'
                }}
              >
                <div style={{ fontWeight: '600', color: '#047857', fontSize: '11px', marginBottom: '3px' }}>{comp.name}</div>
                <div style={{ color: '#065f46', fontSize: '10px' }}>{comp.description}</div>
              </div>
            ))}
          </div>
        )}
        
        {data.flow && (
          <div style={{ 
            background: '#faf5ff', 
            borderLeft: '4px solid #a855f7',
            padding: '10px 12px',
            borderRadius: '4px',
            marginBottom: '10px',
            border: '1px solid #e9d5ff'
          }}>
            <div style={{ fontWeight: '700', color: '#a855f7', marginBottom: '6px', fontSize: '11px' }}>🔄 Flow</div>
            <div style={{ fontSize: '10px', color: '#6b21a8', whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: '1.5' }}>{data.flow}</div>
          </div>
        )}
        
        {data.interactions && Array.isArray(data.interactions) && data.interactions.length > 0 && (
          <div style={{ 
            background: '#f0f9ff', 
            borderLeft: '4px solid #0ea5e9',
            padding: '10px 12px',
            borderRadius: '4px',
            marginBottom: '10px',
            border: '1px solid #cffafe'
          }}>
            <div style={{ fontWeight: '700', color: '#0369a1', marginBottom: '8px', fontSize: '11px' }}>🔗 Interactions</div>
            <ul style={{ margin: '0', paddingLeft: '18px', fontSize: '11px' }}>
              {data.interactions.map((inter, i) => (
                <li key={i} style={{ marginBottom: '4px', color: '#0c4a6e' }}>{inter}</li>
              ))}
            </ul>
          </div>
        )}
        
        {data.patterns && Array.isArray(data.patterns) && data.patterns.length > 0 && (
          <div style={{ 
            background: '#fdf2f8', 
            borderLeft: '4px solid #ec4899',
            padding: '10px 12px',
            borderRadius: '4px',
            marginBottom: '10px',
            border: '1px solid #fbcfe8'
          }}>
            <div style={{ fontWeight: '700', color: '#be185d', marginBottom: '8px', fontSize: '11px' }}>📐 Patterns</div>
            <ul style={{ margin: '0', paddingLeft: '18px', fontSize: '11px' }}>
              {data.patterns.map((pattern, i) => (
                <li key={i} style={{ marginBottom: '4px', color: '#831843' }}>{pattern}</li>
              ))}
            </ul>
          </div>
        )}
        
        {data.notes && (
          <div style={{ 
            background: '#faf5ff', 
            border: '1px solid #e9d5ff',
            padding: '10px 12px',
            borderRadius: '4px'
          }}>
            <div style={{ fontWeight: '700', color: '#6b21a8', marginBottom: '6px', fontSize: '11px' }}>📝 Notes</div>
            <div style={{ color: '#581c87', fontSize: '10px', lineHeight: '1.5' }}>{data.notes}</div>
          </div>
        )}
      </div>
    )
  } catch (err) {
    return <div style={{ fontSize: '11px', lineHeight: '1.5', color: '#444', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{text}</div>
  }
}

export default function ContentTab() {
  const { archNodes = [], repoData, repoKey, addAgentTrace } = useStore()
  const allFiles = archNodes.map(n => n.data.label)

  const [showChat, setShowChat] = useState(true)
  const [selectedFiles, setSelectedFiles] = useState(new Set())
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [analyzing, setAnalyzing] = useState(false)

  const toggleFile = (file) => {
    const newSelected = new Set(selectedFiles)
    if (newSelected.has(file)) newSelected.delete(file)
    else newSelected.add(file)
    setSelectedFiles(newSelected)
  }

  const toggleAll = () => {
    if (selectedFiles.size === allFiles.length) {
      setSelectedFiles(new Set())
    } else {
      setSelectedFiles(new Set(allFiles))
    }
  }

  const handleSend = async (question = input) => {
    if (!question.trim() || selectedFiles.size === 0) return
    
    setMessages([...messages, { role: 'user', text: question }])
    setInput('')
    setAnalyzing(true)

    try {
      const filesList = Array.from(selectedFiles).join(', ')
      const fullQuestion = `About these files (${filesList}): ${question}

IMPORTANT: Respond ONLY with valid JSON. No markdown, no code blocks, just pure JSON:
{
  "summary": "Brief overview",
  "key_points": ["point 1", "point 2"],
  "components": [{"name": "Name", "description": "What it does"}],
  "flow": "Step 1. Step 2. Step 3.",
  "interactions": ["A interacts with B"],
  "patterns": ["Pattern 1"],
  "notes": "Additional notes"
}`
      
      if (repoKey) {
        const res = await agentQuery(repoKey, fullQuestion, repoData?.workspace_id, null)
        const response = res.answer || 'Unable to analyze files.'
        setMessages(prev => [...prev, { role: 'assistant', text: response, isStructured: true }])
        addAgentTrace({ question: fullQuestion, steps: res.steps || [] })
      } else {
        setMessages(prev => [...prev, { role: 'assistant', text: 'Please wait for repository to load...' }])
      }
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', text: 'Error: Could not reach the backend.' }])
    }
    
    setAnalyzing(false)
  }

  const filteredFiles = searchTerm 
    ? allFiles.filter(f => f.toLowerCase().includes(searchTerm.toLowerCase()))
    : allFiles

  return (
    <div style={{ display: 'flex', height: '100%', width: '100%', gap: 0 }}>
      
      {/* LEFT SIDEBAR - 300px FIXED */}
      <div style={{ 
        width: '300px',
        display: 'flex', 
        flexDirection: 'column',
        overflow: 'hidden',
        background: 'var(--bg)',
        flexShrink: 0
      }}>
        <div style={{ 
          background: 'white', 
          padding: '16px',
          flex: 1,
          overflowY: 'auto',
          borderRight: '1px solid var(--border)'
        }}>
          <h2 style={{ fontSize: 13, fontWeight: 'bold', marginBottom: 12, color: '#1f2937' }}>Questions</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {GENERAL_QUESTIONS.map((q, i) => (
              <button
                key={i}
                onClick={() => handleSend(q)}
                disabled={selectedFiles.size === 0 || analyzing}
                style={{
                  padding: '8px 10px',
                  background: selectedFiles.size > 0 ? '#f0f9ff' : '#f3f4f6',
                  border: selectedFiles.size > 0 ? '1px solid #7dd3fc' : '1px solid #e5e7eb',
                  borderRadius: 5,
                  cursor: selectedFiles.size > 0 ? 'pointer' : 'not-allowed',
                  fontSize: '11px',
                  textAlign: 'left',
                  lineHeight: '1.3',
                  color: selectedFiles.size > 0 ? '#0c4a6e' : '#9ca3af',
                  fontWeight: '500'
                }}
              >
                {q}
              </button>
            ))}
          </div>
          
          <div style={{ 
            background: '#f9fafb', 
            border: '1px solid #e5e7eb',
            padding: 10, 
            borderRadius: 5,
            marginTop: 14
          }}>
            <div style={{ fontSize: 10, fontWeight: '600', color: '#1f2937', marginBottom: 6 }}>📊 Repo</div>
            <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 3 }}>
              <strong>{allFiles.length}</strong> files
            </div>
            <div style={{ fontSize: 11, color: '#6b7280' }}>
              <strong style={{ color: selectedFiles.size > 0 ? '#059669' : '#6b7280' }}>{selectedFiles.size}</strong> selected
            </div>
          </div>
        </div>

        <div style={{ padding: 10, background: 'white', borderTop: '1px solid var(--border)' }}>
          <button
            onClick={() => setShowChat(!showChat)}
            style={{
              width: '100%',
              padding: '8px',
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: 5,
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: '600'
            }}
          >
            {showChat ? '✕ Close' : '⊕ Chat'}
          </button>
        </div>
      </div>

      {/* RIGHT CHAT PANEL - FLEX 1 (FILLS ALL SPACE) */}
      {showChat && (
        <div style={{ 
          flex: 1,
          background: '#f9fafb',
          display: 'flex', 
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          
          {/* Header */}
          <div style={{ 
            padding: '12px 16px',
            background: 'white',
            borderBottom: '1px solid #e5e7eb',
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            flexShrink: 0
          }}>
            <div>
              <h3 style={{ fontWeight: '700', fontSize: 14, color: '#1f2937', margin: 0 }}>Code Analysis</h3>
            </div>
            <button onClick={() => setShowChat(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              <X size={18} color='#6b7280' />
            </button>
          </div>

          {/* Files Selection */}
          <div style={{ 
            padding: '10px 14px',
            background: 'white',
            borderBottom: '1px solid #e5e7eb',
            flexShrink: 0
          }}>
            <button
              onClick={toggleAll}
              style={{
                width: '100%',
                padding: '6px 10px',
                background: selectedFiles.size > 0 ? '#ecfdf5' : '#f3f4f6',
                border: '1px solid ' + (selectedFiles.size > 0 ? '#a7f3d0' : '#e5e7eb'),
                borderRadius: 4,
                cursor: 'pointer',
                fontSize: 11,
                fontWeight: '500',
                color: selectedFiles.size > 0 ? '#065f46' : '#6b7280',
                marginBottom: 8
              }}
            >
              {selectedFiles.size === allFiles.length ? 'Deselect All' : 'Select All'} ({selectedFiles.size}/{allFiles.length})
            </button>
            <input
              type="text"
              placeholder="🔍 Search files…"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 8px',
                border: '1px solid #e5e7eb',
                borderRadius: 4,
                fontSize: 11,
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Files Grid */}
          <div style={{ 
            padding: '8px 12px',
            background: 'white',
            borderBottom: '1px solid #e5e7eb',
            maxHeight: 110,
            overflowY: 'auto',
            flexShrink: 0
          }}>
            {filteredFiles.length === 0 ? (
              <p style={{ color: '#9ca3af', fontSize: 10, textAlign: 'center', padding: 6, margin: 0 }}>No files</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
                {filteredFiles.map(file => (
                  <label 
                    key={file} 
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 6,
                      cursor: 'pointer', 
                      fontSize: 10,
                      padding: '5px 6px',
                      borderRadius: 4,
                      background: selectedFiles.has(file) ? '#dbeafe' : 'transparent',
                      userSelect: 'none'
                    }}
                  >
                    <input type="checkbox" checked={selectedFiles.has(file)} onChange={() => toggleFile(file)} style={{ width: 12, height: 12 }} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'monospace', fontSize: 9 }}>{file}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* MESSAGES AREA - TALL & WIDE */}
          <div style={{ 
            flex: 1,
            padding: '12px 14px',
            overflowY: 'auto',
            display: 'flex', 
            flexDirection: 'column', 
            gap: 12,
            background: '#f9fafb'
          }}>
            {messages.length === 0 ? (
              <div style={{ color: '#9ca3af', fontSize: 12, textAlign: 'center', margin: 'auto' }}>
                <div style={{ fontSize: 24, marginBottom: 8 }}>💭</div>
                <div>Select files and ask a question</div>
              </div>
            ) : (
              messages.map((msg, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                  <div style={{
                    maxWidth: msg.role === 'user' ? '70%' : '100%',
                    padding: msg.role === 'user' ? '8px 12px' : '0',
                    borderRadius: msg.role === 'user' ? 6 : 0,
                    background: msg.role === 'user' ? '#3b82f6' : 'transparent',
                    color: msg.role === 'user' ? 'white' : 'inherit'
                  }}>
                    {msg.isStructured ? (
                      <StructuredResponse text={msg.text} />
                    ) : (
                      <div style={{ fontSize: 12, lineHeight: 1.5 }}>{msg.text}</div>
                    )}
                  </div>
                </div>
              ))
            )}
            
            {analyzing && (
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#3b82f6', animation: 'pulse 1.5s infinite' }}/>
                <span style={{ fontSize: 11, color: '#6b7280' }}>Analyzing…</span>
              </div>
            )}
          </div>

          {/* Input Area */}
          <div style={{ 
            padding: '10px 12px',
            background: 'white',
            borderTop: '1px solid #e5e7eb',
            display: 'flex', 
            gap: 6,
            flexShrink: 0
          }}>
            <input
              type="text"
              placeholder="Ask your question…"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyPress={e => e.key === 'Enter' && !analyzing && handleSend()}
              disabled={analyzing}
              style={{
                flex: 1,
                padding: '7px 10px',
                border: '1px solid #e5e7eb',
                borderRadius: 4,
                fontSize: 11,
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || selectedFiles.size === 0 || analyzing}
              style={{
                padding: '7px 10px',
                background: (input.trim() && selectedFiles.size > 0 && !analyzing) ? '#3b82f6' : '#e5e7eb',
                color: 'white',
                border: 'none',
                borderRadius: 4,
                cursor: (input.trim() && selectedFiles.size > 0 && !analyzing) ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <Send size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
