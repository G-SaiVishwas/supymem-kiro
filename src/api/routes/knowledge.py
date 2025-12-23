from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from src.agents.knowledge_agent import query_agent
from src.vectors.embeddings import embedding_service
from src.vectors.qdrant_client import vector_store
from src.services.knowledge import KnowledgeService

router = APIRouter()


# ============================================================================
# REQUEST/RESPONSE MODELS
# ============================================================================

class QueryRequest(BaseModel):
    query: str
    user_id: Optional[str] = "anonymous"
    team_id: Optional[str] = "default"


class QueryResponse(BaseModel):
    response: str
    sources: Optional[List[dict]] = None


class StoreRequest(BaseModel):
    content: str
    source: str
    team_id: str
    metadata: Optional[dict] = None


class KnowledgeEntryCreate(BaseModel):
    content: str
    source: str
    team_id: str
    user_id: Optional[str] = None
    category: Optional[str] = "other"
    source_url: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
    tags: Optional[List[str]] = None


class KnowledgeEntryUpdate(BaseModel):
    content: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[List[str]] = None
    metadata: Optional[Dict[str, Any]] = None


# ============================================================================
# AI QUERY ENDPOINTS
# ============================================================================

@router.post("/query", response_model=QueryResponse)
async def query_knowledge(request: QueryRequest):
    """Query the knowledge base using the AI agent."""
    try:
        response = await query_agent(
            message=request.query,
            user_id=request.user_id,
            team_id=request.team_id
        )
        
        # Also get related sources
        sources = await KnowledgeService.semantic_search(
            query=request.query,
            team_id=request.team_id,
            limit=5
        )
        
        return QueryResponse(response=response, sources=sources)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/search")
async def search_knowledge(request: QueryRequest):
    """Search the knowledge base without AI generation."""
    try:
        results = await KnowledgeService.semantic_search(
            query=request.query,
            team_id=request.team_id,
            limit=10
        )
        return {"results": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# KNOWLEDGE ENTRIES CRUD
# ============================================================================

@router.get("/knowledge/entries")
async def list_entries(
    team_id: str = Query(..., description="Team ID"),
    category: Optional[str] = Query(None, description="Filter by category"),
    source: Optional[str] = Query(None, description="Filter by source"),
    limit: int = Query(50, le=100),
    offset: int = Query(0, ge=0)
):
    """List knowledge entries with optional filtering."""
    try:
        entries = await KnowledgeService.list_entries(
            team_id=team_id,
            category=category,
            source=source,
            limit=limit,
            offset=offset
        )
        return {"entries": entries, "count": len(entries)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/knowledge/entries/{entry_id}")
async def get_entry(entry_id: str):
    """Get a single knowledge entry by ID."""
    entry = await KnowledgeService.get_entry(entry_id)
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    return entry


@router.post("/knowledge/entries")
async def create_entry(data: KnowledgeEntryCreate):
    """Create a new knowledge entry."""
    try:
        entry = await KnowledgeService.create_entry(
            team_id=data.team_id,
            content=data.content,
            source=data.source,
            user_id=data.user_id,
            category=data.category,
            source_url=data.source_url,
            metadata=data.metadata,
            tags=data.tags
        )
        return entry
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/knowledge/entries/{entry_id}")
async def update_entry(entry_id: str, data: KnowledgeEntryUpdate):
    """Update an existing knowledge entry."""
    try:
        entry = await KnowledgeService.update_entry(
            entry_id=entry_id,
            content=data.content,
            category=data.category,
            tags=data.tags,
            metadata=data.metadata
        )
        if not entry:
            raise HTTPException(status_code=404, detail="Entry not found")
        return entry
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/knowledge/entries/{entry_id}")
async def delete_entry(
    entry_id: str,
    hard_delete: bool = Query(False, description="Permanently delete")
):
    """Delete a knowledge entry."""
    try:
        success = await KnowledgeService.delete_entry(entry_id, hard_delete)
        if not success:
            raise HTTPException(status_code=404, detail="Entry not found")
        return {"status": "deleted", "id": entry_id}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/knowledge/stats")
async def get_stats(team_id: str = Query(..., description="Team ID")):
    """Get knowledge base statistics."""
    try:
        stats = await KnowledgeService.get_stats(team_id)
        return stats
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# LEGACY ENDPOINT (for backward compatibility)
# ============================================================================

@router.post("/store")
async def store_knowledge(request: StoreRequest):
    """Store new knowledge in the knowledge base (legacy endpoint)."""
    try:
        entry = await KnowledgeService.create_entry(
            team_id=request.team_id,
            content=request.content,
            source=request.source,
            metadata=request.metadata
        )
        return {"status": "stored", "id": entry["id"]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
