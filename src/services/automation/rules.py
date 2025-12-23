"""
Automation Rule Manager

Manages CRUD operations for automation rules.
"""

from typing import Dict, List, Optional, Any
from datetime import datetime
import uuid

from sqlalchemy import select, and_

from src.database.session import get_session
from src.database.models import AutomationRule, AutomationExecution
from src.services.automation.parser import ParsedCommand
from src.config.logging import get_logger

logger = get_logger(__name__)


class AutomationRuleManager:
    """
    Manages automation rules in the database.
    """

    async def create_rule(
        self,
        team_id: str,
        created_by: str,
        command: ParsedCommand
    ) -> str:
        """
        Create an automation rule from a parsed command.
        
        Returns:
            Rule ID
        """
        rule_id = str(uuid.uuid4())
        
        async with get_session() as session:
            rule = AutomationRule(
                id=rule_id,
                team_id=team_id,
                created_by=created_by,
                original_instruction=command.original_text,
                description=command.description,
                trigger_type=command.trigger.trigger_type,
                trigger_conditions=command.trigger.conditions,
                action_type=command.action.action_type,
                action_params=command.action.params,
                is_one_time=command.is_one_time,
                status="active"
            )
            session.add(rule)
            
            logger.info(
                "Automation rule created",
                rule_id=rule_id,
                trigger=command.trigger.trigger_type,
                action=command.action.action_type
            )
        
        return rule_id

    async def get_rule(self, rule_id: str) -> Optional[Dict]:
        """Get a single rule by ID."""
        async with get_session() as session:
            result = await session.execute(
                select(AutomationRule).where(AutomationRule.id == rule_id)
            )
            rule = result.scalar_one_or_none()
            
            if not rule:
                return None
            
            return self._rule_to_dict(rule)

    async def get_active_rules(
        self,
        team_id: str,
        trigger_type: Optional[str] = None
    ) -> List[Dict]:
        """
        Get all active rules for a team.
        
        Args:
            team_id: Team ID
            trigger_type: Filter by trigger type
        """
        async with get_session() as session:
            query = select(AutomationRule).where(
                and_(
                    AutomationRule.team_id == team_id,
                    AutomationRule.status == "active"
                )
            )
            
            if trigger_type:
                query = query.where(AutomationRule.trigger_type == trigger_type)
            
            result = await session.execute(query)
            rules = result.scalars().all()
            
            return [self._rule_to_dict(r) for r in rules]

    async def get_rules_for_trigger(
        self,
        team_id: str,
        trigger_type: str,
        trigger_data: Dict[str, Any]
    ) -> List[Dict]:
        """
        Get rules that match a specific trigger.
        
        Args:
            team_id: Team ID
            trigger_type: Type of trigger that occurred
            trigger_data: Data about the trigger event
        
        Returns:
            List of matching rules
        """
        rules = await self.get_active_rules(team_id, trigger_type)
        matching = []
        
        for rule in rules:
            if self._matches_conditions(rule["trigger_conditions"], trigger_data):
                matching.append(rule)
        
        return matching

    def _matches_conditions(
        self,
        conditions: Dict[str, Any],
        trigger_data: Dict[str, Any]
    ) -> bool:
        """Check if trigger data matches rule conditions."""
        for key, expected in conditions.items():
            actual = trigger_data.get(key)
            
            if actual is None:
                continue  # Condition not applicable
            
            # Handle different match types
            if isinstance(expected, list):
                # Any in list matches
                if isinstance(actual, list):
                    if not any(e in actual for e in expected):
                        return False
                elif actual not in expected:
                    return False
            elif isinstance(expected, str):
                # String match (case-insensitive, supports partial)
                if expected.lower() not in str(actual).lower():
                    return False
            else:
                # Exact match
                if actual != expected:
                    return False
        
        return True

    async def update_rule_status(
        self,
        rule_id: str,
        status: str
    ) -> bool:
        """Update rule status (active, paused, completed, failed)."""
        async with get_session() as session:
            result = await session.execute(
                select(AutomationRule).where(AutomationRule.id == rule_id)
            )
            rule = result.scalar_one_or_none()
            
            if not rule:
                return False
            
            rule.status = status
            rule.updated_at = datetime.utcnow()
            
            logger.info("Rule status updated", rule_id=rule_id, status=status)
            return True

    async def record_execution(
        self,
        rule_id: str,
        triggered_by: Dict[str, Any],
        status: str,
        result: Dict[str, Any],
        actions_performed: List[Dict],
        error: Optional[str] = None
    ) -> str:
        """Record a rule execution."""
        execution_id = str(uuid.uuid4())
        
        async with get_session() as session:
            # Record execution
            execution = AutomationExecution(
                id=execution_id,
                rule_id=rule_id,
                triggered_by_event=triggered_by,
                status=status,
                result=result,
                actions_performed=actions_performed,
                error_message=error
            )
            session.add(execution)
            
            # Update rule
            result_db = await session.execute(
                select(AutomationRule).where(AutomationRule.id == rule_id)
            )
            rule = result_db.scalar_one_or_none()
            
            if rule:
                rule.execution_count += 1
                rule.last_triggered_at = datetime.utcnow()
                rule.last_execution_result = {"status": status, "execution_id": execution_id}
                
                # Deactivate if one-time
                if rule.is_one_time and status == "success":
                    rule.status = "completed"
        
        return execution_id

    async def delete_rule(self, rule_id: str) -> bool:
        """Delete a rule."""
        async with get_session() as session:
            result = await session.execute(
                select(AutomationRule).where(AutomationRule.id == rule_id)
            )
            rule = result.scalar_one_or_none()
            
            if not rule:
                return False
            
            await session.delete(rule)
            logger.info("Rule deleted", rule_id=rule_id)
            return True

    async def list_rules(
        self,
        team_id: str,
        created_by: Optional[str] = None,
        status: Optional[str] = None,
        limit: int = 50
    ) -> List[Dict]:
        """List rules with optional filters."""
        async with get_session() as session:
            query = select(AutomationRule).where(AutomationRule.team_id == team_id)
            
            if created_by:
                query = query.where(AutomationRule.created_by == created_by)
            if status:
                query = query.where(AutomationRule.status == status)
            
            query = query.order_by(AutomationRule.created_at.desc()).limit(limit)
            
            result = await session.execute(query)
            rules = result.scalars().all()
            
            return [self._rule_to_dict(r) for r in rules]

    def _rule_to_dict(self, rule: AutomationRule) -> Dict:
        """Convert rule to dictionary."""
        return {
            "id": rule.id,
            "team_id": rule.team_id,
            "created_by": rule.created_by,
            "original_instruction": rule.original_instruction,
            "description": rule.description,
            "trigger_type": rule.trigger_type,
            "trigger_conditions": rule.trigger_conditions,
            "action_type": rule.action_type,
            "action_params": rule.action_params,
            "status": rule.status,
            "is_one_time": rule.is_one_time,
            "execution_count": rule.execution_count,
            "last_triggered_at": rule.last_triggered_at.isoformat() if rule.last_triggered_at else None,
            "created_at": rule.created_at.isoformat()
        }


# Singleton instance
rule_manager = AutomationRuleManager()

