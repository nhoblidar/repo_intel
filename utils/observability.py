"""
Observability utilities - Analytics and tracing for RepoIntel + GitVizz
"""
from typing import Dict, Any, Optional
from datetime import datetime


class ObservabilityManager:
    """Manage observability, analytics, and tracing"""
    
    def __init__(self, phoenix_enabled: bool = False):
        """Initialize observability manager"""
        self.phoenix_enabled = phoenix_enabled
        self.events = []
    
    
    async def log_event(
        self,
        event_type: str,
        data: Dict[str, Any],
        timestamp: Optional[str] = None
    ) -> Dict[str, Any]:
        """Log an event for observability"""
        
        event = {
            "type": event_type,
            "timestamp": timestamp or datetime.utcnow().isoformat(),
            "data": data
        }
        
        self.events.append(event)
        return event
    
    
    async def log_query(
        self,
        repo_key: str,
        question: str,
        answer_length: int,
        duration_ms: float,
        tokens_used: int,
        model: str
    ) -> Dict[str, Any]:
        """Log a query execution"""
        
        return await self.log_event(
            "query",
            {
                "repo_key": repo_key,
                "question": question,
                "answer_length": answer_length,
                "duration_ms": duration_ms,
                "tokens_used": tokens_used,
                "model": model
            }
        )
    
    
    async def log_analysis(
        self,
        repo_key: str,
        files_count: int,
        duration_ms: float
    ) -> Dict[str, Any]:
        """Log repository analysis"""
        
        return await self.log_event(
            "analysis",
            {
                "repo_key": repo_key,
                "files_count": files_count,
                "duration_ms": duration_ms
            }
        )
    
    
    def get_metrics(self) -> Dict[str, Any]:
        """Get observability metrics"""
        
        total_events = len(self.events)
        event_types = {}
        total_duration = 0
        total_tokens = 0
        
        for event in self.events:
            event_type = event.get("type")
            event_types[event_type] = event_types.get(event_type, 0) + 1
            
            data = event.get("data", {})
            total_duration += data.get("duration_ms", 0)
            total_tokens += data.get("tokens_used", 0)
        
        return {
            "total_events": total_events,
            "event_types": event_types,
            "total_duration_ms": total_duration,
            "total_tokens": total_tokens,
            "average_duration_ms": round(total_duration / total_events, 2) if total_events > 0 else 0
        }


# Global instance
_observability_manager: Optional[ObservabilityManager] = None


def get_observability_manager() -> ObservabilityManager:
    """Get or create global observability manager"""
    global _observability_manager
    if _observability_manager is None:
        _observability_manager = ObservabilityManager()
    return _observability_manager
