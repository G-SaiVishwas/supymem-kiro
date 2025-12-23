"""
Automation API Routes

Endpoints for managing automation rules.
"""

from typing import Optional, List
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from src.services.automation import nl_parser, rule_manager
from src.config.logging import get_logger

logger = get_logger(__name__)
router = APIRouter()


# ============================================================================
# REQUEST/RESPONSE MODELS
# ============================================================================

class CreateAutomationRequest(BaseModel):
    instruction: str = Field(..., description="Natural language instruction")
    team_id: str = Field(default="default")
    created_by: str = Field(default="api")


class AutomationRuleResponse(BaseModel):
    id: str
    team_id: str
    created_by: str
    description: str
    trigger_type: str
    trigger_conditions: dict
    action_type: str
    action_params: dict
    status: str
    is_one_time: bool
    execution_count: int
    last_triggered_at: Optional[str]
    created_at: str


class ParseResult(BaseModel):
    success: bool
    confirmation_message: Optional[str] = None
    parsed_command: Optional[dict] = None
    confidence: Optional[float] = None
    error: Optional[str] = None


# ============================================================================
# ENDPOINTS
# ============================================================================

@router.post("/automation/parse", response_model=ParseResult)
async def parse_instruction(request: CreateAutomationRequest):
    """
    Parse a natural language instruction without creating a rule.
    
    Use this to preview what the system understood before confirming.
    """
    try:
        result = await nl_parser.parse_and_confirm(
            instruction=request.instruction,
            context={"team_id": request.team_id, "user": request.created_by}
        )
        
        return ParseResult(
            success=result.get("success", False),
            confirmation_message=result.get("confirmation_message"),
            parsed_command=result.get("parsed_command"),
            confidence=result.get("confidence"),
            error=result.get("error")
        )
        
    except Exception as e:
        logger.error("Parse error", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/automation/rules", response_model=dict)
async def create_automation_rule(request: CreateAutomationRequest):
    """
    Create an automation rule from natural language.
    
    The instruction is parsed and the rule is created if successful.
    """
    try:
        # Parse the instruction
        command, error = await nl_parser.parse(
            instruction=request.instruction,
            context={"team_id": request.team_id, "user": request.created_by}
        )
        
        if error or not command:
            raise HTTPException(
                status_code=400,
                detail=f"Could not parse instruction: {error}"
            )
        
        # Create the rule
        rule_id = await rule_manager.create_rule(
            team_id=request.team_id,
            created_by=request.created_by,
            command=command
        )
        
        return {
            "success": True,
            "rule_id": rule_id,
            "description": command.description,
            "trigger_type": command.trigger.trigger_type,
            "action_type": command.action.action_type
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Create rule error", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/automation/rules", response_model=List[AutomationRuleResponse])
async def list_automation_rules(
    team_id: str = "default",
    status: Optional[str] = None,
    created_by: Optional[str] = None,
    limit: int = 50
):
    """
    List automation rules for a team.
    """
    try:
        rules = await rule_manager.list_rules(
            team_id=team_id,
            created_by=created_by,
            status=status,
            limit=limit
        )
        
        return [AutomationRuleResponse(**r) for r in rules]
        
    except Exception as e:
        logger.error("List rules error", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/automation/rules/{rule_id}", response_model=AutomationRuleResponse)
async def get_automation_rule(rule_id: str):
    """
    Get a specific automation rule.
    """
    try:
        rule = await rule_manager.get_rule(rule_id)
        
        if not rule:
            raise HTTPException(status_code=404, detail="Rule not found")
        
        return AutomationRuleResponse(**rule)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Get rule error", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/automation/rules/{rule_id}/status")
async def update_rule_status(rule_id: str, status: str):
    """
    Update automation rule status.
    
    Valid statuses: active, paused, completed, failed
    """
    valid_statuses = ["active", "paused", "completed", "failed"]
    if status not in valid_statuses:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status. Must be one of: {valid_statuses}"
        )
    
    try:
        success = await rule_manager.update_rule_status(rule_id, status)
        
        if not success:
            raise HTTPException(status_code=404, detail="Rule not found")
        
        return {"success": True, "status": status}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Update status error", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/automation/rules/{rule_id}")
async def delete_automation_rule(rule_id: str):
    """
    Delete an automation rule.
    """
    try:
        success = await rule_manager.delete_rule(rule_id)
        
        if not success:
            raise HTTPException(status_code=404, detail="Rule not found")
        
        return {"success": True, "message": "Rule deleted"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Delete rule error", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))

