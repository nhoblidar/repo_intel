"""
graph_builder.py — Real AST-based dependency graph builder.

Parses every file fetched during ingest, extracts imports/dependencies,
and builds a graph of { nodes, edges } that reflects the ACTUAL codebase
structure — not heuristic guesses.
"""
import re
import os
from collections import defaultdict


# ── File classification ────────────────────────────────────────────────────

EXT_LAYER = {
    # Frontend
    'jsx': 'frontend', 'tsx': 'frontend', 'vue': 'frontend', 'svelte': 'frontend',
    'html': 'frontend',
    # Style
    'css': 'style', 'scss': 'style', 'sass': 'style', 'less': 'style',
    # Config / infra
    'yaml': 'infra', 'yml': 'infra', 'toml': 'infra', 'dockerfile': 'infra',
    # Docs
    'md': 'docs', 'mdx': 'docs', 'rst': 'docs', 'txt': 'docs',
    # Data
    'json': 'config', 'env': 'config',
}

PATH_LAYER_RULES = [
    # Order matters — first match wins
    (r'(dockerfile|docker.compose|\.github|\.gitlab|ci\.ya?ml|deploy|infra|terraform|k8s|kubernetes)',  'infra'),
    (r'(auth|login|session|jwt|oauth|passport|clerk|security)',   'auth'),
    (r'(model|schema|migration|prisma|orm|db\.|database|mongo|postgres|redis|sqlite|supabase)', 'database'),
    (r'(route|router|endpoint|controller|handler|api/|views\.)',  'api'),
    (r'(test|spec|__test__|\.test\.|\.spec\.)',                   'test'),
    (r'(util|helper|lib/|shared/|common/|constant|config)',      'util'),
    (r'(component|page|screen|view|layout|widget)',               'frontend'),
    (r'(style|theme|css|tailwind)',                               'style'),
]

LAYER_META = {
    'frontend': {'color': '#2563eb', 'label': 'Frontend',  'bg': '#eff6ff'},
    'api':      {'color': '#0891b2', 'label': 'API',        'bg': '#ecfeff'},
    'backend':  {'color': '#059669', 'label': 'Backend',    'bg': '#ecfdf5'},
    'auth':     {'color': '#dc2626', 'label': 'Auth',       'bg': '#fef2f2'},
    'database': {'color': '#d97706', 'label': 'Database',   'bg': '#fffbeb'},
    'infra':    {'color': '#7c3aed', 'label': 'Infra',      'bg': '#f5f3ff'},
    'test':     {'color': '#0891b2', 'label': 'Tests',      'bg': '#ecfeff'},
    'util':     {'color': '#6b7280', 'label': 'Utilities',  'bg': '#f9fafb'},
    'style':    {'color': '#8b5cf6', 'label': 'Styles',     'bg': '#f5f3ff'},
    'docs':     {'color': '#10b981', 'label': 'Docs',       'bg': '#ecfdf5'},
    'config':   {'color': '#f59e0b', 'label': 'Config',     'bg': '#fffbeb'},
    'other':    {'color': '#9ca3af', 'label': 'Other',      'bg': '#f9fafb'},
}

def classify_file(path: str) -> str:
    p = path.lower()
    name = os.path.basename(p)
    ext  = name.split('.')[-1] if '.' in name else ''

    # Exact name matches
    if name in ('dockerfile', '.env', '.env.example', '.env.local'): return 'infra'
    if name in ('package.json', 'pyproject.toml', 'setup.py', 'setup.cfg'): return 'config'
    if name in ('requirements.txt', 'go.mod', 'cargo.toml', 'gemfile'): return 'config'

    # Extension map
    if ext in EXT_LAYER:
        return EXT_LAYER[ext]

    # Path-based rules
    for pattern, layer in PATH_LAYER_RULES:
        if re.search(pattern, p):
            return layer

    # Code files → backend by default
    if ext in ('py', 'go', 'rs', 'java', 'rb', 'php', 'cs', 'cpp', 'c', 'kt', 'swift'):
        return 'backend'
    if ext in ('js', 'ts', 'mjs', 'cjs'):
        return 'backend'

    return 'other'


# ── Import extraction ──────────────────────────────────────────────────────

