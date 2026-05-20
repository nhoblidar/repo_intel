"""
Graph Search Tool - Search and analyze dependency graphs
"""
from typing import Dict, List, Any, Set


class GraphSearchTool:
    """Search and analyze graphs for patterns and relationships"""
    
    def search(
        self,
        graph: Dict[str, Any],
        query: str,
        search_type: str = "all"
    ) -> Dict[str, Any]:
        """
        Search the graph
        
        Args:
            graph: Graph structure with nodes and edges
            query: Search query
            search_type: "node", "edge", "path", or "all"
        
        Returns:
            Search results
        """
        
        results = {
            "query": query,
            "search_type": search_type,
            "nodes": [],
            "edges": []
        }
        
        query_lower = query.lower()
        
        # Search nodes
        if search_type in ["node", "all"]:
            nodes = graph.get("nodes", [])
            for node in nodes:
                node_id = str(node.get("id", "")).lower()
                label = str(node.get("label", "")).lower()
                
                if query_lower in node_id or query_lower in label:
                    results["nodes"].append(node)
        
        # Search edges
        if search_type in ["edge", "all"]:
            edges = graph.get("edges", [])
            for edge in edges:
                source = str(edge.get("source", "")).lower()
                target = str(edge.get("target", "")).lower()
                
                if query_lower in source or query_lower in target:
                    results["edges"].append(edge)
        
        return results
    
    
    def find_paths(
        self,
        graph: Dict[str, Any],
        start_node: str,
        end_node: str,
        max_depth: int = 5
    ) -> List[List[str]]:
        """
        Find all paths between two nodes
        
        Args:
            graph: Graph structure
            start_node: Starting node ID
            end_node: Ending node ID
            max_depth: Maximum path depth
        
        Returns:
            List of paths (each path is a list of node IDs)
        """
        
        edges = graph.get("edges", [])
        
        # Build adjacency list
        adj = {}
        for edge in edges:
            source = edge["source"]
            target = edge["target"]
            if source not in adj:
                adj[source] = []
            adj[source].append(target)
        
        # DFS to find paths
        paths = []
        
        def dfs(current: str, target: str, path: List[str], depth: int):
            if depth > max_depth:
                return
            
            if current == target:
                paths.append(path + [current])
                return
            
            if current in adj:
                for neighbor in adj[current]:
                    if neighbor not in path:  # Avoid cycles
                        dfs(neighbor, target, path + [current], depth + 1)
        
        dfs(start_node, end_node, [], 0)
        return paths
    
    
    def find_cycles(self, graph: Dict[str, Any]) -> List[List[str]]:
        """
        Find all cycles in the graph
        
        Returns:
            List of cycles (each cycle is a list of node IDs)
        """
        
        edges = graph.get("edges", [])
        nodes = graph.get("nodes", [])
        node_ids = [n.get("id") for n in nodes]
        
        # Build adjacency list
        adj = {}
        for node_id in node_ids:
            adj[node_id] = []
        
        for edge in edges:
            adj[edge["source"]].append(edge["target"])
        
        cycles = []
        visited = set()
        
        def dfs(node: str, path: List[str], rec_stack: Set[str]):
            visited.add(node)
            rec_stack.add(node)
            path.append(node)
            
            if node in adj:
                for neighbor in adj[node]:
                    if neighbor not in visited:
                        dfs(neighbor, path[:], rec_stack)
                    elif neighbor in rec_stack:
                        # Found a cycle
                        cycle_start = path.index(neighbor)
                        cycle = path[cycle_start:] + [neighbor]
                        if cycle not in cycles:
                            cycles.append(cycle)
            
            rec_stack.remove(node)
        
        # Find cycles starting from each node
        for node_id in node_ids:
            if node_id not in visited:
                dfs(node_id, [], set())
        
        return cycles
    
    
    def analyze_node(
        self,
        graph: Dict[str, Any],
        node_id: str
    ) -> Dict[str, Any]:
        """
        Analyze a specific node
        
        Returns:
        - Node info
        - Dependencies (outgoing edges)
        - Dependents (incoming edges)
        - Paths
        """
        
        nodes = {n.get("id"): n for n in graph.get("nodes", [])}
        edges = graph.get("edges", [])
        
        if node_id not in nodes:
            return {"error": f"Node {node_id} not found"}
        
        node = nodes[node_id]
        
        # Find dependencies
        dependencies = [e["target"] for e in edges if e["source"] == node_id]
        dependents = [e["source"] for e in edges if e["target"] == node_id]
        
        return {
            "node": node,
            "dependencies": [nodes.get(d) for d in dependencies if d in nodes],
            "dependents": [nodes.get(d) for d in dependents if d in nodes],
            "dependency_count": len(dependencies),
            "dependent_count": len(dependents),
            "complexity_score": len(dependencies) + len(dependents)
        }
    
    
    def find_hub_nodes(self, graph: Dict[str, Any], threshold_percentile: float = 75) -> List[Dict]:
        """
        Find hub nodes (nodes with many connections)
        
        Args:
            graph: Graph structure
            threshold_percentile: Percentile threshold for hub detection
        
        Returns:
            List of hub nodes with their degree
        """
        
        edges = graph.get("edges", [])
        nodes = graph.get("nodes", [])
        node_ids = [n.get("id") for n in nodes]
        
        # Calculate degrees
        degrees = {}
        for node_id in node_ids:
            in_degree = len([e for e in edges if e["target"] == node_id])
            out_degree = len([e for e in edges if e["source"] == node_id])
            degrees[node_id] = in_degree + out_degree
        
        # Calculate threshold
        sorted_degrees = sorted(degrees.values())
        threshold_idx = int(len(sorted_degrees) * (threshold_percentile / 100))
        threshold = sorted_degrees[threshold_idx] if threshold_idx < len(sorted_degrees) else 0
        
        # Find hubs
        hubs = []
        for node_id, degree in degrees.items():
            if degree > threshold:
                node = next((n for n in nodes if n.get("id") == node_id), None)
                if node:
                    hubs.append({
                        "node": node,
                        "degree": degree,
                        "risk_level": "high" if degree > threshold * 2 else "medium"
                    })
        
        return sorted(hubs, key=lambda x: x["degree"], reverse=True)
