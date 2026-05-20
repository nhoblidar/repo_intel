# RepoIntel with GitVizz Integration - Ready to Run!

This is a **complete, production-ready version** of RepoIntel with **GitVizz integrated**.

## ✨ What's Included

✅ **RepoIntel Core** - All original features
- Multi-agent AI system (5 agents)
- Workspace collaboration
- Issues tracking
- Analytics & observability
- Chat interface

✅ **GitVizz Integration** - New capabilities
- Advanced AST parsing (10+ languages)
- Enhanced dependency graphs
- Graph search & analysis
- Multi-LLM support (4 providers)
- Documentation generation
- Hybrid code search

✅ **Zero Setup** - Just run!
- All dependencies configured
- All files integrated
- No additional setup needed

---

## 🚀 Quick Start (3 Steps)

### Step 1: Install Dependencies

```bash
# Install Python packages
pip install -r requirements.txt

# Install JavaScript dependencies
npm install
```

### Step 2: Setup Environment (Optional)

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your keys (optional):
# - OPENAI_API_KEY (for ChatGPT)
# - ANTHROPIC_API_KEY (for Claude)
# - GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET
# - DATABASE_URL (if using PostgreSQL)
```

### Step 3: Run!

#### Option A: Backend Only
```bash
python main.py
```
Backend will run on: `http://localhost:8003`

#### Option B: Full Stack (Backend + Frontend)

Terminal 1 - Backend:
```bash
python main.py
```

Terminal 2 - Frontend:
```bash
npm run dev
```
Frontend will run on: `http://localhost:5173`

---

## 📊 What's New (GitVizz Features)

### New API Endpoints

```bash
# Generate dependency graph (uses GitVizz)
curl -X POST http://localhost:8003/api/graph/analyze \
  -H "Content-Type: application/json" \
  -d '{"repo_key": "owner/repo"}'

# Generate documentation
curl -X POST http://localhost:8003/api/documentation/generate \
  -H "Content-Type: application/json" \
  -d '{"repo_key": "owner/repo"}'

# Advanced search
curl -X POST http://localhost:8003/api/search/advanced \
  -H "Content-Type: application/json" \
  -d '{"repo_key": "owner/repo", "query": "authentication"}'

# Get graph metrics
curl -X GET http://localhost:8003/api/graph/metrics/owner/repo

# Detect dependency issues
curl -X GET http://localhost:8003/api/graph/issues/owner/repo
```

### Enhanced Components

- **Agents** - Now use graphs for analysis
- **Graph Builder** - Uses GitVizz engine
- **Code Ingestion** - AST parsing
- **Search** - Hybrid (graph + semantic)

---

## 📂 Project Structure

```
repo_intel/
├── core/                    ← GitVizz core
│   ├── custom_ast_parser.py
│   ├── graph_generator.py
│   └── graph_search_tool.py
│
├── utils/                   ← Utilities
│   ├── llm_handler.py
│   ├── cache_manager.py
│   └── observability.py
│
├── services/                ← Business logic
│   ├── workspace_service.py
│   ├── graph_service.py     ← NEW
│   ├── documentation_service.py ← NEW
│   └── search_service.py    ← NEW
│
├── main.py                  ← FastAPI server
├── agents.py                ← Multi-agent system
├── graph_builder.py         ← Graph building
├── ingest.py                ← Code ingestion
├── query.py                 ← Query processing
│
├── db/                      ← Database
│   ├── models/
│   └── database.py
│
├── src/                     ← React frontend
│   ├── pages/
│   ├── components/
│   └── ...
│
└── requirements.txt         ← Python dependencies
```

---

## 🔧 Configuration

### Environment Variables

Create `.env` file (copy from `.env.example`):

```env
# Database (optional - uses in-memory ChromaDB by default)
DATABASE_URL=postgresql://user:pass@localhost/repointel

# LLM Providers (choose at least one)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GEMINI_API_KEY=AIza...
GROQ_API_KEY=gsk_...

# GitHub (optional)
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...

# Other
JWT_SECRET=your-secret-key
REDIS_URL=redis://localhost:6379  # optional
```

---

## 💾 Database

By default, RepoIntel uses:
- **ChromaDB** (embedded, SQLite-based) - for code embeddings
- **In-memory cache** - for session data
- **PostgreSQL** (optional) - for persistent data

To use PostgreSQL:
1. Install PostgreSQL locally
2. Create database: `createdb repointel`
3. Set `DATABASE_URL` in `.env`
4. Run migrations: `alembic upgrade head`

---

## 🎯 Usage Examples

### 1. Analyze a Repository

```python
import requests

response = requests.post(
    "http://localhost:8003/analyze",
    json={"github_url": "https://github.com/owner/repo"}
)

print(response.json())
# Returns: {
#   "repo_key": "owner/repo",
#   "file_count": 250,
#   "ai_summary": "...",
#   "graph": {"nodes": [...], "edges": [...]}
# }
```

