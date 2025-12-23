"""
Slack to Team Mapping Service

Maps Slack channels/workspaces to database teams for cross-platform integration.
"""

from typing import Optional
from sqlalchemy import select, or_
from sqlalchemy.dialects.postgresql import JSONB

from src.database.session import get_session
from src.database.models import Team, Organization
from src.config.logging import get_logger

logger = get_logger(__name__)

# Cache for team mappings (channel_id -> team_id)
_channel_team_cache: dict[str, str] = {}


async def get_team_id_for_slack_channel(channel_id: str, workspace_id: Optional[str] = None) -> str:
    """
    Get the database team ID for a Slack channel.
    
    Lookup priority:
    1. Check if channel is in any team's slack_channels list
    2. Check if workspace matches an organization's slack_workspace_id
    3. Fall back to using the channel_id as team_id (for unlinked channels)
    
    Args:
        channel_id: Slack channel ID (e.g., C0123456789)
        workspace_id: Slack workspace ID (optional)
        
    Returns:
        Database team ID or channel_id if no mapping found
    """
    # Check cache first
    if channel_id in _channel_team_cache:
        return _channel_team_cache[channel_id]
    
    try:
        async with get_session() as session:
            # Try to find team with this channel in slack_channels
            # PostgreSQL JSON array contains query
            result = await session.execute(
                select(Team).where(
                    Team.slack_channels.contains([channel_id])
                )
            )
            team = result.scalar_one_or_none()
            
            if team:
                logger.info("Found team for Slack channel", channel_id=channel_id, team_id=team.id)
                _channel_team_cache[channel_id] = team.id
                return team.id
            
            # If workspace_id provided, try to find org and default team
            if workspace_id:
                result = await session.execute(
                    select(Organization).where(
                        Organization.slack_workspace_id == workspace_id
                    )
                )
                org = result.scalar_one_or_none()
                
                if org:
                    # Get default team for this org
                    result = await session.execute(
                        select(Team).where(
                            Team.organization_id == org.id,
                            Team.is_default == True
                        )
                    )
                    default_team = result.scalar_one_or_none()
                    
                    if default_team:
                        logger.info("Using org default team for channel", 
                                   channel_id=channel_id, team_id=default_team.id)
                        _channel_team_cache[channel_id] = default_team.id
                        return default_team.id
            
            # No specific mapping - try to find any default team
            result = await session.execute(
                select(Team).where(Team.is_default == True).limit(1)
            )
            default_team = result.scalar_one_or_none()
            
            if default_team:
                logger.info("Using global default team for unmapped channel", 
                           channel_id=channel_id, team_id=default_team.id)
                _channel_team_cache[channel_id] = default_team.id
                return default_team.id
            
            # No mapping found - use channel_id as fallback
            logger.warning("No team mapping found for Slack channel", channel_id=channel_id)
            return channel_id
            
    except Exception as e:
        logger.error("Error looking up team for channel", channel_id=channel_id, error=str(e))
        return channel_id


async def get_user_id_for_slack_user(slack_user_id: str) -> Optional[str]:
    """
    Get the database user ID for a Slack user.
    
    Args:
        slack_user_id: Slack user ID
        
    Returns:
        Database user ID or None if not found
    """
    try:
        from src.database.models import User
        
        async with get_session() as session:
            result = await session.execute(
                select(User).where(User.slack_id == slack_user_id)
            )
            user = result.scalar_one_or_none()
            
            if user:
                return user.id
            return None
            
    except Exception as e:
        logger.error("Error looking up user", slack_user_id=slack_user_id, error=str(e))
        return None


async def link_channel_to_team(channel_id: str, team_id: str) -> bool:
    """
    Link a Slack channel to a database team.
    
    Args:
        channel_id: Slack channel ID
        team_id: Database team ID
        
    Returns:
        True if successful
    """
    try:
        async with get_session() as session:
            result = await session.execute(
                select(Team).where(Team.id == team_id)
            )
            team = result.scalar_one_or_none()
            
            if not team:
                logger.error("Team not found", team_id=team_id)
                return False
            
            # Add channel to slack_channels if not already present
            channels = team.slack_channels or []
            if channel_id not in channels:
                channels.append(channel_id)
                team.slack_channels = channels
                await session.commit()
                
                # Update cache
                _channel_team_cache[channel_id] = team_id
                logger.info("Linked channel to team", channel_id=channel_id, team_id=team_id)
            
            return True
            
    except Exception as e:
        logger.error("Error linking channel to team", error=str(e))
        return False


def clear_cache():
    """Clear the channel-team mapping cache."""
    _channel_team_cache.clear()

