import { create } from 'zustand'

export const useStore = create((set, get) => ({
  // Repo
  repoData:    null,
  repoKey:     null,
  isLoading:   false,
  loadingStep: 0,
  loadingSteps: [
    'Fetching repository tree…',
    'Reading source files…',
    'Parsing imports & building graph…',
    'Indexing into vector store…',
    'Generating AI summary…',
  ],

  // Navigation
  activeTab: 'overview',

  // Chat
  messages:        [],
  isChatLoading:   false,
  pendingQuestion: null,
  aiProvider:      'openai',

  // Architecture graph
  archNodes: [],
  archEdges: [],

  // File tree (for FileTree tab) — built from archNodes
  fileTree: null,

  // Search query (for graph search)
  graphSearch: '',

  // Agent traces
  agentTraces: [],

  // Observability
  obsOpen:   false,
  obsLogs:   [],
  obsFilter: 'all',

  // PM data
  pmData: null,

  // Modals
  sandboxOpen:    false,
  shareModalOpen: false,
  colabOpen:      false,

  // Collaborators
  collaborators: [],

  // Actions
  setActiveTab:   (tab) => set({ activeTab: tab }),
  setRepoData:    (d)   => set({ repoData: d, repoKey: d?.repo_key }),
  setIsLoading:   (v)   => set({ isLoading: v }),
  setLoadingStep: (v)   => set({ loadingStep: v }),
  setGraphSearch: (v)   => set({ graphSearch: v }),

  addMessage:      (m) => set(s => ({ messages: [...s.messages, m] })),
  setIsChatLoading:(v) => set({ isChatLoading: v }),
  setAiProvider:   (p) => set({ aiProvider: p }),

  setArchitecture: (nodes, edges) => set({
    archNodes: nodes,
    archEdges: edges,
    fileTree: buildFileTree(nodes),
  }),

  addAgentTrace: (t) => set(s => ({
    agentTraces: [{ id: Date.now(), ...t }, ...s.agentTraces].slice(0, 100)
  })),

  setObsOpen:   (v) => set({ obsOpen: v }),
  setObsFilter: (f) => set({ obsFilter: f }),
  addObsLog: (log) => set(s => ({
    obsLogs: [{ id: Date.now() + Math.random(), ts: new Date().toISOString(), ...log }, ...s.obsLogs].slice(0, 500)
  })),
  clearObsLogs: () => set({ obsLogs: [] }),

  setPmData:     (d) => set({ pmData: d }),
  setSandbox:    (v) => set({ sandboxOpen: v }),
  setShareModal: (v) => set({ shareModalOpen: v }),
  setColabOpen:  (v) => set({ colabOpen: v }),

  addCollaborator: (c) => set(s => ({ collaborators: [...s.collaborators, c] })),

  reset: () => set({
    repoData: null, repoKey: null, messages: [],
    archNodes: [], archEdges: [], fileTree: null,
    activeTab: 'overview', obsLogs: [], pmData: null,
    pendingQuestion: null, agentTraces: [], collaborators: [],
    graphSearch: '',
  }),
}))

// Build nested file tree from flat node list
function buildFileTree(nodes) {
  const root = { name: '', children: {}, files: [] }
  nodes.forEach(n => {
    const parts = (n.data.path || n.data.label).split('/')
    let cur = root
    parts.forEach((part, i) => {
      if (i === parts.length - 1) {
        cur.files.push(n.data)
      } else {
        if (!cur.children[part]) cur.children[part] = { name: part, children: {}, files: [] }
        cur = cur.children[part]
      }
    })
  })
  return root
}
