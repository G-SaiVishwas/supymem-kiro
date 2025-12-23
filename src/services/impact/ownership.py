"""
File Ownership Tracking

Tracks who works on what files based on commit history.
Used for impact analysis - determining who to notify when files change.
"""

from typing import Dict, List, Optional
from datetime import datetime, timedelta
from dataclasses import dataclass
import uuid

from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from src.database.session import get_session
from src.database.models import FileOwnership
from src.config.logging import get_logger

logger = get_logger(__name__)


@dataclass
class FileOwner:
    """Represents ownership of a file."""
    user_identifier: str
    user_id: Optional[str]
    ownership_score: float  # 0-1
    total_commits: int
    last_commit_at: Optional[datetime]
    is_primary_owner: bool


class FileOwnershipTracker:
    """
    Tracks and calculates file ownership based on commit history.
    
    Ownership is calculated based on:
    - Number of commits to the file
    - Recency of commits (recent work counts more)
    - Lines added/removed
    """

    # Time decay factor - commits older than this have reduced weight
    RECENCY_WINDOW_DAYS = 90
    
    # Minimum score to be considered an owner
    MIN_OWNERSHIP_SCORE = 0.1

    async def update_ownership_from_commit(
        self,
        repo: str,
        team_id: str,
        author: str,
        files: List[str],
        lines_added: int = 0,
        lines_removed: int = 0,
        commit_time: Optional[datetime] = None
    ) -> None:
        """
        Update file ownership based on a new commit.
        
        Args:
            repo: Repository full name
            team_id: Team ID
            author: GitHub username of commit author
            files: List of file paths modified
            lines_added: Total lines added
            lines_removed: Total lines removed
            commit_time: Time of commit
        """
        if not files:
            return
            
        commit_time = commit_time or datetime.utcnow()
        lines_per_file = (lines_added + lines_removed) // max(len(files), 1)
        
        async with get_session() as session:
            for file_path in files:
                await self._update_file_owner(
                    session=session,
                    repo=repo,
                    team_id=team_id,
                    file_path=file_path,
                    user_identifier=author,
                    lines_added=lines_per_file // 2,
                    lines_removed=lines_per_file // 2,
                    commit_time=commit_time
                )
            
            # Recalculate ownership scores for affected files
            await self._recalculate_scores(session, repo, files)

    async def _update_file_owner(
        self,
        session: AsyncSession,
        repo: str,
        team_id: str,
        file_path: str,
        user_identifier: str,
        lines_added: int,
        lines_removed: int,
        commit_time: datetime
    ) -> None:
        """Update or create file ownership record."""
        # Find existing record
        result = await session.execute(
            select(FileOwnership).where(
                and_(
                    FileOwnership.file_path == file_path,
                    FileOwnership.repo == repo,
                    FileOwnership.user_identifier == user_identifier
                )
            )
        )
        ownership = result.scalar_one_or_none()

        if ownership:
            # Update existing
            ownership.total_commits += 1
            ownership.total_lines_added += lines_added
            ownership.total_lines_removed += lines_removed
            ownership.last_commit_at = commit_time
            ownership.updated_at = datetime.utcnow()
        else:
            # Create new
            ownership = FileOwnership(
                id=str(uuid.uuid4()),
                file_path=file_path,
                repo=repo,
                team_id=team_id,
                user_identifier=user_identifier,
                total_commits=1,
                total_lines_added=lines_added,
                total_lines_removed=lines_removed,
                first_commit_at=commit_time,
                last_commit_at=commit_time,
                ownership_score=0.0,  # Will be calculated
                recent_activity_score=0.0
            )
            session.add(ownership)

    async def _recalculate_scores(
        self,
        session: AsyncSession,
        repo: str,
        files: List[str]
    ) -> None:
        """Recalculate ownership scores for files."""
        now = datetime.utcnow()
        recency_cutoff = now - timedelta(days=self.RECENCY_WINDOW_DAYS)

        for file_path in files:
            # Get all owners of this file
            result = await session.execute(
                select(FileOwnership).where(
                    and_(
                        FileOwnership.file_path == file_path,
                        FileOwnership.repo == repo
                    )
                )
            )
            owners = result.scalars().all()

            if not owners:
                continue

            # Calculate total contributions
            total_commits = sum(o.total_commits for o in owners)
            total_lines = sum(o.total_lines_added + o.total_lines_removed for o in owners)

            for owner in owners:
                # Base score from commits
                commit_score = owner.total_commits / max(total_commits, 1)
                
                # Lines score
                lines_score = (owner.total_lines_added + owner.total_lines_removed) / max(total_lines, 1)
                
                # Recency bonus
                recency_score = 0.0
                if owner.last_commit_at and owner.last_commit_at > recency_cutoff:
                    days_ago = (now - owner.last_commit_at).days
                    recency_score = 1.0 - (days_ago / self.RECENCY_WINDOW_DAYS)
                
                # Combined score (weighted)
                owner.ownership_score = (
                    commit_score * 0.4 +
                    lines_score * 0.3 +
                    recency_score * 0.3
                )
                owner.recent_activity_score = recency_score

    async def get_file_owners(
        self,
        repo: str,
        file_path: str,
        min_score: Optional[float] = None
    ) -> List[FileOwner]:
        """
        Get owners of a file, sorted by ownership score.
        
        Args:
            repo: Repository full name
            file_path: Path to file
            min_score: Minimum ownership score to include
        
        Returns:
            List of FileOwner objects
        """
        min_score = min_score or self.MIN_OWNERSHIP_SCORE
        
        async with get_session() as session:
            result = await session.execute(
                select(FileOwnership).where(
                    and_(
                        FileOwnership.file_path == file_path,
                        FileOwnership.repo == repo,
                        FileOwnership.ownership_score >= min_score
                    )
                ).order_by(FileOwnership.ownership_score.desc())
            )
            records = result.scalars().all()

            if not records:
                return []

            # Find primary owner (highest score)
            max_score = max(r.ownership_score for r in records)

            return [
                FileOwner(
                    user_identifier=r.user_identifier,
                    user_id=r.user_id,
                    ownership_score=r.ownership_score,
                    total_commits=r.total_commits,
                    last_commit_at=r.last_commit_at,
                    is_primary_owner=(r.ownership_score == max_score)
                )
                for r in records
            ]

    async def get_affected_users(
        self,
        repo: str,
        files: List[str],
        exclude_user: Optional[str] = None,
        min_score: Optional[float] = None
    ) -> Dict[str, List[str]]:
        """
        Get users who would be affected by changes to files.
        
        Args:
            repo: Repository full name
            files: List of file paths that changed
            exclude_user: User to exclude (e.g., the one who made the change)
            min_score: Minimum ownership score to consider
        
        Returns:
            Dict mapping user_identifier to list of files they own
        """
        min_score = min_score or self.MIN_OWNERSHIP_SCORE
        affected: Dict[str, List[str]] = {}

        async with get_session() as session:
            for file_path in files:
                result = await session.execute(
                    select(FileOwnership).where(
                        and_(
                            FileOwnership.file_path == file_path,
                            FileOwnership.repo == repo,
                            FileOwnership.ownership_score >= min_score
                        )
                    )
                )
                records = result.scalars().all()

                for record in records:
                    if exclude_user and record.user_identifier == exclude_user:
                        continue
                    
                    if record.user_identifier not in affected:
                        affected[record.user_identifier] = []
                    affected[record.user_identifier].append(file_path)

        logger.info(
            "Found affected users",
            users_count=len(affected),
            files_count=len(files)
        )

        return affected

    async def get_user_files(
        self,
        user_identifier: str,
        repo: Optional[str] = None,
        team_id: Optional[str] = None,
        min_score: Optional[float] = None
    ) -> List[Dict]:
        """
        Get all files a user owns.
        
        Returns:
            List of dicts with file_path, repo, ownership_score
        """
        min_score = min_score or self.MIN_OWNERSHIP_SCORE

        async with get_session() as session:
            query = select(FileOwnership).where(
                and_(
                    FileOwnership.user_identifier == user_identifier,
                    FileOwnership.ownership_score >= min_score
                )
            )
            
            if repo:
                query = query.where(FileOwnership.repo == repo)
            if team_id:
                query = query.where(FileOwnership.team_id == team_id)
            
            result = await session.execute(
                query.order_by(FileOwnership.ownership_score.desc())
            )
            records = result.scalars().all()

            return [
                {
                    "file_path": r.file_path,
                    "repo": r.repo,
                    "ownership_score": r.ownership_score,
                    "total_commits": r.total_commits,
                    "last_commit_at": r.last_commit_at.isoformat() if r.last_commit_at else None
                }
                for r in records
            ]


# Singleton instance
ownership_tracker = FileOwnershipTracker()

