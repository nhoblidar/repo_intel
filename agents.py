"""
RepoIntel Agent System
======================
Multi-agent architecture built with pure Python (no LangGraph dependency needed).
Uses OpenAI function/tool calling for each agent.

Agents
------
  Orchestrator  — reads the question, decides which agents to run and in order
  CodeAgent     — searches ChromaDB, reads relevant code chunks
  ArchitectAgent— analyses imports and module structure
  ActivityAgent — summarises recent commits/PRs (GitHub data already fetched)
  Synthesizer   — merges all agent findings into a final answer with citations

Each agent records its steps so the frontend can show a live trace.
"""
import os
import time
import json
from typing import Any
from openai import OpenAI

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
MODEL  = "gpt-4o-mini"


# ─── Shared types ──────────────────────────────────────────────────────────

class AgentStep:
    def __init__(self, agent: str, action: str, detail: str, result: str = "", ms: int = 0):
        self.agent  = agent
        self.action = action
        self.detail = detail
        self.result = result
        self.ms     = ms

    def to_dict(self):
        return {
            "agent":  self.agent,
            "action": self.action,
            "detail": self.detail,
            "result": self.result,
            "ms":     self.ms,
        }


class AgentContext:
    """Shared state threaded through all agents."""
    def __init__(self, question: str, collection, repo_data: dict):
        self.question    = question
        self.collection  = collection
        self.repo_data   = repo_data
        self.steps:  list[AgentStep] = []
        self.sources: list[str]      = []
        self.tokens_in:  int = 0
        self.tokens_out: int = 0

    def add_step(self, agent, action, detail, result="", ms=0):
        self.steps.append(AgentStep(agent, action, detail, result, ms))

    def add_tokens(self, usage):
        if usage:
            self.tokens_in  += getattr(usage, "prompt_tokens",     0)
            self.tokens_out += getattr(usage, "completion_tokens",  0)

    def add_source(self, path: str):
        if path and path not in self.sources:
            self.sources.append(path)

    @property
    def total_tokens(self):
        return self.tokens_in + self.tokens_out


# ─── Code Agent ────────────────────────────────────────────────────────────

def run_code_agent(ctx: AgentContext) -> str:
    """
    Searches ChromaDB for relevant code chunks and returns a structured
    summary of what it found, with file citations.
    """
    t0 = time.time()
    ctx.add_step("CodeAgent", "search", f"Searching codebase for: {ctx.question[:80]}")

    try:
        results = ctx.collection.query(
            query_texts=[ctx.question],
            n_results=6,
        )
    except Exception as e:
        ctx.add_step("CodeAgent", "error", str(e))
        return "Could not search codebase."

    chunks = results["documents"][0]
    metas  = results["metadatas"][0]

    code_context = ""
    for i, (doc, meta) in enumerate(zip(chunks, metas)):
        path = meta.get("path", "unknown")
        ctx.add_source(path)
        code_context += f"\n### File: {path}\n```\n{doc[:800]}\n```\n"
        ctx.add_step("CodeAgent", "read_chunk",
                     f"Read chunk {i+1} from {path}",
                     f"{len(doc)} chars", ms=0)

    ms = round((time.time() - t0) * 1000)

    # Ask the model to summarise what the code says
    t1 = time.time()
    resp = client.chat.completions.create(
        model=MODEL,
        max_tokens=600,
        messages=[{
            "role": "user",
            "content": (
                f"You are analysing code to answer: \"{ctx.question}\"\n\n"
                f"Code found:\n{code_context}\n\n"
                "Summarise what you learned from the code in 3-5 sentences. "
                "Be specific. Mention file names."
            ),
        }],
    )
    ctx.add_tokens(resp.usage)
    summary = resp.choices[0].message.content.strip()
    ctx.add_step("CodeAgent", "summarise", "Summarised code findings",
                 f"{ctx.tokens_out} tokens out", ms=round((time.time() - t1) * 1000))
    return summary


# ─── Architect Agent ───────────────────────────────────────────────────────

def run_architect_agent(ctx: AgentContext) -> str:
    """
    Uses the repo file list (from repo_data) to infer module structure
    and dependency graph without re-fetching GitHub.
    """
    t0 = time.time()
    ctx.add_step("ArchitectAgent", "analyse", "Mapping repository structure")

    commits = ctx.repo_data.get("commits", [])
    lang    = ctx.repo_data.get("language", "Unknown")
    name    = ctx.repo_data.get("name", "repo")

    # Build a lightweight structure description from what we know
    structure_prompt = (
        f"Repository: {name}\n"
        f"Primary language: {lang}\n"
        f"Recent commit messages:\n"
        + "\n".join(f"  - {c.get('message','')}" for c in commits[:6])
        + f"\n\nQuestion: {ctx.question}\n\n"
        "Based on the repository name, language, and recent commits, "
        "describe the likely module structure and architectural layers in 3-4 sentences. "
        "Be specific about what each layer does."
    )

    resp = client.chat.completions.create(
        model=MODEL, max_tokens=350,
        messages=[{"role": "user", "content": structure_prompt}],
    )
    ctx.add_tokens(resp.usage)
    result = resp.choices[0].message.content.strip()
    ctx.add_step("ArchitectAgent", "infer_structure",
                 f"Inferred architecture for {lang} project",
                 result[:80] + "…", ms=round((time.time() - t0) * 1000))
    return result


# ─── Activity Agent ────────────────────────────────────────────────────────

