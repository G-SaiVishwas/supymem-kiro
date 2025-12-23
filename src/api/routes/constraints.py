"""
Constraints API Routes

Endpoints for managing constraints (red lines, locks, and rules).
"""

from typing import Optional, List, Dict, Any
from datetime import datetime
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from src.config.logging import get_logger

logger = get_logger(__name__)
router = APIRouter()


# ============================================================================
# IN-MEMORY STORE (Replace with database in production)
# ============================================================================

# Simple in-memory store for demo purposes
_constraints_store: Dict[str, Dict[str, Any]] = {
    "con-001": {
        "id": "con-001",
        "team_id": "default",
        "type": "security",
        "name": "Token Expiry Limit",
        "description": "Access token expiry must be ≤ 15 minutes",
        "severity": "critical",
        "scope": {
            "files": ["src/auth/*", "src/middleware/auth*"],
            "components": ["authentication"]
        },
        "threshold": {"max_expiry_seconds": 900},
        "enforcement": "hard",  # hard = block, soft = warn
        "approved_by": "security-lead",
        "approved_at": "2024-10-15T10:00:00Z",
        "is_active": True,
        "created_at": "2024-10-15T10:00:00Z"
    },
    "con-002": {
        "id": "con-002",
        "team_id": "default",
        "type": "performance",
        "name": "API Latency SLA",
        "description": "API response time must be < 100ms at p95",
        "severity": "high",
        "scope": {
            "files": ["src/api/*"],
            "components": ["api"]
        },
        "threshold": {"max_latency_ms": 100, "percentile": 95},
        "enforcement": "soft",
        "approved_by": "cto",
        "approved_at": "2024-09-01T14:00:00Z",
        "is_active": True,
        "created_at": "2024-09-01T14:00:00Z"
    },
    "con-003": {
        "id": "con-003",
        "team_id": "default",
        "type": "regulatory",
        "name": "Payment Code Lock",
        "description": "Payment processing code requires CFO approval for any changes",
        "severity": "critical",
        "scope": {
            "files": ["src/payments/*", "src/billing/*"],
            "components": ["payments", "billing"]
        },
        "threshold": {},
        "enforcement": "hard",
        "approved_by": "cfo",
        "approved_at": "2024-07-01T09:00:00Z",
        "is_active": True,
        "created_at": "2024-07-01T09:00:00Z"
    },
    "con-004": {
        "id": "con-004",
        "team_id": "default",
        "type": "architecture",
        "name": "Database Direct Access Ban",
        "description": "No direct SQL queries outside repository layer",
        "severity": "high",
        "scope": {
            "files": ["src/api/*", "src/services/*"],
            "components": ["api", "services"]
        },
        "threshold": {},
        "enforcement": "soft",
        "approved_by": "architect",
        "approved_at": "2024-08-15T11:00:00Z",
        "is_active": True,
        "created_at": "2024-08-15T11:00:00Z"
    },
    "con-005": {
        "id": "con-005",
        "team_id": "default",
        "type": "security",
        "name": "No Secrets in Code",
        "description": "API keys, passwords, and secrets must never be hardcoded",
        "severity": "critical",
        "scope": {
            "files": ["**/*"],
            "components": []
        },
        "threshold": {},
        "enforcement": "hard",
        "approved_by": "security-lead",
        "approved_at": "2024-06-01T08:00:00Z",
        "is_active": True,
        "created_at": "2024-06-01T08:00:00Z"
    }
}


# ============================================================================
# REQUEST/RESPONSE MODELS
# ============================================================================

class ConstraintScope(BaseModel):
    files: List[str] = Field(default_factory=list, description="File patterns affected")
    components: List[str] = Field(default_factory=list, description="Components affected")


class ConstraintCreate(BaseModel):
    team_id: str = "default"
    type: str = Field(..., description="security, performance, regulatory, architecture, process")
    name: str
    description: str
    severity: str = Field("medium", description="critical, high, medium, low")
    scope: ConstraintScope
    threshold: Dict[str, Any] = Field(default_factory=dict)
    enforcement: str = Field("soft", description="hard (block) or soft (warn)")
    approved_by: Optional[str] = None


class ConstraintUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    severity: Optional[str] = None
    scope: Optional[ConstraintScope] = None
    threshold: Optional[Dict[str, Any]] = None
    enforcement: Optional[str] = None
    is_active: Optional[bool] = None


class ConstraintCheck(BaseModel):
    file_path: str
    proposed_changes: Optional[str] = None
    team_id: str = "default"


# ============================================================================
# ENDPOINTS
# ============================================================================

@router.get("/constraints")
async def list_constraints(
    team_id: str = Query("default"),
    type: Optional[str] = Query(None, description="Filter by type"),
    severity: Optional[str] = Query(None, description="Filter by severity"),
    is_active: bool = Query(True, description="Filter by active status")
):
    """List all constraints for a team."""
    constraints = [
        c for c in _constraints_store.values()
        if c["team_id"] == team_id and c.get("is_active", True) == is_active
    ]
    
    if type:
        constraints = [c for c in constraints if c["type"] == type]
    if severity:
        constraints = [c for c in constraints if c["severity"] == severity]
    
    return {"constraints": constraints, "count": len(constraints)}


