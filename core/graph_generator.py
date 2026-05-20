"""
Graph Generator - Generate dependency graphs from code
"""
from typing import Dict, List, Any, Set


class GraphGenerator:
    """Generate dependency graphs from files and imports"""
    
    def __init__(self):
        """Initialize graph generator"""
        self.nodes: Dict[str, Dict] = {}
        self.edges: List[Dict] = []
    
    
    def generate(self, files: List[Dict[str, str]]) -> Dict[str, Any]:
        """
        Generate graph from files
        
        Args:
            files: List of {path, content, language} dicts
        
        Returns:
            Graph with nodes and edges
        """
        
        self.nodes = {}
        self.edges = []
        
        # First pass: create nodes for all files
        for file_info in files:
            path = file_info.get("path", "unknown")
            self.nodes[path] = {
                "id": path,
                "label": path.split('/')[-1],
                "type": "file",
                "file": path,
                "language": file_info.get("language", "unknown")
            }
        
        # Second pass: extract dependencies
        for file_info in files:
            path = file_info.get("path", "unknown")
            content = file_info.get("content", "")
            
            dependencies = self._extract_dependencies(content)
            
            for dep in dependencies:
                # Find matching files
                for other_path in self.nodes.keys():
                    if self._matches_dependency(dep, other_path):
                        self.edges.append({
                            "source": path,
                            "target": other_path,
                            "type": "import"
                        })
                        break
        
        return {
            "nodes": list(self.nodes.values()),
            "edges": self.edges,
            "stats": {
                "node_count": len(self.nodes),
                "edge_count": len(self.edges)
            }
        }
    
    
    def _extract_dependencies(self, content: str) -> List[str]:
        """Extract imports/dependencies from code"""
        dependencies = []
        
        for line in content.split('\n'):
            stripped = line.strip()
            
            # Python imports
            if stripped.startswith('import '):
                dep = stripped.replace('import ', '').split(' as ')[0].split(',')[0].strip()
                dependencies.append(dep)
            elif stripped.startswith('from '):
                dep = stripped.split(' import ')[0].replace('from ', '').strip()
                dependencies.append(dep)
            
            # JavaScript/TypeScript imports
            elif stripped.startswith('import '):
                dep = stripped.replace('import ', '').split(' from ')[1].strip().strip("'\"")
                dependencies.append(dep)
            elif stripped.startswith('const ') and 'require' in stripped:
                dep = stripped.split('require(')[1].split(')')[0].strip().strip("'\"")
                dependencies.append(dep)
            
            # Java imports
            elif stripped.startswith('import '):
                dep = stripped.replace('import ', '').replace(';', '').strip()
                dependencies.append(dep)
        
        return list(set(dependencies))  # Remove duplicates
    
    
    def _matches_dependency(self, dep: str, filepath: str) -> bool:
        """Check if a dependency matches a file path"""
        
        # Convert dependency path to file path patterns
        dep_patterns = [
            dep.replace('.', '/') + '.py',
            dep.replace('.', '/') + '.js',
            dep.replace('.', '/') + '.ts',
            dep.replace('.', '/') + '.tsx',
            dep.replace('.', '/') + '.java',
            dep.replace('.', '/') + '.go',
            'node_modules/' + dep + '/index.js',
        ]
        
        for pattern in dep_patterns:
            if pattern in filepath or filepath.endswith(pattern):
                return True
        
        # Also check filename
        filename = filepath.split('/')[-1].replace('.py', '').replace('.js', '')
        if filename == dep.split('.')[-1]:
            return True
        
        return False
    
    
    def get_node_info(self, node_id: str) -> Dict[str, Any]:
        """Get information about a specific node"""
        if node_id in self.nodes:
            node = self.nodes[node_id]
            
            # Find connected nodes
            incoming = [e["source"] for e in self.edges if e["target"] == node_id]
            outgoing = [e["target"] for e in self.edges if e["source"] == node_id]
            
            return {
                "node": node,
                "incoming": incoming,
                "outgoing": outgoing,
                "in_degree": len(incoming),
                "out_degree": len(outgoing)
            }
        
        return {"error": f"Node {node_id} not found"}
    
    
    def get_graph_stats(self) -> Dict[str, Any]:
        """Get statistics about the graph"""
        
        # Calculate degrees
        degrees = {}
        for node_id in self.nodes.keys():
            in_degree = len([e for e in self.edges if e["target"] == node_id])
            out_degree = len([e for e in self.edges if e["source"] == node_id])
            degrees[node_id] = in_degree + out_degree
        
        avg_degree = sum(degrees.values()) / len(degrees) if degrees else 0
        
        return {
            "node_count": len(self.nodes),
            "edge_count": len(self.edges),
            "average_degree": round(avg_degree, 2),
            "max_degree": max(degrees.values()) if degrees else 0,
            "languages": list(set([n.get("language") for n in self.nodes.values()]))
        }
