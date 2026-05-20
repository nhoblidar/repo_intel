import React, { useEffect, useState } from 'react'
import { useStore } from '../lib/store.js'
import { getIssues } from '../lib/api.js'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
dayjs.extend(relativeTime)

const DIFFICULTY_MAP = {
  easy:   { label: 'Good first issue', color: 'var(--green)',  bg: 'var(--green-dim)' },
  medium: { label: 'Intermediate',     color: 'var(--amber)',  bg: 'var(--amber-dim)' },
  hard:   { label: 'Advanced',         color: 'var(--red)',    bg: 'var(--red-dim)' },
}

const CAT_MAP = {
  bug:         { icon: '🐛', label: 'Bug fix',     color: 'var(--red)' },
  feature:     { icon: '✨', label: 'Feature',     color: 'var(--blue)' },
  docs:        { icon: '📝', label: 'Docs',        color: 'var(--cyan)' },
  testing:     { icon: '🧪', label: 'Testing',     color: 'var(--amber)' },
  performance: { icon: '⚡', label: 'Performance', color: 'var(--purple)' },
  other:       { icon: '💬', label: 'Other',       color: 'var(--text3)' },
}

function guessDifficulty(issue) {
  const labels = (issue.labels || []).map(l => l.name.toLowerCase())
  if (labels.some(l => /good.first|beginner|starter|easy/.test(l))) return 'easy'
  if (labels.some(l => /hard|complex|advanced/.test(l))) return 'hard'
  const bodyLen = (issue.body || '').length
  if (bodyLen < 200) return 'easy'
  if (bodyLen > 800) return 'hard'
  return 'medium'
}

function guessCategory(issue) {
  const t = ((issue.title || '') + ' ' + (issue.body || '')).toLowerCase()
  if (/bug|fix|error|crash|broken/.test(t)) return 'bug'
  if (/feature|add|implement|support/.test(t)) return 'feature'
  if (/doc|readme|comment|typo/.test(t)) return 'docs'
  if (/test|coverage|spec/.test(t)) return 'testing'
  if (/perf|slow|speed|optim/.test(t)) return 'performance'
  return 'other'
}

function contributionPath(diff, cat) {
  if (diff === 'easy' && cat === 'docs')
    return ['Find the docs file', 'Make the edit', 'Run doc linter if available', 'Open a focused PR']
  if (diff === 'easy')
    return ['Read the issue carefully', 'Use Chat to find relevant files', 'Make a small targeted change', 'Write a clear PR description']
  if (cat === 'bug')
    return ['Reproduce the bug locally', 'Use Chat to find the buggy code', 'Write a failing test first', 'Fix it, verify test passes', 'Open a PR referencing this issue']
  if (cat === 'feature')
    return ['Check discussion in comments', 'Use Chat to understand existing patterns', 'Keep implementation small', 'Follow existing code style', 'Open a PR with screenshots/demo']
  return ['Use Chat to understand context', 'Follow existing patterns', 'Write tests for your change', 'Open a focused PR']
}

