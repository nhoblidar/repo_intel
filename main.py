"""
RepoIntel API v4 — FastAPI + ChromaDB + PostgreSQL + Multi-Agent + Real Graph
"""
import os, time
from contextlib import asynccontextmanager
from uuid import UUID

from fastapi import FastAPI, Request, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from dotenv import load_dotenv
import chromadb

from db.database import get_db, create_tables
from services.workspace_service import WorkspaceService, ChatService, AnalyticsService, AuditService
from ingest import ingest_repo, get_repo_summary, get_recent_commits, get_recent_prs
from query import query_repo, summarize_repo
from agents import run_agents

load_dotenv()


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        await create_tables()
        print("✓ PostgreSQL tables ready")
    except Exception as e:
        print(f"⚠ DB init skipped: {e}")
    yield


app = FastAPI(title="RepoIntel API", version="4.0.0", lifespan=lifespan)
chroma_client = chromadb.PersistentClient(path="./chroma_db")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def add_timing(request: Request, call_next):
    start    = time.time()
    response = await call_next(request)
    response.headers["X-Response-Time"] = f"{round((time.time()-start)*1000)}ms"
    return response


# ── In-memory caches ──────────────────────────────────────────
active_repos: dict = {}    # repo_key → ChromaDB collection
repo_cache:   dict = {}    # repo_key → full analyze result (for agents)
graph_cache:  dict = {}    # repo_key → { nodes, edges } real dependency graph


# ── Schemas ───────────────────────────────────────────────────
class RepoRequest(BaseModel):
    github_url: str
    user_id: str | None = None

class QueryRequest(BaseModel):
    repo_key: str
    question: str
    workspace_id: str | None = None
    user_id: str | None = None

class AgentRequest(BaseModel):
    repo_key: str
    question: str
    workspace_id: str | None = None
    user_id: str | None = None

class InviteRequest(BaseModel):
    workspace_id: str
    invited_by: str
    email: str
    role: str = "viewer"


# ── Health ────────────────────────────────────────────────────
@app.get("/health")
async def health():
    return {
        "status": "ok",
        "loaded_repos": list(active_repos.keys()),
        "chroma_collections": len(chroma_client.list_collections()),
    }


# ── Analyze ───────────────────────────────────────────────────
@app.post("/analyze")
async def analyze_repo(request: RepoRequest, db: AsyncSession = Depends(get_db)):
    url   = request.github_url.strip("/")
    # Robust URL parsing — strips https://, github.com/, trailing slashes
    url = url.rstrip("/")
    for prefix in ("https://github.com/", "http://github.com/", "github.com/"):
        if url.startswith(prefix):
            url = url[len(prefix):]
            break
    parts = url.split("/")
    owner, repo = parts[0], parts[1]
    repo_key    = f"{owner}/{repo}"

    # ingest_repo now returns (collection, file_count, graph)
    collection, file_count, graph = ingest_repo(owner, repo)
    active_repos[repo_key] = collection
    graph_cache[repo_key]  = graph          # ← store real graph

    repo_info = get_repo_summary(owner, repo)
    commits   = get_recent_commits(owner, repo)
    prs       = get_recent_prs(owner, repo)
    summary   = summarize_repo(owner, repo, repo_info, commits, prs)

    result = {
        "repo_key":       repo_key,
        "name":           repo_info.get("full_name"),
        "description":    repo_info.get("description"),
        "language":       repo_info.get("language"),
        "stars":          repo_info.get("stargazers_count"),
        "forks":          repo_info.get("forks_count"),
        "file_count":     file_count,
        "summary":        summary,
        "default_branch": repo_info.get("default_branch", "main"),
        "topics":         repo_info.get("topics", []),
        "license":        (repo_info.get("license") or {}).get("name"),
        "graph_nodes":    len(graph.get("nodes", [])),
        "graph_edges":    len(graph.get("edges", [])),
        "commits": [
            {"message": c["commit"]["message"][:80],
             "author":  c["commit"]["author"]["name"],
             "date":    c["commit"]["author"]["date"],
             "sha":     c["sha"][:7]}
            for c in (commits if isinstance(commits, list) else [])[:10]
            if isinstance(c, dict) and "commit" in c
        ],
        "prs": [
            {"title":   p["title"], "state": p["state"],
             "author":  p["user"]["login"],
             "created": p["created_at"], "number": p["number"]}
            for p in (prs if isinstance(prs, list) else [])[:8]
            if isinstance(p, dict) and "title" in p
        ],
    }

    repo_cache[repo_key] = result

    # Persist to PostgreSQL if user_id provided
    if request.user_id:
        try:
            user_id = UUID(request.user_id)
            ws = await WorkspaceService.upsert(db, user_id, result)
            result["workspace_id"] = str(ws.id)
            result["share_token"]  = ws.share_token
            await AuditService.log(db, "workspace.analyze", user_id=user_id, workspace_id=ws.id)
        except Exception as e:
            print(f"DB persist skipped: {e}")

    return result


