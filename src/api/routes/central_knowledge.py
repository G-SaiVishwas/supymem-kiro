"""
Central Knowledge API Routes - Manage curated team knowledge.
Only admins and managers can create/edit entries.
"""
from fastapi import APIRouter, HTTPException, Query, Depends
from pydantic import BaseModel
from typing import Optional, List, Dict, Any

from src.services.central_knowledge import CentralKnowledgeService
from src.services.auth.dependencies import (
    get_current_user, 
    require_org_manager,
    require_org_admin,
    CurrentUser
)

router = APIRouter()


# ============================================================================
# REQUEST/RESPONSE MODELS
# ============================================================================

class CentralKnowledgeCreate(BaseModel):
    title: str
    content: str
    category: str
    team_id: Optional[str] = None
    summary: Optional[str] = None
    tags: Optional[List[str]] = None
    status: Optional[str] = "draft"  # draft or published


class CentralKnowledgeUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    summary: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[List[str]] = None
    team_id: Optional[str] = None


class CentralKnowledgeResponse(BaseModel):
    id: str
    organization_id: str
    team_id: Optional[str]
    title: str
    content: str
    summary: Optional[str]
    category: str
    status: str
    version: int
    tags: List[str]
    related_documents: List[str]
    created_by: str
    created_by_name: Optional[str]
    last_edited_by: Optional[str]
    last_edited_by_name: Optional[str]
    created_at: Optional[str]
    updated_at: Optional[str]
    published_at: Optional[str]


# ============================================================================
# LIST & GET ENDPOINTS (accessible to all authenticated users)
# ============================================================================

@router.get("")
async def list_entries(
    category: Optional[str] = Query(None, description="Filter by category"),
    status: Optional[str] = Query(None, description="Filter by status (draft, published, archived)"),
    team_id: Optional[str] = Query(None, description="Filter by team ID"),
    limit: int = Query(50, le=100),
    offset: int = Query(0, ge=0),
    current_user: CurrentUser = Depends(get_current_user)
):
    """List central knowledge entries. All authenticated users can view published entries."""
    if not current_user.org_id:
        raise HTTPException(status_code=400, detail="No organization context")
    
    # Non-managers can only see published entries
    if not current_user.can_manage_members() and status != "published":
        status = "published"
    
    try:
        entries = await CentralKnowledgeService.list_entries(
            organization_id=current_user.org_id,
            team_id=team_id,
            category=category,
            status=status,
            limit=limit,
            offset=offset
        )
        return {"entries": entries, "count": len(entries)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/categories")
async def get_categories(
    current_user: CurrentUser = Depends(get_current_user)
):
    """Get available knowledge categories."""
    categories = await CentralKnowledgeService.get_categories()
    return {"categories": categories}


@router.get("/stats")
async def get_stats(
    current_user: CurrentUser = Depends(require_org_manager())
):
    """Get statistics about central knowledge entries. Manager+ only."""
    if not current_user.org_id:
        raise HTTPException(status_code=400, detail="No organization context")
    
    try:
        stats = await CentralKnowledgeService.get_stats(current_user.org_id)
        return stats
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{entry_id}")
async def get_entry(
    entry_id: str,
    current_user: CurrentUser = Depends(get_current_user)
):
    """Get a single central knowledge entry by ID."""
    entry = await CentralKnowledgeService.get_entry(entry_id)
    
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    
    # Check organization access
    if entry["organization_id"] != current_user.org_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Non-managers can only see published entries
    if not current_user.can_manage_members() and entry["status"] != "published":
        raise HTTPException(status_code=403, detail="Entry not published")
    
    return entry


# ============================================================================
# CREATE & UPDATE ENDPOINTS (manager+ only)
# ============================================================================

@router.post("", response_model=CentralKnowledgeResponse)
async def create_entry(
    data: CentralKnowledgeCreate,
    current_user: CurrentUser = Depends(require_org_manager())
):
    """Create a new central knowledge entry. Manager+ only."""
    if not current_user.org_id:
        raise HTTPException(status_code=400, detail="No organization context")
    
    try:
        entry = await CentralKnowledgeService.create_entry(
            organization_id=current_user.org_id,
            title=data.title,
            content=data.content,
            category=data.category,
            created_by=current_user.id,
            team_id=data.team_id,
            summary=data.summary,
            tags=data.tags,
            status=data.status or "draft"
        )
        return entry
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{entry_id}", response_model=CentralKnowledgeResponse)
async def update_entry(
    entry_id: str,
    data: CentralKnowledgeUpdate,
    current_user: CurrentUser = Depends(require_org_manager())
):
    """Update an existing central knowledge entry. Manager+ only."""
    # First check the entry exists and belongs to the org
    existing = await CentralKnowledgeService.get_entry(entry_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Entry not found")
    
    if existing["organization_id"] != current_user.org_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    try:
        entry = await CentralKnowledgeService.update_entry(
            entry_id=entry_id,
            editor_id=current_user.id,
            title=data.title,
            content=data.content,
            summary=data.summary,
            category=data.category,
            tags=data.tags,
            team_id=data.team_id
        )
        if not entry:
            raise HTTPException(status_code=404, detail="Entry not found")
        return entry
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{entry_id}/publish", response_model=CentralKnowledgeResponse)
async def publish_entry(
    entry_id: str,
    current_user: CurrentUser = Depends(require_org_manager())
):
    """Publish a draft entry. Manager+ only."""
    existing = await CentralKnowledgeService.get_entry(entry_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Entry not found")
    
    if existing["organization_id"] != current_user.org_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    if existing["status"] == "published":
        raise HTTPException(status_code=400, detail="Entry is already published")
    
    try:
        entry = await CentralKnowledgeService.publish_entry(
            entry_id=entry_id,
            editor_id=current_user.id
        )
        if not entry:
            raise HTTPException(status_code=404, detail="Entry not found")
        return entry
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{entry_id}/archive")
async def archive_entry(
    entry_id: str,
    current_user: CurrentUser = Depends(require_org_manager())
):
    """Archive a central knowledge entry. Manager+ only."""
    existing = await CentralKnowledgeService.get_entry(entry_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Entry not found")
    
    if existing["organization_id"] != current_user.org_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    try:
        success = await CentralKnowledgeService.archive_entry(
            entry_id=entry_id,
            editor_id=current_user.id
        )
        if not success:
            raise HTTPException(status_code=404, detail="Entry not found")
        return {"status": "archived", "id": entry_id}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{entry_id}")
async def delete_entry(
    entry_id: str,
    current_user: CurrentUser = Depends(require_org_admin())
):
    """Permanently delete a central knowledge entry. Admin+ only."""
    existing = await CentralKnowledgeService.get_entry(entry_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Entry not found")
    
    if existing["organization_id"] != current_user.org_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    try:
        success = await CentralKnowledgeService.delete_entry(entry_id)
        if not success:
            raise HTTPException(status_code=404, detail="Entry not found")
        return {"status": "deleted", "id": entry_id}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# SEARCH ENDPOINTS
# ============================================================================

@router.post("/search")
async def search_entries(
    query: str = Query(..., description="Search query"),
    team_id: Optional[str] = Query(None, description="Filter by team ID"),
    limit: int = Query(10, le=50),
    current_user: CurrentUser = Depends(get_current_user)
):
    """Semantic search across published central knowledge."""
    if not current_user.org_id:
        raise HTTPException(status_code=400, detail="No organization context")
    
    try:
        results = await CentralKnowledgeService.semantic_search(
            query=query,
            organization_id=current_user.org_id,
            team_id=team_id,
            limit=limit
        )
        return {"results": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

