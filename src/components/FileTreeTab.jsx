import React, { useState, useMemo } from 'react'
import { useStore } from '../lib/store.js'

const LAYER_COLORS = {
  frontend:'#2563eb', api:'#0891b2', backend:'#059669',
  auth:'#dc2626', database:'#d97706', infra:'#7c3aed',
  test:'#0891b2', util:'#656d76', style:'#6639ba',
  docs:'#1a7f37', config:'#9a6700', other:'#9ca3af',
}

const EXT_ICON = {
  py:'🐍', js:'🟨', jsx:'⚛️', ts:'🔷', tsx:'⚛️',
  html:'🌐', css:'🎨', scss:'🎨', json:'📋',
  yaml:'⚙️', yml:'⚙️', toml:'⚙️', md:'📝', mdx:'📝',
  go:'🔵', rs:'🦀', java:'☕', rb:'💎', sh:'💻',
  dockerfile:'🐳', env:'🔐', vue:'💚', svelte:'🧡', txt:'📄',
}

function fileIcon(name) {
  if (!name) return '📄'
  if (name.toLowerCase() === 'dockerfile') return '🐳'
  const ext = name.split('.').pop()?.toLowerCase()
  return EXT_ICON[ext] || '📄'
}

// Build nested tree from flat node list
function buildTree(nodes) {
  const root = { __files__: [] }
  nodes.forEach(n => {
    const path = n.data?.path || n.data?.label || ''
    const parts = path.split('/').filter(Boolean)
    if (parts.length === 0) return
    let cur = root
    for (let i = 0; i < parts.length - 1; i++) {
      if (!cur[parts[i]]) cur[parts[i]] = { __files__: [] }
      cur = cur[parts[i]]
    }
    const fileName = parts[parts.length - 1]
    cur.__files__ = cur.__files__ || []
    cur.__files__.push({
      name:  fileName,
      path:  path,
      layer: n.data?.layer || 'other',
      color: n.data?.color || LAYER_COLORS[n.data?.layer] || '#9ca3af',
    })
  })
  return root
}

function FileRow({ file, depth, search, onSelect, selected }) {
  const matches = !search || file.name.toLowerCase().includes(search.toLowerCase())
  if (!matches) return null
  const isSelected = selected === file.path
  return (
    <div
      onClick={() => onSelect(file.path)}
      style={{
        display: 'flex', alignItems: 'center', gap: 7,
        padding: '4px 8px',
        paddingLeft: 12 + depth * 16,
        borderRadius: 5, cursor: 'pointer',
        background: isSelected ? file.color + '12' : 'transparent',
        color: isSelected ? file.color : 'var(--text2)',
        fontSize: 13, transition: 'background 0.1s',
      }}
      onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'var(--bg2)' }}
      onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent' }}
    >
      <span style={{ fontSize: 14, lineHeight: 1, flexShrink: 0 }}>{fileIcon(file.name)}</span>
      <span style={{
        flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        fontFamily: 'var(--font-mono)', fontSize: 12.5,
      }}>
        {file.name}
      </span>
      <span style={{
        fontSize: 9, fontWeight: 600, padding: '1px 6px', borderRadius: 100,
        background: file.color + '14', color: file.color,
        textTransform: 'uppercase', flexShrink: 0, letterSpacing: '0.04em',
      }}>
        {file.layer}
      </span>
    </div>
  )
}

