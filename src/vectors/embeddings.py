import httpx
from typing import List, Union
from openai import AsyncOpenAI
from src.config.settings import get_settings
from src.config.logging import get_logger

logger = get_logger(__name__)
settings = get_settings()


class EmbeddingService:
    def __init__(self):
        self.openai_client = None
        self.ollama_base_url = settings.ollama_base_url
        self.ollama_model = "nomic-embed-text"
        
        # Use OpenAI if API key is available
        if settings.openai_api_key:
            self.openai_client = AsyncOpenAI(api_key=settings.openai_api_key)
            self.openai_model = "text-embedding-3-small"  # 1536 dimensions, cost-effective
            logger.info("Using OpenAI for embeddings")
        else:
            logger.info("Using Ollama for embeddings")

    async def embed(self, texts: Union[str, List[str]]) -> List[List[float]]:
        if isinstance(texts, str):
            texts = [texts]

        # Use OpenAI if available
        if self.openai_client:
            return await self._embed_openai(texts)
        else:
            return await self._embed_ollama(texts)

    async def _embed_openai(self, texts: List[str]) -> List[List[float]]:
        """Generate embeddings using OpenAI."""
        try:
            response = await self.openai_client.embeddings.create(
                model=self.openai_model,
                input=texts,
                dimensions=768  # Match Qdrant/PostgreSQL vector size
            )
            embeddings = [item.embedding for item in response.data]
            logger.debug("Generated OpenAI embeddings", count=len(embeddings))
            return embeddings
        except Exception as e:
            logger.error("OpenAI embedding error, falling back to Ollama", error=str(e))
            return await self._embed_ollama(texts)

    async def _embed_ollama(self, texts: List[str]) -> List[List[float]]:
        """Generate embeddings using Ollama."""
        embeddings = []
        async with httpx.AsyncClient(timeout=60) as client:
            for text in texts:
                try:
                    response = await client.post(
                        f"{self.ollama_base_url}/api/embeddings",
                        json={"model": self.ollama_model, "prompt": text}
                    )
                    response.raise_for_status()
                    embeddings.append(response.json()["embedding"])
                except Exception as e:
                    logger.error("Ollama embedding error", error=str(e))
                    raise

        return embeddings


embedding_service = EmbeddingService()
