import React, { useState } from 'react'
import { useStore } from '../lib/store.js'

export default function ColabModal() {
  const { setColabOpen, repoData } = useStore()
  const [generated, setGenerated] = useState(false)
  const [notebook, setNotebook] = useState(null)

  function generate() {
    const nb = buildNotebook(repoData)
    setNotebook(nb)
    setGenerated(true)
  }

  function download() {
    const blob = new Blob([JSON.stringify(notebook, null, 2)], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url
    a.download = `${repoData?.name?.replace('/', '_') || 'repo'}_exploration.ipynb`
    a.click()
    URL.revokeObjectURL(url)
  }

  function openInColab() {
    window.open('https://colab.research.google.com/#create=true', '_blank')
  }

  return (
    <div
      onClick={e => e.target === e.currentTarget && setColabOpen(false)}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, backdropFilter: 'blur(4px)', animation: 'fadeIn 0.2s ease',
      }}
    >
      <div style={{
        width: 620, maxWidth: '95vw', maxHeight: '88vh',
        background: 'var(--bg2)', border: '1px solid var(--border)',
        borderRadius: 20, overflow: 'hidden', display: 'flex', flexDirection: 'column',
        boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
      }}>
        {/* Header */}
        <div style={{ padding: '20px 22px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10, background: 'rgba(249,168,37,0.12)',
            border: '1px solid rgba(249,168,37,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
          }}>🔬</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 700, color: 'var(--text)' }}>
              Open in Google Colab
            </div>
            <div style={{ fontSize: 13, color: 'var(--text3)' }}>
              Generate an exploration notebook for {repoData?.name}
            </div>
          </div>
          <button onClick={() => setColabOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text3)', fontSize: 22, cursor: 'pointer' }}>×</button>
        </div>

        <div style={{ overflow: 'auto', padding: '20px 22px' }}>

          {!generated ? (
            <>
              <p style={{ fontSize: 14, color: 'var(--text2)', lineHeight: 1.7, marginBottom: 20 }}>
                We'll generate a Jupyter notebook tailored to this repo with cells for:
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
                {[
                  { icon: '📦', label: 'Clone & install dependencies', desc: 'Auto-detects requirements.txt, pyproject.toml, setup.py' },
                  { icon: '🔍', label: 'Explore file structure', desc: 'Recursive tree view, file sizes, language breakdown' },
                  { icon: '📊', label: 'Run key entry points', desc: 'Detects main.py, app.py, cli.py, and runs them safely' },
                  { icon: '🧪', label: 'Execute test suite', desc: 'pytest or unittest — shows pass/fail summary' },
                  { icon: '📈', label: 'Basic profiling', desc: 'cProfile on main entry point, top 10 slowest functions' },
                  { icon: '🤖', label: 'AI analysis cell', desc: 'Sends code snippets to Claude API for inline explanation' },
                ].map(item => (
                  <div key={item.label} style={{
                    display: 'flex', gap: 12, padding: '12px 14px',
                    background: 'var(--surface)', border: '1px solid var(--border)',
                    borderRadius: 10,
                  }}>
                    <span style={{ fontSize: 18, flexShrink: 0 }}>{item.icon}</span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>{item.label}</div>
                      <div style={{ fontSize: 12, color: 'var(--text3)' }}>{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={generate}
                style={{
                  width: '100%', padding: '13px',
                  background: '#f9a825', border: 'none', borderRadius: 10,
                  color: '#000', fontSize: 15, fontWeight: 700, cursor: 'pointer',
                }}
              >
                Generate notebook ✨
              </button>
            </>
          ) : (
            <>
              {/* Preview */}
              <div style={{
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 10, overflow: 'hidden', marginBottom: 18,
              }}>
                <div style={{
                  padding: '10px 14px', borderBottom: '1px solid var(--border)',
                  display: 'flex', alignItems: 'center', gap: 10,
                }}>
                  <span style={{ fontSize: 14 }}>📓</span>
                  <span style={{ fontSize: 13, fontFamily: 'var(--font-mono)', color: 'var(--text)' }}>
                    {repoData?.name?.replace('/', '_')}_exploration.ipynb
                  </span>
                  <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--green)' }}>
                    ✓ Generated · {notebook?.cells?.length} cells
                  </span>
                </div>
                <div style={{ padding: '12px 14px', maxHeight: 280, overflow: 'auto' }}>
                  {notebook?.cells?.map((cell, i) => (
                    <div key={i} style={{
                      marginBottom: 8, padding: '8px 12px',
                      background: cell.cell_type === 'markdown' ? 'rgba(77,159,255,0.06)' : 'rgba(61,214,140,0.06)',
                      border: `1px solid ${cell.cell_type === 'markdown' ? 'rgba(77,159,255,0.15)' : 'rgba(61,214,140,0.15)'}`,
                      borderRadius: 6,
                    }}>
                      <div style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 4, fontFamily: 'var(--font-mono)' }}>
                        [{cell.cell_type === 'markdown' ? 'md' : 'code'}]
                      </div>
                      <pre style={{ fontSize: 11, color: 'var(--text2)', whiteSpace: 'pre-wrap', margin: 0, fontFamily: 'var(--font-mono)', maxHeight: 80, overflow: 'hidden' }}>
                        {cell.source.join('').slice(0, 200)}{cell.source.join('').length > 200 ? '…' : ''}
                      </pre>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={download}
                  style={{
                    flex: 1, padding: '12px', background: '#f9a825',
                    border: 'none', borderRadius: 10, color: '#000',
                    fontSize: 14, fontWeight: 700, cursor: 'pointer',
                  }}
                >
                  ⬇ Download .ipynb
                </button>
                <button
                  onClick={openInColab}
                  style={{
                    flex: 1, padding: '12px',
                    background: 'var(--surface)', border: '1px solid var(--border)',
                    borderRadius: 10, color: 'var(--text)',
                    fontSize: 14, fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  Open Colab ↗
                </button>
              </div>

              <div style={{
                marginTop: 14, padding: '10px 14px',
                background: 'var(--amber-dim)', border: '1px solid rgba(240,164,41,0.2)',
                borderRadius: 8, fontSize: 12, color: 'var(--text3)',
              }}>
                💡 Download the .ipynb then drag it into Colab, or use File → Upload notebook.
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Notebook builder ─────────────────────────────────────────────────────
function buildNotebook(repoData) {
  const name    = repoData?.name || 'repo'
  const [owner, repo] = (name || '/').split('/')
  const desc    = repoData?.description || ''
  const lang    = repoData?.language || 'Python'
  const summary = repoData?.summary || ''

  const mdCell  = (source) => ({ cell_type: 'markdown', metadata: {}, source: [source] })
  const codeCell = (source) => ({ cell_type: 'code', execution_count: null, metadata: {}, outputs: [], source: source.split('\n').map((l, i, a) => i < a.length - 1 ? l + '\n' : l) })

  return {
    nbformat: 4, nbformat_minor: 5,
    metadata: {
      kernelspec: { display_name: 'Python 3', language: 'python', name: 'python3' },
      language_info: { name: 'python', version: '3.10.0' },
    },
    cells: [
      mdCell(`# 🔍 ${name} — Exploration Notebook\n\n> ${desc}\n\n**AI Summary:** ${summary}\n\nGenerated by [RepoIntel](https://repointel.app)`),

      codeCell(`# ── 1. Clone the repository ──────────────────────────────
import os, subprocess

REPO_URL = "https://github.com/${owner}/${repo}.git"
REPO_DIR = "/content/${repo}"

if not os.path.exists(REPO_DIR):
    subprocess.run(["git", "clone", REPO_URL, REPO_DIR], check=True)
    print(f"✓ Cloned {REPO_URL}")
else:
    subprocess.run(["git", "-C", REPO_DIR, "pull"], check=True)
    print("✓ Updated existing clone")

os.chdir(REPO_DIR)
print(f"Working dir: {os.getcwd()}")`),

      codeCell(`# ── 2. Install dependencies ──────────────────────────────
import subprocess, os

deps_found = []

if os.path.exists("requirements.txt"):
    subprocess.run(["pip", "install", "-r", "requirements.txt", "-q"], check=False)
    deps_found.append("requirements.txt")

if os.path.exists("pyproject.toml"):
    subprocess.run(["pip", "install", ".", "-q"], check=False)
    deps_found.append("pyproject.toml")

if os.path.exists("setup.py"):
    subprocess.run(["pip", "install", "-e", ".", "-q"], check=False)
    deps_found.append("setup.py")

if os.path.exists("package.json"):
    subprocess.run(["npm", "install", "--silent"], check=False)
    deps_found.append("package.json")

print(f"✓ Processed: {', '.join(deps_found) if deps_found else 'No dependency file found'}")`),

      codeCell(`# ── 3. Explore file structure ────────────────────────────
import os
from collections import Counter

IGNORE = {'.git', '__pycache__', 'node_modules', '.venv', 'venv', 'dist', 'build', '.next'}

exts = Counter()
total_files = 0
total_size  = 0

print(f"{'File':<55} {'Size':>8}")
print("─" * 65)

for root, dirs, files in os.walk("."):
    dirs[:] = [d for d in dirs if d not in IGNORE]
    for f in sorted(files):
        path = os.path.join(root, f)
        rel  = path[2:]
        size = os.path.getsize(path)
        ext  = os.path.splitext(f)[1].lower() or '(no ext)'
        exts[ext] += 1
        total_files += 1
        total_size  += size
        if total_files <= 30:
            print(f"  {rel:<53} {size:>6,} B")

print(f"\\n{'─'*65}")
print(f"  Total: {total_files:,} files  |  {total_size/1024:.1f} KB\\n")
print("Top extensions:")
for ext, count in exts.most_common(8):
    print(f"  {ext:<18} {count:>4} files")`),

      codeCell(`# ── 4. Run tests ─────────────────────────────────────────
import subprocess, os

if os.path.exists("pytest.ini") or os.path.exists("tests") or os.path.exists("test"):
    print("Running pytest…")
    result = subprocess.run(
        ["python", "-m", "pytest", "--tb=short", "-q"],
        capture_output=True, text=True
    )
    print(result.stdout[-3000:] if len(result.stdout) > 3000 else result.stdout)
    if result.stderr:
        print("STDERR:", result.stderr[:500])
else:
    print("No test directory found. Skipping.")`),

      codeCell(`# ── 5. Profile entry point ───────────────────────────────
import cProfile, pstats, io, os

entry = next((f for f in ["main.py","app.py","cli.py","run.py","__main__.py"] if os.path.exists(f)), None)

if entry:
    print(f"Profiling {entry}…")
    pr = cProfile.Profile()
    try:
        pr.enable()
        exec(open(entry).read(), {"__name__": "__main__"})
    except SystemExit:
        pass
    except Exception as e:
        print(f"Note: {e}")
    finally:
        pr.disable()

    s = io.StringIO()
    ps = pstats.Stats(pr, stream=s).sort_stats('cumulative')
    ps.print_stats(15)
    print(s.getvalue())
else:
    print("No standard entry point found.")`),

      codeCell(`# ── 6. AI-powered code explanation ───────────────────────
# Paste any code snippet below and get an AI explanation
# (requires ANTHROPIC_API_KEY in Colab secrets)

import os, textwrap

try:
    from google.colab import userdata
    api_key = userdata.get('ANTHROPIC_API_KEY')
except:
    api_key = os.getenv('ANTHROPIC_API_KEY', '')

CODE_TO_EXPLAIN = """
# Paste your code snippet here
def example():
    pass
"""

if api_key:
    import urllib.request, json
    payload = json.dumps({
        "model": "claude-sonnet-4-20250514",
        "max_tokens": 1024,
        "messages": [{"role": "user", "content": f"Explain this code from ${name} clearly and concisely:\\n\\n{CODE_TO_EXPLAIN}"}]
    }).encode()
    req = urllib.request.Request(
        "https://api.anthropic.com/v1/messages",
        data=payload,
        headers={"x-api-key": api_key, "anthropic-version": "2023-06-01", "content-type": "application/json"}
    )
    with urllib.request.urlopen(req) as r:
        resp = json.loads(r.read())
        print(resp["content"][0]["text"])
else:
    print("Add ANTHROPIC_API_KEY to Colab secrets to enable AI explanations.")`),

      mdCell(`## Next steps\n\n- Browse the file tree above and identify modules of interest\n- Paste functions into cell 6 for AI-powered explanations\n- Check the [issues](https://github.com/${owner}/${repo}/issues) tab for contribution opportunities\n- Return to [RepoIntel](https://repointel.app) for interactive architecture diagrams and codebase chat`),
    ]
  }
}