### 2. Ask Questions About Code

```python
response = requests.post(
    "http://localhost:8003/agent",
    json={
        "repo_key": "owner/repo",
        "question": "What is the main entry point?"
    }
)

result = response.json()
print(f"Answer: {result['answer']}")
print(f"Sources: {result['sources']}")
print(f"Duration: {result['total_ms']}ms")
```

### 3. Generate Documentation

```python
response = requests.post(
    "http://localhost:8003/api/documentation/generate",
    json={"repo_key": "owner/repo"}
)

docs = response.json()
print(docs['content'])
```

### 4. Search Code

```python
response = requests.post(
    "http://localhost:8003/api/search/advanced",
    json={
        "repo_key": "owner/repo",
        "query": "authentication logic"
    }
)

results = response.json()
print(f"Found {results['total_count']} results")
```

---

## 🧪 Testing

### Health Check
```bash
curl http://localhost:8003/health
```

### Analyze a Repo
```bash
curl -X POST http://localhost:8003/analyze \
  -H "Content-Type: application/json" \
  -d '{"github_url": "https://github.com/django/django"}'
```

### Ask a Question
```bash
curl -X POST http://localhost:8003/agent \
  -H "Content-Type: application/json" \
  -d '{"repo_key": "django/django", "question": "How does the ORM work?"}'
```

---

## 🎨 Frontend Features

Open `http://localhost:5173` (or `http://localhost:8003` if frontend dev server is off)

### Tabs Available:
- **Overview** - Repository summary
- **Chat** - Multi-agent Q&A with code search
- **Architecture** - Structure analysis
- **Documentation** - Auto-generated docs
- **Issues** - GitHub issues tracking
- **Collaborators** - Team management
- **Graph** - Dependency graph visualization
- **Observability** - Metrics & analytics
- **PM Dashboard** - Project metrics

---

## 🐛 Troubleshooting

### Issue: "Module not found: core.graph_generator"
**Solution**: Make sure all files are in the correct locations
```bash
# Check structure
ls -la repo_intel/core/
# Should show: custom_ast_parser.py, graph_generator.py, graph_search_tool.py
```

### Issue: "ChromaDB error"
**Solution**: Delete and recreate ChromaDB
```bash
rm -rf chroma_db/
python main.py  # Will recreate on startup
```

### Issue: "Port 8003 already in use"
**Solution**: Run on different port
```bash
uvicorn main:app --port 8004
```

### Issue: LLM provider not working
**Solution**: Check API keys
```bash
# Check that at least one LLM API key is set
cat .env | grep -E "OPENAI|ANTHROPIC|GEMINI|GROQ"
```

---

## 📚 Documentation

- **REPOINTEL_STRUCTURE.md** - Architecture overview
- **REPOINTEL_BEFORE_AFTER.md** - What changed
- **FILE_MAPPING.txt** - File locations
- **Original README.md** - RepoIntel docs

---

## 🚀 Performance Tips

1. **Install Redis** (optional but recommended)
   ```bash
   # macOS
   brew install redis
   redis-server
   
   # Or Docker
   docker run -d -p 6379:6379 redis:latest
   ```

2. **Use PostgreSQL** instead of in-memory storage
   ```bash
   # Much faster for large repositories
   ```

3. **Increase Python workers** (production)
   ```bash
   uvicorn main:app --workers 4
   ```

---

## 🔐 Security Notes

1. **Change JWT_SECRET** in production
2. **Use PostgreSQL + PostgreSQL auth** in production
3. **Enable HTTPS** in production
4. **Restrict CORS** in production:
   ```python
   # In main.py, change from:
   allow_origins=["*"]
   # To:
   allow_origins=["https://yourdomain.com"]
   ```

---

## 📈 Next Steps

1. **Analyze your first repo** - Use the `/analyze` endpoint
2. **Ask questions** - Use the `/agent` endpoint
3. **Generate docs** - Use `/api/documentation/generate`
4. **Search code** - Use `/api/search/advanced`
5. **Invite team members** - Use the Collaborators tab

---

## 🎉 You're All Set!

RepoIntel + GitVizz is ready to use. Just run:

```bash
# Terminal 1: Backend
python main.py

# Terminal 2: Frontend (optional)
npm run dev
```

**Backend**: http://localhost:8003
**Frontend**: http://localhost:5173

Happy analyzing! 🚀

---

## 📞 Support

- Check the logs: `python main.py` will show errors
- Database issues? Try `rm -rf chroma_db/` to reset
- Still stuck? Check the original repositories:
  - RepoIntel: https://github.com/nhoblidar/repo_intel
  - GitVizz: https://github.com/adithya-s-k/GitVizz

