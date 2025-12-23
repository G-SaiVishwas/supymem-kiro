"""
Notification Service

Sends notifications to users via various channels:
- Slack DM
- Web push (future)
- Email (future)
"""

from typing import Dict, List, Optional
from datetime import datetime
from dataclasses import dataclass
import uuid

from sqlalchemy import select, or_

from src.database.session import get_session
from src.database.models import Notification, User, NotificationType
from src.config.settings import get_settings
from src.config.logging import get_logger

logger = get_logger(__name__)
settings = get_settings()


@dataclass
class NotificationPayload:
    """Payload for creating a notification."""
    user_identifier: str
    team_id: str
    notification_type: str
    title: str
    content: str
    source_type: Optional[str] = None
    source_id: Optional[str] = None
    source_url: Optional[str] = None
    related_change: Optional[Dict] = None
    affected_files: Optional[List[str]] = None
    priority: str = "normal"
    delivery_channels: Optional[List[str]] = None


class NotificationService:
    """
    Service for creating and delivering notifications.
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

    async def create_notification(
        self,
        payload: NotificationPayload
    ) -> str:
        """
        Create and optionally deliver a notification.
        
        Returns:
            Notification ID
        """
        notification_id = str(uuid.uuid4())
        
        async with get_session() as session:
            notification = Notification(
                id=notification_id,
                user_identifier=payload.user_identifier,
                team_id=payload.team_id,
                notification_type=payload.notification_type,
                title=payload.title,
                content=payload.content,
                source_type=payload.source_type,
                source_id=payload.source_id,
                source_url=payload.source_url,
                related_change=payload.related_change or {},
                affected_files=payload.affected_files or [],
                priority=payload.priority,
                delivery_channels=payload.delivery_channels or ["slack", "web"],
                created_at=datetime.utcnow()
            )
            session.add(notification)
            
            logger.info(
                "Notification created",
                notification_id=notification_id,
                user=payload.user_identifier,
                type=payload.notification_type
            )

        # Attempt to deliver via Slack
        if payload.delivery_channels is None or "slack" in payload.delivery_channels:
            await self._deliver_slack(notification_id, payload)

        return notification_id

    async def create_change_impact_notifications(
        self,
        team_id: str,
        affected_users: Dict[str, List[str]],
        change_summary: str,
        source_type: str,
        source_id: str,
        source_url: Optional[str] = None,
        is_breaking: bool = False,
        change_author: Optional[str] = None,
        priority: str = "normal"
    ) -> List[str]:
        """
        Create notifications for all affected users about a change.
        
        Args:
            team_id: Team ID
            affected_users: Dict mapping user_identifier to list of their affected files
            change_summary: Human-readable summary of the change
            source_type: Type of change (commit, pr, etc.)
            source_id: ID of the change
            source_url: URL to the change
            is_breaking: Whether this is a breaking change
            change_author: Who made the change
            priority: Notification priority
        
        Returns:
            List of notification IDs created
        """
        notification_ids = []
        
        notification_type = (
            NotificationType.BREAKING_CHANGE.value 
            if is_breaking 
            else NotificationType.CHANGE_IMPACT.value
        )
        
        for user_identifier, affected_files in affected_users.items():
            # Skip the author
            if user_identifier == change_author:
                continue
            
            # Create personalized content
            if len(affected_files) == 1:
                content = f"A file you work on was modified: `{affected_files[0]}`\n\n{change_summary}"
            else:
                files_preview = affected_files[:5]
                content = f"{len(affected_files)} files you work on were modified:\n"
                content += "\n".join(f"• `{f}`" for f in files_preview)
                if len(affected_files) > 5:
                    content += f"\n... and {len(affected_files) - 5} more"
                content += f"\n\n{change_summary}"
            
            title = "⚠️ Breaking Change Alert" if is_breaking else "📝 Code Change Notification"
            
            payload = NotificationPayload(
                user_identifier=user_identifier,
                team_id=team_id,
                notification_type=notification_type,
                title=title,
                content=content,
                source_type=source_type,
                source_id=source_id,
                source_url=source_url,
                related_change={
                    "author": change_author,
                    "is_breaking": is_breaking,
                    "files_count": len(affected_files)
                },
                affected_files=affected_files,
                priority=priority
            )
            
            notification_id = await self.create_notification(payload)
            notification_ids.append(notification_id)
        
        logger.info(
            "Created change impact notifications",
            count=len(notification_ids),
            is_breaking=is_breaking
        )
        
        return notification_ids

    async def _deliver_slack(
        self,
        notification_id: str,
        payload: NotificationPayload
    ) -> bool:
        """
        Deliver notification via Slack DM.
        """
        if not self.slack_client:
            logger.debug("Slack client not configured, skipping Slack delivery")
            return False

        try:
            # Find user's Slack ID
            slack_user_id = await self._resolve_slack_user(payload.user_identifier)
            
            if not slack_user_id:
                logger.warning(
                    "Could not resolve Slack user",
                    user=payload.user_identifier
                )
                return False

            # Format message
            blocks = self._format_slack_message(payload)
            
            # Send DM
            response = await self.slack_client.chat_postMessage(
                channel=slack_user_id,  # DM by user ID
                text=payload.title,
                blocks=blocks
            )
            
            if response.get("ok"):
                # Update notification with Slack message TS
                await self._update_notification_delivered(
                    notification_id,
                    slack_message_ts=response.get("ts")
                )
                logger.info(
                    "Notification delivered via Slack",
                    notification_id=notification_id,
                    user=payload.user_identifier
                )
                return True
            else:
                logger.error(
                    "Slack delivery failed",
                    error=response.get("error")
                )
                return False

        except Exception as e:
            logger.error("Slack delivery error", error=str(e))
            return False

    async def _resolve_slack_user(self, user_identifier: str) -> Optional[str]:
        """
        Resolve a user identifier to Slack user ID.
        
        Tries:
        1. If it looks like a Slack ID, use directly
        2. Look up in database
        3. Search Slack by email/username
        """
        # If already a Slack ID
        if user_identifier.startswith("U") and len(user_identifier) == 11:
            return user_identifier
        
        # Check database for linked Slack ID
        async with get_session() as session:
            result = await session.execute(
                select(User).where(
                    or_(
                        User.github_username == user_identifier,
                        User.slack_username == user_identifier,
                        User.email == user_identifier
                    )
                )
            )
            user = result.scalar_one_or_none()
            
            if user and user.slack_id:
                return user.slack_id
        
        # Try to find by username in Slack
        if self.slack_client:
            try:
                # Note: This requires users:read scope
                response = await self.slack_client.users_lookupByEmail(
                    email=f"{user_identifier}@company.com"  # Assumption
                )
                if response.get("ok"):
                    return response.get("user", {}).get("id")
            except Exception:
                pass  # Email lookup failed

        return None

    def _format_slack_message(self, payload: NotificationPayload) -> List[Dict]:
        """Format notification as Slack Block Kit message."""
        blocks = [
            {
                "type": "header",
                "text": {
                    "type": "plain_text",
                    "text": payload.title,
                    "emoji": True
                }
            },
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": payload.content[:2900]  # Slack limit
                }
            }
        ]
        
        # Add source link if available
        if payload.source_url:
            blocks.append({
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": f"<{payload.source_url}|View Change>"
                }
            })
        
        # Add action buttons
        actions = []
        if payload.source_url:
            actions.append({
                "type": "button",
                "text": {
                    "type": "plain_text",
                    "text": "View Details",
                    "emoji": True
                },
                "url": payload.source_url
            })
        
        actions.append({
            "type": "button",
            "text": {
                "type": "plain_text",
                "text": "Mark as Read",
                "emoji": True
            },
            "action_id": f"notification_read_{payload.user_identifier}"
        })
        
        if actions:
            blocks.append({
                "type": "actions",
                "elements": actions
            })
        
        return blocks

    async def _update_notification_delivered(
        self,
        notification_id: str,
        slack_message_ts: Optional[str] = None
    ) -> None:
        """Mark notification as delivered."""
        async with get_session() as session:
            result = await session.execute(
                select(Notification).where(Notification.id == notification_id)
            )
            notification = result.scalar_one_or_none()
            
            if notification:
                notification.delivered_via_slack = True
                if slack_message_ts:
                    notification.slack_message_ts = slack_message_ts

    async def mark_as_read(
        self,
        notification_id: str
    ) -> bool:
        """Mark a notification as read."""
        async with get_session() as session:
            result = await session.execute(
                select(Notification).where(Notification.id == notification_id)
            )
            notification = result.scalar_one_or_none()
            
            if notification:
                notification.is_read = True
                notification.read_at = datetime.utcnow()
                return True
            return False

    async def get_user_notifications(
        self,
        user_identifier: str,
        team_id: Optional[str] = None,
        unread_only: bool = False,
        limit: int = 50
    ) -> List[Dict]:
        """Get notifications for a user."""
        async with get_session() as session:
            query = select(Notification).where(
                Notification.user_identifier == user_identifier
            )
            
            if team_id:
                query = query.where(Notification.team_id == team_id)
            if unread_only:
                query = query.where(Notification.is_read.is_(False))
            
            query = query.order_by(Notification.created_at.desc()).limit(limit)
            
            result = await session.execute(query)
            notifications = result.scalars().all()
            
            return [
                {
                    "id": n.id,
                    "type": n.notification_type,
                    "title": n.title,
                    "content": n.content,
                    "source_url": n.source_url,
                    "priority": n.priority,
                    "is_read": n.is_read,
                    "created_at": n.created_at.isoformat()
                }
                for n in notifications
            ]


# Singleton instance
notification_service = NotificationService()

