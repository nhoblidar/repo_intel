import React, { useMemo } from 'react'
import { useStore } from '../lib/store.js'

const SANDBOX_OPTIONS = [
  {
    id: 'stackblitz', name: 'StackBlitz', icon: '⚡', color: '#1389fd',
    desc: 'Full dev environment in the browser. Best for JS/TS, Node, React.',
    langs: ['JavaScript', 'TypeScript'],
    url: (name) => `https://stackblitz.com/github/${name}`,
  },
  {
    id: 'githubdev', name: 'GitHub.dev', icon: '🖥', color: '#4d9fff',
    desc: 'VS Code in the browser. Browse, read, and edit — no execution.',
    langs: ['All'],
    url: (name) => `https://github.dev/${name}`,
  },
  {
    id: 'gitpod', name: 'Gitpod', icon: '☁️', color: '#ff8a00',
    desc: 'Full cloud Linux workspace. Works for any language.',
    langs: ['All'],
    url: (name) => `https://gitpod.io/#https://github.com/${name}`,
  },
  {
    id: 'colab', name: 'Google Colab', icon: '🔬', color: '#f9a825',
    desc: 'GPU notebooks. Best for ML, data science, Python.',
    langs: ['Python'],
    url: (name) => `https://colab.research.google.com/github/${name}`,
  },
]

function detectSetup(repoData) {
  const lang     = repoData?.language || ''
  const commits  = (repoData?.commits || []).map(c => c.message.toLowerCase()).join(' ')
  const summary  = (repoData?.summary || '').toLowerCase()
  const combined = `${lang} ${commits} ${summary}`

  const isNode   = /javascript|typescript|node|npm|yarn|pnpm/.test(combined)
  const isPython = /python|pip|fastapi|django|flask/.test(combined)
  const isDocker = /docker|container/.test(combined)
  const isRust   = /rust|cargo/.test(combined)
  const isGo     = /\bgo\b|golang/.test(combined)

  const steps = []

  // Clone
  steps.push({
    n: '01', label: 'Clone the repository',
    cmd: `git clone https://github.com/${repoData?.name}`,
    note: 'Or fork first if you plan to contribute.',
  })

  // Install
  if (isNode) {
    steps.push({ n: '02', label: 'Install dependencies', cmd: 'npm install', note: 'Or use pnpm / yarn depending on the lockfile.' })
  } else if (isPython) {
    steps.push({ n: '02', label: 'Create virtual environment', cmd: 'python -m venv .venv && source .venv/bin/activate', note: 'Windows: .venv\\Scripts\\activate' })
    steps.push({ n: '03', label: 'Install dependencies', cmd: 'pip install -r requirements.txt', note: 'Or: pip install -e . if using pyproject.toml' })
  } else if (isRust) {
    steps.push({ n: '02', label: 'Build the project', cmd: 'cargo build', note: 'Cargo handles dependencies automatically.' })
  } else if (isGo) {
    steps.push({ n: '02', label: 'Download dependencies', cmd: 'go mod download', note: '' })
  } else {
    steps.push({ n: '02', label: 'Install dependencies', cmd: 'Check README for install instructions', note: '' })
  }

  // Env
  steps.push({ n: String(steps.length + 1).padStart(2,'0'), label: 'Copy environment file', cmd: 'cp .env.example .env', note: 'Fill in required API keys and secrets.' })

  // Run
  if (isNode) {
    steps.push({ n: String(steps.length + 1).padStart(2,'0'), label: 'Start dev server', cmd: 'npm run dev', note: '' })
  } else if (isPython) {
    steps.push({ n: String(steps.length + 1).padStart(2,'0'), label: 'Run the server', cmd: 'uvicorn main:app --reload', note: 'Or: python main.py / flask run / python -m app' })
  } else if (isDocker) {
    steps.push({ n: String(steps.length + 1).padStart(2,'0'), label: 'Start with Docker', cmd: 'docker compose up', note: '' })
  } else {
    steps.push({ n: String(steps.length + 1).padStart(2,'0'), label: 'Run the project', cmd: 'Check README for run instructions', note: '' })
  }

  return steps
}

