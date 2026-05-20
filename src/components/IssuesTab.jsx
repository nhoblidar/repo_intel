import React, { useEffect, useState } from 'react'
import { useStore } from '../lib/store.js'
import { getIssues } from '../lib/api.js'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'

dayjs.extend(relativeTime)

const LABEL_COLORS = {
  'good first issue': { bg: '#1a3a1a', color: '#3dd68c', border: '#2a5a2a' },
  'bug':              { bg: '#3a1a1a', color: '#f05454', border: '#5a2a2a' },
  'enhancement':      { bg: '#1a2a3a', color: '#4d9fff', border: '#2a3a5a' },
  'help wanted':      { bg: '#2a2a3a', color: '#a78bfa', border: '#3a3a5a' },
  'documentation':    { bg: '#1a2a2a', color: '#22d3ee', border: '#2a3a3a' },
  'question':         { bg: '#2a2a1a', color: '#f0a429', border: '#3a3a2a' },
  default:            { bg: 'var(--surface2)', color: 'var(--text2)', border: 'var(--border)' },
}

const DIFFICULTY = {
  easy:   { label: 'Good first issue', color: '#3dd68c', bg: 'var(--green-dim)' },
  medium: { label: 'Intermediate',     color: '#f0a429', bg: 'var(--amber-dim)' },
  hard:   { label: 'Advanced',         color: '#f05454', bg: 'var(--red-dim)' },
}

function guessDifficulty(issue) {
  const labels = (issue.labels || []).map(l => l.name.toLowerCase())
  if (labels.some(l => l.includes('good first') || l.includes('beginner') || l.includes('starter'))) return 'easy'
  if (labels.some(l => l.includes('hard') || l.includes('complex') || l.includes('advanced'))) return 'hard'
  const body = (issue.body || '').length
  if (body < 200) return 'easy'
  if (body > 800) return 'hard'
  return 'medium'
}

function guessCategory(issue) {
  const text = ((issue.title || '') + ' ' + (issue.body || '')).toLowerCase()
  if (/bug|fix|error|crash|broken|regression/.test(text)) return 'bug'
  if (/feature|add|implement|support|allow|enable/.test(text)) return 'feature'
  if (/doc|readme|comment|typo|spelling/.test(text)) return 'docs'
  if (/test|coverage|spec/.test(text)) return 'testing'
  if (/perf|slow|speed|optimize/.test(text)) return 'performance'
  return 'other'
}

const CATEGORY_META = {
  bug:         { label: 'Bug fix',      icon: '🐛', color: 'var(--red)' },
  feature:     { label: 'Feature',      icon: '✨', color: 'var(--blue)' },
  docs:        { label: 'Docs',         icon: '📝', color: 'var(--cyan)' },
  testing:     { label: 'Testing',      icon: '🧪', color: 'var(--amber)' },
  performance: { label: 'Performance',  icon: '⚡', color: 'var(--purple)' },
  other:       { label: 'Other',        icon: '💬', color: 'var(--text3)' },
}

