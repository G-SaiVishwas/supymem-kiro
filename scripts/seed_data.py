#!/usr/bin/env python
"""
Seed Data Script

Populates the database with sample data for development and testing.
Run with: python scripts/seed_data.py
"""

import asyncio
import uuid
from datetime import datetime, timedelta
import random

from sqlalchemy import select, text
from src.database.session import get_session
from src.database.models import (
    User, Team, KnowledgeEntry, Task, Decision, DecisionChallenge,
    UserActivity, AutomationRule, FileOwnership, Notification, Conversation, Message
)


# Sample data
TEAM_DATA = {
    "id": "team-demo-001",
    "name": "Demo Engineering Team",
    "slug": "demo-team",
    "github_org": "demo-org",
    "slack_workspace_id": "T0DEMO001",
}

USERS = [
    {"id": "user-001", "name": "Alice", "email": "alice@demo.com", "github_username": "alice-dev", "slack_id": "U001ALICE"},
    {"id": "user-002", "name": "Bob", "email": "bob@demo.com", "github_username": "bob-eng", "slack_id": "U002BOB"},
    {"id": "user-003", "name": "Carol", "email": "carol@demo.com", "github_username": "carol-code", "slack_id": "U003CAROL"},
    {"id": "user-004", "name": "Dave", "email": "dave@demo.com", "github_username": "dave-dev", "slack_id": "U004DAVE"},
]

KNOWLEDGE_ENTRIES = [
    {
        "content": "Our API uses FastAPI with async/await patterns. All endpoints should return JSON responses.",
        "source": "documentation",
        "team_id": TEAM_DATA["id"],
    },
    {
        "content": "We use PostgreSQL as our primary database with SQLAlchemy as the ORM. Alembic handles migrations.",
        "source": "documentation",
        "team_id": TEAM_DATA["id"],
    },
    {
        "content": "For vector embeddings, we use Qdrant with the nomic-embed-text model via Ollama for local embedding generation.",
        "source": "documentation",
        "team_id": TEAM_DATA["id"],
    },
    {
        "content": "The authentication flow uses JWT tokens. Tokens are validated on each request through FastAPI middleware.",
        "source": "github_pr",
        "team_id": TEAM_DATA["id"],
    },
    {
        "content": "We decided to use Python 3.11+ for better async performance and the new typing features.",
        "source": "slack",
        "team_id": TEAM_DATA["id"],
    },
    {
        "content": "React with TailwindCSS is our frontend stack. We use TanStack Query for data fetching and caching.",
        "source": "documentation",
        "team_id": TEAM_DATA["id"],
    },
]

DECISIONS = [
    {
        "title": "Use PostgreSQL instead of MongoDB",
        "summary": "Chose PostgreSQL for ACID compliance and relational data integrity.",
        "reasoning": "Our data model has many relationships and we need strong consistency guarantees. PostgreSQL also supports pgvector for vector storage.",
        "source_type": "github_pr",
        "category": "architecture",
        "importance": "high",
        "decided_by": "alice-dev",
        "team_id": TEAM_DATA["id"],
    },
    {
        "title": "Implement event-driven architecture using Redis Streams",
        "summary": "Use Redis Streams for async processing and real-time features.",
        "reasoning": "Low latency requirement for collaborative features and notifications. Redis Streams provide reliable message delivery with consumer groups.",
        "source_type": "slack",
        "category": "architecture",
        "importance": "high",
        "decided_by": "bob-eng",
        "team_id": TEAM_DATA["id"],
    },
    {
        "title": "Use LangGraph for AI agent orchestration",
        "summary": "Selected LangGraph over raw LangChain for the AI agent layer.",
        "reasoning": "Better state management and more predictable conversation flows. LangGraph provides built-in checkpointing for conversation memory.",
        "source_type": "github_pr",
        "category": "technology",
        "importance": "high",
        "decided_by": "carol-code",
        "team_id": TEAM_DATA["id"],
    },
    {
        "title": "Use TailwindCSS for styling",
        "summary": "Adopted TailwindCSS instead of CSS-in-JS solutions.",
        "reasoning": "Faster development with utility classes, better performance than runtime CSS-in-JS, excellent documentation.",
        "source_type": "slack",
        "category": "technology",
        "importance": "medium",
        "decided_by": "dave-dev",
        "team_id": TEAM_DATA["id"],
    },
]

