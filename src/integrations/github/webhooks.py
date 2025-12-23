"""
GitHub Webhook Handlers

Processes GitHub events and:
1. Stores content in knowledge base
2. Classifies content and extracts decisions
3. Tracks file ownership
4. Analyzes impact and sends notifications
5. Tracks user activity
"""

import hmac
import hashlib
from typing import Optional, Dict
from datetime import datetime
import uuid

from fastapi import APIRouter, Request, HTTPException, Header, BackgroundTasks

from src.vectors.embeddings import embedding_service
from src.vectors.qdrant_client import vector_store
from src.services.classification import classifier, decision_extractor, action_extractor
from src.services.impact import ownership_tracker, impact_analyzer, notification_service
from src.services.analytics import activity_tracker
from src.config.settings import get_settings
from src.config.logging import get_logger
from src.database.session import get_session
from src.database.models import GitHubEvent, Decision, Task
from src.cache.redis_client import publish_git_event

logger = get_logger(__name__)
settings = get_settings()
router = APIRouter()


def verify_signature(payload: bytes, signature: Optional[str]) -> bool:
    """Verify GitHub webhook signature."""
    if not signature or not settings.github_webhook_secret:
        return True  # Skip verification if not configured
    
    expected = "sha256=" + hmac.new(
        settings.github_webhook_secret.encode(),
        payload,
        hashlib.sha256
    ).hexdigest()
    
    return hmac.compare_digest(expected, signature)


@router.post("/webhooks/github")
async def handle_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
    x_hub_signature_256: Optional[str] = Header(None),
    x_github_event: Optional[str] = Header(None),
    x_github_delivery: Optional[str] = Header(None)
):
    """
    Main webhook handler.
    Validates and dispatches to specific handlers.
    
    Flow:
    1. Validate signature
    2. Store raw event in database
    3. Publish to Redis Stream for async processing
    4. Return immediately (fast response to GitHub)
    """
    payload = await request.body()
    
    # Verify signature
    if settings.github_webhook_secret and not verify_signature(payload, x_hub_signature_256):
        raise HTTPException(status_code=403, detail="Invalid signature")
    
    data = await request.json()
    
    # Store raw event
    event_id = await store_github_event(
        event_type=x_github_event,
        delivery_id=x_github_delivery,
        data=data
    )
    
    # Extract org/repo from payload
    repo_info = data.get("repository", {})
    org = repo_info.get("owner", {}).get("login", "unknown")
    repo = repo_info.get("name", "unknown")
    
    # Publish to Redis Stream for async processing by workers
    try:
        await publish_git_event(
            event_type=x_github_event,
            org=org,
            repo=repo,
            payload={
                "event_id": event_id,
                "delivery_id": x_github_delivery,
                "action": data.get("action"),
                "data": data
            }
        )
        logger.info(
            "Git event published to stream",
            event_type=x_github_event,
            org=org,
            repo=repo,
            event_id=event_id
        )
    except Exception as e:
        # Fallback to background task if Redis fails
        logger.warning(
            "Redis stream publish failed, using background task",
            error=str(e)
        )
        handlers = {
            "push": process_push_event,
            "pull_request": process_pull_request_event,
            "issue_comment": process_issue_comment,
            "pull_request_review": process_pr_review,
            "issues": process_issue_event,
        }
        handler = handlers.get(x_github_event)
        if handler:
            background_tasks.add_task(handler, event_id, data)
    
    return {"status": "accepted", "event_id": event_id}


async def store_github_event(
    event_type: str,
    delivery_id: str,
    data: Dict
) -> str:
    """Store raw GitHub event in database."""
    event_id = str(uuid.uuid4())
    
    async with get_session() as session:
        event = GitHubEvent(
            id=event_id,
            event_type=event_type,
            action=data.get("action"),
            repository=data.get("repository", {}).get("full_name", "unknown"),
            sender=data.get("sender", {}).get("login"),
            sender_id=str(data.get("sender", {}).get("id", "")),
            pr_number=data.get("pull_request", {}).get("number") if "pull_request" in data else None,
            issue_number=data.get("issue", {}).get("number") if "issue" in data else None,
            payload=data,
            team_id=data.get("repository", {}).get("full_name", "default"),
        )
        session.add(event)
    
    return event_id


