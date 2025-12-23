"""
Change Processor Worker

Processes Git events from the Redis Stream:
- Push events (commits)
- Pull request events
- Issue events
- PR reviews
- Issue comments

For each event:
1. Classifies content
2. Extracts decisions/action items
3. Updates file ownership
4. Analyzes impact
5. Triggers notifications
6. Tracks user activity
"""

import asyncio
from typing import Dict, Any

from src.workers.base import BaseWorker
from src.cache.redis_client import (
    StreamMessage,
    STREAM_GIT_EVENTS,
    GROUP_CHANGE_PROCESSOR,
    publish_notification,
    publish_task_event
)
from src.config.logging import get_logger
from src.database.session import get_session
from src.database.models import GitHubEvent

# Import services (lazy to avoid circular imports)
logger = get_logger(__name__)


class ChangeProcessorWorker(BaseWorker):
    """
    Processes Git events from webhooks.
    
    This is the main worker that handles all Git-related events
    and orchestrates the various services.
    """
    
    @property
    def stream_name(self) -> str:
        return STREAM_GIT_EVENTS
    
    @property
    def group_name(self) -> str:
        return GROUP_CHANGE_PROCESSOR
    
    async def process_message(self, message: StreamMessage) -> bool:
        """
        Process a Git event message.
        
        Args:
            message: StreamMessage containing the Git event
            
        Returns:
            True if processed successfully
        """
        event_type = message.event_type
        payload = message.payload
        
        event_id = payload.get("event_id")
        data = payload.get("data", {})
        org = payload.get("org")
        repo = payload.get("repo")
        
        logger.info(
            "Processing git event",
            event_type=event_type,
            org=org,
            repo=repo,
            event_id=event_id
        )
        
        try:
            # Route to appropriate handler
            if event_type == "push":
                await self._process_push(event_id, data, org, repo)
            elif event_type == "pull_request":
                await self._process_pull_request(event_id, data, org, repo)
            elif event_type == "issues":
                await self._process_issue(event_id, data, org, repo)
            elif event_type == "issue_comment":
                await self._process_comment(event_id, data, org, repo)
            elif event_type == "pull_request_review":
                await self._process_pr_review(event_id, data, org, repo)
            else:
                logger.debug(
                    "Unhandled event type",
                    event_type=event_type
                )
            
            # Mark event as processed in database
            await self._mark_event_processed(event_id)
            
            return True
            
        except Exception as e:
            logger.error(
                "Failed to process git event",
                event_type=event_type,
                event_id=event_id,
                error=str(e)
            )
            return False
    
    async def _process_push(
        self,
        event_id: str,
        data: Dict[str, Any],
        org: str,
        repo: str
    ):
        """Process a push event (commits)."""
        from src.vectors.embeddings import embedding_service
        from src.vectors.qdrant_client import vector_store
        from src.services.classification import classifier
        from src.services.impact import ownership_tracker, impact_analyzer
        from src.services.analytics import activity_tracker
        
        commits = data.get("commits", [])
        ref = data.get("ref", "")
        pusher = data.get("pusher", {}).get("name", "unknown")
        
        # Get team_id from repository settings (simplified)
        team_id = f"{org}"  # In production, look up from DB
        
        for commit in commits:
            sha = commit.get("id", "")[:8]
            message = commit.get("message", "")
            author = commit.get("author", {}).get("username", pusher)
            files_added = commit.get("added", [])
            files_modified = commit.get("modified", [])
            files_removed = commit.get("removed", [])
            all_files = files_added + files_modified + files_removed
            
            logger.info(
                "Processing commit",
                sha=sha,
                author=author,
                files_count=len(all_files)
            )
            
            # 1. Classify commit message
            classification = await classifier.classify(
                content=message,
                context={
                    "source": "github_commit",
                    "repo": f"{org}/{repo}",
                    "files": all_files[:10]  # Limit for context
                }
            )
            
            # 2. Update file ownership
            await ownership_tracker.update_ownership_from_commit(
                repo=f"{org}/{repo}",
                team_id=team_id,
                author=author,
                files=all_files
            )
            
            # 3. Analyze impact and get affected users
            impact = await impact_analyzer.analyze_change(
                team_id=team_id,
                changed_files=all_files,
                change_type="commit",
                author=author
            )
            
            # 4. Publish notifications for affected users
            if impact.get("affected_users"):
                for user in impact["affected_users"]:
                    if user != author:  # Don't notify the author
                        await publish_notification(
                            notification_type="change_impact",
                            recipient_id=user,
                            payload={
                                "title": f"Code change in {repo}",
                                "message": f"{author} committed: {message[:100]}",
                                "commit_sha": sha,
                                "repo": f"{org}/{repo}",
                                "classification": classification.category.value if classification else "unknown"
                            }
                        )
            
            # 5. Track activity
            await activity_tracker.track(
                user_identifier=author,
                team_id=team_id,
                activity_type="commit",
                title=f"Commit {sha}: {message[:50]}",
                description=message,
                source="github",
                source_id=commit.get("id"),
                metadata={
                    "repo": f"{org}/{repo}",
                    "files_changed": len(all_files),
                    "branch": ref.replace("refs/heads/", "")
                }
            )
            
            # 6. Store in vector store for knowledge retrieval
            if message and len(message) > 20:  # Only meaningful messages
                embeddings = await embedding_service.embed(message)
                await vector_store.store(
                    id=f"commit-{commit.get('id')}",
                    vector=embeddings[0],
                    metadata={
                        "type": "commit",
                        "content": message,
                        "author": author,
                        "repo": f"{org}/{repo}",
                        "team_id": team_id,
                        "sha": commit.get("id"),
                        "files": all_files[:20]
                    }
                )
    
    async def _process_pull_request(
        self,
        event_id: str,
        data: Dict[str, Any],
        org: str,
        repo: str
    ):
        """Process a pull request event."""
        from src.services.classification import decision_extractor
        from src.services.analytics import activity_tracker
        from src.services.automation import condition_monitor
        
        action = data.get("action")
        pr = data.get("pull_request", {})
        pr_number = pr.get("number")
        title = pr.get("title", "")
        body = pr.get("body", "")
        author = pr.get("user", {}).get("login", "unknown")
        team_id = org
        
        logger.info(
            "Processing PR",
            action=action,
            pr_number=pr_number,
            author=author
        )
        
        # Track activity based on action
        activity_type = "pr_opened"
        if action == "closed" and pr.get("merged"):
            activity_type = "pr_merged"
        elif action == "closed":
            activity_type = "pr_closed"
        
        await activity_tracker.track(
            user_identifier=author,
            team_id=team_id,
            activity_type=activity_type,
            title=f"PR #{pr_number}: {title[:50]}",
            description=body[:500] if body else None,
            source="github",
            source_id=str(pr_number),
            metadata={
                "repo": f"{org}/{repo}",
                "pr_number": pr_number,
                "action": action
            }
        )
        
        # On merge, check automation conditions
        if action == "closed" and pr.get("merged"):
            await condition_monitor.check_pr_merged(
                team_id=team_id,
                repo=f"{org}/{repo}",
                pr_number=pr_number,
                author=author,
                title=title
            )
            
            # Extract decisions from PR description
            if body:
                decisions = await decision_extractor.extract(
                    content=body,
                    context={
                        "source": "github_pr",
                        "repo": f"{org}/{repo}",
                        "pr_number": pr_number
                    }
                )
                
                # Store decisions
                for decision in decisions:
                    logger.info(
                        "Decision extracted from PR",
                        pr_number=pr_number,
                        decision=decision.content[:100]
                    )
    
    async def _process_issue(
        self,
        event_id: str,
        data: Dict[str, Any],
        org: str,
        repo: str
    ):
        """Process an issue event."""
        from src.services.classification import classifier, action_extractor
        from src.vectors.embeddings import embedding_service
        from src.vectors.qdrant_client import vector_store
        
        action = data.get("action")
        issue = data.get("issue", {})
        issue_number = issue.get("number")
        title = issue.get("title", "")
        body = issue.get("body", "")
        author = issue.get("user", {}).get("login", "unknown")
        team_id = org
        
        if action not in ("opened", "edited"):
            return
        
        logger.info(
            "Processing issue",
            action=action,
            issue_number=issue_number
        )
        
        # Classify issue content
        full_content = f"{title}\n\n{body}" if body else title
        classification = await classifier.classify(
            content=full_content,
            context={
                "source": "github_issue",
                "repo": f"{org}/{repo}"
            }
        )
        
        # Extract action items
        if body:
            action_items = await action_extractor.extract(
                content=body,
                context={
                    "source": "github_issue",
                    "repo": f"{org}/{repo}",
                    "issue_number": issue_number
                }
            )
            
            if action_items:
                for item in action_items:
                    # Publish task event for each action item
                    await publish_task_event(
                        event_type="task_extracted",
                        team_id=team_id,
                        payload={
                            "title": item.title,
                            "description": item.description,
                            "source": "github_issue",
                            "source_id": str(issue_number),
                            "assignee": item.assignee
                        }
                    )
        
        # Store in vector store
        if full_content and len(full_content) > 20:
            embeddings = await embedding_service.embed(full_content)
            await vector_store.store(
                id=f"issue-{org}-{repo}-{issue_number}",
                vector=embeddings[0],
                metadata={
                    "type": "issue",
                    "content": full_content[:2000],
                    "author": author,
                    "repo": f"{org}/{repo}",
                    "team_id": team_id,
                    "issue_number": issue_number,
                    "classification": classification.category.value if classification else None
                }
            )
    
    async def _process_comment(
        self,
        event_id: str,
        data: Dict[str, Any],
        org: str,
        repo: str
    ):
        """Process an issue/PR comment."""
        from src.services.classification import classifier, decision_extractor
        from src.vectors.embeddings import embedding_service
        from src.vectors.qdrant_client import vector_store
        
        action = data.get("action")
        if action != "created":
            return
        
        comment = data.get("comment", {})
        body = comment.get("body", "")
        author = comment.get("user", {}).get("login", "unknown")
        issue = data.get("issue", {})
        issue_number = issue.get("number")
        team_id = org
        
        if not body or len(body) < 20:
            return
        
        logger.info(
            "Processing comment",
            issue_number=issue_number,
            author=author
        )
        
        # Classify comment
        classification = await classifier.classify(
            content=body,
            context={
                "source": "github_comment",
                "repo": f"{org}/{repo}"
            }
        )
        
        # Check for decisions
        if classification and classification.category.value == "decision":
            decisions = await decision_extractor.extract(
                content=body,
                context={
                    "source": "github_comment",
                    "repo": f"{org}/{repo}",
                    "issue_number": issue_number
                }
            )
            
            for decision in decisions:
                logger.info(
                    "Decision found in comment",
                    issue_number=issue_number,
                    decision=decision.content[:100]
                )
        
        # Store in vector store for important comments
        if classification and classification.importance_score > 0.5:
            embeddings = await embedding_service.embed(body)
            await vector_store.store(
                id=f"comment-{comment.get('id')}",
                vector=embeddings[0],
                metadata={
                    "type": "comment",
                    "content": body[:2000],
                    "author": author,
                    "repo": f"{org}/{repo}",
                    "team_id": team_id,
                    "issue_number": issue_number,
                    "classification": classification.category.value
                }
            )
    
    async def _process_pr_review(
        self,
        event_id: str,
        data: Dict[str, Any],
        org: str,
        repo: str
    ):
        """Process a PR review event."""
        from src.services.analytics import activity_tracker
        
        action = data.get("action")
        if action != "submitted":
            return
        
        review = data.get("review", {})
        pr = data.get("pull_request", {})
        reviewer = review.get("user", {}).get("login", "unknown")
        pr_number = pr.get("number")
        pr_author = pr.get("user", {}).get("login", "unknown")
        state = review.get("state", "")  # approved, changes_requested, commented
        team_id = org
        
        logger.info(
            "Processing PR review",
            pr_number=pr_number,
            reviewer=reviewer,
            state=state
        )
        
        # Track review activity
        await activity_tracker.track(
            user_identifier=reviewer,
            team_id=team_id,
            activity_type="pr_review",
            title=f"Reviewed PR #{pr_number}",
            description=f"Review state: {state}",
            source="github",
            source_id=str(review.get("id")),
            metadata={
                "repo": f"{org}/{repo}",
                "pr_number": pr_number,
                "pr_author": pr_author,
                "review_state": state
            }
        )
        
        # Notify PR author of review
        if reviewer != pr_author:
            await publish_notification(
                notification_type="pr_reviewed",
                recipient_id=pr_author,
                payload={
                    "title": f"PR #{pr_number} reviewed",
                    "message": f"{reviewer} {state.replace('_', ' ')} your PR",
                    "repo": f"{org}/{repo}",
                    "pr_number": pr_number,
                    "reviewer": reviewer,
                    "state": state
                }
            )
    
    async def _mark_event_processed(self, event_id: str):
        """Mark a GitHub event as processed in the database."""
        try:
            async with get_session() as session:
                from sqlalchemy import update
                from datetime import datetime
                
                await session.execute(
                    update(GitHubEvent)
                    .where(GitHubEvent.id == event_id)
                    .values(processed_at=datetime.utcnow())
                )
                await session.commit()
        except Exception as e:
            logger.warning(
                "Failed to mark event as processed",
                event_id=event_id,
                error=str(e)
            )


async def main():
    """Run the change processor worker."""
    worker = ChangeProcessorWorker()
    await worker.start()


if __name__ == "__main__":
    asyncio.run(main())

