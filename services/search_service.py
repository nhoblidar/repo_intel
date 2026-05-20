"""
Search Service - Advanced code search with graph and semantic capabilities
"""
from typing import Dict, List, Any, Optional


class SearchService:
    """Advanced code search combining graph and semantic search"""
    
    async def search_code(
        self,
        graph: Dict[str, Any],
        chromadb_collection,
        query: str,
        search_type: str = "hybrid"
    ) -> Dict[str, Any]:
        """
        Search code using graph and vector search
        
        Args:
            graph: Dependency graph
            chromadb_collection: ChromaDB collection
            query: Search query
            search_type: "graph", "semantic", "hybrid"
        
        Returns:
            Combined search results
        """
        
        results = {
            "query": query,
            "search_type": search_type,
            "graph_results": [],
            "semantic_results": [],
            "combined": [],
            "total_count": 0
        }
        
        # Semantic search (ChromaDB)
        if search_type in ["semantic", "hybrid"]:
            semantic_results = await self._search_semantic(chromadb_collection, query)
            results["semantic_results"] = semantic_results
        
        # Graph search
        if search_type in ["graph", "hybrid"]:
            graph_results = await self._search_graph(graph, query)
            results["graph_results"] = graph_results
        
        # Combine results
        results["combined"] = self._merge_results(
            results["graph_results"],
            results["semantic_results"]
        )
        results["total_count"] = len(results["combined"])
        
        return results
    
    
    async def _search_semantic(self, collection, query: str) -> List[Dict]:
        """Search using ChromaDB semantic search"""
        try:
            results = collection.query(
                query_texts=[query],
                n_results=5,
                include=["documents", "metadatas", "distances"]
            )
            
            formatted = []
            if results and results.get("documents"):
                for i, doc in enumerate(results["documents"][0]):
                    metadata = results["metadatas"][0][i] if results["metadatas"] else {}
                    similarity = 1 - results["distances"][0][i]
                    
                    formatted.append({
                        "type": "code",
                        "file": metadata.get("file", "unknown"),
                        "content": doc[:200],
                        "relevance": "high" if similarity > 0.7 else "medium",
                        "similarity": round(similarity, 3)
                    })
            
            return formatted
        except Exception as e:
            return []
    
    
    async def _search_graph(self, graph: Dict, query: str) -> List[Dict]:
        """Search using graph structure"""
        try:
            query_lower = query.lower()
            results = []
            
            # Search nodes by name
            for node in graph.get("nodes", []):
                if query_lower in str(node.get("id", "")).lower() or \
                   query_lower in str(node.get("label", "")).lower():
                    results.append({
                        "type": "node",
                        "id": node.get("id"),
                        "label": node.get("label"),
                        "relevance": "high"
                    })
            
            return results[:5]
        except Exception as e:
            return []
    
    
    def _merge_results(self, graph_results: List, semantic_results: List) -> List[Dict]:
        """Merge and deduplicate search results"""
        seen = set()
        merged = []
        
        # Add graph results
        for result in graph_results:
            key = (result.get("type"), result.get("id"))
            if key not in seen:
                seen.add(key)
                merged.append(result)
        
        # Add semantic results
        for result in semantic_results:
            key = ("code", result.get("file"))
            if key not in seen:
                seen.add(key)
                merged.append(result)
        
        # Sort by relevance
        relevance_order = {"high": 0, "medium": 1, "low": 2}
        merged.sort(key=lambda x: relevance_order.get(x.get("relevance"), 3))
        
        return merged
