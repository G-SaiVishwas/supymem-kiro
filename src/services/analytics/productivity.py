"""
Productivity Analytics Service

Aggregates user activities into productivity metrics:
- Daily/weekly productivity snapshots
- Team-wide analytics
- Trend analysis
"""

from typing import Dict, List, Optional, Any
from datetime import datetime, date, timedelta
from dataclasses import dataclass
import uuid

from sqlalchemy import select, func, and_, cast, Date
from sqlalchemy.ext.asyncio import AsyncSession

from src.database.session import get_session
from src.database.models import (
    UserActivity, ProductivitySnapshot, KnowledgeEntry,
    Decision
)
from src.config.logging import get_logger

logger = get_logger(__name__)


@dataclass
class UserProductivitySummary:
    """Productivity summary for a user."""
    user_identifier: str
    period_start: date
    period_end: date
    
    # Activity counts
    commits: int
    prs_opened: int
    prs_merged: int
    prs_reviewed: int
    tasks_completed: int
    tasks_created: int
    
    # Code metrics
    lines_added: int
    lines_removed: int
    files_changed: int
    
    # Knowledge contributions
    knowledge_entries: int
    decisions_made: int
    
    # Derived metrics
    productivity_score: float
    activity_trend: str  # increasing, stable, decreasing
    most_active_day: Optional[str]


