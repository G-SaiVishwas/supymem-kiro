"""
Mock Vector Store for Unit Tests

Provides in-memory vector storage without requiring Qdrant.
"""

from typing import List, Dict, Any, Optional
import uuid
import math


class MockVectorStore:
    """Mock vector store using in-memory storage."""
    
    def __init__(self, collection_name: str = "test_collection"):
        self.collection_name = collection_name
        self._vectors = {}  # id -> {vector, payload}
        self._initialized = False
    
    async def initialize(self):
        """Mock initialization."""
        self._initialized = True
    
    async def insert(
        self,
        vectors: List[List[float]],
        payloads: List[Dict[str, Any]],
        ids: Optional[List[str]] = None
    ) -> List[str]:
        """Insert vectors with payloads."""
        if ids is None:
            ids = [str(uuid.uuid4()) for _ in vectors]
        
        for i, (vec, payload) in enumerate(zip(vectors, payloads)):
            self._vectors[ids[i]] = {
                "vector": vec,
                "payload": payload
            }
        
        return ids
    
    async def search(
        self,
        query_vector: List[float],
        limit: int = 10,
        filter_conditions: Optional[Dict[str, Any]] = None,
        score_threshold: float = 0.0
    ) -> List[Dict[str, Any]]:
        """Search for similar vectors."""
        results = []
        
        for vec_id, data in self._vectors.items():
            # Calculate cosine similarity
            score = self._cosine_similarity(query_vector, data["vector"])
            
            if score >= score_threshold:
                # Apply filters
                if filter_conditions:
                    if not self._matches_filter(data["payload"], filter_conditions):
                        continue
                
                results.append({
                    "id": vec_id,
                    "score": score,
                    "payload": data["payload"]
                })
        
        # Sort by score descending
        results.sort(key=lambda x: x["score"], reverse=True)
        return results[:limit]
    
    async def delete(self, ids: List[str]) -> int:
        """Delete vectors by IDs."""
        deleted = 0
        for vec_id in ids:
            if vec_id in self._vectors:
                del self._vectors[vec_id]
                deleted += 1
        return deleted
    
    async def get(self, ids: List[str]) -> List[Dict[str, Any]]:
        """Get vectors by IDs."""
        results = []
        for vec_id in ids:
            if vec_id in self._vectors:
                results.append({
                    "id": vec_id,
                    **self._vectors[vec_id]
                })
        return results
    
    async def count(self) -> int:
        """Get total vector count."""
        return len(self._vectors)
    
    def _cosine_similarity(self, vec1: List[float], vec2: List[float]) -> float:
        """Calculate cosine similarity between two vectors."""
        if len(vec1) != len(vec2):
            # Truncate to smaller length
            min_len = min(len(vec1), len(vec2))
            vec1 = vec1[:min_len]
            vec2 = vec2[:min_len]
        
        dot_product = sum(a * b for a, b in zip(vec1, vec2))
        norm1 = math.sqrt(sum(a * a for a in vec1))
        norm2 = math.sqrt(sum(b * b for b in vec2))
        
        if norm1 == 0 or norm2 == 0:
            return 0.0
        
        return dot_product / (norm1 * norm2)
    
    def _matches_filter(self, payload: Dict[str, Any], conditions: Dict[str, Any]) -> bool:
        """Check if payload matches filter conditions."""
        for key, value in conditions.items():
            if key not in payload:
                return False
            if payload[key] != value:
                return False
        return True
    
    def clear(self):
        """Clear all vectors."""
        self._vectors = {}


# Singleton instance
mock_vector_store = MockVectorStore()


def get_mock_vector_store(collection_name: str = "test_collection") -> MockVectorStore:
    """Get a mock vector store instance."""
    return MockVectorStore(collection_name)


def reset_mock_vector_store():
    """Reset the mock vector store."""
    mock_vector_store.clear()