TASKS = [
    {"title": "Implement user authentication", "description": "Add JWT-based auth flow with refresh tokens", "status": "completed", "priority": "high", "assigned_to": "alice-dev"},
    {"title": "Set up CI/CD pipeline", "description": "Configure GitHub Actions for testing and deployment", "status": "completed", "priority": "high", "assigned_to": "bob-eng"},
    {"title": "Add rate limiting", "description": "Implement rate limiting for API endpoints using Redis", "status": "in_progress", "priority": "medium", "assigned_to": "carol-code"},
    {"title": "Write API documentation", "description": "Create OpenAPI docs for all endpoints with examples", "status": "in_progress", "priority": "medium", "assigned_to": "dave-dev"},
    {"title": "Performance optimization", "description": "Profile and optimize slow database queries", "status": "pending", "priority": "low", "assigned_to": "alice-dev"},
    {"title": "Add logging middleware", "description": "Implement structured logging for all requests using structlog", "status": "pending", "priority": "medium", "assigned_to": "bob-eng"},
    {"title": "Fix vector search relevance", "description": "Tune Qdrant search parameters for better results", "status": "pending", "priority": "high", "assigned_to": "carol-code"},
    {"title": "Add VS Code extension tests", "description": "Write unit tests for the VS Code extension", "status": "pending", "priority": "medium", "assigned_to": "dave-dev"},
]

AUTOMATION_RULES = [
    {
        "original_instruction": "When a task is completed, congratulate the user in Slack",
        "trigger_type": "task_completed",
        "trigger_conditions": {},
        "action_type": "notify_user",
        "action_params": {"message": "Great job completing the task! 🎉"},
        "description": "Congratulate user when task is completed",
        "status": "active",
        "team_id": TEAM_DATA["id"],
        "created_by": "alice-dev",
    },
    {
        "original_instruction": "Notify #releases when a critical PR is merged",
        "trigger_type": "pr_merged",
        "trigger_conditions": {"labels": ["critical"]},
        "action_type": "send_message",
        "action_params": {"channel": "#releases", "message": "Critical PR merged! 🚀"},
        "description": "Notify releases channel when critical PR is merged",
        "status": "active",
        "team_id": TEAM_DATA["id"],
        "created_by": "bob-eng",
    },
    {
        "original_instruction": "Create a task when someone mentions TODO in a PR",
        "trigger_type": "keyword_detected",
        "trigger_conditions": {"keywords": ["TODO", "FIXME"]},
        "action_type": "create_task",
        "action_params": {"priority": "medium"},
        "description": "Auto-create tasks from TODO comments",
        "status": "active",
        "team_id": TEAM_DATA["id"],
        "created_by": "carol-code",
    },
]


