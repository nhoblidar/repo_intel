import React, { useEffect, useState } from 'react'
import { useStore } from '../lib/store.js'
import { getPullRequests, getRelease, getContributors } from '../lib/api.js'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
dayjs.extend(relativeTime)

function scoreColor(s) {
  if (s >= 75) return '#3dd68c'
  if (s >= 50) return '#f0a429'
  return '#f05454'
}

function fmtHours(h) {
  if (h == null) return 'N/A'
  if (h < 1)    return '<1h'
  if (h < 24)   return Math.round(h) + 'h'
  return Math.round(h / 24) + 'd'
}

function HealthRing({ score }) {
  const r = 38, cx = 50, cy = 50
  const circ = 2 * Math.PI * r
  const dash  = (score / 100) * circ
  const col   = scoreColor(score)
  return (
    <svg width="110" height="110" viewBox="0 0 100 100">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8"/>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={col} strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={`${dash} ${circ - dash}`}
        strokeDashoffset={circ / 4}
        style={{ transition: 'stroke-dasharray 1s ease' }}
      />
      <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central"
        style={{ fontSize: 19, fontWeight: 800, fill: col, fontFamily: 'var(--font-display)' }}>
        {score}
      </text>
    </svg>
  )
}

function KPI({ label, value, sub, color }) {
  return (
    <div style={{
      background: '#111827', border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 12, padding: '18px 20px',
    }}>
      <div style={{ fontSize: 11, color: '#5a6478', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, color: color || '#e4eaf5', fontFamily: 'var(--font-display)', marginBottom: 4 }}>
        {value}
      </div>
      <div style={{ fontSize: 12, color: '#5a6478' }}>{sub}</div>
    </div>
  )
}

function HealthBar({ label, score, desc }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
        <span style={{ fontSize: 13, color: '#8895ae' }}>{label}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: scoreColor(score) }}>{score}/100</span>
      </div>
      <div style={{ height: 5, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: score + '%',
          background: scoreColor(score), borderRadius: 3,
          transition: 'width 0.8s ease',
        }}/>
      </div>
      <div style={{ fontSize: 11, color: '#5a6478', marginTop: 4 }}>{desc}</div>
    </div>
  )
}

function PRRow({ pr, i, total }) {
  const isMerged = !!pr.merged_at
  const color    = isMerged ? '#a78bfa' : pr.state === 'open' ? '#3dd68c' : '#5a6478'
  const label    = isMerged ? 'merged' : pr.state
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 10,
      padding: '10px 0',
      borderBottom: i < total - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
    }}>
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0, marginTop: 5 }}/>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, color: '#e4eaf5', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 2 }}>
          #{pr.number} {pr.title}
        </div>
        <div style={{ fontSize: 11, color: '#5a6478' }}>
          {pr.user?.login} · {dayjs(pr.created_at).fromNow()}
          {pr.merged_at && ` · merged ${dayjs(pr.merged_at).fromNow()}`}
        </div>
      </div>
      <span style={{
        fontSize: 10, padding: '2px 8px', borderRadius: 100, fontWeight: 700,
        textTransform: 'uppercase', flexShrink: 0,
        background: color + '20', color,
      }}>
        {label}
      </span>
    </div>
  )
}