class ProductivityAnalytics:
    """
    Service for generating productivity analytics.
    """

    # Weights for productivity score calculation
    WEIGHTS = {
        "commit": 1.0,
        "pr_opened": 3.0,
        "pr_merged": 5.0,
        "pr_review": 2.0,
        "task_completed": 4.0,
        "task_created": 1.5,
        "knowledge_entry": 1.0,
        "decision": 2.0,
    }

    async def generate_daily_snapshot(
        self,
        user_identifier: str,
        team_id: str,
        snapshot_date: Optional[date] = None
    ) -> str:
        """
        Generate a daily productivity snapshot for a user.
        
        Returns:
            Snapshot ID
        """
        snapshot_date = snapshot_date or (datetime.utcnow() - timedelta(days=1)).date()
        snapshot_id = str(uuid.uuid4())
        
        # Get activity counts
        start = datetime.combine(snapshot_date, datetime.min.time())
        end = datetime.combine(snapshot_date, datetime.max.time())
        
        async with get_session() as session:
            # Count activities by type
            activity_counts = await self._count_activities(
                session, user_identifier, team_id, start, end
            )
            
            # Get code metrics
            code_metrics = await self._get_code_metrics(
                session, user_identifier, team_id, start, end
            )
            
            # Calculate productivity score
            score = self._calculate_score(activity_counts, code_metrics)
            
            # Store snapshot
            snapshot = ProductivitySnapshot(
                id=snapshot_id,
                user_identifier=user_identifier,
                team_id=team_id,
                snapshot_date=snapshot_date,
                commits_count=activity_counts.get("commit", 0),
                prs_opened=activity_counts.get("pr_opened", 0),
                prs_merged=activity_counts.get("pr_merged", 0),
                prs_reviewed=activity_counts.get("pr_review", 0),
                tasks_created=activity_counts.get("task_created", 0),
                tasks_completed=activity_counts.get("task_completed", 0),
                lines_added=code_metrics.get("lines_added", 0),
                lines_removed=code_metrics.get("lines_removed", 0),
                files_changed=code_metrics.get("files_changed", 0),
                productivity_score=score,
                metrics_detail={
                    "activity_counts": activity_counts,
                    "code_metrics": code_metrics
                }
            )
            session.add(snapshot)
        
        logger.info(
            "Daily snapshot generated",
            user=user_identifier,
            date=str(snapshot_date),
            score=score
        )
        
        return snapshot_id

    async def get_user_productivity(
        self,
        user_identifier: str,
        team_id: str,
        days: int = 7
    ) -> UserProductivitySummary:
        """
        Get productivity summary for a user.
        """
        end_date = datetime.utcnow().date()
        start_date = end_date - timedelta(days=days)
        
        start = datetime.combine(start_date, datetime.min.time())
        end = datetime.combine(end_date, datetime.max.time())
        
        async with get_session() as session:
            # Get activity counts
            activity_counts = await self._count_activities(
                session, user_identifier, team_id, start, end
            )
            
            # Get code metrics
            code_metrics = await self._get_code_metrics(
                session, user_identifier, team_id, start, end
            )
            
            # Get knowledge contributions
            knowledge_count = await self._count_knowledge_entries(
                session, user_identifier, team_id, start, end
            )
            
            # Get decisions made
            decisions_count = await self._count_decisions(
                session, user_identifier, team_id, start, end
            )
            
            # Calculate score
            score = self._calculate_score(activity_counts, code_metrics)
            
            # Get trend
            trend = await self._calculate_trend(
                session, user_identifier, team_id, days
            )
            
            # Find most active day
            most_active = await self._find_most_active_day(
                session, user_identifier, team_id, start, end
            )
            
            return UserProductivitySummary(
                user_identifier=user_identifier,
                period_start=start_date,
                period_end=end_date,
                commits=activity_counts.get("commit", 0),
                prs_opened=activity_counts.get("pr_opened", 0),
                prs_merged=activity_counts.get("pr_merged", 0),
                prs_reviewed=activity_counts.get("pr_review", 0),
                tasks_completed=activity_counts.get("task_completed", 0),
                tasks_created=activity_counts.get("task_created", 0),
                lines_added=code_metrics.get("lines_added", 0),
                lines_removed=code_metrics.get("lines_removed", 0),
                files_changed=code_metrics.get("files_changed", 0),
                knowledge_entries=knowledge_count,
                decisions_made=decisions_count,
                productivity_score=score,
                activity_trend=trend,
                most_active_day=most_active
            )

    async def get_team_productivity(
        self,
        team_id: str,
        days: int = 7
    ) -> Dict[str, Any]:
        """
        Get team-wide productivity metrics.
        """
        end_date = datetime.utcnow().date()
        start_date = end_date - timedelta(days=days)
        
        start = datetime.combine(start_date, datetime.min.time())
        end = datetime.combine(end_date, datetime.max.time())
        
        async with get_session() as session:
            # Get all team members with activity
            result = await session.execute(
                select(UserActivity.user_identifier)
                .where(
                    and_(
                        UserActivity.team_id == team_id,
                        UserActivity.timestamp >= start,
                        UserActivity.timestamp <= end
                    )
                )
                .distinct()
            )
            users = [r[0] for r in result.all()]
            
            # Get per-user summaries
            user_summaries = []
            for user in users:
                summary = await self.get_user_productivity(user, team_id, days)
                user_summaries.append({
                    "user": user,
                    "productivity_score": summary.productivity_score,
                    "commits": summary.commits,
                    "prs_merged": summary.prs_merged,
                    "tasks_completed": summary.tasks_completed,
                    "lines_added": summary.lines_added,
                    "trend": summary.activity_trend
                })
            
            # Sort by productivity
            user_summaries.sort(key=lambda x: x["productivity_score"], reverse=True)
            
            # Calculate team totals
            totals = {
                "total_commits": sum(u["commits"] for u in user_summaries),
                "total_prs_merged": sum(u["prs_merged"] for u in user_summaries),
                "total_tasks_completed": sum(u["tasks_completed"] for u in user_summaries),
                "total_lines_added": sum(u["lines_added"] for u in user_summaries),
                "average_productivity": (
                    sum(u["productivity_score"] for u in user_summaries) / len(user_summaries)
                    if user_summaries else 0
                )
            }
            
            return {
                "team_id": team_id,
                "period_start": str(start_date),
                "period_end": str(end_date),
                "active_users": len(users),
                "user_rankings": user_summaries[:10],  # Top 10
                "totals": totals
            }

    async def get_daily_breakdown(
        self,
        user_identifier: str,
        team_id: str,
        days: int = 7
    ) -> List[Dict]:
        """
        Get day-by-day productivity breakdown.
        """
        end_date = datetime.utcnow().date()
        
        async with get_session() as session:
            result = await session.execute(
                select(ProductivitySnapshot)
                .where(
                    and_(
                        ProductivitySnapshot.user_identifier == user_identifier,
                        ProductivitySnapshot.team_id == team_id,
                        ProductivitySnapshot.snapshot_date >= end_date - timedelta(days=days)
                    )
                )
                .order_by(ProductivitySnapshot.snapshot_date)
            )
            snapshots = result.scalars().all()
            
            return [
                {
                    "date": str(s.snapshot_date),
                    "commits": s.commits_count,
                    "prs_opened": s.prs_opened,
                    "prs_merged": s.prs_merged,
                    "tasks_completed": s.tasks_completed,
                    "lines_added": s.lines_added,
                    "productivity_score": s.productivity_score
                }
                for s in snapshots
            ]

    async def _count_activities(
        self,
        session: AsyncSession,
        user_identifier: str,
        team_id: str,
        start: datetime,
        end: datetime
    ) -> Dict[str, int]:
        """Count activities by type."""
        result = await session.execute(
            select(
                UserActivity.activity_type,
                func.count(UserActivity.id).label("count")
            )
            .where(
                and_(
                    UserActivity.user_identifier == user_identifier,
                    UserActivity.team_id == team_id,
                    UserActivity.timestamp >= start,
                    UserActivity.timestamp <= end
                )
            )
            .group_by(UserActivity.activity_type)
        )
        
        return {row[0]: row[1] for row in result.all()}

    async def _get_code_metrics(
        self,
        session: AsyncSession,
        user_identifier: str,
        team_id: str,
        start: datetime,
        end: datetime
    ) -> Dict[str, int]:
        """Get aggregated code metrics."""
        result = await session.execute(
            select(
                func.sum(UserActivity.lines_added).label("added"),
                func.sum(UserActivity.lines_removed).label("removed"),
                func.sum(UserActivity.files_changed).label("files")
            )
            .where(
                and_(
                    UserActivity.user_identifier == user_identifier,
                    UserActivity.team_id == team_id,
                    UserActivity.timestamp >= start,
                    UserActivity.timestamp <= end
                )
            )
        )
        row = result.one()
        
        return {
            "lines_added": row[0] or 0,
            "lines_removed": row[1] or 0,
            "files_changed": row[2] or 0
        }

    async def _count_knowledge_entries(
        self,
        session: AsyncSession,
        user_identifier: str,
        team_id: str,
        start: datetime,
        end: datetime
    ) -> int:
        """Count knowledge entries created."""
        result = await session.execute(
            select(func.count(KnowledgeEntry.id))
            .where(
                and_(
                    KnowledgeEntry.user_id == user_identifier,
                    KnowledgeEntry.team_id == team_id,
                    KnowledgeEntry.created_at >= start,
                    KnowledgeEntry.created_at <= end
                )
            )
        )
        return result.scalar() or 0

    async def _count_decisions(
        self,
        session: AsyncSession,
        user_identifier: str,
        team_id: str,
        start: datetime,
        end: datetime
    ) -> int:
        """Count decisions made."""
        result = await session.execute(
            select(func.count(Decision.id))
            .where(
                and_(
                    Decision.decided_by == user_identifier,
                    Decision.team_id == team_id,
                    Decision.created_at >= start,
                    Decision.created_at <= end
                )
            )
        )
        return result.scalar() or 0

    async def _calculate_trend(
        self,
        session: AsyncSession,
        user_identifier: str,
        team_id: str,
        days: int
    ) -> str:
        """Calculate activity trend."""
        # Compare this period to previous period
        now = datetime.utcnow()
        current_start = now - timedelta(days=days)
        previous_start = now - timedelta(days=days * 2)
        
        # Current period count
        current = await session.execute(
            select(func.count(UserActivity.id))
            .where(
                and_(
                    UserActivity.user_identifier == user_identifier,
                    UserActivity.team_id == team_id,
                    UserActivity.timestamp >= current_start
                )
            )
        )
        current_count = current.scalar() or 0
        
        # Previous period count
        previous = await session.execute(
            select(func.count(UserActivity.id))
            .where(
                and_(
                    UserActivity.user_identifier == user_identifier,
                    UserActivity.team_id == team_id,
                    UserActivity.timestamp >= previous_start,
                    UserActivity.timestamp < current_start
                )
            )
        )
        previous_count = previous.scalar() or 0
        
        if previous_count == 0:
            return "stable"
        
        change = (current_count - previous_count) / previous_count
        
        if change > 0.1:
            return "increasing"
        elif change < -0.1:
            return "decreasing"
        return "stable"

    async def _find_most_active_day(
        self,
        session: AsyncSession,
        user_identifier: str,
        team_id: str,
        start: datetime,
        end: datetime
    ) -> Optional[str]:
        """Find the most active day."""
        result = await session.execute(
            select(
                cast(UserActivity.timestamp, Date).label("day"),
                func.count(UserActivity.id).label("count")
            )
            .where(
                and_(
                    UserActivity.user_identifier == user_identifier,
                    UserActivity.team_id == team_id,
                    UserActivity.timestamp >= start,
                    UserActivity.timestamp <= end
                )
            )
            .group_by(cast(UserActivity.timestamp, Date))
            .order_by(func.count(UserActivity.id).desc())
            .limit(1)
        )
        row = result.first()
        
        if row:
            return row[0].strftime("%A")  # Day name
        return None

    def _calculate_score(
        self,
        activity_counts: Dict[str, int],
        code_metrics: Dict[str, int]
    ) -> float:
        """Calculate weighted productivity score."""
        score = 0.0
        
        for activity_type, count in activity_counts.items():
            weight = self.WEIGHTS.get(activity_type, 1.0)
            score += count * weight
        
        # Add code contribution bonus
        lines = code_metrics.get("lines_added", 0) + code_metrics.get("lines_removed", 0)
        score += (lines / 100) * 0.5  # Small bonus per 100 lines
        
        return round(score, 2)


# Singleton instance
productivity_analytics = ProductivityAnalytics()

