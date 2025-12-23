"""
Impact Analysis Service

Analyzes changes and determines:
- Who is affected by a change
- Severity of impact
- What to notify users about
"""

from typing import Dict, List, Any
from dataclasses import dataclass
import uuid

from src.services.classification import classifier
from src.services.impact.ownership import ownership_tracker
from src.config.logging import get_logger

logger = get_logger(__name__)


@dataclass
class ImpactAnalysisResult:
    """Result of impact analysis."""
    change_id: str
    change_type: str  # commit, pr, file_change
    is_breaking: bool
    severity: str  # low, medium, high, critical
    affected_users: Dict[str, List[str]]  # user -> files they own that changed
    affected_files: List[str]
    summary: str
    details: Dict[str, Any]
    should_notify: bool
    notification_priority: str


class ImpactAnalyzer:
    """
    Analyzes the impact of changes on team members.
    """

    async def analyze_commit(
        self,
        repo: str,
        team_id: str,
        commit_sha: str,
        commit_message: str,
        author: str,
        files_changed: List[str],
        lines_added: int = 0,
        lines_removed: int = 0
    ) -> ImpactAnalysisResult:
        """
        Analyze the impact of a commit.
        
        Args:
            repo: Repository full name
            team_id: Team ID
            commit_sha: Commit SHA
            commit_message: Commit message
            author: Author username
            files_changed: List of files changed
            lines_added: Lines added
            lines_removed: Lines removed
        
        Returns:
            ImpactAnalysisResult
        """
        # Check for breaking changes
        content = f"Commit: {commit_message}\nFiles: {', '.join(files_changed[:20])}"
        breaking_result = await classifier.is_breaking_change(content, source="github_commit")
        
        is_breaking = breaking_result.get("is_breaking", False)
        severity = breaking_result.get("severity", "low")
        
        # Find affected users
        affected_users = await ownership_tracker.get_affected_users(
            repo=repo,
            files=files_changed,
            exclude_user=author
        )
        
        # Determine if we should notify
        should_notify = (
            is_breaking or 
            len(affected_users) > 0 or
            len(files_changed) > 10  # Large change
        )
        
        # Notification priority
        if is_breaking and severity in ("high", "critical"):
            notification_priority = "urgent"
        elif is_breaking:
            notification_priority = "high"
        elif len(affected_users) > 3:
            notification_priority = "normal"
        else:
            notification_priority = "low"

        # Generate summary
        summary = self._generate_commit_summary(
            commit_message=commit_message,
            author=author,
            files_count=len(files_changed),
            affected_count=len(affected_users),
            is_breaking=is_breaking
        )

        return ImpactAnalysisResult(
            change_id=commit_sha,
            change_type="commit",
            is_breaking=is_breaking,
            severity=severity,
            affected_users=affected_users,
            affected_files=files_changed,
            summary=summary,
            details={
                "author": author,
                "lines_added": lines_added,
                "lines_removed": lines_removed,
                "breaking_reason": breaking_result.get("reason", ""),
                "affected_areas": breaking_result.get("affected_areas", [])
            },
            should_notify=should_notify,
            notification_priority=notification_priority
        )

    async def analyze_pr(
        self,
        repo: str,
        team_id: str,
        pr_number: int,
        pr_title: str,
        pr_body: str,
        author: str,
        files_changed: List[str],
        action: str = "opened"  # opened, closed, merged
    ) -> ImpactAnalysisResult:
        """
        Analyze the impact of a pull request.
        """
        content = f"PR #{pr_number}: {pr_title}\n\n{pr_body}"
        breaking_result = await classifier.is_breaking_change(content, source="github_pr")
        
        is_breaking = breaking_result.get("is_breaking", False)
        severity = breaking_result.get("severity", "low")
        
        # Increase severity for merged PRs
        if action == "merged" and severity == "low":
            severity = "medium"
        
        # Find affected users
        affected_users = await ownership_tracker.get_affected_users(
            repo=repo,
            files=files_changed,
            exclude_user=author
        )
        
        # Should notify on merge or if breaking
        should_notify = (
            action == "merged" or
            is_breaking or
            (action == "opened" and len(affected_users) > 2)
        )
        
        # Notification priority
        if is_breaking and action == "merged":
            notification_priority = "urgent"
        elif is_breaking:
            notification_priority = "high"
        elif action == "merged":
            notification_priority = "normal"
        else:
            notification_priority = "low"

        summary = self._generate_pr_summary(
            pr_number=pr_number,
            pr_title=pr_title,
            author=author,
            action=action,
            files_count=len(files_changed),
            affected_count=len(affected_users),
            is_breaking=is_breaking
        )

        return ImpactAnalysisResult(
            change_id=f"pr-{pr_number}",
            change_type="pr",
            is_breaking=is_breaking,
            severity=severity,
            affected_users=affected_users,
            affected_files=files_changed,
            summary=summary,
            details={
                "pr_number": pr_number,
                "pr_title": pr_title,
                "author": author,
                "action": action,
                "breaking_reason": breaking_result.get("reason", ""),
                "affected_areas": breaking_result.get("affected_areas", [])
            },
            should_notify=should_notify,
            notification_priority=notification_priority
        )

    async def analyze_files_changed(
        self,
        repo: str,
        team_id: str,
        files: List[str],
        change_author: str,
        change_description: str = ""
    ) -> ImpactAnalysisResult:
        """
        Simple file change analysis.
        """
        affected_users = await ownership_tracker.get_affected_users(
            repo=repo,
            files=files,
            exclude_user=change_author
        )

        should_notify = len(affected_users) > 0
        
        return ImpactAnalysisResult(
            change_id=str(uuid.uuid4()),
            change_type="file_change",
            is_breaking=False,
            severity="low",
            affected_users=affected_users,
            affected_files=files,
            summary=f"{change_author} modified {len(files)} files",
            details={"description": change_description},
            should_notify=should_notify,
            notification_priority="low"
        )

    def _generate_commit_summary(
        self,
        commit_message: str,
        author: str,
        files_count: int,
        affected_count: int,
        is_breaking: bool
    ) -> str:
        """Generate a human-readable commit summary."""
        parts = []
        
        if is_breaking:
            parts.append("⚠️ BREAKING CHANGE:")
        
        # First line of commit message
        first_line = commit_message.split("\n")[0][:100]
        parts.append(f"{author} committed: \"{first_line}\"")
        parts.append(f"({files_count} files changed")
        
        if affected_count > 0:
            parts.append(f", affects {affected_count} team members)")
        else:
            parts.append(")")
            
        return " ".join(parts)

    def _generate_pr_summary(
        self,
        pr_number: int,
        pr_title: str,
        author: str,
        action: str,
        files_count: int,
        affected_count: int,
        is_breaking: bool
    ) -> str:
        """Generate a human-readable PR summary."""
        parts = []
        
        if is_breaking:
            parts.append("⚠️ BREAKING:")
        
        action_past = {
            "opened": "opened",
            "closed": "closed", 
            "merged": "merged"
        }.get(action, action)
        
        parts.append(f"PR #{pr_number} {action_past} by {author}:")
        parts.append(f"\"{pr_title[:80]}\"")
        
        if files_count > 0:
            parts.append(f"({files_count} files")
            if affected_count > 0:
                parts.append(f", affects {affected_count} people)")
            else:
                parts.append(")")
                
        return " ".join(parts)


# Singleton instance
impact_analyzer = ImpactAnalyzer()

