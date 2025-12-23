import time
from typing import Optional, List, Dict, Any

from github import Github, GithubIntegration

from src.config.settings import get_settings
from src.config.logging import get_logger

logger = get_logger(__name__)
settings = get_settings()


class GitHubClient:
    def __init__(self):
        self.app_id = settings.github_app_id
        self.private_key = settings.github_private_key
        self._integration: Optional[GithubIntegration] = None
        self._installation_tokens: Dict[int, Dict[str, Any]] = {}

    @property
    def integration(self) -> Optional[GithubIntegration]:
        """Get or create GitHub integration."""
        if not self.app_id or not self.private_key:
            return None

        if self._integration is None:
            self._integration = GithubIntegration(
                integration_id=int(self.app_id),
                private_key=self.private_key,
            )
        return self._integration

    def get_installation_token(self, installation_id: int) -> Optional[str]:
        """Get or refresh installation access token."""
        if not self.integration:
            return None

        # Check cached token
        cached = self._installation_tokens.get(installation_id)
        if cached and cached["expires_at"] > time.time():
            return cached["token"]

        # Get new token
        try:
            access_token = self.integration.get_access_token(installation_id)
            self._installation_tokens[installation_id] = {
                "token": access_token.token,
                "expires_at": access_token.expires_at.timestamp() - 60,  # Buffer
            }
            return access_token.token
        except Exception as e:
            logger.error("Failed to get installation token", error=str(e))
            return None

    def get_client(self, installation_id: int) -> Optional[Github]:
        """Get authenticated GitHub client for an installation."""
        token = self.get_installation_token(installation_id)
        if not token:
            return None
        return Github(token)

    async def get_repository_content(
        self,
        installation_id: int,
        repo_full_name: str,
        path: str = "",
    ) -> Optional[List[Dict[str, Any]]]:
        """Get contents of a repository path."""
        client = self.get_client(installation_id)
        if not client:
            return None

        try:
            repo = client.get_repo(repo_full_name)
            contents = repo.get_contents(path)

            if not isinstance(contents, list):
                contents = [contents]

            return [
                {
                    "name": c.name,
                    "path": c.path,
                    "type": c.type,
                    "size": c.size,
                    "sha": c.sha,
                }
                for c in contents
            ]
        except Exception as e:
            logger.error("Failed to get repository content", error=str(e))
            return None

    async def get_file_content(
        self,
        installation_id: int,
        repo_full_name: str,
        file_path: str,
    ) -> Optional[str]:
        """Get content of a specific file."""
        client = self.get_client(installation_id)
        if not client:
            return None

        try:
            repo = client.get_repo(repo_full_name)
            file_content = repo.get_contents(file_path)
            return file_content.decoded_content.decode("utf-8")
        except Exception as e:
            logger.error("Failed to get file content", error=str(e))
            return None

    async def get_pull_request(
        self,
        installation_id: int,
        repo_full_name: str,
        pr_number: int,
    ) -> Optional[Dict[str, Any]]:
        """Get pull request details."""
        client = self.get_client(installation_id)
        if not client:
            return None

        try:
            repo = client.get_repo(repo_full_name)
            pr = repo.get_pull(pr_number)

            return {
                "number": pr.number,
                "title": pr.title,
                "body": pr.body,
                "state": pr.state,
                "author": pr.user.login,
                "base_branch": pr.base.ref,
                "head_branch": pr.head.ref,
                "created_at": pr.created_at.isoformat(),
                "updated_at": pr.updated_at.isoformat(),
                "merged": pr.merged,
                "mergeable": pr.mergeable,
                "commits": pr.commits,
                "additions": pr.additions,
                "deletions": pr.deletions,
                "changed_files": pr.changed_files,
            }
        except Exception as e:
            logger.error("Failed to get pull request", error=str(e))
            return None

    async def get_issue(
        self,
        installation_id: int,
        repo_full_name: str,
        issue_number: int,
    ) -> Optional[Dict[str, Any]]:
        """Get issue details."""
        client = self.get_client(installation_id)
        if not client:
            return None

        try:
            repo = client.get_repo(repo_full_name)
            issue = repo.get_issue(issue_number)

            return {
                "number": issue.number,
                "title": issue.title,
                "body": issue.body,
                "state": issue.state,
                "author": issue.user.login,
                "labels": [label.name for label in issue.labels],
                "assignees": [a.login for a in issue.assignees],
                "created_at": issue.created_at.isoformat(),
                "updated_at": issue.updated_at.isoformat(),
                "closed_at": issue.closed_at.isoformat() if issue.closed_at else None,
                "comments": issue.comments,
            }
        except Exception as e:
            logger.error("Failed to get issue", error=str(e))
            return None

    async def create_comment(
        self,
        installation_id: int,
        repo_full_name: str,
        issue_number: int,
        body: str,
    ) -> bool:
        """Create a comment on an issue or PR."""
        client = self.get_client(installation_id)
        if not client:
            return False

        try:
            repo = client.get_repo(repo_full_name)
            issue = repo.get_issue(issue_number)
            issue.create_comment(body)
            return True
        except Exception as e:
            logger.error("Failed to create comment", error=str(e))
            return False


# Singleton instance
github_client = GitHubClient()
