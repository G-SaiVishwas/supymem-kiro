"""
Notification Worker

Processes notification events from the Redis Stream and delivers them
via various channels:
- Slack DM
- Web push (future)
- Email (future)

Features:
- Rate limiting to prevent spam
- User preference checking
- Delivery tracking
- Retry on failure
"""

import asyncio
from typing import Dict, Any
from datetime import datetime

from src.workers.base import BaseWorker
from src.cache.redis_client import (
    StreamMessage,
    STREAM_NOTIFICATIONS,
    GROUP_NOTIFICATION_WORKER,
    cache
)
from src.config.logging import get_logger
from src.config.settings import get_settings

logger = get_logger(__name__)
settings = get_settings()


class NotificationWorker(BaseWorker):
    """
    Delivers notifications to users via Slack and other channels.
    """
    
    # Rate limiting: max notifications per user per minute
    RATE_LIMIT_WINDOW = 60  # seconds
    MAX_NOTIFICATIONS_PER_WINDOW = 10
    
    @property
    def stream_name(self) -> str:
        return STREAM_NOTIFICATIONS
    
    @property
    def group_name(self) -> str:
        return GROUP_NOTIFICATION_WORKER
    
    async def process_message(self, message: StreamMessage) -> bool:
        """
        Process a notification message.
        
        Args:
            message: StreamMessage containing notification data
            
        Returns:
            True if delivered successfully
        """
        notification_type = message.event_type
        payload = message.payload
        
        recipient_id = payload.get("recipient_id")
        title = payload.get("title", "Notification")
        notification_message = payload.get("message", "")
        
        logger.info(
            "Processing notification",
            type=notification_type,
            recipient=recipient_id
        )
        
        try:
            # Check rate limit
            if not await self._check_rate_limit(recipient_id):
                logger.warning(
                    "Rate limit exceeded for user",
                    recipient=recipient_id
                )
                # Still return True to ack - we don't want to retry rate-limited messages
                return True
            
            # Get user preferences (simplified - in production, fetch from DB)
            preferences = await self._get_user_preferences(recipient_id)
            
            if not preferences.get("notifications_enabled", True):
                logger.debug(
                    "User has notifications disabled",
                    recipient=recipient_id
                )
                return True
            
            # Deliver via Slack
            if preferences.get("slack_enabled", True):
                await self._send_slack_notification(
                    recipient_id=recipient_id,
                    notification_type=notification_type,
                    title=title,
                    message=notification_message,
                    payload=payload
                )
            
            # Store notification in database
            await self._store_notification(
                recipient_id=recipient_id,
                notification_type=notification_type,
                title=title,
                message=notification_message,
                payload=payload
            )
            
            # Update rate limit counter
            await self._increment_rate_limit(recipient_id)
            
            return True
            
        except Exception as e:
            logger.error(
                "Failed to deliver notification",
                recipient=recipient_id,
                error=str(e)
            )
            return False
    
    async def _check_rate_limit(self, user_id: str) -> bool:
        """Check if user is within rate limit."""
        key = f"notification_rate:{user_id}"
        count = await cache.get(key)
        
        if count is None:
            return True
        
        return int(count) < self.MAX_NOTIFICATIONS_PER_WINDOW
    
    async def _increment_rate_limit(self, user_id: str):
        """Increment rate limit counter."""
        key = f"notification_rate:{user_id}"
        
        # Increment and set expiry
        count = await cache.increment(key)
        if count == 1:
            # First notification in window, set expiry
            if cache.client:
                await cache.client.expire(key, self.RATE_LIMIT_WINDOW)
    
    async def _get_user_preferences(self, user_id: str) -> Dict[str, Any]:
        """Get user notification preferences."""
        # In production, fetch from database
        # For now, return defaults
        return {
            "notifications_enabled": True,
            "slack_enabled": True,
            "email_enabled": False,
            "quiet_hours_start": None,
            "quiet_hours_end": None
        }
    
    async def _send_slack_notification(
        self,
        recipient_id: str,
        notification_type: str,
        title: str,
        message: str,
        payload: Dict[str, Any]
    ):
        """Send notification via Slack DM."""
        try:
            from slack_sdk.web.async_client import AsyncWebClient
            
            if not settings.slack_bot_token:
                logger.debug("Slack bot token not configured")
                return
            
            client = AsyncWebClient(token=settings.slack_bot_token)
            
            # Build Slack message blocks
            blocks = self._build_slack_blocks(
                notification_type=notification_type,
                title=title,
                message=message,
                payload=payload
            )
            
            # Send DM
            await client.chat_postMessage(
                channel=recipient_id,  # Slack user ID
                text=f"{title}: {message}",
                blocks=blocks
            )
            
            logger.info(
                "Slack notification sent",
                recipient=recipient_id,
                type=notification_type
            )
            
        except Exception as e:
            logger.error(
                "Failed to send Slack notification",
                recipient=recipient_id,
                error=str(e)
            )
            raise
    
    def _build_slack_blocks(
        self,
        notification_type: str,
        title: str,
        message: str,
        payload: Dict[str, Any]
    ) -> list:
        """Build Slack Block Kit message."""
        # Icon based on notification type
        icons = {
            "change_impact": "🔔",
            "breaking_change": "🚨",
            "pr_reviewed": "👀",
            "task_assigned": "📋",
            "task_completed": "✅",
            "automation_triggered": "⚡",
            "mention": "💬"
        }
        icon = icons.get(notification_type, "📢")
        
        blocks = [
            {
                "type": "header",
                "text": {
                    "type": "plain_text",
                    "text": f"{icon} {title}",
                    "emoji": True
                }
            },
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": message
                }
            }
        ]
        
        # Add context based on payload
        context_elements = []
        
        if payload.get("repo"):
            context_elements.append({
                "type": "mrkdwn",
                "text": f"*Repo:* {payload['repo']}"
            })
        
        if payload.get("commit_sha"):
            context_elements.append({
                "type": "mrkdwn",
                "text": f"*Commit:* `{payload['commit_sha']}`"
            })
        
        if payload.get("pr_number"):
            context_elements.append({
                "type": "mrkdwn",
                "text": f"*PR:* #{payload['pr_number']}"
            })
        
        if context_elements:
            blocks.append({
                "type": "context",
                "elements": context_elements
            })
        
        # Add action buttons for certain types
        if notification_type == "change_impact" and payload.get("commit_sha"):
            repo = payload.get("repo", "")
            sha = payload.get("commit_sha", "")
            blocks.append({
                "type": "actions",
                "elements": [
                    {
                        "type": "button",
                        "text": {
                            "type": "plain_text",
                            "text": "View Commit"
                        },
                        "url": f"https://github.com/{repo}/commit/{sha}"
                    }
                ]
            })
        
        return blocks
    
    async def _store_notification(
        self,
        recipient_id: str,
        notification_type: str,
        title: str,
        message: str,
        payload: Dict[str, Any]
    ):
        """Store notification in database for history/read status."""
        try:
            from src.database.session import get_session
            from src.database.models import Notification
            import uuid
            
            async with get_session() as session:
                notification = Notification(
                    id=str(uuid.uuid4()),
                    recipient_id=recipient_id,
                    notification_type=notification_type,
                    title=title,
                    content=message,
                    source_url=payload.get("source_url"),
                    metadata=payload,
                    is_read=False,
                    created_at=datetime.utcnow()
                )
                session.add(notification)
                await session.commit()
                
        except Exception as e:
            logger.warning(
                "Failed to store notification in DB",
                error=str(e)
            )
            # Don't fail the notification delivery


async def main():
    """Run the notification worker."""
    worker = NotificationWorker()
    await worker.start()


if __name__ == "__main__":
    asyncio.run(main())