def run_activity_agent(ctx: AgentContext) -> str:
    """
    Analyses recent commits and PRs from repo_data to answer
    activity-related parts of the question.
    """
    t0 = time.time()
    ctx.add_step("ActivityAgent", "analyse", "Checking recent repo activity")

    commits = ctx.repo_data.get("commits", [])
    prs     = ctx.repo_data.get("prs", [])

    if not commits and not prs:
        return "No recent activity data available."

    commit_lines = "\n".join(
        f"  [{c.get('sha','?')}] {c.get('message','')[:70]} — {c.get('author','?')}"
        for c in commits[:8]
    )
    pr_lines = "\n".join(
        f"  [#{p.get('number','?')} {p.get('state','?')}] {p.get('title','')[:60]} — {p.get('author','?')}"
        for p in prs[:5]
    )

    prompt = (
        f"Question: {ctx.question}\n\n"
        f"Recent commits:\n{commit_lines}\n\n"
        f"Recent PRs:\n{pr_lines}\n\n"
        "Summarise the relevant recent activity in 2-3 sentences."
    )

    resp = client.chat.completions.create(
        model=MODEL, max_tokens=250,
        messages=[{"role": "user", "content": prompt}],
    )
    ctx.add_tokens(resp.usage)
    result = resp.choices[0].message.content.strip()
    ctx.add_step("ActivityAgent", "summarise_activity",
                 f"Analysed {len(commits)} commits, {len(prs)} PRs",
                 result[:80] + "…", ms=round((time.time() - t0) * 1000))
    return result


# ─── Orchestrator ──────────────────────────────────────────────────────────

ORCHESTRATOR_SYSTEM = """
You are the orchestrator for a multi-agent code intelligence system.
Given a user question about a GitHub repository, decide which agents to activate.

Available agents:
- code_agent     : searches the codebase for relevant source code
- architect_agent: analyses module structure and architectural layers
- activity_agent : looks at recent commits and pull requests

Respond with a JSON object: {"agents": ["code_agent", "architect_agent"]}
Always include code_agent unless the question is purely about activity/history.
Include architect_agent for structure/architecture/flow questions.
Include activity_agent for questions about recent changes, who worked on what, or project health.
""".strip()


def orchestrate(question: str) -> list[str]:
    """Decide which agents to run for this question."""
    resp = client.chat.completions.create(
        model=MODEL, max_tokens=80,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": ORCHESTRATOR_SYSTEM},
            {"role": "user",   "content": question},
        ],
    )
    try:
        data = json.loads(resp.choices[0].message.content)
        agents = data.get("agents", ["code_agent"])
        # Validate
        valid = {"code_agent", "architect_agent", "activity_agent"}
        return [a for a in agents if a in valid] or ["code_agent"]
    except Exception:
        return ["code_agent"]


# ─── Synthesizer ───────────────────────────────────────────────────────────

def run_synthesizer(ctx: AgentContext, agent_findings: dict[str, str]) -> str:
    """Merge all agent findings into one coherent final answer."""
    t0 = time.time()
    ctx.add_step("Synthesizer", "merge", "Combining findings from all agents")

    findings_text = ""
    for agent_name, finding in agent_findings.items():
        findings_text += f"\n\n### {agent_name} says:\n{finding}"

    sources_text = "\n".join(f"  - {s}" for s in ctx.sources) if ctx.sources else "  - No specific files cited"

    prompt = (
        f"Question: {ctx.question}\n"
        f"{findings_text}\n\n"
        f"Source files used:\n{sources_text}\n\n"
        "Write a clear, helpful final answer. "
        "Be specific and practical. Use markdown formatting where helpful. "
        "Mention specific files when relevant. "
        "Keep it under 400 words."
    )

    resp = client.chat.completions.create(
        model=MODEL, max_tokens=700,
        messages=[{"role": "user", "content": prompt}],
    )
    ctx.add_tokens(resp.usage)
    answer = resp.choices[0].message.content.strip()
    ctx.add_step("Synthesizer", "final_answer",
                 "Synthesised final answer",
                 f"{len(answer)} chars", ms=round((time.time() - t0) * 1000))
    return answer


# ─── Main entry point ──────────────────────────────────────────────────────

def run_agents(question: str, collection, repo_data: dict) -> dict[str, Any]:
    """
    Run the full multi-agent pipeline and return a structured result.

    Returns:
      answer       : str
      sources      : list[str]
      steps        : list[dict]
      tokens_in    : int
      tokens_out   : int
      total_tokens : int
      agents_used  : list[str]
      total_ms     : int
    """
    wall_start = time.time()

    ctx = AgentContext(question, collection, repo_data)

    # 1. Orchestrator decides which agents to run
    ctx.add_step("Orchestrator", "plan", f"Routing question: {question[:80]}")
    agents_to_run = orchestrate(question)
    ctx.add_step("Orchestrator", "decision",
                 f"Activated agents: {', '.join(agents_to_run)}")

    # 2. Run selected agents
    findings: dict[str, str] = {}

    if "code_agent" in agents_to_run:
        findings["Code Agent"]      = run_code_agent(ctx)

    if "architect_agent" in agents_to_run:
        findings["Architect Agent"] = run_architect_agent(ctx)

    if "activity_agent" in agents_to_run:
        findings["Activity Agent"]  = run_activity_agent(ctx)

    # 3. Synthesize
    answer = run_synthesizer(ctx, findings)

    total_ms = round((time.time() - wall_start) * 1000)

    return {
        "answer":       answer,
        "sources":      ctx.sources,
        "steps":        [s.to_dict() for s in ctx.steps],
        "tokens_in":    ctx.tokens_in,
        "tokens_out":   ctx.tokens_out,
        "total_tokens": ctx.total_tokens,
        "agents_used":  agents_to_run,
        "total_ms":     total_ms,
    }
