import httpx
from typing import List, Union
from src.config.settings import get_settings
from src.config.logging import get_logger

logger = get_logger(__name__)
settings = get_settings()


class EmbeddingService:
    def __init__(self, model: str = "nomic-embed-text"):
        self.model = model
        self.base_url = settings.ollama_base_url

    async def embed(self, texts: Union[str, List[str]]) -> List[List[float]]:
        if isinstance(texts, str):
            texts = [texts]

        embeddings = []
        async with httpx.AsyncClient(timeout=60) as client:
            for text in texts:
                response = await client.post(
                    f"{self.base_url}/api/embeddings",
                    json={"model": self.model, "prompt": text}
                )
                response.raise_for_status()
                embeddings.append(response.json()["embedding"])

        return embeddings


embedding_service = EmbeddingService()
