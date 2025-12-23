"""
User Activity Tracking Service

Tracks all user activities for:
- Productivity analysis
- Automation triggers
- Activity feeds
"""

from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta, timezone
from dataclasses import dataclass
import uuid

from sqlalchemy import select, func, and_, desc

from src.database.session import get_session
from src.database.models import UserActivity, ActivityType
from src.config.logging import get_logger

logger = get_logger(__name__)


def ensure_naive_utc(dt: Optional[datetime]) -> Optional[datetime]:
    """Convert timezone-aware datetime to naive UTC datetime for database storage."""
    if dt is None:
        return None
    if dt.tzinfo is not None:
        # Convert to UTC and remove timezone info
        dt = dt.astimezone(timezone.utc).replace(tzinfo=None)
    return dt


@dataclass
class ActivityRecord:
    """Represents a single activity."""
    activity_type: str
    user_identifier: str
    team_id: str
    title: str
    description: Optional[str]
    source: str
    source_id: Optional[str]
    source_url: Optional[str]
    related_files: List[str]
    metadata: Dict[str, Any]
    timestamp: datetime


class ActivityTracker:
    """
    Tracks user activities across the system.
    """

    async def track(
        self,
        activity_type: str,
        user_identifier: str,
        team_id: str,
        title: str,
        description: Optional[str] = None,
        source: Optional[str] = None,
        source_id: Optional[str] = None,
        source_url: Optional[str] = None,
        related_files: Optional[List[str]] = None,
        related_task_id: Optional[str] = None,
        related_pr_number: Optional[int] = None,
        related_repo: Optional[str] = None,
        lines_added: int = 0,
        lines_removed: int = 0,
        files_changed: int = 0,
        metadata: Optional[Dict[str, Any]] = None,
        timestamp: Optional[datetime] = None
    ) -> str:
        """
        Track a new activity.
        
        Returns:
            Activity ID
        """
        activity_id = str(uuid.uuid4())
        # Ensure timestamp is naive UTC for database storage
        timestamp = ensure_naive_utc(timestamp) or datetime.utcnow()
        
        async with get_session() as session:
            activity = UserActivity(
                id=activity_id,
                user_identifier=user_identifier,
                team_id=team_id,
                activity_type=activity_type,
                title=title,
                description=description,
                source=source,
                source_id=source_id,
                source_url=source_url,
                related_files=related_files or [],
                related_task_id=related_task_id,
                related_pr_number=related_pr_number,
                related_repo=related_repo,
                lines_added=lines_added,
                lines_removed=lines_removed,
                files_changed=files_changed,
                metadata=metadata or {},
                timestamp=timestamp
            )
            session.add(activity)
            
            logger.debug(
                "Activity tracked",
                activity_id=activity_id,
                type=activity_type,
                user=user_identifier
            )
        
        return activity_id

    async def track_commit(
        self,
        user_identifier: str,
        team_id: str,
        repo: str,
        commit_sha: str,
        commit_message: str,
        files: List[str],
        lines_added: int = 0,
        lines_removed: int = 0,
        commit_url: Optional[str] = None,
        timestamp: Optional[datetime] = None
    ) -> str:
        """Track a commit activity."""
        return await self.track(
            activity_type=ActivityType.COMMIT.value,
            user_identifier=user_identifier,
            team_id=team_id,
            title=commit_message.split("\n")[0][:200],
            description=commit_message,
            source="github",
            source_id=commit_sha,
            source_url=commit_url,
            related_files=files,
            related_repo=repo,
            lines_added=lines_added,
            lines_removed=lines_removed,
            files_changed=len(files),
            metadata={"commit_sha": commit_sha, "repo": repo},
            timestamp=timestamp
        )

    async def track_pr(
        self,
        user_identifier: str,
        team_id: str,
        repo: str,
        pr_number: int,
        pr_title: str,
        action: str,  # opened, merged, closed
        files: Optional[List[str]] = None,
        pr_url: Optional[str] = None,
        timestamp: Optional[datetime] = None
    ) -> str:
        """Track a PR activity."""
        activity_type = {
            "opened": ActivityType.PR_OPENED.value,
            "merged": ActivityType.PR_MERGED.value,
            "closed": ActivityType.PR_CLOSED.value,
        }.get(action, ActivityType.PR_OPENED.value)
        
        return await self.track(
            activity_type=activity_type,
            user_identifier=user_identifier,
            team_id=team_id,
            title=f"PR #{pr_number}: {pr_title}",
            description=f"{action.capitalize()} PR #{pr_number}: {pr_title}",
            source="github",
            source_id=str(pr_number),
            source_url=pr_url,
            related_files=files or [],
            related_pr_number=pr_number,
            related_repo=repo,
            metadata={"pr_number": pr_number, "action": action, "repo": repo},
            timestamp=timestamp
        )

    async def track_pr_review(
        self,
        user_identifier: str,
        team_id: str,
        repo: str,
        pr_number: int,
        review_state: str,  # approved, changes_requested, commented
        pr_url: Optional[str] = None,
        timestamp: Optional[datetime] = None
    ) -> str:
        """Track a PR review."""
        return await self.track(
            activity_type=ActivityType.PR_REVIEW.value,
            user_identifier=user_identifier,
            team_id=team_id,
            title=f"Reviewed PR #{pr_number} ({review_state})",
            description=f"Review: {review_state}",
            source="github",
            source_id=f"review-{pr_number}",
            source_url=pr_url,
            related_pr_number=pr_number,
            related_repo=repo,
            metadata={"pr_number": pr_number, "review_state": review_state, "repo": repo},
            timestamp=timestamp
        )

    async def track_task_created(
        self,
        user_identifier: str,
        team_id: str,
        task_id: str,
        task_title: str,
        source: str = "api",
        timestamp: Optional[datetime] = None
    ) -> str:
        """Track task creation."""
        return await self.track(
            activity_type=ActivityType.TASK_CREATED.value,
            user_identifier=user_identifier,
            team_id=team_id,
            title=f"Created task: {task_title}",
            source=source,
            related_task_id=task_id,
            metadata={"task_id": task_id},
            timestamp=timestamp
        )

    async def track_task_completed(
        self,
        user_identifier: str,
        team_id: str,
        task_id: str,
        task_title: str,
        source: str = "api",
        timestamp: Optional[datetime] = None
    ) -> str:
        """Track task completion."""
        return await self.track(
            activity_type=ActivityType.TASK_COMPLETED.value,
            user_identifier=user_identifier,
            team_id=team_id,
            title=f"Completed task: {task_title}",
            source=source,
            related_task_id=task_id,
            metadata={"task_id": task_id},
            timestamp=timestamp
        )

    async def get_user_activities(
        self,
        user_identifier: str,
        team_id: Optional[str] = None,
        activity_types: Optional[List[str]] = None,
        since: Optional[datetime] = None,
        until: Optional[datetime] = None,
        limit: int = 100
    ) -> List[Dict]:
        """
        Get activities for a user.
        
        Args:
            user_identifier: User to get activities for
            team_id: Filter by team
            activity_types: Filter by activity types
            since: Only activities after this time
            until: Only activities before this time
            limit: Max number to return
        
        Returns:
            List of activity dicts
        """
        async with get_session() as session:
            query = select(UserActivity).where(
                UserActivity.user_identifier == user_identifier
            )
            
            if team_id:
                query = query.where(UserActivity.team_id == team_id)
            if activity_types:
                query = query.where(UserActivity.activity_type.in_(activity_types))
            if since:
                query = query.where(UserActivity.timestamp >= since)
            if until:
                query = query.where(UserActivity.timestamp <= until)
            
            query = query.order_by(desc(UserActivity.timestamp)).limit(limit)
            
            result = await session.execute(query)
            activities = result.scalars().all()
            
            return [
                {
                    "id": a.id,
                    "type": a.activity_type,
                    "title": a.title,
                    "description": a.description,
                    "source": a.source,
                    "source_url": a.source_url,
                    "related_files": a.related_files,
                    "related_repo": a.related_repo,
                    "lines_added": a.lines_added,
                    "lines_removed": a.lines_removed,
                    "timestamp": a.timestamp.isoformat()
                }
                for a in activities
            ]

    async def get_team_activities(
        self,
        team_id: str,
        since: Optional[datetime] = None,
        until: Optional[datetime] = None,
        limit: int = 100
    ) -> List[Dict]:
        """Get recent activities for a team."""
        async with get_session() as session:
            query = select(UserActivity).where(
                UserActivity.team_id == team_id
            )
            
            if since:
                query = query.where(UserActivity.timestamp >= since)
            if until:
                query = query.where(UserActivity.timestamp <= until)
            
            query = query.order_by(desc(UserActivity.timestamp)).limit(limit)
            
            result = await session.execute(query)
            activities = result.scalars().all()
            
            return [
                {
                    "id": a.id,
                    "type": a.activity_type,
                    "user": a.user_identifier,
                    "title": a.title,
                    "source": a.source,
                    "source_url": a.source_url,
                    "timestamp": a.timestamp.isoformat()
                }
                for a in activities
            ]

    async def get_activity_summary(
        self,
        user_identifier: str,
        team_id: str,
        days: int = 7
    ) -> Dict[str, Any]:
        """
        Get activity summary for a user.
        
        Returns:
            Summary with counts by activity type
        """
        since = datetime.utcnow() - timedelta(days=days)
        
        async with get_session() as session:
            # Count by type
            result = await session.execute(
                select(
                    UserActivity.activity_type,
                    func.count(UserActivity.id).label("count")
                ).where(
                    and_(
                        UserActivity.user_identifier == user_identifier,
                        UserActivity.team_id == team_id,
                        UserActivity.timestamp >= since
                    )
                ).group_by(UserActivity.activity_type)
            )
            type_counts = {row[0]: row[1] for row in result.all()}
            
            # Total lines
            result = await session.execute(
                select(
                    func.sum(UserActivity.lines_added).label("added"),
                    func.sum(UserActivity.lines_removed).label("removed"),
                    func.sum(UserActivity.files_changed).label("files")
                ).where(
                    and_(
                        UserActivity.user_identifier == user_identifier,
                        UserActivity.team_id == team_id,
                        UserActivity.timestamp >= since
                    )
                )
            )
            totals = result.one()
            
            return {
                "period_days": days,
                "activity_counts": type_counts,
                "total_lines_added": totals[0] or 0,
                "total_lines_removed": totals[1] or 0,
                "total_files_changed": totals[2] or 0,
                "total_activities": sum(type_counts.values())
            }

    async def check_user_completed_task_type(
        self,
        user_identifier: str,
        team_id: str,
        task_type: Optional[str] = None,
        task_keywords: Optional[List[str]] = None,
        since: Optional[datetime] = None
    ) -> bool:
        """
        Check if user has completed a task matching criteria.
        Used for automation triggers.
        
        Args:
            user_identifier: User to check
            team_id: Team ID
            task_type: Task category to match
            task_keywords: Keywords to search in task title
            since: Only check activities after this time
        
        Returns:
            True if matching task completion found
        """
        since = since or (datetime.utcnow() - timedelta(hours=24))
        
        async with get_session() as session:
            query = select(UserActivity).where(
                and_(
                    UserActivity.user_identifier == user_identifier,
                    UserActivity.team_id == team_id,
                    UserActivity.activity_type == ActivityType.TASK_COMPLETED.value,
                    UserActivity.timestamp >= since
                )
            )
            
            result = await session.execute(query)
            activities = result.scalars().all()
            
            for activity in activities:
                # Check keywords in title
                if task_keywords:
                    title_lower = activity.title.lower()
                    if any(kw.lower() in title_lower for kw in task_keywords):
                        return True
                
                # Check task type in extra_data
                if task_type:
                    extra_data = activity.extra_data or {}
                    if extra_data.get("task_type") == task_type:
                        return True
                    if task_type.lower() in activity.title.lower():
                        return True
                
                # If no filters, any completion matches
                if not task_keywords and not task_type:
                    return True
            
            return False


# Singleton instance
activity_tracker = ActivityTracker()

