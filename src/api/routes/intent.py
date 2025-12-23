"""
Intent & Constraints API Routes

Endpoints for analyzing file intent, constraints, and change impact.
These are the core APIs for the VS Code extension's AI Control Plane features.
"""

from typing import Optional, List
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from datetime import datetime
import uuid

from src.services.debate import challenge_service
from src.services.impact import impact_analyzer
from src.vectors.embeddings import embedding_service
from src.vectors.qdrant_client import vector_store
from src.llm.client import llm_client
from src.config.logging import get_logger

logger = get_logger(__name__)
router = APIRouter()


# ============================================================================
# REQUEST/RESPONSE MODELS
# ============================================================================

class Constraint(BaseModel):
    id: str
    type: str  # security, performance, cost, reliability
    description: str
    severity: str  # critical, high, medium, low
    threshold: Optional[dict] = None
    approved_by: Optional[str] = None
    approved_at: Optional[str] = None


class RecentChange(BaseModel):
    date: str
    description: str
    author: str
    decision_id: Optional[str] = None


class Expert(BaseModel):
    username: str
    ownership_score: float
    last_active: Optional[str] = None


class DecisionSummary(BaseModel):
    id: str
    title: str
    summary: Optional[str] = None
    category: Optional[str] = None
    importance: Optional[str] = None
    decided_by: Optional[str] = None
    created_at: str


class IntentAnalyzeRequest(BaseModel):
    file_path: str
    team_id: str = Field(default="default")


class IntentData(BaseModel):
    file_path: str
    purpose: str
    context: str
    constraints: List[Constraint]
    open_questions: List[str]
    recent_changes: List[RecentChange]
    experts: List[Expert]
    related_decisions: List[DecisionSummary]


class WhyExistsRequest(BaseModel):
    file_path: str
    selection: Optional[str] = None
    team_id: str = Field(default="default")


class WhyExistsResult(BaseModel):
    file_path: str
    purpose: str
    created_by: Optional[str] = None
    created_at: Optional[str] = None
    related_decisions: List[DecisionSummary]
    dependencies: List[str]
    dependents: List[str]
    knowledge_sources: List[dict]


class WhatBreaksRequest(BaseModel):
    file_path: str
    team_id: str = Field(default="default")


class DependentInfo(BaseModel):
    file: str
    usage_type: str
    importance: str


class WhatBreaksResult(BaseModel):
    file_path: str
    risk_level: str  # low, medium, high, critical
    dependents: List[DependentInfo]
    affected_tests: List[str]
    affected_decisions: List[DecisionSummary]
    impact_summary: str
    recommendations: List[str]


class ChangeAnalyzeRequest(BaseModel):
    files: List[str]
    diff: Optional[str] = None
    team_id: str = Field(default="default")
    user_id: str = Field(default="anonymous")


class ConflictItem(BaseModel):
    decision_id: str
    decision_title: str
    conflict_type: str
    description: str
    severity: str  # warning, error, info
    approved_by: Optional[str] = None
    approved_at: Optional[str] = None


class ChangeAnalysis(BaseModel):
    has_conflicts: bool
    conflicts: List[ConflictItem]
    affected_decisions: List[DecisionSummary]
    affected_users: List[str]
    risk_level: str  # low, medium, high, critical
    summary: str
    recommendations: List[str]


# ============================================================================
# INTENT ANALYSIS ENDPOINT
# ============================================================================