export default function CodeSetupTab() {
  const { repoData } = useStore()
  const steps = useMemo(() => detectSetup(repoData), [repoData])
  const lang  = repoData?.language || ''

  function copyCmd(cmd) {
    navigator.clipboard.writeText(cmd).catch(() => {})
  }

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>

      {/* Left — setup steps */}
      <div style={{ flex: 1, overflow: 'auto', padding: '22px 24px' }}>
        <div className="tab-kicker">Code setup</div>
        <div className="tab-title">Run {repoData?.name} locally</div>
        <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 24 }}>
          Auto-detected from repo language ({lang}) and recent commit history.
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {steps.map((step, i) => (
            <div key={i} style={{
              display: 'flex', gap: 16, padding: '16px 18px',
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 14, alignItems: 'flex-start',
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                background: 'var(--blue-dim)', border: '1px solid var(--blue-glow)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, color: 'var(--blue)',
              }}>
                {step.n}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>
                  {step.label}
                </div>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  background: 'var(--bg)', border: '1px solid var(--border)',
                  borderRadius: 8, padding: '8px 12px', marginBottom: step.note ? 6 : 0,
                }}>
                  <code style={{ flex: 1, fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--cyan)' }}>
                    {step.cmd}
                  </code>
                  <button onClick={() => copyCmd(step.cmd)} style={{
                    background: 'none', border: '1px solid var(--border)',
                    borderRadius: 6, padding: '3px 8px', fontSize: 11,
                    color: 'var(--text3)', cursor: 'pointer', flexShrink: 0,
                  }}>
                    copy
                  </button>
                </div>
                {step.note && (
                  <div style={{ fontSize: 12, color: 'var(--text3)' }}>💡 {step.note}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right — sandbox panel */}
      <div style={{
        width: 320, borderLeft: '1px solid var(--border)',
        background: 'var(--bg2)', overflow: 'auto', padding: '22px 18px', flexShrink: 0,
      }}>
        <div className="tab-kicker">Try in browser</div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
          One-click sandbox
        </div>
        <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 18, lineHeight: 1.5 }}>
          Launch {repoData?.name} in a cloud environment — no local setup needed.
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {SANDBOX_OPTIONS.map(sb => {
            const isRecommended = sb.langs.some(l =>
              l === 'All' || lang.toLowerCase().includes(l.toLowerCase())
            )
            return (
              <a key={sb.id}
                href={sb.url(repoData?.name || '')}
                target="_blank" rel="noreferrer"
                style={{
                  display: 'flex', gap: 12, padding: '14px 16px',
                  background: isRecommended ? `${sb.color}12` : 'var(--surface)',
                  border: `1px solid ${isRecommended ? sb.color + '44' : 'var(--border)'}`,
                  borderRadius: 12, textDecoration: 'none', transition: 'all 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = sb.color + '88' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = isRecommended ? sb.color + '44' : 'var(--border)' }}
              >
                <div style={{
                  width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                  background: sb.color + '22',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
                }}>
                  {sb.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 3 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{sb.name}</span>
                    {isRecommended && (
                      <span style={{
                        fontSize: 9, padding: '1px 6px', borderRadius: 100,
                        background: sb.color + '30', color: sb.color, fontWeight: 700,
                      }}>RECOMMENDED</span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text3)' }}>{sb.desc}</div>
                </div>
                <span style={{ color: 'var(--text3)', fontSize: 16, alignSelf: 'center' }}>↗</span>
              </a>
            )
          })}
        </div>

        <div style={{
          marginTop: 18, padding: '12px 14px',
          background: 'var(--amber-dim)', border: '1px solid rgba(240,164,41,0.18)',
          borderRadius: 10, fontSize: 12, color: 'var(--text2)', lineHeight: 1.5,
        }}>
          💡 Check for a <code style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>Dockerfile</code> or <code style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>.gitpod.yml</code> in the repo for the best sandbox experience.
        </div>
      </div>
    </div>
  )
}
