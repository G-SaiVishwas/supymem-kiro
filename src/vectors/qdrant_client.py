import uuid
from typing import List, Dict, Any, Optional
from qdrant_client import QdrantClient
from qdrant_client.models import (
    Distance, VectorParams, PointStruct,
    Filter, FieldCondition, MatchValue,
    HnswConfigDiff
)
from src.config.settings import get_settings
from src.config.logging import get_logger

logger = get_logger(__name__)
settings = get_settings()


class VectorStore:
    def __init__(self):
        self.client = QdrantClient(
            url=settings.qdrant_url,
            api_key=settings.qdrant_api_key if settings.qdrant_api_key else None,
            prefer_grpc=True,
            timeout=60
        )
        self.collection_name = "supymem_knowledge"
        self.vector_size = 768  # nomic-embed-text dimension

    async def initialize(self):
        """Create collection if it doesn't exist."""
        if not self.client.collection_exists(self.collection_name):
            self.client.create_collection(
                collection_name=self.collection_name,
                vectors_config=VectorParams(
                    size=self.vector_size,
                    distance=Distance.COSINE,
                ),
                hnsw_config=HnswConfigDiff(
                    m=16,
                    ef_construct=128,
                ),
            )
            # Create payload indexes
            self.client.create_payload_index(
                collection_name=self.collection_name,
                field_name="source",
                field_schema="keyword"
            )
            self.client.create_payload_index(
                collection_name=self.collection_name,
                field_name="team_id",
                field_schema="keyword"
            )
            logger.info("Created Qdrant collection", collection=self.collection_name)

    async def insert(
        self,
        vectors: List[List[float]],
        payloads: List[Dict[str, Any]],
        ids: Optional[List[str]] = None
    ) -> bool:
        if ids is None:
            ids = [str(uuid.uuid4()) for _ in vectors]

        points = [
            PointStruct(id=id_, vector=vec, payload=payload)
            for id_, vec, payload in zip(ids, vectors, payloads)
        ]

        self.client.upsert(
            collection_name=self.collection_name,
            points=points,
            wait=True
        )
        logger.info("Inserted vectors", count=len(points))
        return True

    async def search(
        self,
        query_vector: List[float],
        limit: int = 10,
        filters: Optional[Dict[str, Any]] = None,
        score_threshold: float = 0.5
    ) -> List[Dict]:
        query_filter = None
        if filters:
            conditions = [
                FieldCondition(key=k, match=MatchValue(value=v))
                for k, v in filters.items()
            ]
            query_filter = Filter(must=conditions)

        results = self.client.query_points(
            collection_name=self.collection_name,
            query=query_vector,
            limit=limit,
            query_filter=query_filter,
            score_threshold=score_threshold,
            with_payload=True
        )

        return [
            {
                "id": hit.id,
                "score": hit.score,
                "payload": hit.payload
            }
            for hit in results.points
        ]


# Singleton instance
vector_store = VectorStore()