# ── Real dependency graph ─────────────────────────────────────
@app.get("/graph/{owner}/{repo}")
async def get_graph(owner: str, repo: str):
    """
    Returns the real file-level dependency graph built during ingest.
    Nodes = actual files. Edges = actual import statements parsed from code.
    """
    repo_key = f"{owner}/{repo}"
    if repo_key not in graph_cache:
        raise HTTPException(404, detail="Graph not found. Analyze the repo first.")
    return graph_cache[repo_key]


# ── Simple RAG query ──────────────────────────────────────────
@app.post("/query")
async def query(request: QueryRequest, db: AsyncSession = Depends(get_db)):
    start      = time.time()
    collection = _get_collection(request.repo_key)
    result     = query_repo(collection, request.question)
    result["duration_ms"] = round((time.time()-start)*1000)
    return result


# ── Multi-agent query ─────────────────────────────────────────
@app.post("/agent")
async def agent_query(request: AgentRequest, db: AsyncSession = Depends(get_db)):
    collection = _get_collection(request.repo_key)
    repo_data  = repo_cache.get(request.repo_key, {})

    result = run_agents(request.question, collection, repo_data)

    if request.user_id and request.workspace_id:
        try:
            uid = UUID(request.user_id)
            wid = UUID(request.workspace_id)
            session = await ChatService.get_or_create_session(db, wid, uid)
            await ChatService.save_message(db, session.id, "user", request.question)
            await ChatService.save_message(
                db, session.id, "assistant", result["answer"],
                sources=result["sources"], model="gpt-4o-mini (agents)",
                duration_ms=result["total_ms"],
            )
            result["session_id"] = str(session.id)
        except Exception as e:
            print(f"Chat persist skipped: {e}")

    return result


# ── Workspace / member endpoints ──────────────────────────────
@app.get("/workspaces/{user_id}")
async def list_workspaces(user_id: str, db: AsyncSession = Depends(get_db)):
    workspaces = await WorkspaceService.list_for_user(db, UUID(user_id))
    return {"workspaces": [ws.to_dict() for ws in workspaces]}

@app.post("/workspace/invite")
async def invite_member(request: InviteRequest, db: AsyncSession = Depends(get_db)):
    member = await WorkspaceService.invite_member(
        db, workspace_id=UUID(request.workspace_id),
        invited_by=UUID(request.invited_by), email=request.email, role=request.role)
    await AuditService.log(db, "member.invite",
        user_id=UUID(request.invited_by), workspace_id=UUID(request.workspace_id),
        metadata={"email": request.email, "role": request.role})
    return member.to_dict()

@app.get("/workspace/{workspace_id}/members")
async def list_members(workspace_id: str, db: AsyncSession = Depends(get_db)):
    members = await WorkspaceService.list_members(db, UUID(workspace_id))
    return {"members": [m.to_dict() for m in members]}

@app.get("/share/{token}")
async def get_shared_workspace(token: str, db: AsyncSession = Depends(get_db)):
    ws = await WorkspaceService.get_by_share_token(db, token)
    if not ws:
        raise HTTPException(404, detail="Workspace not found")
    return ws.to_dict()

@app.get("/repos")
async def list_repos():
    return {"repos": [c.name for c in chroma_client.list_collections()]}


# ── Helper ────────────────────────────────────────────────────
def _get_collection(repo_key: str):
    if repo_key in active_repos:
        return active_repos[repo_key]
    try:
        cn = repo_key.replace("/","_").replace("-","_").replace(".","_")
        cn = cn[:63].strip("_")
        if cn and not cn[0].isalnum(): cn = "r" + cn[1:]
        if cn and not cn[-1].isalnum(): cn = cn[:-1] + "x"
        col = chroma_client.get_collection(cn)
        active_repos[repo_key] = col
        return col
    except Exception:
        raise HTTPException(404, detail="Repo not found. Analyze it first.")
