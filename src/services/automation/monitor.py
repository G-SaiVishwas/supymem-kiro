"""
Condition Monitor

Monitors for trigger conditions and executes automation rules.
Can be run as a background task or called directly on events.
"""

from typing import Dict, List, Optional, Any
from datetime import datetime
import asyncio

from src.services.automation.rules import rule_manager
from src.services.automation.executor import action_executor
from src.config.logging import get_logger

logger = get_logger(__name__)


class ConditionMonitor:
    """
    Monitors for automation trigger conditions.
    """

    def __init__(self):
        self._running = False
        self._check_interval = 60  # seconds

    async def check_task_completed(
        self,
        team_id: str,
        user_identifier: str,
        task_title: str,
        task_type: Optional[str] = None
    ) -> List[str]:
        """
        Check and execute rules triggered by task completion.
        
        Called when a task is marked as completed.
        
        Returns:
            List of rule IDs that were executed
        """
        trigger_data = {
            "user": user_identifier,
            "task_title": task_title,
            "task_type": task_type,
            "task_keywords": task_title.lower().split()
        }
        
        return await self._check_and_execute(
            team_id=team_id,
            trigger_type="task_completed",
            trigger_data=trigger_data
        )

    async def check_pr_merged(
        self,
        team_id: str,
        repo: str,
        pr_number: int,
        author: str,
        title: str
    ) -> List[str]:
        """
        Check and execute rules triggered by PR merge.
        
        Called when a PR is merged.
        """
        trigger_data = {
            "repo": repo,
            "pr_number": pr_number,
            "author": author,
            "pr_title": title
        }
        
        return await self._check_and_execute(
            team_id=team_id,
            trigger_type="pr_merged",
            trigger_data=trigger_data
        )

    async def check_file_changed(
        self,
        team_id: str,
        repo: str,
        files: List[str],
        author: str
    ) -> List[str]:
        """
        Check and execute rules triggered by file changes.
        """
        trigger_data = {
            "repo": repo,
            "files": files,
            "author": author
        }
        
        return await self._check_and_execute(
            team_id=team_id,
            trigger_type="file_changed",
            trigger_data=trigger_data
        )

    async def check_keyword_detected(
        self,
        team_id: str,
        content: str,
        source: str,
        author: str
    ) -> List[str]:
        """
        Check and execute rules triggered by keyword detection.
        """
        keywords = content.lower().split()
        
        trigger_data = {
            "content": content,
            "keywords": keywords,
            "source": source,
            "author": author
        }
        
        return await self._check_and_execute(
            team_id=team_id,
            trigger_type="keyword_detected",
            trigger_data=trigger_data
        )

    async def _check_and_execute(
        self,
        team_id: str,
        trigger_type: str,
        trigger_data: Dict[str, Any]
    ) -> List[str]:
        """
        Check for matching rules and execute them.
        
        Returns:
            List of executed rule IDs
        """
        executed_rules = []
        
        try:
            # Get matching rules
            rules = await rule_manager.get_rules_for_trigger(
                team_id=team_id,
                trigger_type=trigger_type,
                trigger_data=trigger_data
            )
            
            logger.info(
                "Checking automation rules",
                trigger_type=trigger_type,
                matching_rules=len(rules)
            )
            
            for rule in rules:
                try:
                    # Build execution context
                    context = {
                        "rule_id": rule["id"],
                        "trigger_type": trigger_type,
                        "trigger_data": trigger_data,
                        "trigger_user": trigger_data.get("user") or trigger_data.get("author")
                    }
                    
                    # Execute the action
                    result = await action_executor.execute(
                        action_type=rule["action_type"],
                        action_params=rule["action_params"],
                        team_id=team_id,
                        context=context
                    )
                    
                    # Record execution
                    await rule_manager.record_execution(
                        rule_id=rule["id"],
                        triggered_by=trigger_data,
                        status="success" if result.get("success") else "failed",
                        result=result,
                        actions_performed=[{
                            "action_type": rule["action_type"],
                            "result": result
                        }],
                        error=result.get("error")
                    )
                    
                    if result.get("success"):
                        executed_rules.append(rule["id"])
                    
                except Exception as e:
                    logger.error(
                        "Rule execution failed",
                        rule_id=rule["id"],
                        error=str(e)
                    )
                    await rule_manager.record_execution(
                        rule_id=rule["id"],
                        triggered_by=trigger_data,
                        status="failed",
                        result={},
                        actions_performed=[],
                        error=str(e)
                    )
            
            return executed_rules
            
        except Exception as e:
            logger.error("Condition check failed", error=str(e))
            return []

    async def run_periodic_check(self, team_ids: List[str]):
        """
        Run periodic checks for time-based triggers.
        Should be called from a background worker.
        """
        self._running = True
        
        while self._running:
            try:
                for team_id in team_ids:
                    await self._check_time_based_rules(team_id)
                
                await asyncio.sleep(self._check_interval)
                
            except Exception as e:
                logger.error("Periodic check failed", error=str(e))
                await asyncio.sleep(self._check_interval)

    async def _check_time_based_rules(self, team_id: str):
        """Check time-based rules for a team."""
        rules = await rule_manager.get_active_rules(team_id, trigger_type="time_based")
        now = datetime.utcnow()
        
        for rule in rules:
            conditions = rule.get("trigger_conditions", {})
            
            # Check scheduled time
            scheduled = conditions.get("datetime")
            if scheduled:
                try:
                    scheduled_time = datetime.fromisoformat(scheduled)
                    if scheduled_time <= now:
                        # Time has passed, execute
                        await self._check_and_execute(
                            team_id=team_id,
                            trigger_type="time_based",
                            trigger_data={"scheduled_time": scheduled, "current_time": now.isoformat()}
                        )
                except Exception as e:
                    logger.error("Time-based rule check failed", error=str(e))
            
            # Cron-based would need additional handling

    def stop(self):
        """Stop the periodic checker."""
        self._running = False


# Singleton instance
condition_monitor = ConditionMonitor()