export default function PMDashboard() {
  const { repoKey, repoData } = useStore()
  const [prs,          setPrs]          = useState([])
  const [release,      setRelease]      = useState(null)
  const [contributors, setContributors] = useState([])
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState('')

  useEffect(() => {
    if (!repoKey) return
    setLoading(true)
    setError('')
    Promise.allSettled([
      getPullRequests(repoKey, 'all'),
      getRelease(repoKey),
      getContributors(repoKey),
    ]).then(([prsR, relR, conR]) => {
      if (prsR.status === 'fulfilled' && Array.isArray(prsR.value)) setPrs(prsR.value)
      if (relR.status === 'fulfilled' && relR.value?.tag_name)       setRelease(relR.value)
      if (conR.status === 'fulfilled' && Array.isArray(conR.value))  setContributors(conR.value)
      setLoading(false)
    }).catch(() => { setError('Failed to load data.'); setLoading(false) })
  }, [repoKey])

  if (loading) return (
    <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:12, background:'#07090f' }}>
      <div className="spinner"/>
      <div style={{ fontSize:14, color:'#5a6478' }}>Loading PM dashboard…</div>
    </div>
  )

  if (error) return (
    <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', background:'#07090f' }}>
      <div style={{ fontSize:14, color:'#f05454' }}>{error}</div>
    </div>
  )

  const openPRs   = prs.filter(p => p.state === 'open')
  const mergedPRs = prs.filter(p => p.merged_at)
  const closedPRs = prs.filter(p => p.state === 'closed' && !p.merged_at)
  const mergeRate = prs.length ? Math.round(mergedPRs.length / prs.length * 100) : 0

  const avgMergeMs = mergedPRs.length
    ? mergedPRs.reduce((a, p) => a + (new Date(p.merged_at) - new Date(p.created_at)), 0) / mergedPRs.length
    : null
  const avgMergeHours = avgMergeMs ? avgMergeMs / 3600000 : null

  const stars = repoData?.stars || 0
  const forks = repoData?.forks || 0
  const prScore   = Math.min(mergeRate * 1.2, 100)
  const commScore = Math.min((forks / Math.max(stars, 1)) * 200, 100)
  const spdScore  = avgMergeHours == null ? 60
    : avgMergeHours < 24 ? 95 : avgMergeHours < 72 ? 70 : avgMergeHours < 168 ? 45 : 20
  const health = Math.round((prScore + commScore + spdScore) / 3)

  return (
    <div style={{ height:'100%', overflow:'auto', background:'#07090f', padding:'28px 32px' }}>

      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:28 }}>
        <div>
          <div style={{ fontSize:11, color:'#5a6478', textTransform:'uppercase', letterSpacing:'0.6px', marginBottom:6, fontFamily:'var(--font-mono)' }}>
            PM Dashboard
          </div>
          <div style={{ fontSize:24, fontWeight:800, color:'#e4eaf5', fontFamily:'var(--font-display)', letterSpacing:'-0.5px' }}>
            {repoData?.name?.split('/')[1] || repoData?.name}
          </div>
          <div style={{ fontSize:14, color:'#5a6478', marginTop:4 }}>
            {repoData?.description || 'Repository health overview'}
          </div>
        </div>
        {release?.tag_name && (
          <div style={{ background:'#111827', border:'1px solid rgba(255,255,255,0.08)', borderRadius:12, padding:'12px 18px', textAlign:'right' }}>
            <div style={{ fontSize:11, color:'#5a6478', marginBottom:3 }}>Latest release</div>
            <div style={{ fontSize:18, fontWeight:700, color:'#3dd68c', fontFamily:'var(--font-mono)' }}>{release.tag_name}</div>
            <div style={{ fontSize:11, color:'#5a6478', marginTop:2 }}>{dayjs(release.published_at).fromNow()}</div>
          </div>
        )}
      </div>

      {/* KPI row */}
      <div style={{ display:'grid', gridTemplateColumns:'180px repeat(4,1fr)', gap:14, marginBottom:24 }}>
        {/* Health ring */}
        <div style={{ background:'#111827', border:'1px solid rgba(255,255,255,0.08)', borderRadius:12, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:16 }}>
          <HealthRing score={health}/>
          <div style={{ fontSize:12, color:'#5a6478', marginTop:6 }}>Repo health</div>
          <div style={{ fontSize:11, color:scoreColor(health), fontWeight:600, marginTop:3 }}>
            {health >= 75 ? 'Healthy' : health >= 50 ? 'Fair' : 'Needs work'}
          </div>
        </div>

        <KPI label="Open PRs"        value={openPRs.length}          color="#4d9fff"  sub={`of ${prs.length} total`}/>
        <KPI label="Merge rate"      value={mergeRate + '%'}          color="#3dd68c"  sub={`${mergedPRs.length} merged`}/>
        <KPI label="Avg merge time"  value={fmtHours(avgMergeHours)} color={avgMergeHours != null && avgMergeHours < 48 ? '#3dd68c' : '#f0a429'} sub="time to merge"/>
        <KPI label="Stars"           value={(stars || 0).toLocaleString()} color="#f0a429" sub={`${(forks||0).toLocaleString()} forks`}/>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, marginBottom:20 }}>

        {/* Health breakdown */}
        <div style={{ background:'#111827', border:'1px solid rgba(255,255,255,0.08)', borderRadius:14, padding:'20px 22px' }}>
          <div style={{ fontSize:11, color:'#5a6478', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:18, fontFamily:'var(--font-mono)' }}>
            Health breakdown
          </div>
          <HealthBar label="PR merge rate"    score={Math.round(prScore)}   desc={`${mergedPRs.length} of ${prs.length} PRs merged`}/>
          <HealthBar label="Community health" score={Math.round(commScore)} desc={`${forks} forks / ${stars} stars`}/>
          <HealthBar label="Review speed"     score={spdScore}              desc={avgMergeHours != null ? fmtHours(avgMergeHours) + ' avg to merge' : 'No merged PRs yet'}/>

          {/* Repo basics */}
          <div style={{ borderTop:'1px solid rgba(255,255,255,0.06)', paddingTop:16, marginTop:6 }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              {[
                { label:'Language',     value: repoData?.language || 'Mixed' },
                { label:'Files indexed',value: (repoData?.file_count || 0).toLocaleString() },
                { label:'Open PRs',     value: openPRs.length },
                { label:'Closed (no merge)', value: closedPRs.length },
              ].map(s => (
                <div key={s.label} style={{ background:'rgba(255,255,255,0.03)', borderRadius:8, padding:'10px 12px' }}>
                  <div style={{ fontSize:10, color:'#5a6478', marginBottom:3 }}>{s.label}</div>
                  <div style={{ fontSize:15, fontWeight:700, color:'#e4eaf5' }}>{s.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* PR list */}
        <div style={{ background:'#111827', border:'1px solid rgba(255,255,255,0.08)', borderRadius:14, padding:'20px 22px' }}>
          <div style={{ fontSize:11, color:'#5a6478', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:14, fontFamily:'var(--font-mono)' }}>
            Recent pull requests ({prs.length})
          </div>
          {prs.length > 0 ? (
            <div style={{ overflowY:'auto', maxHeight:340 }}>
              {prs.slice(0,10).map((pr, i) => (
                <PRRow key={pr.id || i} pr={pr} i={i} total={Math.min(prs.length,10)}/>
              ))}
            </div>
          ) : (
            <div style={{ padding:'40px 0', textAlign:'center', color:'#5a6478', fontSize:13 }}>
              No pull requests found.
            </div>
          )}
        </div>
      </div>

      {/* Contributors */}
      {contributors.length > 0 && (
        <div style={{ background:'#111827', border:'1px solid rgba(255,255,255,0.08)', borderRadius:14, padding:'20px 22px', marginBottom:20 }}>
          <div style={{ fontSize:11, color:'#5a6478', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:16, fontFamily:'var(--font-mono)' }}>
            Top contributors
          </div>
          <div style={{ display:'flex', gap:14, flexWrap:'wrap' }}>
            {contributors.slice(0,8).map(c => (
              <a key={c.login} href={c.html_url} target="_blank" rel="noreferrer"
                style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 12px', background:'rgba(255,255,255,0.03)', borderRadius:10, textDecoration:'none', transition:'background 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.07)'}
                onMouseLeave={e => e.currentTarget.style.background='rgba(255,255,255,0.03)'}
              >
                <img src={c.avatar_url} alt={c.login} style={{ width:32, height:32, borderRadius:'50%', border:'2px solid rgba(255,255,255,0.1)' }}/>
                <div>
                  <div style={{ fontSize:13, fontWeight:600, color:'#e4eaf5' }}>{c.login}</div>
                  <div style={{ fontSize:11, color:'#5a6478', fontFamily:'var(--font-mono)' }}>{c.contributions} commits</div>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Summary */}
      <div style={{ background:'#111827', border:'1px solid rgba(77,159,255,0.2)', borderLeft:'3px solid #4d9fff', borderRadius:'0 14px 14px 0', padding:'18px 22px' }}>
        <div style={{ fontSize:11, color:'#4d9fff', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:8, fontFamily:'var(--font-mono)' }}>
          PM Summary
        </div>
        <p style={{ fontSize:14, color:'#8895ae', lineHeight:1.75, margin:0 }}>
          <strong style={{ color:'#e4eaf5' }}>{repoData?.name}</strong> has{' '}
          <strong style={{ color:'#4d9fff' }}>{openPRs.length} open PRs</strong> and a{' '}
          <strong style={{ color:'#3dd68c' }}>{mergeRate}% merge rate</strong>.{' '}
          {avgMergeHours != null
            ? `Average time to merge a PR is ${fmtHours(avgMergeHours)}.`
            : 'No merged PRs to calculate review speed yet.'}{' '}
          {repoData?.description ? repoData.description + '.' : ''}
        </p>
      </div>
    </div>
  )
}
