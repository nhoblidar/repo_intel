import { useStore } from './store.js'

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

// ── Instrumented fetch — every call logged to obs panel ───────────────────
async function tracked(type, method, url, options = {}, label = '') {
  const start   = performance.now()
  const addLog  = useStore.getState().addObsLog
  let status = 0, size = 0, responseData = null

  try {
    const res  = await fetch(url, { method, ...options })
    status     = res.status
    const text = await res.clone().text()
    size       = new Blob([text]).size
    try { responseData = JSON.parse(text) } catch { responseData = text.slice(0, 400) }

    const duration = Math.round(performance.now() - start)
    addLog({ type, method, url, status, duration, size,
      label: label || url,
      payload:  options.body ? (() => { try { return JSON.parse(options.body) } catch { return null } })() : null,
      response: responseData,
      error:    res.ok ? null : `HTTP ${status}`,
    })

    if (!res.ok) throw new Error(`API error ${status}`)
    return JSON.parse(text)
  } catch (e) {
    const duration = Math.round(performance.now() - start)
    if (!status) addLog({ type, method, url, status: 0, duration, size: 0,
      label: label || url, payload: null, response: null, error: e.message || 'Network error' })
    throw e
  }
}

// ── Backend ────────────────────────────────────────────────────────────────
export async function analyzeRepo(githubUrl) {
  return tracked('backend', 'POST', `${BASE}/analyze`,
    { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ github_url: githubUrl }) },
    'POST /analyze — ingest & index repo')
}

export async function queryRepo(repoKey, question) {
  return tracked('backend', 'POST', `${BASE}/query`,
    { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ repo_key: repoKey, question }) },
    `POST /query (RAG) — "${question.slice(0, 55)}"`)
}

export async function agentQuery(repoKey, question, workspaceId, userId) {
  return tracked('backend', 'POST', `${BASE}/agent`,
    { headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ repo_key: repoKey, question, workspace_id: workspaceId, user_id: userId }) },
    `POST /agent — "${question.slice(0, 55)}"`)
}

export async function inviteCollaborator(workspaceId, invitedBy, email, role) {
  return tracked('backend', 'POST', `${BASE}/workspace/invite`,
    { headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspace_id: workspaceId, invited_by: invitedBy, email, role }) },
    `POST /workspace/invite — ${email}`)
}

// ── GitHub API ─────────────────────────────────────────────────────────────
export async function getIssues(repoKey) {
  const [owner, repo] = repoKey.split('/')
  return tracked('github', 'GET',
    `https://api.github.com/repos/${owner}/${repo}/issues?state=open&per_page=30`,
    {}, `GitHub Issues — ${repoKey}`)
}

export async function getContributors(repoKey) {
  const [owner, repo] = repoKey.split('/')
  return tracked('github', 'GET',
    `https://api.github.com/repos/${owner}/${repo}/contributors?per_page=10`,
    {}, `GitHub Contributors — ${repoKey}`)
}

export async function getLanguages(repoKey) {
  const [owner, repo] = repoKey.split('/')
  return tracked('github', 'GET',
    `https://api.github.com/repos/${owner}/${repo}/languages`,
    {}, `GitHub Languages — ${repoKey}`)
}

export async function getWeeklyCommitActivity(repoKey) {
  const [owner, repo] = repoKey.split('/')
  return tracked('github', 'GET',
    `https://api.github.com/repos/${owner}/${repo}/stats/participation`,
    {}, `GitHub Commit Activity — ${repoKey}`)
}

export async function getCodeFrequency(repoKey) {
  const [owner, repo] = repoKey.split('/')
  return tracked('github', 'GET',
    `https://api.github.com/repos/${owner}/${repo}/stats/code_frequency`,
    {}, `GitHub Code Frequency — ${repoKey}`)
}

export async function getPullRequests(repoKey, state = 'all') {
  const [owner, repo] = repoKey.split('/')
  return tracked('github', 'GET',
    `https://api.github.com/repos/${owner}/${repo}/pulls?state=${state}&per_page=20`,
    {}, `GitHub PRs (${state}) — ${repoKey}`)
}

export async function getRelease(repoKey) {
  const [owner, repo] = repoKey.split('/')
  return tracked('github', 'GET',
    `https://api.github.com/repos/${owner}/${repo}/releases/latest`,
    {}, `GitHub Latest Release — ${repoKey}`)
}

export async function fetchGraph(repoKey) {
  const [owner, repo] = repoKey.split('/')
  return tracked('backend', 'GET', `${BASE}/graph/${owner}/${repo}`,
    {}, `GET /graph — real dependency graph for ${repoKey}`)
}

export async function getBranches(repoKey) {
  const [owner, repo] = repoKey.split('/')
  return tracked('github', 'GET',
    `https://api.github.com/repos/${owner}/${repo}/branches?per_page=50`,
    {}, `GitHub Branches — ${repoKey}`)
}

export async function getFileContent(repoKey, path, branch = 'main') {
  const [owner, repo] = repoKey.split('/')
  return tracked('github', 'GET',
    `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`,
    {}, `GitHub file content — ${path}`)
}