function DirRow({ name, node, depth, search, onSelect, selected }) {
  const [open, setOpen] = useState(depth < 2)

  const folders = Object.entries(node).filter(([k]) => k !== '__files__')
  const files   = node.__files__ || []

  // Check if anything inside matches search
  if (search) {
    const hasMatch =
      files.some(f => f.name.toLowerCase().includes(search.toLowerCase())) ||
      folders.some(([k]) => k.toLowerCase().includes(search.toLowerCase()))
    if (!hasMatch) return null
  }

  return (
    <div>
      {name && (
        <div
          onClick={() => setOpen(o => !o)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '4px 8px',
            paddingLeft: 12 + (depth - 1) * 16,
            borderRadius: 5, cursor: 'pointer',
            userSelect: 'none', fontSize: 13,
            color: 'var(--text)',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--bg2)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          <svg width="10" height="10" viewBox="0 0 16 16" fill="var(--text3)"
            style={{ transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s', flexShrink: 0 }}>
            <path d="M6.22 3.22a.75.75 0 011.06 0l4.25 4.25a.75.75 0 010 1.06l-4.25 4.25a.75.75 0 01-1.06-1.06L9.94 8 6.22 4.28a.75.75 0 010-1.06z"/>
          </svg>
          <svg width="14" height="14" viewBox="0 0 16 16" fill={open ? '#0969da' : 'var(--text2)'}>
            <path d="M1.75 1A1.75 1.75 0 000 2.75v10.5C0 14.216.784 15 1.75 15h12.5A1.75 1.75 0 0016 13.25v-8.5A1.75 1.75 0 0014.25 3h-6.5a.25.25 0 01-.2-.1l-.9-1.2C6.07 1.26 5.55 1 5 1H1.75z"/>
          </svg>
          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 500, color: open ? 'var(--blue)' : 'var(--text)' }}>
            {name}
          </span>
          <span style={{ fontSize: 11, color: 'var(--text3)', marginLeft: 'auto' }}>
            {files.length + folders.length}
          </span>
        </div>
      )}
      {open && (
        <div>
          {folders.map(([k, v]) => (
            <DirRow key={k} name={k} node={v} depth={depth + 1} search={search} onSelect={onSelect} selected={selected} />
          ))}
          {files.map(f => (
            <FileRow key={f.path} file={f} depth={depth + 1} search={search} onSelect={onSelect} selected={selected} />
          ))}
        </div>
      )}
    </div>
  )
}

export default function FileTreeTab() {
  const { archNodes, repoData } = useStore()
  const [search,   setSearch]   = useState('')
  const [selected, setSelected] = useState(null)
  const [copied,   setCopied]   = useState(false)

  const tree  = useMemo(() => buildTree(archNodes), [archNodes])
  const total = archNodes.length

  // Export as plain text tree
  function exportTree() {
    const lines = [repoData?.name + '/']
    const sorted = [...archNodes].sort((a, b) =>
      (a.data?.path || '').localeCompare(b.data?.path || '')
    )
    sorted.forEach(n => {
      const path  = n.data?.path || n.data?.label || ''
      const depth = (path.match(/\//g) || []).length
      lines.push('  '.repeat(depth) + path.split('/').pop())
    })
    navigator.clipboard.writeText(lines.join('\n')).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const folders = Object.entries(tree).filter(([k]) => k !== '__files__')
  const rootFiles = tree.__files__ || []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

      {/* Header */}
      <div style={{
        padding: '12px 16px', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 10,
        background: 'var(--surface)', flexShrink: 0,
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 1 }}>
            File structure
          </div>
          <div style={{ fontSize: 12, color: 'var(--text3)' }}>
            {total} files · {repoData?.name}
          </div>
        </div>
        <button onClick={exportTree} className="btn btn-secondary btn-sm">
          {copied ? '✓ Copied' : '⎘ Copy tree'}
        </button>
      </div>

      {/* Search */}
      <div style={{
        padding: '8px 12px', borderBottom: '1px solid var(--border)',
        background: 'var(--surface)', flexShrink: 0,
      }}>
        <div style={{ position: 'relative' }}>
          <svg width="13" height="13" viewBox="0 0 16 16" fill="var(--text3)"
            style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)' }}>
            <path d="M10.68 11.74a6 6 0 01-7.922-8.982 6 6 0 018.982 7.922l3.04 3.04a.749.749 0 01-.326 1.275.749.749 0 01-.734-.215zm-1.42-1.096a4.5 4.5 0 10-6.456-6.258 4.5 4.5 0 006.456 6.258z"/>
          </svg>
          <input
            className="input"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Filter files…"
            style={{ paddingLeft: 30, fontSize: 13 }}
          />
        </div>
      </div>

      {/* Tree */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '6px 4px', background: 'var(--bg)' }}>
        {total === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>📁</div>
            Analyze a repo first to see the file structure.
          </div>
        ) : (
          <>
            {folders.map(([k, v]) => (
              <DirRow key={k} name={k} node={v} depth={1} search={search} onSelect={setSelected} selected={selected} />
            ))}
            {rootFiles.map(f => (
              <FileRow key={f.path} file={f} depth={1} search={search} onSelect={setSelected} selected={selected} />
            ))}
          </>
        )}
      </div>
    </div>
  )
}
