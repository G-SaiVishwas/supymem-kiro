"""
Knowledge Service - Handles all knowledge entry CRUD operations with database and vector store sync.
"""
from typing import Optional, List, Dict, Any
from datetime import datetime
from sqlalchemy import select, update, delete, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession

from src.database.models import KnowledgeEntry, Decision, ContentCategory
from src.database.session import get_session
from src.vectors.embeddings import embedding_service
from src.vectors.qdrant_client import vector_store
from src.config.logging import get_logger

logger = get_logger(__name__)


class KnowledgeService:
    """Service for managing knowledge entries in both PostgreSQL and Qdrant."""
    
    # ========================================================================
    # KNOWLEDGE ENTRIES - CRUD
    # ========================================================================
    
    @staticmethod
    async def list_entries(
        team_id: str,
        category: Optional[str] = None,
        source: Optional[str] = None,
        search_query: Optional[str] = None,
        limit: int = 50,
        offset: int = 0
    ) -> List[Dict[str, Any]]:
        """List knowledge entries with filtering."""
        async for session in get_session():
            query = select(KnowledgeEntry).where(
                and_(
                    KnowledgeEntry.team_id == team_id,
                    KnowledgeEntry.is_deleted == False
                )
            )
            
            if category:
                query = query.where(KnowledgeEntry.category == category)
            if source:
                query = query.where(KnowledgeEntry.source == source)
            
            query = query.order_by(KnowledgeEntry.created_at.desc())
            query = query.limit(limit).offset(offset)
            
            result = await session.execute(query)
            entries = result.scalars().all()
            
            return [KnowledgeService._entry_to_dict(e) for e in entries]
    
    @staticmethod
    async def get_entry(entry_id: str) -> Optional[Dict[str, Any]]:
        """Get a single knowledge entry by ID."""
        async for session in get_session():
            result = await session.execute(
                select(KnowledgeEntry).where(KnowledgeEntry.id == entry_id)
            )
            entry = result.scalar_one_or_none()
            if entry:
                return KnowledgeService._entry_to_dict(entry)
            return None
    
    @staticmethod
    async def create_entry(
        team_id: str,
        content: str,
        source: str,
        user_id: Optional[str] = None,
        category: str = "other",
        source_url: Optional[str] = None,
        metadata: Optional[Dict] = None,
        tags: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """Create a new knowledge entry with vector embedding."""
        async for session in get_session():
            # Generate embedding
            embeddings = await embedding_service.embed(content)
            
            # Create database entry
            entry = KnowledgeEntry(
                content=content,
                source=source,
                source_url=source_url,
                team_id=team_id,
                user_id=user_id,
                category=category,
                embedding=embeddings[0] if embeddings else None,
                extra_metadata=metadata or {},
                tags=tags or []
            )
            
            session.add(entry)
            await session.commit()
            await session.refresh(entry)
            
            # Also store in Qdrant for fast similarity search
            try:
                await vector_store.insert(
                    vectors=embeddings,
                    payloads=[{
                        "id": entry.id,
                        "content": content,
                        "source": source,
                        "team_id": team_id,
                        "category": category,
                        "created_at": entry.created_at.isoformat()
                    }]
                )
            except Exception as e:
                logger.warning(f"Failed to sync to Qdrant: {e}")
            
            logger.info(f"Created knowledge entry {entry.id}")
            return KnowledgeService._entry_to_dict(entry)
    
    @staticmethod
    async def update_entry(
        entry_id: str,
        content: Optional[str] = None,
        category: Optional[str] = None,
        tags: Optional[List[str]] = None,
        metadata: Optional[Dict] = None
    ) -> Optional[Dict[str, Any]]:
        """Update an existing knowledge entry."""
        async for session in get_session():
            result = await session.execute(
                select(KnowledgeEntry).where(KnowledgeEntry.id == entry_id)
            )
            entry = result.scalar_one_or_none()
            
            if not entry:
                return None
            
            # Update fields
            if content is not None:
                entry.content = content
                # Regenerate embedding
                embeddings = await embedding_service.embed(content)
                entry.embedding = embeddings[0] if embeddings else None
            
            if category is not None:
                entry.category = category
            if tags is not None:
                entry.tags = tags
            if metadata is not None:
                entry.extra_metadata = {**entry.extra_metadata, **metadata}
            
            entry.updated_at = datetime.utcnow()
            
            await session.commit()
            await session.refresh(entry)
            
            logger.info(f"Updated knowledge entry {entry_id}")
            return KnowledgeService._entry_to_dict(entry)
    
    @staticmethod
    async def delete_entry(entry_id: str, hard_delete: bool = False) -> bool:
        """Delete a knowledge entry (soft delete by default)."""
        async for session in get_session():
            if hard_delete:
                result = await session.execute(
                    delete(KnowledgeEntry).where(KnowledgeEntry.id == entry_id)
                )
            else:
                result = await session.execute(
                    update(KnowledgeEntry)
                    .where(KnowledgeEntry.id == entry_id)
                    .values(is_deleted=True, updated_at=datetime.utcnow())
                )
            
            await session.commit()
            logger.info(f"Deleted knowledge entry {entry_id}")
            return result.rowcount > 0
    
    # ========================================================================
    # SEARCH & QUERY
    # ========================================================================
    
    @staticmethod
    async def semantic_search(
        query: str,
        team_id: str,
        limit: int = 10,
        category: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Perform semantic search using vector similarity."""
        try:
            embeddings = await embedding_service.embed(query)
            
            filters = {"team_id": team_id}
            if category:
                filters["category"] = category
            
            results = await vector_store.search(
                query_vector=embeddings[0],
                filters=filters,
                limit=limit
            )
            
            return [
                {
                    "id": r.get("payload", {}).get("id"),
                    "content": r.get("payload", {}).get("content"),
                    "source": r.get("payload", {}).get("source"),
                    "score": r.get("score", 0),
                    "category": r.get("payload", {}).get("category")
                }
                for r in results
            ]
        except Exception as e:
            logger.error(f"Semantic search failed: {e}")
            return []
    
    @staticmethod
    async def get_stats(team_id: str) -> Dict[str, Any]:
        """Get statistics about knowledge entries."""
        async for session in get_session():
            from sqlalchemy import func
            
            # Total count
            total_result = await session.execute(
                select(func.count(KnowledgeEntry.id)).where(
                    and_(
                        KnowledgeEntry.team_id == team_id,
                        KnowledgeEntry.is_deleted == False
                    )
                )
            )
            total = total_result.scalar() or 0
            
            # Count by category
            category_result = await session.execute(
                select(
                    KnowledgeEntry.category,
                    func.count(KnowledgeEntry.id)
                ).where(
                    and_(
                        KnowledgeEntry.team_id == team_id,
                        KnowledgeEntry.is_deleted == False
                    )
                ).group_by(KnowledgeEntry.category)
            )
            by_category = {row[0]: row[1] for row in category_result.all()}
            
            # Count by source
            source_result = await session.execute(
                select(
                    KnowledgeEntry.source,
                    func.count(KnowledgeEntry.id)
                ).where(
                    and_(
                        KnowledgeEntry.team_id == team_id,
                        KnowledgeEntry.is_deleted == False
                    )
                ).group_by(KnowledgeEntry.source)
            )
            by_source = {row[0]: row[1] for row in source_result.all()}
            
            return {
                "total": total,
                "by_category": by_category,
                "by_source": by_source
            }
    
    # ========================================================================
    # HELPERS
    # ========================================================================
    
    @staticmethod
    def _entry_to_dict(entry: KnowledgeEntry) -> Dict[str, Any]:
        """Convert a KnowledgeEntry to a dictionary."""
        return {
            "id": entry.id,
            "content": entry.content,
            "source": entry.source,
            "source_id": entry.source_id,
            "source_url": entry.source_url,
            "team_id": entry.team_id,
            "user_id": entry.user_id,
            "category": entry.category,
            "subcategory": entry.subcategory,
            "importance_score": entry.importance_score,
            "is_actionable": entry.is_actionable,
            "extracted_entities": entry.extracted_entities,
            "tags": entry.tags,
            "metadata": entry.extra_metadata,
            "created_at": entry.created_at.isoformat() if entry.created_at else None,
            "updated_at": entry.updated_at.isoformat() if entry.updated_at else None
        }