async def clear_existing_data():
    """Clear existing seed data."""
    async with get_session() as session:
        # Delete in reverse order of dependencies using raw SQL for safety
        await session.execute(text("DELETE FROM notifications WHERE team_id = :team_id"), {"team_id": TEAM_DATA["id"]})
        await session.execute(text("DELETE FROM automation_executions WHERE rule_id IN (SELECT id FROM automation_rules WHERE team_id = :team_id)"), {"team_id": TEAM_DATA["id"]})
        await session.execute(text("DELETE FROM automation_rules WHERE team_id = :team_id"), {"team_id": TEAM_DATA["id"]})
        await session.execute(text("DELETE FROM decision_challenges WHERE decision_id IN (SELECT id FROM decisions WHERE team_id = :team_id)"), {"team_id": TEAM_DATA["id"]})
        await session.execute(text("DELETE FROM decisions WHERE team_id = :team_id"), {"team_id": TEAM_DATA["id"]})
        await session.execute(text("DELETE FROM tasks WHERE team_id = :team_id"), {"team_id": TEAM_DATA["id"]})
        await session.execute(text("DELETE FROM user_activities WHERE team_id = :team_id"), {"team_id": TEAM_DATA["id"]})
        await session.execute(text("DELETE FROM knowledge_entries WHERE team_id = :team_id"), {"team_id": TEAM_DATA["id"]})
        await session.execute(text("DELETE FROM file_ownership WHERE team_id = :team_id"), {"team_id": TEAM_DATA["id"]})
        await session.execute(text("DELETE FROM team_members WHERE team_id = :team_id"), {"team_id": TEAM_DATA["id"]})
        # Delete users one by one to avoid IN clause issues with asyncpg
        for user in USERS:
            await session.execute(text("DELETE FROM users WHERE id = :user_id"), {"user_id": user["id"]})
        await session.execute(text("DELETE FROM teams WHERE id = :team_id"), {"team_id": TEAM_DATA["id"]})
        await session.commit()
        print("✓ Cleared existing seed data")


async def seed_team():
    """Create demo team."""
    async with get_session() as session:
        team = Team(
            id=TEAM_DATA["id"],
            name=TEAM_DATA["name"],
            slug=TEAM_DATA["slug"],
            github_org=TEAM_DATA["github_org"],
            slack_workspace_id=TEAM_DATA["slack_workspace_id"],
        )
        session.add(team)
        await session.commit()
        print(f"✓ Created team: {TEAM_DATA['name']}")


async def seed_users():
    """Create demo users."""
    async with get_session() as session:
        for user_data in USERS:
            user = User(
                id=user_data["id"],
                name=user_data["name"],
                email=user_data["email"],
                github_username=user_data["github_username"],
                slack_id=user_data["slack_id"],
            )
            session.add(user)
        await session.commit()
        print(f"✓ Created {len(USERS)} users")


async def seed_knowledge():
    """Create knowledge entries."""
    async with get_session() as session:
        for entry in KNOWLEDGE_ENTRIES:
            knowledge = KnowledgeEntry(
                id=str(uuid.uuid4()),
                content=entry["content"],
                source=entry["source"],
                team_id=entry["team_id"],
                category="instruction",
                importance_score=0.7,
                created_at=datetime.utcnow() - timedelta(days=random.randint(1, 30)),
            )
            session.add(knowledge)
        await session.commit()
        print(f"✓ Created {len(KNOWLEDGE_ENTRIES)} knowledge entries")


async def seed_decisions():
    """Create decisions."""
    async with get_session() as session:
        for idx, dec in enumerate(DECISIONS):
            decision = Decision(
                id=str(uuid.uuid4()),
                title=dec["title"],
                summary=dec["summary"],
                reasoning=dec["reasoning"],
                source_type=dec["source_type"],
                category=dec["category"],
                importance=dec["importance"],
                decided_by=dec["decided_by"],
                team_id=dec["team_id"],
                status="active",
                created_at=datetime.utcnow() - timedelta(days=random.randint(5, 60)),
            )
            session.add(decision)
        await session.commit()
        print(f"✓ Created {len(DECISIONS)} decisions")


async def seed_tasks():
    """Create tasks."""
    async with get_session() as session:
        for task_data in TASKS:
            created = datetime.utcnow() - timedelta(days=random.randint(1, 14))
            task = Task(
                id=str(uuid.uuid4()),
                title=task_data["title"],
                description=task_data["description"],
                status=task_data["status"],
                priority=task_data["priority"],
                assigned_to=task_data["assigned_to"],
                team_id=TEAM_DATA["id"],
                source="manual",
                created_at=created,
                completed_at=created + timedelta(days=random.randint(1, 5)) if task_data["status"] == "completed" else None,
            )
            session.add(task)
        await session.commit()
        print(f"✓ Created {len(TASKS)} tasks")


