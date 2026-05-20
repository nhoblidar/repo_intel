import os
import requests
import chromadb
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

GITHUB_TOKEN   = os.getenv("GITHUB_TOKEN")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

client       = OpenAI(api_key=OPENAI_API_KEY)
chroma_client = chromadb.PersistentClient(path="./chroma_db")

IGNORE_EXTENSIONS = {'.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico',
                     '.pdf', '.zip', '.exe', '.lock', '.woff', '.woff2',
                     '.ttf', '.eot', '.mp4', '.mp3', '.webp', '.bin'}
IGNORE_FOLDERS    = {'node_modules', '.git', 'venv', '__pycache__',
                     'dist', 'build', '.next', '.nuxt', 'coverage',
                     '.pytest_cache', '.mypy_cache', 'target', 'vendor'}

# Max file size to fetch content for (bytes) — skip huge generated files
MAX_FILE_BYTES = 150_000


def get_repo_files(owner, repo):
    """Fetch full file tree from GitHub API."""
    headers  = {"Authorization": f"token {GITHUB_TOKEN}"}
    url      = f"https://api.github.com/repos/{owner}/{repo}/git/trees/HEAD?recursive=1"
    response = requests.get(url, headers=headers)
    tree     = response.json()

    files = []
    for item in tree.get("tree", []):
        if item["type"] != "blob":
            continue
        path = item["path"]
        if any(folder in path.split("/") for folder in IGNORE_FOLDERS):
            continue
        ext = os.path.splitext(path)[1].lower()
        if ext in IGNORE_EXTENSIONS:
            continue
        # Skip very large files (size in bytes returned by tree API)
        if item.get("size", 0) > MAX_FILE_BYTES:
            continue
        files.append(path)

    return files


def get_file_content(owner, repo, path):
    """Fetch content of a single file."""
    headers  = {"Authorization": f"token {GITHUB_TOKEN}"}
    url      = f"https://api.github.com/repos/{owner}/{repo}/contents/{path}"
    response = requests.get(url, headers=headers)
    data     = response.json()

    if "content" in data:
        import base64
        try:
            return base64.b64decode(data["content"]).decode("utf-8", errors="ignore")
        except Exception:
            return None
    return None


def chunk_content(content, path, chunk_size=1500):
    """Split file content into overlapping chunks for ChromaDB."""
    chunks = []
    lines  = content.split("\n")
    current_chunk = []
    current_size  = 0

    for line in lines:
        current_chunk.append(line)
        current_size += len(line)
        if current_size >= chunk_size:
            chunks.append({"text": "\n".join(current_chunk), "path": path})
            current_chunk = []
            current_size  = 0

    if current_chunk:
        chunks.append({"text": "\n".join(current_chunk), "path": path})

    return chunks


def _make_collection_name(owner, repo):
    cn = f"{owner}_{repo}".replace("-", "_").replace(".", "_").replace("/", "_")
    cn = cn[:63].strip("_")
    if cn and not cn[0].isalnum(): cn = "r" + cn[1:]
    if cn and not cn[-1].isalnum(): cn = cn[:-1] + "x"
    return cn


def ingest_repo(owner, repo):
    """
    Fetch repo, store chunks in ChromaDB, build real dependency graph.

    Returns:
        (collection, file_count, graph)
        graph = { "nodes": [...], "edges": [...] }
    """
    print(f"Fetching file list for {owner}/{repo}...")
    files = get_repo_files(owner, repo)
    print(f"Found {len(files)} files to process")

    collection_name = _make_collection_name(owner, repo)

    # ── Check cache ──────────────────────────────────────────
    try:
        collection = chroma_client.get_collection(collection_name)
        print("Repo already indexed — loading from cache")
        # Still build the graph (cheap, from ChromaDB metadata)
        graph = _build_graph_from_collection(collection, files)
        return collection, len(files), graph
    except Exception:
        collection = chroma_client.create_collection(collection_name)

    # ── Fetch + index + collect contents for graph ───────────
    all_chunks   = []
    all_ids      = []
    all_metadata = []
    file_contents: dict[str, str] = {}   # path → content for graph builder

    for i, path in enumerate(files):
        print(f"Processing {i+1}/{len(files)}: {path}")
        content = get_file_content(owner, repo, path)

        if not content or not content.strip():
            continue

        # Store content for graph analysis
        file_contents[path] = content

        # Chunk for ChromaDB
        chunks = chunk_content(content, path)
        for j, chunk in enumerate(chunks):
            all_chunks.append(chunk["text"])
            all_ids.append(f"{path}__{j}")
            all_metadata.append({"path": path, "chunk": j})

    # ── Store in ChromaDB ────────────────────────────────────
    batch_size = 50
    for i in range(0, len(all_chunks), batch_size):
        collection.add(
            documents=all_chunks[i:i+batch_size],
            ids=all_ids[i:i+batch_size],
            metadatas=all_metadata[i:i+batch_size],
        )

    print(f"Indexed {len(all_chunks)} chunks from {len(file_contents)} files")

    # ── Build real dependency graph ──────────────────────────
    from graph_builder import build_graph
    graph = build_graph(file_contents)
    print(f"Graph: {len(graph['nodes'])} nodes, {len(graph['edges'])} edges")

    return collection, len(files), graph


def _build_graph_from_collection(collection, file_paths):
    """
    Rebuild graph from cached collection — we only have paths, not content.
    Returns a graph using file-path classification (no import edges from cache).
    """
    from graph_builder import build_graph, classify_file, LAYER_META, layout_nodes
    import os

    # Build nodes from known paths
    raw_nodes = []
    for path in sorted(file_paths):
        layer = classify_file(path)
        meta  = LAYER_META.get(layer, LAYER_META['other'])
        raw_nodes.append({
            'id': path, 'path': path,
            'label': os.path.basename(path),
            'layer': layer, 'color': meta['color'],
            'bg': meta['bg'], 'meta': meta, 'x': 0, 'y': 0,
        })

    raw_nodes = layout_nodes(raw_nodes)
    return {'nodes': raw_nodes, 'edges': []}   # no edges without content


# ── GitHub metadata helpers ───────────────────────────────────────────────

def get_repo_summary(owner, repo):
    headers = {"Authorization": f"token {GITHUB_TOKEN}"}
    return requests.get(f"https://api.github.com/repos/{owner}/{repo}", headers=headers).json()

def get_recent_commits(owner, repo, limit=10):
    headers = {"Authorization": f"token {GITHUB_TOKEN}"}
    return requests.get(
        f"https://api.github.com/repos/{owner}/{repo}/commits?per_page={limit}",
        headers=headers
    ).json()

def get_recent_prs(owner, repo, limit=5):
    headers = {"Authorization": f"token {GITHUB_TOKEN}"}
    return requests.get(
        f"https://api.github.com/repos/{owner}/{repo}/pulls?state=all&per_page={limit}",
        headers=headers
    ).json()
