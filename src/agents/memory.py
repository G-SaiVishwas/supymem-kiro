from mem0 import Memory
from src.config.settings import get_settings
from src.config.logging import get_logger

logger = get_logger(__name__)
settings = get_settings()

# Configure Mem0 with Qdrant and Ollama
MEM0_CONFIG = {
    "vector_store": {
        "provider": "qdrant",
        "config": {
            "collection_name": "supymem_user_memories",
            "url": settings.qdrant_url,
            "api_key": settings.qdrant_api_key if settings.qdrant_api_key else None,
            "embedding_model_dims": 768,
        }
    },
    "llm": {
        "provider": "ollama",
        "config": {
            "model": "llama3.2",
            "temperature": 0.1,
            "max_tokens": 4000,
            "ollama_base_url": settings.ollama_base_url,
        }
    },
    "embedder": {
        "provider": "ollama",
        "config": {
            "model": "nomic-embed-text",
            "ollama_base_url": settings.ollama_base_url,
        }
    },
    "version": "v1.1"
}


class MemoryManager:
    def __init__(self):
        self._memory = None

    @property
    def memory(self):
        if self._memory is None:
            self._memory = Memory.from_config(MEM0_CONFIG)
        return self._memory

    def add_memory(self, content: str, user_id: str, metadata: dict = None):
        """Add a memory for a specific user."""
        return self.memory.add(
            content,
            user_id=user_id,
            metadata=metadata or {}
        )

    def search_memories(self, query: str, user_id: str, limit: int = 5):
        """Search memories for a specific user."""
        results = self.memory.search(
            query=query,
            user_id=user_id,
            limit=limit
        )
        return results.get("results", [])

    def get_all_memories(self, user_id: str):
        """Get all memories for a user."""
        return self.memory.get_all(user_id=user_id)

    def delete_memory(self, memory_id: str):
        """Delete a specific memory."""
        return self.memory.delete(memory_id=memory_id)


memory_manager = MemoryManager()