async def process_push_event(event_id: str, payload: dict):
    """
    Process push events:
    1. Track activity for each commit
    2. Update file ownership
    3. Classify and store content
    4. Analyze impact and notify affected users
    5. Extract decisions if any
    """
    try:
        repo = payload.get("repository", {}).get("full_name", "")
        team_id = repo  # Use repo as team_id for now
        commits = payload.get("commits", [])
        pusher = payload.get("pusher", {}).get("name", "unknown")
        
        all_files_changed = set()
        
        for commit in commits:
            author = commit.get("author", {}).get("username") or commit.get("author", {}).get("name", "unknown")
            message = commit.get("message", "")
            sha = commit.get("id", "")
            
            # Collect all files
            files_modified = commit.get("modified", [])
            files_added = commit.get("added", [])
            files_removed = commit.get("removed", [])
            all_files = files_modified + files_added + files_removed
            all_files_changed.update(all_files)
            
            # 1. Track activity
            await activity_tracker.track_commit(
                user_identifier=author,
                team_id=team_id,
                repo=repo,
                commit_sha=sha,
                commit_message=message,
                files=all_files,
                commit_url=commit.get("url"),
                timestamp=datetime.fromisoformat(commit.get("timestamp", "").replace("Z", "+00:00")) if commit.get("timestamp") else None
            )
            
            # 2. Update file ownership
            await ownership_tracker.update_ownership_from_commit(
                repo=repo,
                team_id=team_id,
                author=author,
                files=all_files
            )
            
            # 3. Classify and store content
            content = f"Commit to {repo}: {message}\nAuthor: {author}\nFiles: {', '.join(all_files[:10])}"
            
            # Classify
            classification = await classifier.classify(content, source="github_commit")
            
            # Store in vector DB
            embeddings = await embedding_service.embed(content)
            await vector_store.insert(
                vectors=embeddings,
                payloads=[{
                    "content": content,
                    "source": "github_commit",
                    "source_id": sha,
                    "team_id": team_id,
                    "category": classification.category.value,
                    "importance_score": classification.importance_score,
                    "is_actionable": classification.is_actionable,
                    "metadata": {
                        "repo": repo,
                        "sha": sha,
                        "author": author,
                        "files": all_files[:20]
                    }
                }]
            )
            
            # 4. Extract decision if this looks like a significant commit
            if classification.category.value == "decision" or classification.importance_score > 0.7:
                decision = await decision_extractor.extract(content, source="github_commit")
                if decision:
                    await store_decision(
                        team_id=team_id,
                        decision=decision,
                        source_type="github_commit",
                        source_id=sha,
                        source_url=commit.get("url")
                    )
            
            # 5. Extract action items
            action_items = await action_extractor.extract(content, source="github_commit")
            for item in action_items:
                await create_task_from_action_item(
                    team_id=team_id,
                    item=item,
                    source="github_commit",
                    source_id=sha
                )
        
        # 6. Analyze impact and notify
        if all_files_changed:
            impact = await impact_analyzer.analyze_commit(
                repo=repo,
                team_id=team_id,
                commit_sha=commits[-1].get("id", "") if commits else "",
                commit_message=commits[-1].get("message", "") if commits else "",
                author=pusher,
                files_changed=list(all_files_changed)
            )
            
            if impact.should_notify and impact.affected_users:
                await notification_service.create_change_impact_notifications(
                    team_id=team_id,
                    affected_users=impact.affected_users,
                    change_summary=impact.summary,
                    source_type="commit",
                    source_id=impact.change_id,
                    source_url=payload.get("compare"),
                    is_breaking=impact.is_breaking,
                    change_author=pusher,
                    priority=impact.notification_priority
                )
        
        # Update event as processed
        await mark_event_processed(event_id, {"commits_processed": len(commits)})
        
        logger.info(
            "Push event processed",
            repo=repo,
            commits=len(commits),
            files=len(all_files_changed)
        )
        
    except Exception as e:
        logger.error("Push event processing failed", error=str(e), event_id=event_id)
        await mark_event_processed(event_id, {"error": str(e)})


