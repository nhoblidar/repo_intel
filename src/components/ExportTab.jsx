import React, { useState, useMemo } from 'react'
import { useStore } from '../lib/store.js'

function buildMarkdownTree(nodes) {
  const sorted = [...nodes].sort((a,b)=>a.data.path.localeCompare(b.data.path))
  let out = ''
  sorted.forEach(n => {
    const depth = (n.data.path.match(/\//g)||[]).length
    out += '  '.repeat(depth) + '- `' + n.data.label + '` — ' + (n.data.meta?.label||n.data.layer) + '\n'
  })
  return out
}

function buildJsonExport(repoData, nodes) {
  return JSON.stringify({
    repo:      repoData?.name,
    language:  repoData?.language,
    stars:     repoData?.stars,
    summary:   repoData?.summary,
    files:     nodes.map(n => ({ path: n.data.path, layer: n.data.layer })),
    commits:   (repoData?.commits||[]).map(c => ({ sha: c.sha, message: c.message, author: c.author })),
  }, null, 2)
}

function buildLLMText(repoData, nodes) {
  const lines = [
    `# Repository: ${repoData?.name}`,
    `Language: ${repoData?.language}`,
    `Stars: ${repoData?.stars} | Forks: ${repoData?.forks}`,
    '',
    '## Description',
    repoData?.description || 'No description.',
    '',
    '## AI Summary',
    repoData?.summary || '',
    '',
    '## File Structure',
    ...nodes.sort((a,b)=>a.data.path.localeCompare(b.data.path))
      .map(n => `${n.data.path} [${n.data.layer}]`),
    '',
    '## Recent Commits',
    ...(repoData?.commits||[]).map(c => `- ${c.sha}: ${c.message} (${c.author})`),
  ]
  return lines.join('\n')
}

const FORMATS = [
  {
    id: 'markdown',
    label: 'Markdown',
    icon: '📝',
    desc: 'File tree with layer labels. Good for docs and READMEs.',
    ext: 'md',
  },
  {
    id: 'json',
    label: 'JSON',
    icon: '{ }',
    desc: 'Structured data: repo info, files, commits. Good for pipelines.',
    ext: 'json',
  },
  {
    id: 'llm',
    label: 'LLM-ready text',
    icon: '🤖',
    desc: 'Plain text optimised for pasting into ChatGPT, Claude, or any LLM.',
    ext: 'txt',
  },
]

export default function ExportTab() {
  const { repoData, archNodes } = useStore()
  const [format, setFormat] = useState('llm')
  const [copied, setCopied] = useState(false)

  const content = useMemo(() => {
    if (!repoData) return ''
    if (format === 'markdown') return buildMarkdownTree(archNodes)
    if (format === 'json')     return buildJsonExport(repoData, archNodes)
    return buildLLMText(repoData, archNodes)
  }, [format, repoData, archNodes])

  function copyContent() {
    navigator.clipboard.writeText(content).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function downloadContent() {
    const fmt  = FORMATS.find(f => f.id === format)
    const blob = new Blob([content], { type: 'text/plain' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `${repoData?.name?.replace('/','-')}-repointel.${fmt.ext}`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', overflow:'hidden' }}>
      {/* Header */}
      <div style={{ padding:'14px 20px', borderBottom:'1px solid var(--border)', background:'var(--surface)', flexShrink:0 }}>
        <div style={{ fontSize:14, fontWeight:600, color:'var(--text)', marginBottom:1 }}>
          Export repository
        </div>
        <div style={{ fontSize:12, color:'var(--text3)' }}>
          Convert {repoData?.name} to a portable format for LLMs, docs, or pipelines.
        </div>
      </div>

      <div style={{ display:'flex', height:'100%', overflow:'hidden' }}>
        {/* Left — format selector */}
        <div style={{ width:240, background:'var(--surface)', borderRight:'1px solid var(--border)', padding:'14px 12px', flexShrink:0, overflowY:'auto' }}>
          <div className="section-label" style={{ marginBottom:10 }}>Format</div>
          {FORMATS.map(f => (
            <button key={f.id}
              onClick={() => setFormat(f.id)}
              style={{
                display:'flex', gap:10, alignItems:'flex-start', width:'100%',
                padding:'10px 12px', marginBottom:6,
                background: format===f.id ? 'var(--blue-dim)' : 'var(--bg)',
                border: `1px solid ${format===f.id ? 'var(--blue)' : 'var(--border)'}`,
                borderRadius:'var(--radius)', cursor:'pointer', textAlign:'left',
                transition:'all 0.12s',
              }}
            >
              <span style={{ fontSize:18, lineHeight:1, flexShrink:0 }}>{f.icon}</span>
              <div>
                <div style={{ fontSize:13, fontWeight:600, color: format===f.id ? 'var(--blue)' : 'var(--text)', marginBottom:2 }}>
                  {f.label}
                </div>
                <div style={{ fontSize:11.5, color:'var(--text3)', lineHeight:1.5 }}>{f.desc}</div>
              </div>
            </button>
          ))}

          {/* Stats */}
          <div style={{ marginTop:20, padding:'12px', background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'var(--radius)', fontSize:12, color:'var(--text2)' }}>
            <div style={{ marginBottom:5 }}><strong style={{ color:'var(--text)' }}>{archNodes.length}</strong> files included</div>
            <div style={{ marginBottom:5 }}><strong style={{ color:'var(--text)' }}>{content.length.toLocaleString()}</strong> characters</div>
            <div><strong style={{ color:'var(--text)' }}>~{Math.round(content.split(/\s+/).length/750)}</strong> min read</div>
          </div>
        </div>

        {/* Right — preview + actions */}
        <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
          {/* Toolbar */}
          <div style={{ padding:'10px 16px', borderBottom:'1px solid var(--border)', display:'flex', gap:8, alignItems:'center', background:'var(--surface)', flexShrink:0 }}>
            <span style={{ fontSize:12, color:'var(--text3)', flex:1 }}>
              Preview · {content.length.toLocaleString()} chars · ~{Math.ceil(content.length/4)} tokens
            </span>
            <button onClick={copyContent} className="btn btn-secondary btn-sm">
              {copied ? '✓ Copied!' : '⎘ Copy'}
            </button>
            <button onClick={downloadContent} className="btn btn-primary btn-sm">
              ↓ Download .{FORMATS.find(f=>f.id===format)?.ext}
            </button>
          </div>

          {/* Preview */}
          <div style={{ flex:1, overflow:'auto', padding:'16px', background:'var(--bg)' }}>
            {!repoData ? (
              <div style={{ textAlign:'center', padding:40, color:'var(--text3)', fontSize:13 }}>
                Analyze a repo first to generate the export.
              </div>
            ) : (
              <pre style={{
                fontFamily:'var(--font-mono)', fontSize:12.5, lineHeight:1.7,
                color:'var(--text2)', background:'var(--surface)',
                border:'1px solid var(--border)', borderRadius:'var(--radius)',
                padding:16, margin:0, whiteSpace:'pre-wrap', wordBreak:'break-word',
              }}>
                {content}
              </pre>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
