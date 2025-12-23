"""
Analytics API Routes

Endpoints for productivity analytics and activity tracking.
"""

from typing import Optional, List
from datetime import datetime
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from src.services.analytics import activity_tracker, productivity_analytics
from src.config.logging import get_logger

logger = get_logger(__name__)
router = APIRouter()


# ============================================================================
# REQUEST/RESPONSE MODELS
# ============================================================================

class ActivityItem(BaseModel):
    id: str
    type: str
    title: str
    description: Optional[str]
    source: Optional[str]
    source_url: Optional[str]
    related_files: List[str] = []
    related_repo: Optional[str]
    lines_added: int = 0
    lines_removed: int = 0
    timestamp: str


class ActivitySummary(BaseModel):
    period_days: int
    activity_counts: dict
    total_lines_added: int
    total_lines_removed: int
    total_files_changed: int
    total_activities: int


class UserProductivity(BaseModel):
    user_identifier: str
    period_start: str
    period_end: str
    commits: int
    prs_opened: int
    prs_merged: int
    prs_reviewed: int
    tasks_completed: int
    tasks_created: int
    lines_added: int
    lines_removed: int
    files_changed: int
    knowledge_entries: int
    decisions_made: int
    productivity_score: float
    activity_trend: str
    most_active_day: Optional[str]


class TeamProductivity(BaseModel):
    team_id: str
    period_start: str
    period_end: str
    active_users: int
    user_rankings: List[dict]
    totals: dict


class DailyBreakdown(BaseModel):
    date: str
    commits: int
    prs_opened: int
    prs_merged: int
    tasks_completed: int
    lines_added: int
    productivity_score: float


# ============================================================================
# ACTIVITY ENDPOINTS
# ============================================================================

@router.get("/activities", response_model=List[ActivityItem])
async def get_user_activities(
    user: str,
    team_id: str = "default",
    activity_type: Optional[str] = None,
    since: Optional[datetime] = None,
    limit: int = 50
):
    """
    Get activities for a user.
    
    Filter by:
    - activity_type: commit, pr_opened, pr_merged, pr_review, task_completed, etc.
    - since: Only activities after this timestamp
    """
    try:
        activity_types = [activity_type] if activity_type else None
        
        activities = await activity_tracker.get_user_activities(
            user_identifier=user,
            team_id=team_id,
            activity_types=activity_types,
            since=since,
            limit=limit
        )
        
        return [ActivityItem(**a) for a in activities]
        
    except Exception as e:
        logger.error("Get activities error", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/activities/summary", response_model=ActivitySummary)
async def get_activity_summary(
    user: str,
    team_id: str = "default",
    days: int = 7
):
    """
    Get activity summary for a user.
    """
    try:
        summary = await activity_tracker.get_activity_summary(
            user_identifier=user,
            team_id=team_id,
            days=days
        )
        
        return ActivitySummary(**summary)
        
    except Exception as e:
        logger.error("Get summary error", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/activities/team", response_model=List[dict])
async def get_team_activities(
    team_id: str = "default",
    since: Optional[datetime] = None,
    limit: int = 100
):
    """
    Get recent activities for a team.
    """
    try:
        activities = await activity_tracker.get_team_activities(
            team_id=team_id,
            since=since,
            limit=limit
        )
        
        return activities
        
    except Exception as e:
        logger.error("Get team activities error", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# PRODUCTIVITY ENDPOINTS
# ============================================================================

@router.get("/productivity/user", response_model=UserProductivity)
async def get_user_productivity(
    user: str,
    team_id: str = "default",
    days: int = 7
):
    """
    Get productivity metrics for a user.
    
    Returns:
    - Activity counts (commits, PRs, tasks, etc.)
    - Code metrics (lines, files)
    - Productivity score
    - Activity trend
    """
    try:
        summary = await productivity_analytics.get_user_productivity(
            user_identifier=user,
            team_id=team_id,
            days=days
        )
        
        return UserProductivity(
            user_identifier=summary.user_identifier,
            period_start=str(summary.period_start),
            period_end=str(summary.period_end),
            commits=summary.commits,
            prs_opened=summary.prs_opened,
            prs_merged=summary.prs_merged,
            prs_reviewed=summary.prs_reviewed,
            tasks_completed=summary.tasks_completed,
            tasks_created=summary.tasks_created,
            lines_added=summary.lines_added,
            lines_removed=summary.lines_removed,
            files_changed=summary.files_changed,
            knowledge_entries=summary.knowledge_entries,
            decisions_made=summary.decisions_made,
            productivity_score=summary.productivity_score,
            activity_trend=summary.activity_trend,
            most_active_day=summary.most_active_day
        )
        
    except Exception as e:
        logger.error("Get user productivity error", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/productivity/team", response_model=TeamProductivity)
async def get_team_productivity(
    team_id: str = "default",
    days: int = 7
):
    """
    Get team-wide productivity metrics.
    
    Returns:
    - User rankings by productivity
    - Team totals
    - Active user count
    """
    try:
        result = await productivity_analytics.get_team_productivity(
            team_id=team_id,
            days=days
        )
        
        return TeamProductivity(**result)
        
    except Exception as e:
        logger.error("Get team productivity error", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/productivity/daily", response_model=List[DailyBreakdown])
async def get_daily_breakdown(
    user: str,
    team_id: str = "default",
    days: int = 7
):
    """
    Get day-by-day productivity breakdown for a user.
    """
    try:
        breakdown = await productivity_analytics.get_daily_breakdown(
            user_identifier=user,
            team_id=team_id,
            days=days
        )
        
        return [DailyBreakdown(**d) for d in breakdown]
        
    except Exception as e:
        logger.error("Get daily breakdown error", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/productivity/snapshot")
async def generate_snapshot(
    user: str,
    team_id: str = "default"
):
    """
    Generate a productivity snapshot for a user.
    
    Typically called by a background job daily.
    """
    try:
        snapshot_id = await productivity_analytics.generate_daily_snapshot(
            user_identifier=user,
            team_id=team_id
        )
        
        return {"success": True, "snapshot_id": snapshot_id}
        
    except Exception as e:
        logger.error("Generate snapshot error", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))

