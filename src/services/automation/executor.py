"""
Action Executor

Executes actions defined in automation rules:
- notify_user: Send notification
- create_task: Create a new task
- assign_task: Assign task to user
- send_message: Send message to Slack channel
"""

from typing import Dict, Optional, Any
from datetime import datetime
import uuid

from sqlalchemy import select

from src.database.session import get_session
from src.database.models import Task
from src.services.impact.notifications import notification_service, NotificationPayload
from src.config.settings import get_settings
from src.config.logging import get_logger

logger = get_logger(__name__)
settings = get_settings()


class ActionExecutor:
    """
    Executes automation actions.
    """

    def __init__(self):
        self._slack_client = None

    @property
    def slack_client(self):
        """Lazy load Slack client."""
        if self._slack_client is None and settings.slack_bot_token:
            try:
                from slack_sdk.web.async_client import AsyncWebClient
                self._slack_client = AsyncWebClient(token=settings.slack_bot_token)
            except ImportError:
                logger.warning("slack_sdk not available")
        return self._slack_client

    async def execute(
        self,
        action_type: str,
        action_params: Dict[str, Any],
        team_id: str,
        context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Execute an action.
        
        Args:
            action_type: Type of action to execute
            action_params: Parameters for the action
            team_id: Team ID
            context: Additional context from the trigger
        
        Returns:
            Dict with 'success', 'result', and optionally 'error'
        """
        context = context or {}
        
        executors = {
            "notify_user": self._execute_notify_user,
            "create_task": self._execute_create_task,
            "assign_task": self._execute_assign_task,
            "send_message": self._execute_send_message,
            "update_task": self._execute_update_task,
        }
        
        executor = executors.get(action_type)
        if not executor:
            return {
                "success": False,
                "error": f"Unknown action type: {action_type}"
            }
        
        try:
            result = await executor(action_params, team_id, context)
            logger.info(
                "Action executed",
                action_type=action_type,
                success=result.get("success", False)
            )
            return result
        except Exception as e:
            logger.error("Action execution failed", error=str(e), action_type=action_type)
            return {
                "success": False,
                "error": str(e)
            }

    async def _execute_notify_user(
        self,
        params: Dict[str, Any],
        team_id: str,
        context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Send a notification to a user."""
        user = params.get("user")
        message = params.get("message", "You have a notification")
        priority = params.get("priority", "normal")
        
        if not user:
            return {"success": False, "error": "No user specified"}
        
        # Resolve pronouns from context
        if user.lower() in ("him", "her", "them", "they"):
            user = context.get("trigger_user", user)
        
        # Create notification
        payload = NotificationPayload(
            user_identifier=user,
            team_id=team_id,
            notification_type="automation_triggered",
            title="🤖 Automated Notification",
            content=message,
            priority=priority,
            related_change=context
        )
        
        notification_id = await notification_service.create_notification(payload)
        
        return {
            "success": True,
            "result": {
                "notification_id": notification_id,
                "user": user,
                "message": message
            }
        }

    async def _execute_create_task(
        self,
        params: Dict[str, Any],
        team_id: str,
        context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Create a new task."""
        title = params.get("title")
        if not title:
            return {"success": False, "error": "Task title required"}
        
        description = params.get("description", "")
        assignee = params.get("assignee") or params.get("assigned_to")
        priority = params.get("priority", "medium")
        
        # Resolve pronouns
        if assignee and assignee.lower() in ("him", "her", "them", "they"):
            assignee = context.get("trigger_user", assignee)
        
        task_id = str(uuid.uuid4())
        
        async with get_session() as session:
            task = Task(
                id=task_id,
                title=title,
                description=description,
                status="pending",
                priority=priority,
                team_id=team_id,
                assigned_to=assignee,
                source="automation",
                source_id=context.get("rule_id"),
                created_by_automation=context.get("rule_id"),
                tags=["auto-created"]
            )
            session.add(task)
        
        # Notify assignee if specified
        if assignee:
            await notification_service.create_notification(NotificationPayload(
                user_identifier=assignee,
                team_id=team_id,
                notification_type="task_assigned",
                title="📋 New Task Assigned",
                content=f"You've been assigned: {title}",
                priority=priority
            ))
        
        return {
            "success": True,
            "result": {
                "task_id": task_id,
                "title": title,
                "assignee": assignee
            }
        }

    async def _execute_assign_task(
        self,
        params: Dict[str, Any],
        team_id: str,
        context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Assign a task to a user."""
        task_id = params.get("task_id")
        assignee = params.get("assignee")
        
        if not task_id or not assignee:
            return {"success": False, "error": "task_id and assignee required"}
        
        # Resolve pronouns
        if assignee.lower() in ("him", "her", "them", "they"):
            assignee = context.get("trigger_user", assignee)
        
        async with get_session() as session:
            result = await session.execute(
                select(Task).where(Task.id == task_id)
            )
            task = result.scalar_one_or_none()
            
            if not task:
                return {"success": False, "error": f"Task {task_id} not found"}
            
            old_assignee = task.assigned_to
            task.assigned_to = assignee
            task.updated_at = datetime.utcnow()
        
        # Notify new assignee
        await notification_service.create_notification(NotificationPayload(
            user_identifier=assignee,
            team_id=team_id,
            notification_type="task_assigned",
            title="📋 Task Assigned to You",
            content=f"You've been assigned: {task.title}",
            priority="normal"
        ))
        
        return {
            "success": True,
            "result": {
                "task_id": task_id,
                "new_assignee": assignee,
                "old_assignee": old_assignee
            }
        }

    async def _execute_send_message(
        self,
        params: Dict[str, Any],
        team_id: str,
        context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Send a message to a Slack channel."""
        channel = params.get("channel")
        message = params.get("message")
        
        if not channel or not message:
            return {"success": False, "error": "channel and message required"}
        
        if not self.slack_client:
            return {"success": False, "error": "Slack not configured"}
        
        try:
            response = await self.slack_client.chat_postMessage(
                channel=channel,
                text=message
            )
            
            if response.get("ok"):
                return {
                    "success": True,
                    "result": {
                        "channel": channel,
                        "message_ts": response.get("ts")
                    }
                }
            else:
                return {
                    "success": False,
                    "error": response.get("error", "Slack API error")
                }
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def _execute_update_task(
        self,
        params: Dict[str, Any],
        team_id: str,
        context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Update a task's status."""
        task_id = params.get("task_id")
        status = params.get("status")
        
        if not task_id or not status:
            return {"success": False, "error": "task_id and status required"}
        
        async with get_session() as session:
            result = await session.execute(
                select(Task).where(Task.id == task_id)
            )
            task = result.scalar_one_or_none()
            
            if not task:
                return {"success": False, "error": f"Task {task_id} not found"}
            
            old_status = task.status
            task.status = status
            task.updated_at = datetime.utcnow()
            
            if status == "completed":
                task.completed_at = datetime.utcnow()
        
        return {
            "success": True,
            "result": {
                "task_id": task_id,
                "old_status": old_status,
                "new_status": status
            }
        }


# Singleton instance
action_executor = ActionExecutor()