async def process_pull_request_event(event_id: str, payload: dict):
    """
    Process PR events:
    - opened: Store PR info, extract decisions, notify reviewers
    - closed/merged: Analyze impact, notify affected users
    """
    try:
        action = payload.get("action")
        pr = payload.get("pull_request", {})
        repo = payload.get("repository", {}).get("full_name", "")
        team_id = repo
        
        pr_number = pr.get("number")
        pr_title = pr.get("title", "")
        pr_body = pr.get("body") or ""
        author = pr.get("user", {}).get("login", "unknown")
        pr_url = pr.get("html_url")
        is_merged = pr.get("merged", False)
        
        # Get changed files (if available)
        files_changed = []
        if "changed_files" in pr:
            # Note: For full file list, would need to call GitHub API
            files_changed = []  # Placeholder
        
        if action in ["opened", "edited", "reopened"]:
            # Track activity
            await activity_tracker.track_pr(
                user_identifier=author,
                team_id=team_id,
                repo=repo,
                pr_number=pr_number,
                pr_title=pr_title,
                action="opened",
                pr_url=pr_url
            )
            
            # Store in knowledge base
            content = f"PR #{pr_number}: {pr_title}\nAuthor: {author}\n\n{pr_body}"
            
            classification = await classifier.classify(content, source="github_pr")
            
            embeddings = await embedding_service.embed(content)
            await vector_store.insert(
                vectors=embeddings,
                payloads=[{
                    "content": content,
                    "source": "github_pr",
                    "source_id": str(pr.get("id")),
                    "team_id": team_id,
                    "category": classification.category.value,
                    "importance_score": classification.importance_score,
                    "metadata": {
                        "repo": repo,
                        "pr_number": pr_number,
                        "author": author,
                        "state": pr.get("state")
                    }
                }]
            )
            
            # Extract decision from PR
            decision = await decision_extractor.extract_from_pr(
                pr_title=pr_title,
                pr_body=pr_body,
                pr_author=author
            )
            if decision:
                await store_decision(
                    team_id=team_id,
                    decision=decision,
                    source_type="github_pr",
                    source_id=str(pr_number),
                    source_url=pr_url
                )
            
            # Extract action items
            action_items = await action_extractor.extract(content, source="github_pr")
            for item in action_items:
                await create_task_from_action_item(
                    team_id=team_id,
                    item=item,
                    source="github_pr",
                    source_id=str(pr_number)
                )
        
        elif action == "closed":
            # Track PR closed/merged
            await activity_tracker.track_pr(
                user_identifier=author,
                team_id=team_id,
                repo=repo,
                pr_number=pr_number,
                pr_title=pr_title,
                action="merged" if is_merged else "closed",
                pr_url=pr_url
            )
            
            if is_merged:
                # Analyze impact
                impact = await impact_analyzer.analyze_pr(
                    repo=repo,
                    team_id=team_id,
                    pr_number=pr_number,
                    pr_title=pr_title,
                    pr_body=pr_body,
                    author=author,
                    files_changed=files_changed,
                    action="merged"
                )
                
                if impact.should_notify and impact.affected_users:
                    await notification_service.create_change_impact_notifications(
                        team_id=team_id,
                        affected_users=impact.affected_users,
                        change_summary=impact.summary,
                        source_type="pr",
                        source_id=str(pr_number),
                        source_url=pr_url,
                        is_breaking=impact.is_breaking,
                        change_author=author,
                        priority=impact.notification_priority
                    )
        
        await mark_event_processed(event_id, {"action": action, "pr": pr_number})
        logger.info("PR event processed", repo=repo, pr=pr_number, action=action)
        
    except Exception as e:
        logger.error("PR event processing failed", error=str(e), event_id=event_id)
        await mark_event_processed(event_id, {"error": str(e)})


async def process_pr_review(event_id: str, payload: dict):
    """Process PR review events."""
    try:
        review = payload.get("review", {})
        pr = payload.get("pull_request", {})
        repo = payload.get("repository", {}).get("full_name", "")
        team_id = repo
        
        reviewer = review.get("user", {}).get("login", "unknown")
        review_state = review.get("state", "commented")
        pr_number = pr.get("number")
        pr_url = pr.get("html_url")
        
        # Track review activity
        await activity_tracker.track_pr_review(
            user_identifier=reviewer,
            team_id=team_id,
            repo=repo,
            pr_number=pr_number,
            review_state=review_state,
            pr_url=pr_url
        )
        
        # Store review content
        review_body = review.get("body") or ""
        if review_body:
            content = f"Review on PR #{pr_number}: {pr.get('title', '')}\n"
            content += f"Reviewer: {reviewer}\nState: {review_state}\n{review_body}"
            
            embeddings = await embedding_service.embed(content)
            await vector_store.insert(
                vectors=embeddings,
                payloads=[{
                    "content": content,
                    "source": "github_review",
                    "source_id": str(review.get("id")),
                    "team_id": team_id,
                    "metadata": {
                        "repo": repo,
                        "pr_number": pr_number,
                        "reviewer": reviewer,
                        "state": review_state
                    }
                }]
            )
        
        await mark_event_processed(event_id, {"review": review_state})
        logger.info("PR review processed", repo=repo, pr=pr_number, reviewer=reviewer)
        
    except Exception as e:
        logger.error("PR review processing failed", error=str(e), event_id=event_id)
        await mark_event_processed(event_id, {"error": str(e)})


