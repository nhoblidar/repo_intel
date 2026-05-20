/**
 * archBuilder.js — converts /graph response to ReactFlow format.
 * Falls back to heuristic file graph if backend graph is empty.
 */

export const LAYER_META = {
  frontend: { color: '#2563eb', label: 'Frontend',  bg: '#eff6ff' },
  api:      { color: '#0891b2', label: 'API',        bg: '#ecfeff' },
  backend:  { color: '#059669', label: 'Backend',    bg: '#ecfdf5' },
  auth:     { color: '#dc2626', label: 'Auth',       bg: '#fef2f2' },
  database: { color: '#d97706', label: 'Database',   bg: '#fffbeb' },
  infra:    { color: '#7c3aed', label: 'Infra',      bg: '#f5f3ff' },
  test:     { color: '#0891b2', label: 'Tests',      bg: '#f0f9ff' },
  util:     { color: '#6b7280', label: 'Utilities',  bg: '#f9fafb' },
  style:    { color: '#8b5cf6', label: 'Styles',     bg: '#faf5ff' },
  docs:     { color: '#10b981', label: 'Docs',       bg: '#ecfdf5' },
  config:   { color: '#f59e0b', label: 'Config',     bg: '#fffbeb' },
  other:    { color: '#9ca3af', label: 'Other',      bg: '#f9fafb' },
}

// ── Convert real backend graph to ReactFlow format ─────────
export function buildArchGraph(graphData) {
  // If we have real graph data from backend, use it
  if (graphData?.nodes?.length > 0) {
    return {
      nodes: graphData.nodes.map(n => ({
        id:       String(n.id || n.path),
        type:     'arch',
        position: { x: Number(n.x) || 0, y: Number(n.y) || 0 },
        data: {
          label:    n.label,
          sublabel: LAYER_META[n.layer]?.label || n.layer,
          path:     n.path,
          layer:    n.layer,
          color:    n.color || LAYER_META[n.layer]?.color || '#9ca3af',
          bg:       n.bg    || LAYER_META[n.layer]?.bg    || '#f9fafb',
          meta:     LAYER_META[n.layer] || LAYER_META.other,
        },
      })),
      edges: (graphData.edges || []).map(e => ({
        id:     String(e.id),
        source: String(e.source),
        target: String(e.target),
        label:  e.label || '',
        type:   'smoothstep',
      })),
    }
  }

  // Fallback — build heuristic graph from repoData if no real graph
  return { nodes: [], edges: [] }
}

// ── Heuristic fallback — builds graph from repo metadata ───
export function buildFallbackGraph(repoData) {
  const lang    = repoData?.language || 'Python'
  const summary = (repoData?.summary || '').toLowerCase()
  const commits = (repoData?.commits || []).map(c => c.message || '').join(' ').toLowerCase()
  const all     = `${lang} ${summary} ${commits}`.toLowerCase()

  function detect(keywords) {
    return keywords.some(k => all.includes(k))
  }

  const layers = []

  if (detect(['react','vue','angular','next','svelte','html','jsx','tsx','frontend','tailwind']))
    layers.push({ layer:'frontend', label:'Frontend',  sublabel: detect(['react','next']) ? 'React / Next.js' : 'Web client' })
  if (detect(['fastapi','express','django','flask','rails','api','route','endpoint','handler','server']))
    layers.push({ layer:'api',      label:'API',       sublabel: detect(['fastapi']) ? 'FastAPI' : detect(['express']) ? 'Express' : 'HTTP server' })
  if (detect(['auth','jwt','oauth','login','session','passport','clerk']))
    layers.push({ layer:'auth',     label:'Auth',      sublabel: 'JWT / OAuth' })
  layers.push({ layer:'backend', label:'Business logic', sublabel: `${lang} services` })
  if (detect(['postgres','mysql','mongo','redis','sqlite','supabase','prisma','chroma','database','vector']))
    layers.push({ layer:'database', label:'Database',  sublabel: detect(['postgres','supabase']) ? 'PostgreSQL' : detect(['mongo']) ? 'MongoDB' : 'Storage' })
  if (detect(['docker','kubernetes','nginx','ci','deploy','workflow','terraform']))
    layers.push({ layer:'infra',    label:'Infra',     sublabel: 'Docker / CI' })

  const COL = 3, W = 220, H = 120, GX = 40, GY = 50
  const nodes = layers.map((l, i) => {
    const meta = LAYER_META[l.layer]
    return {
      id:       l.layer,
      type:     'arch',
      position: { x: (i % COL) * (W + GX), y: Math.floor(i / COL) * (H + GY) },
      data: {
        label:    l.label,
        sublabel: l.sublabel,
        path:     l.layer,
        layer:    l.layer,
        color:    meta.color,
        bg:       meta.bg,
        meta,
      },
    }
  })

  // Simple connections
  const edges = []
  const idx = Object.fromEntries(layers.map(l => [l.layer, true]))
  if (idx.frontend && idx.api)
    edges.push({ id:'e-fe-api', source:'frontend', target:'api', label:'HTTP', type:'smoothstep' })
  if (idx.api && idx.auth)
    edges.push({ id:'e-api-auth', source:'api', target:'auth', label:'verify', type:'smoothstep' })
  if (idx.api && idx.backend)
    edges.push({ id:'e-api-be', source:'api', target:'backend', type:'smoothstep' })
  if (idx.backend && idx.database)
    edges.push({ id:'e-be-db', source:'backend', target:'database', label:'query', type:'smoothstep' })

  return { nodes, edges }
}