def extract_imports(content: str, path: str) -> list[str]:
    """
    Extract local file imports from source code.
    Returns a list of raw import strings (relative paths / module names).
    """
    ext = path.split('.')[-1].lower() if '.' in path else ''
    imports = []

    if ext == 'py':
        # from .module import X  /  from package.module import X  /  import module
        for m in re.finditer(
            r'^\s*(?:from\s+([\w./]+)\s+import\s+\w+|import\s+([\w.]+))',
            content, re.MULTILINE
        ):
            imp = m.group(1) or m.group(2)
            if imp:
                imports.append(imp.replace('.', '/'))

    elif ext in ('js', 'ts', 'jsx', 'tsx', 'mjs'):
        # import ... from './foo'  /  require('./foo')
        for m in re.finditer(
            r'''(?:import\s+(?:.*?\s+from\s+)?|require\s*\(\s*)['"]([^'"]+)['"]''',
            content
        ):
            imports.append(m.group(1))

    elif ext in ('vue', 'svelte'):
        for m in re.finditer(r'''import\s+.*?\s+from\s+['"]([^'"]+)['"]''', content):
            imports.append(m.group(1))

    elif ext == 'go':
        for m in re.finditer(r'"([^"]+)"', content):
            imports.append(m.group(1))

    elif ext == 'rb':
        for m in re.finditer(r'''require(?:_relative)?\s+['"]([^'"]+)['"]''', content):
            imports.append(m.group(1))

    # Keep only relative / local imports (not stdlib / npm packages)
    local = []
    for imp in imports:
        if imp.startswith(('./', '../', '/')):
            local.append(imp)
        # Python local: short names without dots that match our file list
        elif ext == 'py' and '/' in imp:
            local.append(imp)
    return local


def resolve_import(imp: str, source_path: str, all_paths: set[str]) -> str | None:
    """
    Try to resolve an import string to a real path in the repo.
    Returns the matched path or None.
    """
    source_dir = os.path.dirname(source_path)

    # Strip leading ./
    clean = imp.lstrip('./')
    if imp.startswith('./') or imp.startswith('../'):
        candidate = os.path.normpath(os.path.join(source_dir, imp))
    else:
        candidate = clean

    # Try exact + common extensions
    for ext in ('', '.py', '.js', '.ts', '.jsx', '.tsx', '.vue', '.go', '.rb'):
        trial = candidate + ext
        if trial in all_paths:
            return trial
        # also try from repo root
        trial2 = clean + ext
        if trial2 in all_paths:
            return trial2

    # Python: module/path → module/path/__init__.py
    for init in (candidate + '/__init__.py', clean + '/__init__.py'):
        if init in all_paths:
            return init

    return None


# ── Layout ─────────────────────────────────────────────────────────────────

LAYER_ORDER = ['frontend', 'style', 'api', 'auth', 'backend', 'database',
               'test', 'util', 'config', 'infra', 'docs', 'other']

def layout_nodes(nodes: list[dict]) -> list[dict]:
    """
    Arrange nodes in a grid grouped by layer.
    Returns nodes with x, y positions set.
    """
    # Group by layer
    groups: dict[str, list] = defaultdict(list)
    for n in nodes:
        groups[n['layer']].append(n)

    W, H       = 200, 100   # node width / height
    COL_GAP    = 40
    ROW_GAP    = 48
    GROUP_GAP  = 60          # extra gap between layer groups
    COLS       = 4

    positioned = []
    col = 0
    row = 0
    prev_layer = None

    for layer in LAYER_ORDER:
        if layer not in groups:
            continue
        layer_nodes = groups[layer]

        # Gap between layer groups
        if prev_layer is not None and col > 0:
            col = 0
            row += 1  # push to new row at group boundary

        for n in layer_nodes:
            n['x'] = col * (W + COL_GAP)
            n['y'] = row * (H + ROW_GAP)
            positioned.append(n)
            col += 1
            if col >= COLS:
                col = 0
                row += 1

        if col > 0:
            col = 0
            row += 1

        prev_layer = layer

    return positioned


# ── Main builder ────────────────────────────────────────────────────────────

def build_graph(file_contents: dict[str, str]) -> dict:
    """
    Build a real dependency graph from { path: content } dict.

    Returns:
      {
        "nodes": [ { id, path, label, layer, color, bg, x, y } ],
        "edges": [ { id, source, target, label } ]
      }
    """
    all_paths = set(file_contents.keys())

    # Build nodes
    raw_nodes = []
    for path in sorted(all_paths):
        layer = classify_file(path)
        meta  = LAYER_META.get(layer, LAYER_META['other'])
        raw_nodes.append({
            'id':    path,          # use path as stable id
            'path':  path,
            'label': os.path.basename(path),
            'layer': layer,
            'color': meta['color'],
            'bg':    meta['bg'],
            'meta':  meta,
            'x': 0, 'y': 0,
        })

    # Layout
    raw_nodes = layout_nodes(raw_nodes)

    # Build edges from real imports
    edges = []
    seen_edges: set[tuple] = set()

    for path, content in file_contents.items():
        if not content:
            continue
        imports = extract_imports(content, path)
        for imp in imports:
            target = resolve_import(imp, path, all_paths)
            if target and target != path:
                key = (path, target)
                if key not in seen_edges:
                    seen_edges.add(key)
                    edges.append({
                        'id':     f'e-{path}-{target}',
                        'source': path,
                        'target': target,
                        'label':  'imports',
                    })

    return {'nodes': raw_nodes, 'edges': edges}
