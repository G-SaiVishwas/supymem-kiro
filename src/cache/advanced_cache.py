"""
Advanced multi-level caching with Redis and in-memory support.
Provides cache warming, invalidation strategies, and TTL management.
"""
from typing import Any, Optional, Callable, TypeVar, ParamSpec
from functools import wraps
import json
import hashlib
from datetime import timedelta
import asyncio
from collections import OrderedDict

from src.cache.redis_client import cache as redis_client
from src.config.logging import get_logger

logger = get_logger(__name__)

T = TypeVar('T')
P = ParamSpec('P')


class LRUCache:
    """In-memory LRU cache for hot data."""
    
    def __init__(self, max_size: int = 1000):
        self.cache: OrderedDict = OrderedDict()
        self.max_size = max_size
        self.hits = 0
        self.misses = 0
    
    def get(self, key: str) -> Optional[Any]:
        if key in self.cache:
            self.cache.move_to_end(key)
            self.hits += 1
            return self.cache[key]
        self.misses += 1
        return None
    
    def set(self, key: str, value: Any) -> None:
        if key in self.cache:
            self.cache.move_to_end(key)
        self.cache[key] = value
        if len(self.cache) > self.max_size:
            self.cache.popitem(last=False)
    
    def delete(self, key: str) -> None:
        self.cache.pop(key, None)
    
    def clear(self) -> None:
        self.cache.clear()
        self.hits = 0
        self.misses = 0
    
    def stats(self) -> dict:
        total = self.hits + self.misses
        hit_rate = (self.hits / total * 100) if total > 0 else 0
        return {
            "size": len(self.cache),
            "max_size": self.max_size,
            "hits": self.hits,
            "misses": self.misses,
            "hit_rate": f"{hit_rate:.2f}%"
        }


class MultiLevelCache:
    """Multi-level cache with L1 (memory) and L2 (Redis)."""
    
    def __init__(self, namespace: str = "supymem"):
        self.namespace = namespace
        self.l1_cache = LRUCache(max_size=1000)
        self.redis = redis_client
    
    def _make_key(self, key: str) -> str:
        """Create namespaced cache key."""
        return f"{self.namespace}:{key}"
    
    async def get(self, key: str) -> Optional[Any]:
        """Get value from cache (L1 -> L2)."""
        cache_key = self._make_key(key)
        
        # Try L1 cache first
        value = self.l1_cache.get(cache_key)
        if value is not None:
            logger.debug("L1 cache hit", key=key)
            return value
        
        # Try L2 cache (Redis)
        try:
            value = await self.redis.get(cache_key)
            if value is not None:
                logger.debug("L2 cache hit", key=key)
                # Promote to L1
                self.l1_cache.set(cache_key, value)
                return value
        except Exception as e:
            logger.warning("Redis cache error", error=str(e))
        
        logger.debug("Cache miss", key=key)
        return None
    
    async def set(
        self,
        key: str,
        value: Any,
        ttl: Optional[int] = None,
        l1_only: bool = False
    ) -> None:
        """Set value in cache."""
        cache_key = self._make_key(key)
        
        # Always set in L1
        self.l1_cache.set(cache_key, value)
        
        # Set in L2 unless l1_only
        if not l1_only:
            try:
                await self.redis.set(cache_key, value, ex=ttl)
                logger.debug("Cached in L1 and L2", key=key, ttl=ttl)
            except Exception as e:
                logger.warning("Failed to cache in Redis", error=str(e))
        else:
            logger.debug("Cached in L1 only", key=key)
    
    async def delete(self, key: str) -> None:
        """Delete from all cache levels."""
        cache_key = self._make_key(key)
        self.l1_cache.delete(cache_key)
        try:
            await self.redis.delete(cache_key)
        except Exception as e:
            logger.warning("Failed to delete from Redis", error=str(e))
    
    async def delete_pattern(self, pattern: str) -> int:
        """Delete all keys matching pattern."""
        full_pattern = self._make_key(pattern)
        
        # Clear L1 cache (simple approach - clear all)
        self.l1_cache.clear()
        
        # Delete from Redis
        try:
            keys = await self.redis.keys(full_pattern)
            if keys:
                deleted = await self.redis.delete(*keys)
                logger.info("Deleted cache keys", pattern=pattern, count=deleted)
                return deleted
        except Exception as e:
            logger.warning("Failed to delete pattern from Redis", error=str(e))
        
        return 0
    
    async def clear(self) -> None:
        """Clear all cache levels."""
        self.l1_cache.clear()
        try:
            pattern = self._make_key("*")
            keys = await self.redis.keys(pattern)
            if keys:
                await self.redis.delete(*keys)
        except Exception as e:
            logger.warning("Failed to clear Redis cache", error=str(e))
    
    def stats(self) -> dict:
        """Get cache statistics."""
        return {
            "l1": self.l1_cache.stats(),
            "namespace": self.namespace
        }