@router.post("/intent/analyze", response_model=IntentData)
async def analyze_intent(request: IntentAnalyzeRequest):
    """
    Analyze the intent and context of a file.
    
    Returns:
    - Purpose of the file
    - Active constraints
    - Open questions
    - Recent changes
    - Experts (file owners)
    - Related decisions
    """
    try:
        file_path = request.file_path
        team_id = request.team_id
        file_name = file_path.split("/")[-1].split("\\")[-1]
        
        # Get related decisions
        decisions = await challenge_service.get_decision_history(
            team_id=team_id,
            file_path=file_path,
            limit=5
        )
        
        # Generate purpose using LLM
        purpose = await _generate_file_purpose(file_path, file_name)
        
        # Get constraints (mock for now, can be extended)
        constraints = await _get_file_constraints(file_path, team_id)
        
        # Get file experts from ownership tracking
        experts = await _get_file_experts(file_path, team_id)
        
        # Get recent changes
        recent_changes = await _get_recent_changes(file_path, team_id)
        
        return IntentData(
            file_path=file_path,
            purpose=purpose,
            context=f"Part of the {team_id} team codebase",
            constraints=constraints,
            open_questions=[
                "Review for potential optimization",
                "Consider adding more tests"
            ],
            recent_changes=recent_changes,
            experts=experts,
            related_decisions=[
                DecisionSummary(
                    id=d["id"],
                    title=d["title"],
                    summary=d.get("summary"),
                    category=d.get("category"),
                    importance=d.get("importance"),
                    decided_by=d.get("decided_by"),
                    created_at=d.get("created_at", "")
                )
                for d in decisions
            ]
        )
        
    except Exception as e:
        logger.error("Intent analysis error", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/constraints/active", response_model=List[Constraint])
async def get_active_constraints(
    team_id: str = "default",
    scope: Optional[str] = None
):
    """
    Get active constraints for a team/scope.
    """
    try:
        # Return mock constraints for demo
        # In production, this would query the constraints table
        constraints = [
            Constraint(
                id="con-001",
                type="security",
                description="Sensitive data must be encrypted at rest",
                severity="critical",
                threshold={"encryption": "AES-256"},
                approved_by="security-team",
                approved_at="2024-09-01"
            ),
            Constraint(
                id="con-002",
                type="performance",
                description="API endpoints must respond within 100ms",
                severity="high",
                threshold={"max_latency_ms": 100},
                approved_by="platform-team",
                approved_at="2024-10-15"
            ),
            Constraint(
                id="con-003",
                type="cost",
                description="Limit external API calls per request",
                severity="medium",
                threshold={"max_external_calls": 3},
                approved_by="finance-team",
                approved_at="2024-08-20"
            )
        ]
        
        return constraints
        
    except Exception as e:
        logger.error("Get constraints error", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# WHY EXISTS / WHAT BREAKS ENDPOINTS
# ============================================================================

@router.post("/intent/why-exists", response_model=WhyExistsResult)
async def why_exists(request: WhyExistsRequest):
    """
    Explain why a file/code exists and its purpose.
    """
    try:
        file_path = request.file_path
        file_name = file_path.split("/")[-1].split("\\")[-1]
        
        # Generate purpose
        purpose = await _generate_file_purpose(file_path, file_name)
        
        # Get related decisions
        decisions = await challenge_service.get_decision_history(
            team_id=request.team_id,
            file_path=file_path,
            limit=3
        )
        
        # Search knowledge base for context
        knowledge_sources = []
        try:
            query = f"Why does {file_name} exist? What is its purpose?"
            embeddings = await embedding_service.embed(query)
            results = await vector_store.search(
                query_vector=embeddings[0],
                filters={"team_id": request.team_id},
                limit=3
            )
            knowledge_sources = [
                {
                    "content": r.get("payload", {}).get("content", "")[:200],
                    "source": r.get("payload", {}).get("source", "unknown"),
                    "score": r.get("score", 0)
                }
                for r in results
            ]
        except Exception:
            pass
        
        return WhyExistsResult(
            file_path=file_path,
            purpose=purpose,
            created_by="team",
            created_at="2024-01-01",
            related_decisions=[
                DecisionSummary(
                    id=d["id"],
                    title=d["title"],
                    summary=d.get("summary"),
                    category=d.get("category"),
                    importance=d.get("importance"),
                    decided_by=d.get("decided_by"),
                    created_at=d.get("created_at", "")
                )
                for d in decisions
            ],
            dependencies=["src/utils/helpers", "src/config"],
            dependents=["src/api/routes", "src/services"],
            knowledge_sources=knowledge_sources
        )
        
    except Exception as e:
        logger.error("Why exists error", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/intent/what-breaks", response_model=WhatBreaksResult)
async def what_breaks(request: WhatBreaksRequest):
    """
    Analyze what would break if a file is removed or significantly changed.
    """
    try:
        file_path = request.file_path
        file_name = file_path.split("/")[-1].split("\\")[-1]
        
        # Get related decisions
        decisions = await challenge_service.get_decision_history(
            team_id=request.team_id,
            file_path=file_path,
            limit=3
        )
        
        # Generate impact analysis
        impact_summary = await _generate_impact_summary(file_path, file_name)
        
        return WhatBreaksResult(
            file_path=file_path,
            risk_level="medium",
            dependents=[
                DependentInfo(file="src/api/routes/main.py", usage_type="import", importance="high"),
                DependentInfo(file="src/services/core.py", usage_type="import", importance="high"),
                DependentInfo(file="tests/test_module.py", usage_type="test", importance="medium")
            ],
            affected_tests=[
                "tests/unit/test_module.py",
                "tests/integration/test_api.py"
            ],
            affected_decisions=[
                DecisionSummary(
                    id=d["id"],
                    title=d["title"],
                    summary=d.get("summary"),
                    category=d.get("category"),
                    importance=d.get("importance"),
                    decided_by=d.get("decided_by"),
                    created_at=d.get("created_at", "")
                )
                for d in decisions
            ],
            impact_summary=impact_summary,
            recommendations=[
                "Create migration plan before removal",
                "Update dependent modules first",
                "Run full test suite after changes",
                "Notify team members working on dependent files"
            ]
        )
        
    except Exception as e:
        logger.error("What breaks error", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# CHANGE ANALYSIS ENDPOINT
# ============================================================================

@router.post("/changes/analyze", response_model=ChangeAnalysis)
async def analyze_changes(request: ChangeAnalyzeRequest):
    """
    Analyze proposed changes for conflicts with decisions and constraints.
    """
    try:
        files = request.files
        team_id = request.team_id
        
        conflicts: List[ConflictItem] = []
        affected_decisions: List[DecisionSummary] = []
        affected_users: List[str] = []
        
        # Check each file for related decisions
        for file_path in files:
            decisions = await challenge_service.get_decision_history(
                team_id=team_id,
                file_path=file_path,
                limit=3
            )
            
            for d in decisions:
                affected_decisions.append(DecisionSummary(
                    id=d["id"],
                    title=d["title"],
                    summary=d.get("summary"),
                    category=d.get("category"),
                    importance=d.get("importance"),
                    decided_by=d.get("decided_by"),
                    created_at=d.get("created_at", "")
                ))
        
        # Check for breaking changes in diff
        has_conflicts = False
        risk_level = "low"
        
        if request.diff:
            breaking_result = await _analyze_diff_for_conflicts(request.diff, team_id)
            if breaking_result.get("has_conflicts"):
                has_conflicts = True
                risk_level = breaking_result.get("risk_level", "medium")
                conflicts = breaking_result.get("conflicts", [])
        
        # Generate summary
        if has_conflicts:
            summary = f"Found {len(conflicts)} potential conflict(s) with existing decisions."
        else:
            summary = "No conflicts detected with existing decisions."
        
        return ChangeAnalysis(
            has_conflicts=has_conflicts,
            conflicts=conflicts,
            affected_decisions=affected_decisions,
            affected_users=affected_users,
            risk_level=risk_level,
            summary=summary,
            recommendations=[
                "Review affected decisions before merging",
                "Notify affected team members",
                "Update documentation if needed"
            ] if has_conflicts else ["Proceed with standard review"]
        )
        
    except Exception as e:
        logger.error("Change analysis error", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/changes/simulate", response_model=ChangeAnalysis)
async def simulate_changes(request: ChangeAnalyzeRequest):
    """
    Simulate the impact of proposed changes before applying them.
    """
    # For now, reuse the analyze endpoint
    return await analyze_changes(request)


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

async def _generate_file_purpose(file_path: str, file_name: str) -> str:
    """Generate a description of the file's purpose using LLM."""
    try:
        # Infer purpose from file name and path
        prompt = f"""Based on this file path, describe its likely purpose in 1-2 sentences:
File: {file_path}

Be specific and technical. Focus on what the file does, not generic descriptions."""

        response = await llm_client.complete(
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            max_tokens=150
        )
        return response.strip()
    except Exception:
        # Fallback to simple inference
        if "auth" in file_name.lower():
            return "Authentication and authorization handling"
        elif "api" in file_name.lower() or "route" in file_name.lower():
            return "API endpoint definitions and request handling"
        elif "test" in file_name.lower():
            return "Unit and integration tests"
        elif "config" in file_name.lower():
            return "Configuration and settings management"
        elif "model" in file_name.lower():
            return "Data models and database schema"
        elif "service" in file_name.lower():
            return "Business logic and service layer"
        else:
            return f"Core functionality for {file_name.replace('_', ' ').replace('.py', '').replace('.ts', '')}"


async def _get_file_constraints(file_path: str, team_id: str) -> List[Constraint]:
    """Get constraints relevant to this file."""
    constraints = []
    
    # Security constraints for auth files
    if "auth" in file_path.lower() or "security" in file_path.lower():
        constraints.append(Constraint(
            id=f"con-{uuid.uuid4().hex[:8]}",
            type="security",
            description="Token expiry must be less than 1 hour",
            severity="critical",
            threshold={"max_expiry_seconds": 3600},
            approved_by="security-team",
            approved_at=datetime.now().isoformat()
        ))
    
    # Performance constraints for API files
    if "api" in file_path.lower() or "route" in file_path.lower():
        constraints.append(Constraint(
            id=f"con-{uuid.uuid4().hex[:8]}",
            type="performance",
            description="Endpoints must respond within 100ms",
            severity="high",
            threshold={"max_latency_ms": 100},
            approved_by="platform-team",
            approved_at=datetime.now().isoformat()
        ))
    
    # Default constraints
    if not constraints:
        constraints.append(Constraint(
            id=f"con-{uuid.uuid4().hex[:8]}",
            type="reliability",
            description="Code must have test coverage",
            severity="medium",
            approved_by="engineering",
            approved_at=datetime.now().isoformat()
        ))
    
    return constraints


async def _get_file_experts(file_path: str, team_id: str) -> List[Expert]:
    """Get experts for this file based on ownership tracking."""
    # Mock data - in production, query FileOwnership table
    return [
        Expert(username="rahul", ownership_score=0.45, last_active=datetime.now().isoformat()),
        Expert(username="sarah", ownership_score=0.30, last_active=datetime.now().isoformat()),
        Expert(username="john", ownership_score=0.25, last_active=datetime.now().isoformat())
    ]


async def _get_recent_changes(file_path: str, team_id: str) -> List[RecentChange]:
    """Get recent changes for this file."""
    # Mock data - in production, query UserActivity table
    return [
        RecentChange(date="2024-12-20", description="Updated validation logic", author="rahul"),
        RecentChange(date="2024-12-15", description="Added error handling", author="sarah"),
        RecentChange(date="2024-12-10", description="Initial implementation", author="john")
    ]


async def _generate_impact_summary(file_path: str, file_name: str) -> str:
    """Generate an impact summary for removing/changing a file."""
    try:
        prompt = f"""Describe the potential impact of removing or significantly changing this file:
File: {file_path}

Be specific about:
1. What functionality would break
2. What other parts of the system depend on it
3. How critical it is

Keep response to 2-3 sentences."""

        response = await llm_client.complete(
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            max_tokens=200
        )
        return response.strip()
    except Exception:
        return f"Removing {file_name} would affect dependent modules and may break functionality. Consider creating a migration plan."


async def _analyze_diff_for_conflicts(diff: str, team_id: str) -> dict:
    """Analyze a diff for potential conflicts with decisions."""
    try:
        prompt = f"""Analyze this code diff for potential issues:

{diff[:2000]}

Check for:
1. Breaking changes
2. Security concerns
3. Performance issues
4. Style violations

Respond with JSON:
{{"has_conflicts": true/false, "risk_level": "low/medium/high", "issues": ["issue1", "issue2"]}}"""

        response = await llm_client.complete(
            messages=[{"role": "user", "content": prompt}],
            temperature=0.2,
            max_tokens=300
        )
        
        import json
        try:
            result = json.loads(response.strip())
            conflicts = []
            for issue in result.get("issues", []):
                conflicts.append(ConflictItem(
                    decision_id="auto-detected",
                    decision_title="Code Analysis",
                    conflict_type="potential_issue",
                    description=issue,
                    severity="warning"
                ))
            return {
                "has_conflicts": result.get("has_conflicts", False),
                "risk_level": result.get("risk_level", "low"),
                "conflicts": conflicts
            }
        except json.JSONDecodeError:
            return {"has_conflicts": False, "risk_level": "low", "conflicts": []}
            
    except Exception:
        return {"has_conflicts": False, "risk_level": "low", "conflicts": []}

