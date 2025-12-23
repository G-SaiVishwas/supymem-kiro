"""
Task Monitor Worker

Processes task events from the Redis Stream:
- Task created
- Task completed
- Task updated
- Task extracted (from issues/PRs)

Features:
- Monitors task completion conditions ("After X finishes Y, notify Z")
- Triggers automation rules on task events
- Updates productivity analytics
"""

import asyncio
from typing import Dict, Any
from datetime import datetime

from src.workers.base import BaseWorker
from src.cache.redis_client import (
    StreamMessage,
    STREAM_TASK_EVENTS,
    GROUP_TASK_MONITOR,
    publish_notification
)
from src.config.logging import get_logger

logger = get_logger(__name__)


class TaskMonitorWorker(BaseWorker):
    """
    Monitors task events and triggers automations.
    
    Implements the "After X finishes Y, notify Z" feature.
    """
    
    @property
    def stream_name(self) -> str:
        return STREAM_TASK_EVENTS
    
    @property
    def group_name(self) -> str:
        return GROUP_TASK_MONITOR
    
    async def process_message(self, message: StreamMessage) -> bool:
        """
        Process a task event message.
        
        Args:
            message: StreamMessage containing task event data
            
        Returns:
            True if processed successfully
        """
        event_type = message.event_type
        payload = message.payload
        
        team_id = payload.get("team_id")
        
        logger.info(
            "Processing task event",
            type=event_type,
            team_id=team_id
        )
        
        try:
            if event_type == "task_created":
                await self._process_task_created(payload)
            elif event_type == "task_completed":
                await self._process_task_completed(payload)
            elif event_type == "task_extracted":
                await self._process_task_extracted(payload)
            elif event_type == "task_updated":
                await self._process_task_updated(payload)
            else:
                logger.debug(
                    "Unhandled task event type",
                    event_type=event_type
                )
            
            return True
            
        except Exception as e:
            logger.error(
                "Failed to process task event",
                event_type=event_type,
                error=str(e)
            )
            return False
    
    async def _process_task_created(self, payload: Dict[str, Any]):
        """Process a task created event."""
        
        task_id = payload.get("task_id")
        title = payload.get("title")
        assignee = payload.get("assignee")
        created_by = payload.get("created_by")
        
        logger.info(
            "Task created",
            task_id=task_id,
            title=title,
            assignee=assignee
        )
        
        # Notify assignee if different from creator
        if assignee and assignee != created_by:
            await publish_notification(
                notification_type="task_assigned",
                recipient_id=assignee,
                payload={
                    "title": "New task assigned",
                    "message": f"You've been assigned: {title}",
                    "task_id": task_id,
                    "created_by": created_by
                }
            )
    
    async def _process_task_completed(self, payload: Dict[str, Any]):
        """
        Process a task completed event.
        
        This is where we check for automation conditions like:
        "After Rahul finishes CSS tasks, notify him about API work"
        """
        from src.services.automation import condition_monitor
        
        task_id = payload.get("task_id")
        title = payload.get("title")
        completed_by = payload.get("completed_by")
        team_id = payload.get("team_id")
        task_type = payload.get("task_type")
        
        logger.info(
            "Task completed",
            task_id=task_id,
            title=title,
            completed_by=completed_by
        )
        
        # Check automation conditions
        triggered_rules = await condition_monitor.check_task_completed(
            team_id=team_id,
            user_identifier=completed_by,
            task_title=title,
            task_type=task_type
        )
        
        if triggered_rules:
            logger.info(
                "Automation rules triggered",
                task_id=task_id,
                rules_count=len(triggered_rules)
            )
        
        # Check for "all tasks completed" conditions
        await self._check_all_tasks_completed(
            team_id=team_id,
            user_identifier=completed_by,
            completed_task_title=title
        )
    
    async def _process_task_extracted(self, payload: Dict[str, Any]):
        """Process a task extracted from issue/PR."""
        from src.database.session import get_session
        from src.database.models import Task
        import uuid
        
        title = payload.get("title")
        description = payload.get("description")
        source = payload.get("source")
        source_id = payload.get("source_id")
        assignee = payload.get("assignee")
        team_id = payload.get("team_id")
        
        logger.info(
            "Task extracted",
            title=title,
            source=source,
            source_id=source_id
        )
        
        # Create task in database
        try:
            async with get_session() as session:
                task = Task(
                    id=str(uuid.uuid4()),
                    team_id=team_id,
                    title=title,
                    description=description,
                    status="pending",
                    priority="medium",
                    assigned_to=assignee,
                    source=source,
                    source_id=source_id,
                    created_at=datetime.utcnow()
                )
                session.add(task)
                await session.commit()
                
                logger.info(
                    "Task created from extraction",
                    task_id=task.id,
                    title=title
                )
                
                # Notify assignee
                if assignee:
                    await publish_notification(
                        notification_type="task_assigned",
                        recipient_id=assignee,
                        payload={
                            "title": "Task extracted from " + source,
                            "message": f"New task: {title}",
                            "task_id": task.id,
                            "source": source,
                            "source_id": source_id
                        }
                    )
                    
        except Exception as e:
            logger.error(
                "Failed to create extracted task",
                error=str(e)
            )
    
    async def _process_task_updated(self, payload: Dict[str, Any]):
        """Process a task updated event."""
        task_id = payload.get("task_id")
        updates = payload.get("updates", {})
        updated_by = payload.get("updated_by")
        
        logger.info(
            "Task updated",
            task_id=task_id,
            updates=list(updates.keys())
        )
        
        # Check if assignee changed
        if "assigned_to" in updates:
            new_assignee = updates["assigned_to"]
            if new_assignee and new_assignee != updated_by:
                await publish_notification(
                    notification_type="task_assigned",
                    recipient_id=new_assignee,
                    payload={
                        "title": "Task reassigned to you",
                        "message": f"Task {task_id} has been assigned to you",
                        "task_id": task_id,
                        "assigned_by": updated_by
                    }
                )
    
    async def _check_all_tasks_completed(
        self,
        team_id: str,
        user_identifier: str,
        completed_task_title: str
    ):
        """
        Check if user has completed all tasks of a certain type.
        
        This enables conditions like:
        "After Rahul finishes ALL CSS tasks, notify him"
        """
        from src.database.session import get_session
        from src.database.models import Task
        from sqlalchemy import select, and_
        
        try:
            async with get_session() as session:
                # Future: Could filter by keywords from completed_task_title
                # to check if user completed all tasks of a specific type
                
                # Get pending tasks for this user
                result = await session.execute(
                    select(Task).where(
                        and_(
                            Task.team_id == team_id,
                            Task.assigned_to == user_identifier,
                            Task.status.in_(["pending", "in_progress"])
                        )
                    ).limit(1)
                )
                pending_task = result.scalar_one_or_none()
                
                if not pending_task:
                    # All tasks completed!
                    logger.info(
                        "User completed all tasks",
                        user=user_identifier,
                        team_id=team_id
                    )
                    
                    # Check for automation rules with "all tasks completed" condition
                    # This would trigger rules like "notify when all CSS tasks done"
                    
        except Exception as e:
            logger.warning(
                "Error checking all tasks completed",
                error=str(e)
            )


async def main():
    """Run the task monitor worker."""
    worker = TaskMonitorWorker()
    await worker.start()


if __name__ == "__main__":
    asyncio.run(main())