@router.get("/constraints/{constraint_id}")
async def get_constraint(constraint_id: str):
    """Get a specific constraint by ID."""
    constraint = _constraints_store.get(constraint_id)
    if not constraint:
        raise HTTPException(status_code=404, detail="Constraint not found")
    return constraint


@router.post("/constraints")
async def create_constraint(data: ConstraintCreate):
    """Create a new constraint."""
    import uuid
    
    constraint_id = f"con-{str(uuid.uuid4())[:8]}"
    now = datetime.utcnow().isoformat() + "Z"
    
    constraint = {
        "id": constraint_id,
        "team_id": data.team_id,
        "type": data.type,
        "name": data.name,
        "description": data.description,
        "severity": data.severity,
        "scope": data.scope.dict(),
        "threshold": data.threshold,
        "enforcement": data.enforcement,
        "approved_by": data.approved_by,
        "approved_at": now if data.approved_by else None,
        "is_active": True,
        "created_at": now
    }
    
    _constraints_store[constraint_id] = constraint
    logger.info(f"Created constraint {constraint_id}: {data.name}")
    
    return constraint


@router.put("/constraints/{constraint_id}")
async def update_constraint(constraint_id: str, data: ConstraintUpdate):
    """Update an existing constraint."""
    if constraint_id not in _constraints_store:
        raise HTTPException(status_code=404, detail="Constraint not found")
    
    constraint = _constraints_store[constraint_id]
    
    if data.name is not None:
        constraint["name"] = data.name
    if data.description is not None:
        constraint["description"] = data.description
    if data.severity is not None:
        constraint["severity"] = data.severity
    if data.scope is not None:
        constraint["scope"] = data.scope.dict()
    if data.threshold is not None:
        constraint["threshold"] = data.threshold
    if data.enforcement is not None:
        constraint["enforcement"] = data.enforcement
    if data.is_active is not None:
        constraint["is_active"] = data.is_active
    
    constraint["updated_at"] = datetime.utcnow().isoformat() + "Z"
    
    logger.info(f"Updated constraint {constraint_id}")
    return constraint


@router.delete("/constraints/{constraint_id}")
async def delete_constraint(constraint_id: str):
    """Delete a constraint."""
    if constraint_id not in _constraints_store:
        raise HTTPException(status_code=404, detail="Constraint not found")
    
    del _constraints_store[constraint_id]
    logger.info(f"Deleted constraint {constraint_id}")
    
    return {"status": "deleted", "id": constraint_id}


@router.post("/constraints/check")
async def check_constraints(data: ConstraintCheck):
    """Check if a file/change violates any constraints."""
    violations = []
    warnings = []
    
    for constraint in _constraints_store.values():
        if constraint["team_id"] != data.team_id:
            continue
        if not constraint.get("is_active", True):
            continue
        
        # Check if file matches scope
        scope = constraint.get("scope", {})
        file_patterns = scope.get("files", [])
        
        matches = False
        for pattern in file_patterns:
            if pattern == "**/*":
                matches = True
                break
            # Simple glob matching
            if pattern.endswith("*"):
                prefix = pattern.rstrip("*")
                if data.file_path.startswith(prefix) or data.file_path.replace("\\", "/").startswith(prefix):
                    matches = True
                    break
            elif pattern in data.file_path:
                matches = True
                break
        
        if matches:
            result = {
                "constraint_id": constraint["id"],
                "name": constraint["name"],
                "description": constraint["description"],
                "severity": constraint["severity"],
                "type": constraint["type"],
                "enforcement": constraint["enforcement"],
                "approved_by": constraint.get("approved_by")
            }
            
            if constraint["enforcement"] == "hard":
                violations.append(result)
            else:
                warnings.append(result)
    
    return {
        "file_path": data.file_path,
        "has_violations": len(violations) > 0,
        "has_warnings": len(warnings) > 0,
        "violations": violations,
        "warnings": warnings,
        "can_proceed": len(violations) == 0
    }


@router.get("/constraints/file/{file_path:path}")
async def get_constraints_for_file(file_path: str, team_id: str = "default"):
    """Get all constraints that apply to a specific file."""
    applicable = []
    
    for constraint in _constraints_store.values():
        if constraint["team_id"] != team_id:
            continue
        if not constraint.get("is_active", True):
            continue
        
        scope = constraint.get("scope", {})
        file_patterns = scope.get("files", [])
        
        for pattern in file_patterns:
            if pattern == "**/*":
                applicable.append(constraint)
                break
            if pattern.endswith("*"):
                prefix = pattern.rstrip("*")
                if file_path.startswith(prefix) or file_path.replace("\\", "/").startswith(prefix):
                    applicable.append(constraint)
                    break
            elif pattern in file_path:
                applicable.append(constraint)
                break
    
    return {"constraints": applicable, "count": len(applicable)}

