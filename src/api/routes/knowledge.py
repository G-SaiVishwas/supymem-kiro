from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from src.agents.knowledge_agent import query_agent
from src.vectors.embeddings import embedding_service
from src.vectors.qdrant_client import vector_store

router = APIRouter()


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


@router.post("/query", response_model=QueryResponse)
async def query_knowledge(request: QueryRequest):
    """Query the knowledge base using the AI agent."""
    try:
        response = await query_agent(
            message=request.query,
            user_id=request.user_id,
            team_id=request.team_id
        )
        return QueryResponse(response=response)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/store")
async def store_knowledge(request: StoreRequest):
    """Store new knowledge in the knowledge base."""
    try:
        embeddings = await embedding_service.embed(request.content)
        await vector_store.insert(
            vectors=embeddings,
            payloads=[{
                "content": request.content,
                "source": request.source,
                "team_id": request.team_id,
                "metadata": request.metadata or {}
            }]
        )
        return {"status": "stored"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/search")
async def search_knowledge(request: QueryRequest):
    """Search the knowledge base without AI generation."""
    try:
        embeddings = await embedding_service.embed(request.query)
        results = await vector_store.search(
            query_vector=embeddings[0],
            filters={"team_id": request.team_id} if request.team_id != "default" else None,
            limit=10
        )
        return {"results": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