async def seed_activities():
    """Create user activities."""
    async with get_session() as session:
        activity_types = ["commit", "pr_opened", "pr_merged", "pr_review", "task_completed"]
        
        activities = []
        for user in USERS:
            for i in range(random.randint(8, 20)):
                activity_type = random.choice(activity_types)
                titles = {
                    "commit": f"Commit: Fix bug in {random.choice(['auth', 'api', 'database', 'frontend'])} module",
                    "pr_opened": f"PR: Add {random.choice(['feature', 'fix', 'improvement'])} for {random.choice(['users', 'tasks', 'decisions'])}",
                    "pr_merged": f"Merged PR #{random.randint(10, 100)}",
                    "pr_review": f"Reviewed PR by {random.choice([u['github_username'] for u in USERS if u['github_username'] != user['github_username']])}",
                    "task_completed": f"Completed: {random.choice(['Bug fix', 'Feature', 'Documentation', 'Test'])}",
                }
                activity = UserActivity(
                    id=str(uuid.uuid4()),
                    user_identifier=user["github_username"],
                    team_id=TEAM_DATA["id"],
                    activity_type=activity_type,
                    title=titles[activity_type],
                    source="github",
                    source_url=f"https://github.com/demo-org/supymem/{random.choice(['commit', 'pull'])}/" + str(uuid.uuid4())[:8],
                    timestamp=datetime.utcnow() - timedelta(hours=random.randint(1, 336)),  # Up to 2 weeks
                )
                session.add(activity)
                activities.append(activity)
        await session.commit()
        print(f"✓ Created {len(activities)} user activities")


async def seed_automation_rules():
    """Create automation rules."""
    async with get_session() as session:
        for rule_data in AUTOMATION_RULES:
            rule = AutomationRule(
                id=str(uuid.uuid4()),
                original_instruction=rule_data["original_instruction"],
                trigger_type=rule_data["trigger_type"],
                trigger_conditions=rule_data["trigger_conditions"],
                action_type=rule_data["action_type"],
                action_params=rule_data["action_params"],
                description=rule_data["description"],
                status=rule_data["status"],
                team_id=rule_data["team_id"],
                created_by=rule_data["created_by"],
            )
            session.add(rule)
        await session.commit()
        print(f"✓ Created {len(AUTOMATION_RULES)} automation rules")


async def seed_file_ownership():
    """Create file ownership records."""
    async with get_session() as session:
        files = [
            "src/main.py",
            "src/api/routes/knowledge.py",
            "src/api/routes/tasks.py",
            "src/services/classification/classifier.py",
            "src/database/models.py",
            "src/agents/knowledge_agent.py",
            "src/workers/change_processor.py",
            "frontend/src/App.tsx",
            "frontend/src/pages/Dashboard.tsx",
        ]
        
        for file_path in files:
            owner = random.choice(USERS)
            ownership = FileOwnership(
                id=str(uuid.uuid4()),
                file_path=file_path,
                repo="demo-org/supymem",
                team_id=TEAM_DATA["id"],
                user_identifier=owner["github_username"],
                ownership_score=random.uniform(0.5, 1.0),
                total_commits=random.randint(5, 50),
                total_lines_added=random.randint(100, 2000),
                total_lines_removed=random.randint(50, 500),
                last_commit_at=datetime.utcnow() - timedelta(days=random.randint(1, 30)),
            )
            session.add(ownership)
        await session.commit()
        print(f"✓ Created {len(files)} file ownership records")


async def main():
    """Run all seed functions."""
    print("\n🌱 Starting database seeding...\n")
    
    try:
        await clear_existing_data()
        await seed_team()
        await seed_users()
        await seed_knowledge()
        await seed_decisions()
        await seed_tasks()
        await seed_activities()
        await seed_automation_rules()
        await seed_file_ownership()
        
        print("\n✅ Seeding complete!\n")
        print("Demo credentials:")
        print(f"  Team ID: {TEAM_DATA['id']}")
        print("  Users: alice-dev, bob-eng, carol-code, dave-dev")
        print()
        
    except Exception as e:
        print(f"\n❌ Seeding failed: {e}")
        import traceback
        traceback.print_exc()
        raise


if __name__ == "__main__":
    asyncio.run(main())
