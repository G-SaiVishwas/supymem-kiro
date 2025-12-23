"""
Decisions & Challenge API Routes

Endpoints for viewing decisions and challenging them.
"""

from typing import Optional, List, Any
from datetime import datetime
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select, desc

from src.services.debate import challenge_service
from src.config.logging import get_logger
from src.database.session import get_session
from src.database.models import GitHubEvent, Decision

logger = get_logger(__name__)
router = APIRouter()


# ============================================================================
# REQUEST/RESPONSE MODELS
# ============================================================================

class ChallengeRequest(BaseModel):
    question: str = Field(..., description="The question or challenge")
    team_id: str = Field(default="default")
    challenger_id: str = Field(default="anonymous")
    decision_id: Optional[str] = Field(None, description="Specific decision ID to challenge")


class RelatedDiscussion(BaseModel):
    id: Optional[str]
    content: str
    source: Optional[str]
    score: Optional[float]


class Alternative(BaseModel):
    option: str
    pros: Optional[List[str]] = []
    cons: Optional[List[str]] = []
    rejected_reason: Optional[str]


class DecisionInfo(BaseModel):
    id: str
    title: str
    summary: Optional[str]
    reasoning: Optional[str]
    decided_by: Optional[str]
    created_at: str
    source_type: Optional[str]
    source_url: Optional[str]
    category: Optional[str]
    importance: Optional[str]
    alternatives_considered: List[Alternative] = []


class ChallengeResponse(BaseModel):
    challenge_id: str
    decision_found: bool
    decision: Optional[DecisionInfo] = None
    original_reasoning: str
    related_discussions: List[RelatedDiscussion]
    ai_analysis: str
    alternatives_considered: List[Alternative] = []
    suggested_alternatives: List[str] = []
    confidence: float


class DecisionSummary(BaseModel):
    id: str
    title: str
    summary: Optional[str]
    category: Optional[str]
    importance: Optional[str]
    decided_by: Optional[str]
    created_at: str
    source_url: Optional[str]


# ============================================================================
# ENDPOINTS
# ============================================================================

@router.post("/challenge", response_model=ChallengeResponse)
async def challenge_decision(request: ChallengeRequest):
    """
    Challenge a decision or ask about past reasoning.
    
    Examples:
    - "Why did we decide to use Redis instead of Memcached?"
    - "What was the reasoning behind the API redesign?"
    - "Who decided to switch to TypeScript?"
    
    The system will:
    1. Find relevant decisions
    2. Retrieve related discussions
    3. Provide AI analysis with full context
    4. Suggest alternatives if applicable
    """
    try:
        result = await challenge_service.challenge(
            question=request.question,
            team_id=request.team_id,
            challenger_id=request.challenger_id,
            decision_id=request.decision_id
        )
        
        # Convert to response model
        decision_info = None
        if result.decision:
            decision_info = DecisionInfo(
                id=result.decision.get("id", ""),
                title=result.decision.get("title", ""),
                summary=result.decision.get("summary"),
                reasoning=result.decision.get("reasoning"),
                decided_by=result.decision.get("decided_by"),
                created_at=result.decision.get("created_at", ""),
                source_type=result.decision.get("source_type"),
                source_url=result.decision.get("source_url"),
                category=result.decision.get("category"),
                importance=result.decision.get("importance"),
                alternatives_considered=[
                    Alternative(**a) for a in result.decision.get("alternatives_considered", [])
                ]
            )
        
        return ChallengeResponse(
            challenge_id=result.challenge_id,
            decision_found=result.decision_found,
            decision=decision_info,
            original_reasoning=result.original_reasoning,
            related_discussions=[
                RelatedDiscussion(**r) for r in result.related_discussions
            ],
            ai_analysis=result.ai_analysis,
            alternatives_considered=[
                Alternative(**a) for a in result.alternatives_considered
            ],
            suggested_alternatives=result.suggested_alternatives,
            confidence=result.confidence
        )
        
    except Exception as e:
        logger.error("Challenge error", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/decisions", response_model=List[DecisionSummary])
async def list_decisions(
    team_id: str = "default",
    category: Optional[str] = None,
    file_path: Optional[str] = None,
    limit: int = 20
):
    """
    List decisions for a team.
    
    Can filter by:
    - category: architecture, process, tooling, feature, etc.
    - file_path: decisions affecting a specific file
    """
    try:
        decisions = await challenge_service.get_decision_history(
            team_id=team_id,
            file_path=file_path,
            category=category,
            limit=limit
        )
        
        return [DecisionSummary(**d) for d in decisions]
        
    except Exception as e:
        logger.error("List decisions error", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/decisions/{decision_id}", response_model=DecisionInfo)
async def get_decision(decision_id: str):
    """
    Get details of a specific decision.
    """
    try:
        decision = await challenge_service._get_decision_by_id(decision_id)
        
        if not decision:
            raise HTTPException(status_code=404, detail="Decision not found")
        
        return DecisionInfo(
            id=decision.get("id", ""),
            title=decision.get("title", ""),
            summary=decision.get("summary"),
            reasoning=decision.get("reasoning"),
            decided_by=decision.get("decided_by"),
            created_at=decision.get("created_at", ""),
            source_type=decision.get("source_type"),
            source_url=decision.get("source_url"),
            category=decision.get("category"),
            importance=decision.get("importance"),
            alternatives_considered=[
                Alternative(**a) for a in decision.get("alternatives_considered", [])
            ]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Get decision error", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))

