"""
Central Knowledge Service - Handles CRUD operations for the central knowledge database.
Manages curated, authoritative team knowledge created by admins and managers.
"""
from typing import Optional, List, Dict, Any
from datetime import datetime
from sqlalchemy import select, update, delete, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession

from src.database.models import CentralKnowledge, CentralKnowledgeStatus, CentralKnowledgeCategory, User
from src.database.session import get_session
from src.vectors.embeddings import embedding_service
from src.vectors.qdrant_client import vector_store
from src.config.logging import get_logger

logger = get_logger(__name__)


class CentralKnowledgeService:
    """Service for managing central knowledge entries."""
    
    COLLECTION_NAME = "central_knowledge"
    
    # ========================================================================
    # LIST & GET OPERATIONS
    # ========================================================================
    
    @staticmethod
    async def list_entries(
        organization_id: str,
        team_id: Optional[str] = None,
        category: Optional[str] = None,
        status: Optional[str] = None,
        search_query: Optional[str] = None,
        limit: int = 50,
        offset: int = 0
    ) -> List[Dict[str, Any]]:
        """List central knowledge entries with filtering."""
        async for session in get_session():
            query = select(CentralKnowledge).where(
                CentralKnowledge.organization_id == organization_id
            )
            
            # Filter by team (None means org-wide entries only)
            if team_id:
                query = query.where(
                    or_(
                        CentralKnowledge.team_id == team_id,
                        CentralKnowledge.team_id.is_(None)  # Include org-wide
                    )
                )
            
            if category:
                query = query.where(CentralKnowledge.category == category)
            
            if status:
                query = query.where(CentralKnowledge.status == status)
            
            query = query.order_by(CentralKnowledge.updated_at.desc())
            query = query.limit(limit).offset(offset)
            
            result = await session.execute(query)
            entries = result.scalars().all()
            
            return [await CentralKnowledgeService._entry_to_dict(e, session) for e in entries]
    
    @staticmethod
    async def get_entry(entry_id: str) -> Optional[Dict[str, Any]]:
        """Get a single central knowledge entry by ID."""
        async for session in get_session():
            result = await session.execute(
                select(CentralKnowledge).where(CentralKnowledge.id == entry_id)
            )
            entry = result.scalar_one_or_none()
            if entry:
                return await CentralKnowledgeService._entry_to_dict(entry, session)
            return None
    
    @staticmethod
    async def get_categories() -> List[Dict[str, str]]:
        """Get all available categories."""
        return [
            {"value": cat.value, "label": cat.value.replace("_", " ").title()}
            for cat in CentralKnowledgeCategory
        ]
    
    # ========================================================================
    # CREATE & UPDATE OPERATIONS
    # ========================================================================
    
    @staticmethod
    async def create_entry(
        organization_id: str,
        title: str,
        content: str,
        category: str,
        created_by: str,
        team_id: Optional[str] = None,
        summary: Optional[str] = None,
        tags: Optional[List[str]] = None,
        status: str = "draft"
    ) -> Dict[str, Any]:
        """Create a new central knowledge entry."""
        async for session in get_session():
            # Create database entry
            entry = CentralKnowledge(
                organization_id=organization_id,
                team_id=team_id,
                title=title,
                content=content,
                summary=summary,
                category=category,
                status=status,
                created_by=created_by,
                last_edited_by=created_by,
                tags=tags or [],
                related_documents=[],
                version=1
            )
            
            # Generate embedding if publishing
            if status == "published":
                try:
                    embeddings = await embedding_service.embed(f"{title}\n\n{content}")
                    entry.embedding = embeddings[0] if embeddings else None
                    entry.published_at = datetime.utcnow()
                except Exception as e:
                    logger.warning(f"Failed to generate embedding: {e}")
            
            session.add(entry)
            await session.commit()
            await session.refresh(entry)
            
            # Store in vector DB if published
            if status == "published" and entry.embedding:
                try:
                    await vector_store.insert(
                        vectors=[entry.embedding],
                        payloads=[{
                            "id": entry.id,
                            "title": title,
                            "content": content[:500],  # Store preview
                            "category": category,
                            "organization_id": organization_id,
                            "team_id": team_id,
                            "type": "central_knowledge"
                        }],
                        collection_name=CentralKnowledgeService.COLLECTION_NAME
                    )
                except Exception as e:
                    logger.warning(f"Failed to sync to vector store: {e}")
            
            logger.info(f"Created central knowledge entry {entry.id}")
            return await CentralKnowledgeService._entry_to_dict(entry, session)
    
    @staticmethod
    async def update_entry(
        entry_id: str,
        editor_id: str,
        title: Optional[str] = None,
        content: Optional[str] = None,
        summary: Optional[str] = None,
        category: Optional[str] = None,
        tags: Optional[List[str]] = None,
        team_id: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        """Update an existing central knowledge entry."""
        async for session in get_session():
            result = await session.execute(
                select(CentralKnowledge).where(CentralKnowledge.id == entry_id)
            )
            entry = result.scalar_one_or_none()
            
            if not entry:
                return None
            
            # Update fields
            if title is not None:
                entry.title = title
            if content is not None:
                entry.content = content
            if summary is not None:
                entry.summary = summary
            if category is not None:
                entry.category = category
            if tags is not None:
                entry.tags = tags
            if team_id is not None:
                entry.team_id = team_id if team_id else None
            
            entry.last_edited_by = editor_id
            entry.updated_at = datetime.utcnow()
            entry.version += 1
            
            # Regenerate embedding if published
            if entry.status == "published":
                try:
                    embeddings = await embedding_service.embed(f"{entry.title}\n\n{entry.content}")
                    entry.embedding = embeddings[0] if embeddings else None
                except Exception as e:
                    logger.warning(f"Failed to regenerate embedding: {e}")
            
            await session.commit()
            await session.refresh(entry)
            
            logger.info(f"Updated central knowledge entry {entry_id}")
            return await CentralKnowledgeService._entry_to_dict(entry, session)
    
    @staticmethod
    async def publish_entry(entry_id: str, editor_id: str) -> Optional[Dict[str, Any]]:
        """Publish a draft entry, making it visible and searchable."""
        async for session in get_session():
            result = await session.execute(
                select(CentralKnowledge).where(CentralKnowledge.id == entry_id)
            )
            entry = result.scalar_one_or_none()
            
            if not entry:
                return None
            
            # Generate embedding
            try:
                embeddings = await embedding_service.embed(f"{entry.title}\n\n{entry.content}")
                entry.embedding = embeddings[0] if embeddings else None
            except Exception as e:
                logger.warning(f"Failed to generate embedding: {e}")
            
            entry.status = "published"
            entry.published_at = datetime.utcnow()
            entry.last_edited_by = editor_id
            entry.updated_at = datetime.utcnow()
            
            await session.commit()
            await session.refresh(entry)
            
            # Store in vector DB
            if entry.embedding:
                try:
                    await vector_store.insert(
                        vectors=[entry.embedding],
                        payloads=[{
                            "id": entry.id,
                            "title": entry.title,
                            "content": entry.content[:500],
                            "category": entry.category,
                            "organization_id": entry.organization_id,
                            "team_id": entry.team_id,
                            "type": "central_knowledge"
                        }],
                        collection_name=CentralKnowledgeService.COLLECTION_NAME
                    )
                except Exception as e:
                    logger.warning(f"Failed to sync to vector store: {e}")
            
            logger.info(f"Published central knowledge entry {entry_id}")
            return await CentralKnowledgeService._entry_to_dict(entry, session)
    
    @staticmethod
    async def archive_entry(entry_id: str, editor_id: str) -> bool:
        """Archive a central knowledge entry."""
        async for session in get_session():
            result = await session.execute(
                update(CentralKnowledge)
                .where(CentralKnowledge.id == entry_id)
                .values(
                    status="archived",
                    last_edited_by=editor_id,
                    updated_at=datetime.utcnow()
                )
            )
            await session.commit()
            
            if result.rowcount > 0:
                logger.info(f"Archived central knowledge entry {entry_id}")
                return True
            return False
    
    @staticmethod
    async def delete_entry(entry_id: str) -> bool:
        """Permanently delete a central knowledge entry."""
        async for session in get_session():
            result = await session.execute(
                delete(CentralKnowledge).where(CentralKnowledge.id == entry_id)
            )
            await session.commit()
            
            if result.rowcount > 0:
                logger.info(f"Deleted central knowledge entry {entry_id}")
                return True
            return False
    
    # ========================================================================
    # SEARCH OPERATIONS
    # ========================================================================
    
    @staticmethod
    async def semantic_search(
        query: str,
        organization_id: str,
        team_id: Optional[str] = None,
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """Perform semantic search on published central knowledge."""
        try:
            embeddings = await embedding_service.embed(query)
            
            filters = {
                "organization_id": organization_id,
                "type": "central_knowledge"
            }
            if team_id:
                filters["team_id"] = team_id
            
            results = await vector_store.search(
                query_vector=embeddings[0],
                filters=filters,
                limit=limit,
                collection_name=CentralKnowledgeService.COLLECTION_NAME
            )
            
            return [
                {
                    "id": r.get("payload", {}).get("id"),
                    "title": r.get("payload", {}).get("title"),
                    "content": r.get("payload", {}).get("content"),
                    "category": r.get("payload", {}).get("category"),
                    "score": r.get("score", 0)
                }
                for r in results
            ]
        except Exception as e:
            logger.error(f"Semantic search failed: {e}")
            return []
    
    # ========================================================================
    # STATISTICS
    # ========================================================================
    
    @staticmethod
    async def get_stats(organization_id: str) -> Dict[str, Any]:
        """Get statistics about central knowledge entries."""
        async for session in get_session():
            from sqlalchemy import func
            
            # Total count by status
            status_result = await session.execute(
                select(
                    CentralKnowledge.status,
                    func.count(CentralKnowledge.id)
                ).where(
                    CentralKnowledge.organization_id == organization_id
                ).group_by(CentralKnowledge.status)
            )
            by_status = {row[0]: row[1] for row in status_result.all()}
            
            # Count by category
            category_result = await session.execute(
                select(
                    CentralKnowledge.category,
                    func.count(CentralKnowledge.id)
                ).where(
                    CentralKnowledge.organization_id == organization_id
                ).group_by(CentralKnowledge.category)
            )
            by_category = {row[0]: row[1] for row in category_result.all()}
            
            total = sum(by_status.values())
            
            return {
                "total": total,
                "by_status": by_status,
                "by_category": by_category,
                "published": by_status.get("published", 0),
                "drafts": by_status.get("draft", 0)
            }
    
    # ========================================================================
    # HELPERS
    # ========================================================================
    
    @staticmethod
    async def _entry_to_dict(entry: CentralKnowledge, session: AsyncSession) -> Dict[str, Any]:
        """Convert a CentralKnowledge entry to a dictionary."""
        # Get creator and editor names
        creator_name = None
        editor_name = None
        
        if entry.created_by:
            creator_result = await session.execute(
                select(User.name).where(User.id == entry.created_by)
            )
            creator_name = creator_result.scalar_one_or_none()
        
        if entry.last_edited_by:
            editor_result = await session.execute(
                select(User.name).where(User.id == entry.last_edited_by)
            )
            editor_name = editor_result.scalar_one_or_none()
        
        return {
            "id": entry.id,
            "organization_id": entry.organization_id,
            "team_id": entry.team_id,
            "title": entry.title,
            "content": entry.content,
            "summary": entry.summary,
            "category": entry.category,
            "status": entry.status,
            "version": entry.version,
            "tags": entry.tags or [],
            "related_documents": entry.related_documents or [],
            "created_by": entry.created_by,
            "created_by_name": creator_name,
            "last_edited_by": entry.last_edited_by,
            "last_edited_by_name": editor_name,
            "created_at": entry.created_at.isoformat() if entry.created_at else None,
            "updated_at": entry.updated_at.isoformat() if entry.updated_at else None,
            "published_at": entry.published_at.isoformat() if entry.published_at else None
        }