async def process_issue_comment(event_id: str, payload: dict):
    """Process issue/PR comments."""
    try:
        comment = payload.get("comment", {})
        issue = payload.get("issue", {})
        repo = payload.get("repository", {}).get("full_name", "")
        team_id = repo
        
        commenter = comment.get("user", {}).get("login", "unknown")
        comment_body = comment.get("body", "")
        issue_number = issue.get("number")
        
        content = f"Comment on #{issue_number}: {issue.get('title', '')}\n"
        content += f"By: {commenter}\n{comment_body}"
        
        # Classify
        classification = await classifier.classify(content, source="github_comment")
        
        # Store
        embeddings = await embedding_service.embed(content)
        await vector_store.insert(
            vectors=embeddings,
            payloads=[{
                "content": content,
                "source": "github_comment",
                "source_id": str(comment.get("id")),
                "team_id": team_id,
                "category": classification.category.value,
                "metadata": {
                    "repo": repo,
                    "issue_number": issue_number,
                    "author": commenter
                }
            }]
        )
        
        # Extract action items from comments
        action_items = await action_extractor.extract(content, source="github_comment")
        for item in action_items:
            await create_task_from_action_item(
                team_id=team_id,
                item=item,
                source="github_comment",
                source_id=str(comment.get("id"))
            )
        
        await mark_event_processed(event_id, {"comment_id": comment.get("id")})
        logger.info("Comment processed", repo=repo, issue=issue_number)
        
    except Exception as e:
        logger.error("Comment processing failed", error=str(e), event_id=event_id)
        await mark_event_processed(event_id, {"error": str(e)})


async def process_issue_event(event_id: str, payload: dict):
    """Process issue events."""
    try:
        action = payload.get("action")
        issue = payload.get("issue", {})
        repo = payload.get("repository", {}).get("full_name", "")
        team_id = repo
        
        if action in ["opened", "edited"]:
            issue_number = issue.get("number")
            issue_title = issue.get("title", "")
            issue_body = issue.get("body") or ""
            author = issue.get("user", {}).get("login", "unknown")
            
            content = f"Issue #{issue_number}: {issue_title}\n{issue_body}"
            
            classification = await classifier.classify(content, source="github_issue")
            
            embeddings = await embedding_service.embed(content)
            await vector_store.insert(
                vectors=embeddings,
                payloads=[{
                    "content": content,
                    "source": "github_issue",
                    "source_id": str(issue.get("id")),
                    "team_id": team_id,
                    "category": classification.category.value,
                    "is_actionable": classification.is_actionable,
                    "metadata": {
                        "repo": repo,
                        "issue_number": issue_number,
                        "author": author,
                        "labels": [label.get("name") for label in issue.get("labels", [])]
                    }
                }]
            )
        
        await mark_event_processed(event_id, {"action": action})
        logger.info("Issue event processed", repo=repo, action=action)
        
    except Exception as e:
        logger.error("Issue event processing failed", error=str(e), event_id=event_id)
        await mark_event_processed(event_id, {"error": str(e)})


async def store_decision(
    team_id: str,
    decision,  # ExtractedDecision
    source_type: str,
    source_id: str,
    source_url: Optional[str] = None
):
    """Store an extracted decision in the database."""
    try:
        async with get_session() as session:
            # Generate embedding for the decision
            decision_text = f"{decision.title}\n{decision.summary}\n{decision.reasoning}"
            embeddings = await embedding_service.embed(decision_text)
            
            db_decision = Decision(
                id=str(uuid.uuid4()),
                team_id=team_id,
                title=decision.title,
                summary=decision.summary,
                reasoning=decision.reasoning,
                alternatives_considered=decision.alternatives_considered,
                context=decision.context,
                impact=decision.impact,
                source_type=source_type,
                source_id=source_id,
                source_url=source_url,
                decided_by=decision.decided_by,
                participants=decision.participants,
                affected_files=decision.affected_files,
                affected_components=decision.affected_components,
                category=decision.category,
                importance=decision.importance,
                embedding=embeddings[0]
            )
            session.add(db_decision)
            
            logger.info("Decision stored", title=decision.title[:50])
            
    except Exception as e:
        logger.error("Failed to store decision", error=str(e))


async def create_task_from_action_item(
    team_id: str,
    item,  # ExtractedActionItem
    source: str,
    source_id: str
):
    """Create a task from an extracted action item."""
    try:
        async with get_session() as session:
            task = Task(
                id=str(uuid.uuid4()),
                title=item.title,
                description=item.description,
                status="pending",
                priority=item.priority,
                team_id=team_id,
                assigned_to=item.assigned_to,
                source=source,
                source_id=source_id,
                tags=["auto-extracted"]
            )
            session.add(task)
            
            logger.info("Task created from action item", title=item.title[:50])
            
    except Exception as e:
        logger.error("Failed to create task", error=str(e))


async def mark_event_processed(event_id: str, result: Dict):
    """Mark a GitHub event as processed."""
    try:
        async with get_session() as session:
            from sqlalchemy import select
            stmt = select(GitHubEvent).where(GitHubEvent.id == event_id)
            result_db = await session.execute(stmt)
            event = result_db.scalar_one_or_none()
            
            if event:
                event.processed = True
                event.processing_result = result
                event.impact_analyzed = True
                
    except Exception as e:
        logger.error("Failed to mark event processed", error=str(e))
