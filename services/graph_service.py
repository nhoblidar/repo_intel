"""
Graph Service - Enhanced with GitVizz capabilities
Adds advanced graph generation, search, and analysis to RepoIntel
"""
from typing import Dict, List, Any, Optional
from uuid import UUID
import json

# GitVizz imports (from core/)
from core.graph_generator import GraphGenerator
from core.graph_search_tool import GraphSearchTool


class GraphService:
    """
    Enhanced graph service combining RepoIntel with GitVizz
    
    Provides:
    - Advanced dependency graph generation (GitVizz)
    - Graph search and filtering (GitVizz)
    - Graph analysis and metrics
    - Circular dependency detection
    - Integration with RepoIntel workspaces
    """
    
    def __init__(self):
        self.generator = GraphGenerator()
        self.search_tool = GraphSearchTool()
    
    
    async def generate_and_cache_graph(
        self,
        repo_key: str,
        files_data: List[Dict[str, str]],
        workspace_id: Optional[UUID] = None
    ) -> Dict[str, Any]:
        """
        Generate graph using GitVizz and integrate with RepoIntel
        
        Args:
            repo_key: Repository identifier (e.g., "owner/repo")
            files_data: List of {path, content, language} dicts
            workspace_id: Optional workspace for storing in RepoIntel
        
        Returns:
            Graph with nodes, edges, and metadata
        """
        
        try:
            # Use GitVizz to generate advanced graph
            result = self.generator.generate(files=files_data)
            
            # Enhance with RepoIntel metadata
            enhanced_graph = {
                "repo_key": repo_key,
                "workspace_id": str(workspace_id) if workspace_id else None,
                "nodes": result.get("nodes", []),
                "edges": result.get("edges", []),
                "metadata": {
                    "total_files": len(files_data),
                    "total_nodes": len(result.get("nodes", [])),
                    "total_edges": len(result.get("edges", [])),
                    "languages": self._extract_languages(files_data),
                    "generated_at": self._get_timestamp()
                }
            }
            
            return enhanced_graph
            
        except Exception as e:
            return {
                "error": f"Graph generation failed: {str(e)}",
                "repo_key": repo_key
            }
    
    
    async def search_graph(
        self,
        graph: Dict[str, Any],
        query: str,
        search_type: str = "all"
    ) -> Dict[str, Any]:
        """
        Search the graph using GitVizz search tool
        
        Args:
            graph: Generated dependency graph
            query: Search query (file name, function, pattern)
            search_type: "node", "edge", "path", or "all"
        
        Returns:
            Search results with matching nodes/edges
        """
        
        try:
            results = self.search_tool.search(
                graph=graph,
                query=query,
                search_type=search_type
            )
            
            return {
                "query": query,
                "search_type": search_type,
                "results": results,
                "count": len(results.get("nodes", [])) + len(results.get("edges", []))
            }
            
        except Exception as e:
            return {
                "error": str(e),
                "query": query,
                "results": []
            }
    
    
    async def analyze_node_dependencies(
        self,
        graph: Dict[str, Any],
        node_id: str
    ) -> Dict[str, Any]:
        """
        Analyze dependencies for a specific node (file)
        
        Returns:
        - Direct dependencies (imports)
        - Reverse dependencies (who imports this)
        - Circular dependencies
        - Complexity metrics
        """
        
        node = self._find_node(graph, node_id)
        if not node:
            return {"error": f"Node not found: {node_id}"}
        
        # Find edges
        direct_deps = [
            self._find_node(graph, edge["target"])
            for edge in graph.get("edges", [])
            if edge["source"] == node_id
        ]
        
        reverse_deps = [
            self._find_node(graph, edge["source"])
            for edge in graph.get("edges", [])
            if edge["target"] == node_id
        ]
        
        # Find circular dependencies
        circular = self._find_circular_deps(graph, node_id)
        
        return {
            "node": node,
            "direct_dependencies": [d for d in direct_deps if d],
            "reverse_dependencies": [d for d in reverse_deps if d],
            "circular_dependencies": circular,
            "dependency_count": len(direct_deps),
            "dependent_count": len(reverse_deps),
            "complexity_score": len(direct_deps) + len(reverse_deps)
        }
    
    
    async def detect_issues(
        self,
        graph: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Detect potential issues in the graph
        
        Issues detected:
        - Circular dependencies
        - Hub nodes (too many dependencies)
        - Isolated nodes
        - Complex dependency chains
        """
        
        issues = {
            "circular_dependencies": [],
            "hub_nodes": [],
            "isolated_nodes": [],
            "long_chains": []
        }
        
        nodes = graph.get("nodes", [])
        edges = graph.get("edges", [])
        
        # Calculate degree for each node
        degree = {}
        for node in nodes:
            node_id = node.get("id")
            in_degree = len([e for e in edges if e["target"] == node_id])
            out_degree = len([e for e in edges if e["source"] == node_id])
            degree[node_id] = in_degree + out_degree
        
        # Find hubs (nodes with high degree)
        avg_degree = sum(degree.values()) / len(degree) if degree else 0
        for node_id, deg in degree.items():
            if deg > avg_degree * 3:
                issues["hub_nodes"].append({
                    "node_id": node_id,
                    "degree": deg,
                    "risk": "high"
                })
        
        # Find isolated nodes
        for node_id, deg in degree.items():
            if deg == 0:
                issues["isolated_nodes"].append({"node_id": node_id})
        
        # Find circular dependencies
        for node_id in degree.keys():
            circular = self._find_circular_deps(graph, node_id)
            if circular:
                issues["circular_dependencies"].extend(circular)
        
        return {
            "graph_key": graph.get("repo_key"),
            "total_issues": sum(len(v) if isinstance(v, list) else 1 for v in issues.values()),
            "issues": issues,
            "severity": "high" if issues["circular_dependencies"] else "medium" if issues["hub_nodes"] else "low"
        }
    
    
    async def get_graph_metrics(
        self,
        graph: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Calculate comprehensive metrics for the graph
        
        Returns:
        - Node count, edge count
        - Graph density
        - Average degree
        - Most connected nodes
        """
        
        nodes = graph.get("nodes", [])
        edges = graph.get("edges", [])
        
        if not nodes:
            return {"error": "Empty graph"}
        
        # Basic metrics
        node_count = len(nodes)
        edge_count = len(edges)
        density = edge_count / (node_count * (node_count - 1)) if node_count > 1 else 0
        
        # Degree distribution
        degree = {n["id"]: 0 for n in nodes}
        for edge in edges:
            degree[edge["source"]] = degree.get(edge["source"], 0) + 1
            degree[edge["target"]] = degree.get(edge["target"], 0) + 1
        
        avg_degree = sum(degree.values()) / node_count if node_count > 0 else 0
        
        # Find hubs
        hubs = sorted(degree.items(), key=lambda x: x[1], reverse=True)[:5]
        
        return {
            "node_count": node_count,
            "edge_count": edge_count,
            "density": round(density, 4),
            "average_degree": round(avg_degree, 2),
            "top_hubs": [{"node": h[0], "degree": h[1]} for h in hubs],
            "languages": graph.get("metadata", {}).get("languages", [])
        }
    
    
    async def export_graph(
        self,
        graph: Dict[str, Any],
        format: str = "json"
    ) -> str:
        """
        Export graph in various formats
        
        Formats:
        - json: Full graph data
        - dot: Graphviz DOT format
        - gexf: GEXF format
        """
        
        if format == "json":
            return json.dumps(graph, indent=2)
        
        elif format == "dot":
            lines = ["digraph {"]
            for node in graph.get("nodes", []):
                label = node.get("label", node.get("id", ""))
                lines.append(f'  "{node["id"]}" [label="{label}"];')
            for edge in graph.get("edges", []):
                lines.append(f'  "{edge["source"]}" -> "{edge["target"]}";')
            lines.append("}")
            return "\n".join(lines)
        
        else:
            return json.dumps(graph)
    
    
    # ── Helper Methods ────────────────────────────────────────────
    
    def _find_node(self, graph: Dict, node_id: str) -> Optional[Dict]:
        """Find node by ID"""
        for node in graph.get("nodes", []):
            if node.get("id") == node_id:
                return node
        return None
    
    
    def _find_circular_deps(self, graph: Dict, start_node: str, visited=None, path=None) -> List[List[str]]:
        """Find circular dependency paths"""
        if visited is None:
            visited = set()
        if path is None:
            path = []
        
        if start_node in visited:
            if start_node in path:
                cycle_start = path.index(start_node)
                return [path[cycle_start:] + [start_node]]
            return []
        
        visited.add(start_node)
        cycles = []
        
        for edge in graph.get("edges", []):
            if edge["source"] == start_node:
                target = edge["target"]
                cycles.extend(
                    self._find_circular_deps(graph, target, visited.copy(), path + [start_node])
                )
        
        return cycles
    
    
    def _extract_languages(self, files_data: List[Dict[str, str]]) -> List[str]:
        """Extract programming languages from files"""
        languages = set()
        for file_info in files_data:
            if "language" in file_info:
                languages.add(file_info["language"])
        return sorted(list(languages))
    
    
    def _get_timestamp(self) -> str:
        """Get current timestamp"""
        from datetime import datetime
        return datetime.utcnow().isoformat()