export default function ContributeTab() {
  const { repoKey, repoData, setActiveTab } = useStore()
  const [issues, setIssues]   = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter]   = useState('all')
  const [selected, setSelected] = useState(null)
  const [error, setError]     = useState('')

  useEffect(() => {
    if (!repoKey) return
    setLoading(true)
    getIssues(repoKey)
      .then(data => {
        if (Array.isArray(data)) {
          setIssues(data.filter(i => !i.pull_request))
        } else {
          setError('Could not load issues from GitHub.')
        }
        setLoading(false)
      })
      .catch(() => { setError('Failed to load issues.'); setLoading(false) })
  }, [repoKey])

  const enriched = issues.map(i => ({
    ...i,
    _diff: guessDifficulty(i),
    _cat:  guessCategory(i),
  }))

  const filtered = filter === 'all'    ? enriched
    : filter === 'gfi'                 ? enriched.filter(i => i._diff === 'easy')
    : enriched.filter(i => i._cat === filter)

  const counts = {
    all:     enriched.length,
    gfi:     enriched.filter(i => i._diff === 'easy').length,
    bug:     enriched.filter(i => i._cat === 'bug').length,
    feature: enriched.filter(i => i._cat === 'feature').length,
  }

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>

      {/* Left — list */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ padding: '18px 24px 14px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <div className="tab-kicker">Contribute</div>
          <div className="tab-title">Good-first guidance for {repoData?.name}</div>
          <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 14 }}>
            AI-labelled issues with step-by-step contribution paths for junior developers.
          </div>

          {/* Filters */}
          <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
            {[
              { key: 'all',     label: `All  ${counts.all}` },
              { key: 'gfi',     label: `⭐ Good first  ${counts.gfi}` },
              { key: 'bug',     label: `🐛 Bugs  ${counts.bug}` },
              { key: 'feature', label: `✨ Features  ${counts.feature}` },
            ].map(f => (
              <button key={f.key} onClick={() => setFilter(f.key)} style={{
                padding: '5px 12px', borderRadius: 100, fontSize: 13, cursor: 'pointer',
                background: filter === f.key ? 'var(--green-dim)' : 'var(--surface)',
                border: `1px solid ${filter === f.key ? 'rgba(61,214,140,0.35)' : 'var(--border)'}`,
                color: filter === f.key ? 'var(--green)' : 'var(--text2)',
                transition: 'all 0.15s',
              }}>
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Issue list */}
        <div style={{ flex: 1, overflow: 'auto', padding: '8px 12px' }}>
          {loading && (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text3)' }}>
              <div className="spinner" style={{ margin: '0 auto 12px' }} />
              Loading issues from GitHub…
            </div>
          )}
          {error && <div style={{ padding: 24, color: 'var(--red)', fontSize: 14 }}>{error}</div>}
          {!loading && filtered.length === 0 && !error && (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text3)', fontSize: 14 }}>
              No issues found for this filter.
            </div>
          )}
          {filtered.map(issue => (
            <IssueRow
              key={issue.id} issue={issue}
              selected={selected?.id === issue.id}
              onClick={() => setSelected(selected?.id === issue.id ? null : issue)}
            />
          ))}
        </div>
      </div>

      {/* Right — detail */}
      {selected && (
        <div style={{
          width: 380, borderLeft: '1px solid var(--border)',
          background: 'var(--bg2)', overflowY: 'auto',
          padding: '22px 20px', flexShrink: 0, animation: 'fadeIn 0.2s ease',
        }}>
          <button onClick={() => setSelected(null)} style={{
            float: 'right', background: 'none', border: 'none',
            color: 'var(--text3)', fontSize: 18, cursor: 'pointer',
          }}>×</button>

          {/* Badges */}
          <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 14 }}>
            <span className="badge" style={{
              background: DIFFICULTY_MAP[selected._diff].bg,
              color: DIFFICULTY_MAP[selected._diff].color,
            }}>
              {DIFFICULTY_MAP[selected._diff].label}
            </span>
            <span className="badge badge-gray">
              {CAT_MAP[selected._cat].icon} {CAT_MAP[selected._cat].label}
            </span>
          </div>

          <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 700, color: 'var(--text)', marginBottom: 6, lineHeight: 1.4 }}>
            #{selected.number} {selected.title}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 14 }}>
            by <strong style={{ color: 'var(--text2)' }}>{selected.user?.login}</strong> · {dayjs(selected.created_at).fromNow()}
            {selected.comments > 0 && ` · 💬 ${selected.comments} comments`}
          </div>

          {/* Labels */}
          {(selected.labels || []).length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 14 }}>
              {selected.labels.map(l => (
                <span key={l.id} style={{
                  fontSize: 11, padding: '2px 8px', borderRadius: 100,
                  background: `#${l.color}22`, color: `#${l.color}`,
                  border: `1px solid #${l.color}44`, fontWeight: 600,
                }}>
                  {l.name}
                </span>
              ))}
            </div>
          )}

          {/* Body */}
          {selected.body ? (
            <div style={{
              fontSize: 13, color: 'var(--text2)', lineHeight: 1.7,
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 10, padding: 14, marginBottom: 16,
              maxHeight: 180, overflow: 'auto', whiteSpace: 'pre-wrap',
            }}>
              {selected.body.slice(0, 600)}{selected.body.length > 600 ? '…' : ''}
            </div>
          ) : (
            <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 16 }}>No description.</div>
          )}

          {/* Contribution path */}
          <div style={{
            background: 'var(--green-dim)', border: '1px solid rgba(61,214,140,0.18)',
            borderRadius: 10, padding: '14px 16px', marginBottom: 14,
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--green)', marginBottom: 10, letterSpacing: '0.04em' }}>
              ✦ HOW TO CONTRIBUTE
            </div>
            {contributionPath(selected._diff, selected._cat).map((step, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 8, alignItems: 'flex-start' }}>
                <div style={{
                  width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                  background: 'var(--green)', color: 'var(--bg)',
                  fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {i + 1}
                </div>
                <span style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.5, paddingTop: 2 }}>{step}</span>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <a href={selected.html_url} target="_blank" rel="noreferrer" style={{
              display: 'block', textAlign: 'center', padding: '10px 16px',
              background: 'var(--green)', color: 'var(--bg)',
              borderRadius: 8, fontSize: 14, fontWeight: 600, textDecoration: 'none',
            }}>
              Open on GitHub ↗
            </a>
            <button onClick={() => {
              useStore.getState().addMessage({
                id: Date.now(), role: 'user',
                content: `Help me understand and fix issue #${selected.number}: "${selected.title}"`,
              })
              useStore.setState({
                activeTab: 'chat',
                pendingQuestion: `Help me fix issue #${selected.number} in ${repoKey}: "${selected.title}". ${selected.body ? 'Description: ' + selected.body.slice(0, 200) : ''}`,
              })
            }} style={{
              padding: '9px 16px', background: 'var(--surface)',
              border: '1px solid var(--border)', borderRadius: 8,
              fontSize: 13, color: 'var(--text2)', cursor: 'pointer', width: '100%',
            }}>
              🤖 Ask AI agent how to fix this
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function IssueRow({ issue, selected, onClick }) {
  const diff = DIFFICULTY_MAP[issue._diff]
  const cat  = CAT_MAP[issue._cat]
  return (
    <div onClick={onClick} style={{
      padding: '12px 12px', borderRadius: 10, cursor: 'pointer',
      background: selected ? 'var(--surface)' : 'transparent',
      border: `1px solid ${selected ? 'var(--border2)' : 'transparent'}`,
      transition: 'all 0.15s', marginBottom: 2,
    }}
    onMouseEnter={e => { if (!selected) e.currentTarget.style.background = 'var(--surface)' }}
    onMouseLeave={e => { if (!selected) e.currentTarget.style.background = 'transparent' }}
    >
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>{cat.icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500, marginBottom: 5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            #{issue.number} {issue.title}
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{
              fontSize: 10, padding: '2px 7px', borderRadius: 100, fontWeight: 700,
              background: diff.bg, color: diff.color,
            }}>
              {diff.label}
            </span>
            <span style={{ fontSize: 11, color: 'var(--text3)' }}>{dayjs(issue.created_at).fromNow()}</span>
            {issue.comments > 0 && (
              <span style={{ fontSize: 11, color: 'var(--text3)' }}>💬 {issue.comments}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