export default function IssuesTab() {
  const { repoKey, setActiveTab } = useStore()
  const [issues, setIssues] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [selected, setSelected] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!repoKey) return
    setLoading(true)
    getIssues(repoKey)
      .then(data => {
        if (Array.isArray(data)) setIssues(data.filter(i => !i.pull_request))
        else setError('Could not load issues. Check your internet connection.')
        setLoading(false)
      })
      .catch(() => { setError('Failed to load issues.'); setLoading(false) })
  }, [repoKey])

  const enriched = issues.map(i => ({
    ...i,
    _difficulty: guessDifficulty(i),
    _category: guessCategory(i),
  }))

  const filtered = filter === 'all' ? enriched
    : filter === 'gfi' ? enriched.filter(i => i._difficulty === 'easy')
    : enriched.filter(i => i._category === filter)

  const counts = {
    all: enriched.length,
    gfi: enriched.filter(i => i._difficulty === 'easy').length,
    bug: enriched.filter(i => i._category === 'bug').length,
    feature: enriched.filter(i => i._category === 'feature').length,
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Left — list */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ padding: '22px 24px 16px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: 'var(--green-dim)', border: '1px solid rgba(61,214,140,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16,
            }}>🐛</div>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600 }}>Issue Intelligence</div>
              <div style={{ fontSize: 12, color: 'var(--text3)' }}>{enriched.length} open issues — AI-labeled by difficulty and type</div>
            </div>
          </div>

          {/* Filter pills */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {[
              { key: 'all', label: `All  ${counts.all}` },
              { key: 'gfi', label: `⭐ Good first  ${counts.gfi}` },
              { key: 'bug', label: `🐛 Bugs  ${counts.bug}` },
              { key: 'feature', label: `✨ Features  ${counts.feature}` },
            ].map(f => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                style={{
                  padding: '5px 12px', borderRadius: 100, fontSize: 13,
                  background: filter === f.key ? 'var(--green-dim)' : 'var(--surface)',
                  border: `1px solid ${filter === f.key ? 'rgba(61,214,140,0.4)' : 'var(--border)'}`,
                  color: filter === f.key ? 'var(--green)' : 'var(--text2)',
                  cursor: 'pointer', transition: 'all 0.15s',
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Issue list */}
        <div style={{ flex: 1, overflow: 'auto', padding: '8px 12px' }}>
          {loading && (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text3)' }}>
              <div style={{ width: 28, height: 28, border: '2px solid var(--border)', borderTopColor: 'var(--green)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
              Loading issues from GitHub…
            </div>
          )}
          {error && <div style={{ padding: 24, color: 'var(--red)', fontSize: 14 }}>{error}</div>}

          {filtered.map(issue => (
            <IssueRow
              key={issue.id}
              issue={issue}
              selected={selected?.id === issue.id}
              onClick={() => setSelected(selected?.id === issue.id ? null : issue)}
            />
          ))}

          {!loading && filtered.length === 0 && (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text3)', fontSize: 14 }}>
              No issues found for this filter.
            </div>
          )}
        </div>
      </div>

      {/* Right — detail panel */}
      {selected && (
        <div style={{
          width: 380, borderLeft: '1px solid var(--border)',
          background: 'var(--bg2)', overflowY: 'auto',
          padding: '24px 20px',
          animation: 'fadeIn 0.2s ease',
          flexShrink: 0,
        }}>
          <button
            onClick={() => setSelected(null)}
            style={{ float: 'right', background: 'none', border: 'none', color: 'var(--text3)', fontSize: 18, cursor: 'pointer' }}
          >×</button>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
            <DiffBadge diff={selected._difficulty} />
            <CatBadge cat={selected._category} />
          </div>

          <h2 style={{
            fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 700,
            color: 'var(--text)', marginBottom: 8, lineHeight: 1.4,
          }}>
            #{selected.number} {selected.title}
          </h2>

          <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 16 }}>
            Opened by <strong style={{ color: 'var(--text2)' }}>{selected.user?.login}</strong> · {dayjs(selected.created_at).fromNow()}
          </div>

          {(selected.labels || []).length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
              {selected.labels.map(l => {
                const style = LABEL_COLORS[l.name.toLowerCase()] || LABEL_COLORS.default
                return (
                  <span key={l.id} style={{
                    fontSize: 11, padding: '3px 8px', borderRadius: 100, fontWeight: 600,
                    background: style.bg, color: style.color, border: `1px solid ${style.border}`,
                  }}>
                    {l.name}
                  </span>
                )
              })}
            </div>
          )}

          {selected.body ? (
            <div style={{
              fontSize: 13, color: 'var(--text2)', lineHeight: 1.7,
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 10, padding: 16, marginBottom: 20,
              maxHeight: 220, overflow: 'auto', whiteSpace: 'pre-wrap',
            }}>
              {selected.body.slice(0, 800)}{selected.body.length > 800 ? '…' : ''}
            </div>
          ) : (
            <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 20 }}>No description provided.</div>
          )}

          {/* AI guidance section */}
          <div style={{
            background: 'var(--green-dim)', border: '1px solid rgba(61,214,140,0.2)',
            borderRadius: 10, padding: 16, marginBottom: 16,
          }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--green)', marginBottom: 8, letterSpacing: '0.4px' }}>
              ✦ HOW TO CONTRIBUTE
            </div>
            <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6 }}>
              {getContributionAdvice(selected)}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <a
              href={selected.html_url}
              target="_blank" rel="noreferrer"
              style={{
                display: 'block', textAlign: 'center', padding: '10px 16px',
                background: 'var(--green)', color: 'var(--bg)',
                borderRadius: 8, fontSize: 14, fontWeight: 600,
              }}
            >
              Open on GitHub ↗
            </a>
            <button
              onClick={() => {
                useStore.getState().addMessage({
                  role: 'user',
                  content: `Help me understand and contribute to issue #${selected.number}: "${selected.title}"`,
                  id: Date.now(),
                })
                useStore.setState({
                  activeTab: 'chat',
                  pendingQuestion: `Help me understand and contribute to issue #${selected.number}: "${selected.title}". The description says: ${(selected.body || '').slice(0, 300)}`,
                })
              }}
              style={{
                display: 'block', width: '100%', padding: '9px 16px',
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 8, fontSize: 13, color: 'var(--text2)', cursor: 'pointer',
              }}
            >
              💬 Ask AI how to fix this
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function IssueRow({ issue, selected, onClick }) {
  const diff = DIFFICULTY[issue._difficulty]
  const cat  = CATEGORY_META[issue._category]

  return (
    <div
      onClick={onClick}
      style={{
        padding: '14px 12px',
        borderRadius: 10,
        background: selected ? 'var(--surface)' : 'transparent',
        border: `1px solid ${selected ? 'var(--border2)' : 'transparent'}`,
        cursor: 'pointer', transition: 'all 0.15s', marginBottom: 2,
      }}
      onMouseEnter={e => { if (!selected) e.currentTarget.style.background = 'var(--surface)' }}
      onMouseLeave={e => { if (!selected) e.currentTarget.style.background = 'transparent' }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>{cat?.icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            #{issue.number} {issue.title}
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{
              fontSize: 11, padding: '2px 7px', borderRadius: 100, fontWeight: 600,
              background: diff.bg, color: diff.color,
            }}>
              {diff.label}
            </span>
            <span style={{ fontSize: 12, color: 'var(--text3)' }}>
              {dayjs(issue.created_at).fromNow()}
            </span>
            {issue.comments > 0 && (
              <span style={{ fontSize: 12, color: 'var(--text3)' }}>
                💬 {issue.comments}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function DiffBadge({ diff }) {
  const d = DIFFICULTY[diff]
  return (
    <span style={{
      fontSize: 11, padding: '3px 10px', borderRadius: 100,
      background: d.bg, color: d.color, fontWeight: 700, letterSpacing: '0.3px',
    }}>
      {d.label}
    </span>
  )
}

function CatBadge({ cat }) {
  const c = CATEGORY_META[cat]
  return (
    <span style={{
      fontSize: 11, padding: '3px 10px', borderRadius: 100,
      background: 'var(--surface2)', color: c.color, fontWeight: 600,
      border: '1px solid var(--border)',
    }}>
      {c.icon} {c.label}
    </span>
  )
}

function getContributionAdvice(issue) {
  const diff = issue._difficulty
  const cat  = issue._category
  if (diff === 'easy' && cat === 'docs') return 'Great starting point! Find the relevant docs file and make the edit. Run the doc linter if available. Open a focused PR.'
  if (diff === 'easy') return 'Good first issue! Read the issue, find the related file using the codebase chat, make a small targeted change, and open a PR with a clear description.'
  if (cat === 'bug') return 'Start by reproducing the bug locally. Use the chat tab to find the relevant code. Write a failing test first, then fix it, and submit a PR referencing this issue.'
  if (cat === 'feature') return 'Check if there is a design discussion in the comments. Use codebase chat to understand existing patterns. Keep your implementation small and consistent with the codebase style.'
  return 'Use the codebase chat to understand context. Follow existing patterns, write tests, and open a focused PR that only addresses this issue.'
}