# Global cache instance
cache = MultiLevelCache()


def cache_key_builder(*args, **kwargs) -> str:
    """Build cache key from function arguments."""
    key_parts = [str(arg) for arg in args]
    key_parts.extend(f"{k}={v}" for k, v in sorted(kwargs.items()))
    key_str = ":".join(key_parts)
    return hashlib.md5(key_str.encode()).hexdigest()


def cached(
    ttl: int = 300,
    key_prefix: Optional[str] = None,
    key_builder: Optional[Callable] = None
):
    """
    Decorator for caching function results.
    
    Args:
        ttl: Time to live in seconds
        key_prefix: Prefix for cache key
        key_builder: Custom function to build cache key
    """
    def decorator(func: Callable[P, T]) -> Callable[P, T]:
        @wraps(func)
        async def wrapper(*args: P.args, **kwargs: P.kwargs) -> T:
            # Build cache key
            if key_builder:
                cache_key = key_builder(*args, **kwargs)
            else:
                cache_key = cache_key_builder(*args, **kwargs)
            
            if key_prefix:
                cache_key = f"{key_prefix}:{cache_key}"
            
            # Try to get from cache
            cached_value = await cache.get(cache_key)
            if cached_value is not None:
                return cached_value
            
            # Execute function
            result = await func(*args, **kwargs)
            
            # Cache result
            await cache.set(cache_key, result, ttl=ttl)
            
            return result
        
        return wrapper
    return decorator


async def warm_cache(warmers: list[Callable]) -> None:
    """
    Warm cache on startup with frequently accessed data.
    
    Args:
        warmers: List of async functions that populate cache
    """
    logger.info("Starting cache warming", count=len(warmers))
    
    results = await asyncio.gather(*[warmer() for warmer in warmers], return_exceptions=True)
    
    success_count = sum(1 for r in results if not isinstance(r, Exception))
    logger.info("Cache warming completed", success=success_count, total=len(warmers))


# Cache invalidation strategies
class CacheInvalidation:
    """Cache invalidation utilities."""
    
    @staticmethod
    async def invalidate_user(user_id: str) -> None:
        """Invalidate all cache entries for a user."""
        await cache.delete_pattern(f"user:{user_id}:*")
    
    @staticmethod
    async def invalidate_team(team_id: str) -> None:
        """Invalidate all cache entries for a team."""
        await cache.delete_pattern(f"team:{team_id}:*")
    
    @staticmethod
    async def invalidate_knowledge(entry_id: str) -> None:
        """Invalidate knowledge entry and related searches."""
        await cache.delete(f"knowledge:{entry_id}")
        await cache.delete_pattern("search:*")
    
    @staticmethod
    async def invalidate_analytics(team_id: str) -> None:
        """Invalidate analytics cache for a team."""
        await cache.delete_pattern(f"analytics:{team_id}:*")
