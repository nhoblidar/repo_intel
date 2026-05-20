# RepoIntel v4

AI-powered GitHub repository intelligence platform.
Multi-agent system · Architecture diagrams · Issue guidance · Observability

## What's in this version

| Feature | Status |
|---------|--------|
| Architecture diagram (React Flow, clickable nodes) | ✅ |
| Multi-agent chat (Orchestrator + Code + Architect + Activity + Synthesizer) | ✅ |
| Token count + agent trace per answer | ✅ |
| Contribute tab — junior dev issue guidance with step-by-step paths | ✅ |
| Code Setup — auto-detected run commands + sandbox launchers | ✅ |
| Collaborators — email invite with role selector → PostgreSQL | ✅ |
| PM Dashboard — health score, commit velocity, PR metrics | ✅ |
| Network Observability — every request logged, waterfall, JSON inspector | ✅ |
| Agent Traces — per-question token count, step-by-step agent decisions | ✅ |
| Colab notebook generator | ✅ |
| PostgreSQL schema (9 tables, RLS policies, triggers) | ✅ |

## Setup

```bash
# 1. Backend
pip install -r requirements.txt
cp .env.example .env     # fill OPENAI_API_KEY, GITHUB_TOKEN, DATABASE_URL
python -m uvicorn main:app --reload --port 8000

# 2. Frontend
npm install
npm run dev   # → http://localhost:5173
```

## Agent system

POST /agent runs: Orchestrator → Code Agent + Architect Agent + Activity Agent → Synthesizer
Each response includes: answer, sources[], steps[], tokens_in, tokens_out, total_tokens, agents_used[], total_ms

## Endpoints

GET  /health
POST /analyze     — ingest repo → ChromaDB + PostgreSQL
POST /query       — simple RAG (fallback)
POST /agent       — full multi-agent pipeline
GET  /repos       — list ChromaDB collections
GET  /workspaces/{user_id}
POST /workspace/invite
GET  /workspace/{id}/members
GET  /share/{token}
