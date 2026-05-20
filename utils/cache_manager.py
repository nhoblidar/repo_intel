"""
Cache Manager - Distributed caching utility
Supports Redis and in-memory caching
"""
import os
import json
from typing import Any, Optional
from datetime import timedelta
from dotenv import load_dotenv

load_dotenv()


class CacheManager:
    \"\"\"Unified cache manager supporting multiple backends\"\"\"
    
    def __init__(self):
        self.use_redis = os.getenv("REDIS_URL") is not None
        self.redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
        self.redis_client = None
        self.in_memory_cache = {}  # Fallback in-memory cache
    
    
    async def initialize(self):
        \"\"\"Initialize cache connection\"\"\"
        if self.use_redis:
            try:
                import aioredis
                self.redis_client = await aioredis.create_redis_pool(self.redis_url)
                print("✓ Redis cache initialized")
            except Exception as e:
                print(f"⚠ Redis connection failed: {e}, using in-memory cache")
                self.use_redis = False
    
    
    async def get(self, key: str) -> Optional[Any]:
        \"\"\"Retrieve value from cache\"\"\"
        try:
            if self.use_redis and self.redis_client:
                value = await self.redis_client.get(key)
                return value.decode() if value else None
            else:
                return self.in_memory_cache.get(key)
        except Exception as e:
            print(f"Cache get error: {e}")
            return None
    
    
    async def set(
        self,
        key: str,
        value: Any,
        ttl: Optional[int] = None
    ) -> bool:
        \"\"\"Store value in cache\"\"\"
        try:
            # Convert to string if needed
            if not isinstance(value, str):
                value = json.dumps(value)
            
            if self.use_redis and self.redis_client:
                if ttl:
                    await self.redis_client.setex(key, ttl, value)
                else:
                    await self.redis_client.set(key, value)
            else:
                self.in_memory_cache[key] = value
            
            return True
        except Exception as e:
            print(f"Cache set error: {e}")
            return False
    
    
    async def delete(self, key: str) -> bool:
        \"\"\"Delete value from cache\"\"\"
        try:
            if self.use_redis and self.redis_client:
                await self.redis_client.delete(key)
            elif key in self.in_memory_cache:
                del self.in_memory_cache[key]
            
            return True
        except Exception as e:
            print(f"Cache delete error: {e}")
            return False
    
    
    async def clear(self, pattern: Optional[str] = None) -> bool:
        \"\"\"Clear cache entries\"\"\"
        try:
            if self.use_redis and self.redis_client:
                if pattern:
                    keys = await self.redis_client.keys(pattern)
                    if keys:
                        await self.redis_client.delete(*keys)
                else:
                    await self.redis_client.flushdb()
            else:
                if pattern:
                    # Simple pattern matching for in-memory
                    to_delete = [k for k in self.in_memory_cache if pattern in k]
                    for k in to_delete:
                        del self.in_memory_cache[k]
                else:
                    self.in_memory_cache.clear()
            
            return True
        except Exception as e:
            print(f"Cache clear error: {e}")
            return False
    
    
    async def get_stats(self) -> dict:
        \"\"\"Get cache statistics\"\"\"
        try:
            if self.use_redis and self.redis_client:
                info = await self.redis_client.info()
                return {
                    "backend": "redis",
                    "connected": True,
                    "keys": info.get("db0", {}).get("keys", 0),
                    "memory_mb": round(info.get("used_memory", 0) / (1024*1024), 2)
                }
            else:
                return {
                    "backend": "in-memory",
                    "connected": True,
                    "keys": len(self.in_memory_cache),
                    "memory_mb": 0
                }
        except Exception as e:
            return {"error": str(e)}
    
    
    async def close(self):
        \"\"\"Close cache connection\"\"\"
        try:
            if self.use_redis and self.redis_client:
                self.redis_client.close()
                await self.redis_client.wait_closed()
                print("✓ Redis cache closed")
        except Exception as e:
            print(f"Cache close error: {e}")


class CacheDecorator:
    \"\"\"Decorator for caching async function results\"\"\"
    
    def __init__(self, ttl: int = 3600):
        self.ttl = ttl
        self.cache_manager = CacheManager()
    
    
    def __call__(self, func):
        async def wrapper(*args, **kwargs):
            # Create cache key from function name and arguments
            key = f"{func.__name__}:{args}:{kwargs}"
            
            # Try to get from cache
            cached = await self.cache_manager.get(key)
            if cached is not None:
                return json.loads(cached) if isinstance(cached, str) else cached
            
            # Execute function
            result = await func(*args, **kwargs)
            
            # Store in cache
            await self.cache_manager.set(key, result, self.ttl)
            
            return result
        
        return wrapper


# Global cache manager instance
_cache_manager: Optional[CacheManager] = None


async def get_cache_manager() -> CacheManager:
    \"\"\"Get or create global cache manager instance\"\"\"
    global _cache_manager
    
    if _cache_manager is None:
        _cache_manager = CacheManager()
        await _cache_manager.initialize()
    
    return _cache_manager
