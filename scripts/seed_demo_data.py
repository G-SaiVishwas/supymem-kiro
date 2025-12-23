"""
Seed Demo Data Script

Creates demo organization, users, teams, and sample data for testing.

Demo Credentials:
- Admin: admin@demo.com / Demo@123
- Manager: manager@demo.com / Demo@123
- Member: member@demo.com / Demo@123
"""

import asyncio
import uuid
from datetime import datetime, timedelta

from passlib.context import CryptContext
from sqlalchemy import select, text

from src.database.session import get_session, engine
from src.database.models import (
    User, Organization, OrganizationMember, Team, TeamMember,
    Task, Decision, KnowledgeEntry, AutomationRule, UserActivity
)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


# Demo password for all users
DEMO_PASSWORD = "Demo@123"
DEMO_PASSWORD_HASH = hash_password(DEMO_PASSWORD)


async def seed_demo_data():
    """Seed the database with demo data."""
    print("🌱 Starting demo data seed...")
    
    async with get_session() as session:
        # Check if already seeded
        result = await session.execute(
            select(Organization).where(Organization.slug == "demo-org")
        )
        if result.scalar_one_or_none():
            print("⚠️ Demo data already exists. Skipping...")
            return
        
        # =====================================================================
        # CREATE USERS
        # =====================================================================
        print("👤 Creating demo users...")
        
        admin_user = User(
            id=str(uuid.uuid4()),
            email="admin@demo.com",
            name="Alice Admin",
            password_hash=DEMO_PASSWORD_HASH,
            is_email_verified=True,
            avatar_url="https://ui-avatars.com/api/?name=Alice+Admin&background=6366f1&color=fff",
        )
        
        manager_user = User(
            id=str(uuid.uuid4()),
            email="manager@demo.com",
            name="Mike Manager",
            password_hash=DEMO_PASSWORD_HASH,
            is_email_verified=True,
            avatar_url="https://ui-avatars.com/api/?name=Mike+Manager&background=10b981&color=fff",
        )
        
        member_user = User(
            id=str(uuid.uuid4()),
            email="member@demo.com",
            name="Sarah Developer",
            password_hash=DEMO_PASSWORD_HASH,
            is_email_verified=True,
            avatar_url="https://ui-avatars.com/api/?name=Sarah+Developer&background=f59e0b&color=fff",
        )
        
        viewer_user = User(
            id=str(uuid.uuid4()),
            email="viewer@demo.com",
            name="Victor Viewer",
            password_hash=DEMO_PASSWORD_HASH,
            is_email_verified=True,
            avatar_url="https://ui-avatars.com/api/?name=Victor+Viewer&background=8b5cf6&color=fff",
        )
        
        session.add_all([admin_user, manager_user, member_user, viewer_user])
        await session.flush()
        
        # =====================================================================
        # CREATE ORGANIZATION
        # =====================================================================
        print("🏢 Creating demo organization...")
        
        demo_org = Organization(
            id=str(uuid.uuid4()),
            name="Demo Company",
            slug="demo-org",
            description="A demo organization for testing Supymem features",
            plan="pro",
            max_users=50,
            max_teams=10,
        )
        session.add(demo_org)
        await session.flush()
        
        # Add members to organization with different roles
        org_members = [
            OrganizationMember(
                id=str(uuid.uuid4()),
                user_id=admin_user.id,
                organization_id=demo_org.id,
                role="owner",
            ),
            OrganizationMember(
                id=str(uuid.uuid4()),
                user_id=manager_user.id,
                organization_id=demo_org.id,
                role="manager",
            ),
            OrganizationMember(
                id=str(uuid.uuid4()),
                user_id=member_user.id,
                organization_id=demo_org.id,
                role="member",
            ),
            OrganizationMember(
                id=str(uuid.uuid4()),
                user_id=viewer_user.id,
                organization_id=demo_org.id,
                role="viewer",
            ),
        ]
        session.add_all(org_members)
        
        # =====================================================================
        # CREATE TEAMS
        # =====================================================================
        print("👥 Creating demo teams...")
        
        engineering_team = Team(
            id=str(uuid.uuid4()),
            organization_id=demo_org.id,
            name="Engineering",
            slug="engineering",
            description="Product engineering team",
            is_default=True,
        )
        
        design_team = Team(
            id=str(uuid.uuid4()),
            organization_id=demo_org.id,
            name="Design",
            slug="design",
            description="Product design and UX team",
        )
        
        marketing_team = Team(
            id=str(uuid.uuid4()),
            organization_id=demo_org.id,
            name="Marketing",
            slug="marketing",
            description="Marketing and growth team",
        )
        
        session.add_all([engineering_team, design_team, marketing_team])
        await session.flush()
        
        # Add team members
        team_members = [
            # Engineering team (admin + manager + member)
            TeamMember(id=str(uuid.uuid4()), user_id=admin_user.id, team_id=engineering_team.id, role="admin"),
            TeamMember(id=str(uuid.uuid4()), user_id=manager_user.id, team_id=engineering_team.id, role="manager"),
            TeamMember(id=str(uuid.uuid4()), user_id=member_user.id, team_id=engineering_team.id, role="member"),
            # Design team
            TeamMember(id=str(uuid.uuid4()), user_id=manager_user.id, team_id=design_team.id, role="admin"),
            TeamMember(id=str(uuid.uuid4()), user_id=viewer_user.id, team_id=design_team.id, role="member"),
            # Marketing team
            TeamMember(id=str(uuid.uuid4()), user_id=admin_user.id, team_id=marketing_team.id, role="member"),
        ]
        session.add_all(team_members)
        
        # Update users' current org/team
        admin_user.current_org_id = demo_org.id
        admin_user.current_team_id = engineering_team.id
        manager_user.current_org_id = demo_org.id
        manager_user.current_team_id = engineering_team.id
        member_user.current_org_id = demo_org.id
        member_user.current_team_id = engineering_team.id
        viewer_user.current_org_id = demo_org.id
        viewer_user.current_team_id = design_team.id
        
        # =====================================================================
        # CREATE TASKS
        # =====================================================================
        print("📋 Creating demo tasks...")
        
        tasks = [
            Task(
                id=str(uuid.uuid4()),
                title="Implement user authentication",
                description="Add JWT-based authentication with login, signup, and password reset",
                status="completed",
                priority="high",
                team_id=engineering_team.id,
                assigned_to=member_user.email,
                created_by=manager_user.email,
                completed_at=datetime.utcnow() - timedelta(days=2),
            ),
            Task(
                id=str(uuid.uuid4()),
                title="Design new dashboard layout",
                description="Create mockups for the new role-based dashboard with personalization options",
                status="in_progress",
                priority="high",
                team_id=engineering_team.id,
                assigned_to=member_user.email,
                created_by=manager_user.email,
            ),
            Task(
                id=str(uuid.uuid4()),
                title="Set up CI/CD pipeline",
                description="Configure GitHub Actions for automated testing and deployment",
                status="pending",
                priority="medium",
                team_id=engineering_team.id,
                assigned_to=admin_user.email,
                created_by=manager_user.email,
                due_date=datetime.utcnow() + timedelta(days=7),
            ),
            Task(
                id=str(uuid.uuid4()),
                title="Write API documentation",
                description="Document all REST endpoints using OpenAPI/Swagger",
                status="pending",
                priority="low",
                team_id=engineering_team.id,
                assigned_to=member_user.email,
                created_by=admin_user.email,
            ),
            Task(
                id=str(uuid.uuid4()),
                title="Review security audit findings",
                description="Address security vulnerabilities identified in the latest audit",
                status="pending",
                priority="urgent",
                team_id=engineering_team.id,
                assigned_to=admin_user.email,
                created_by=manager_user.email,
                due_date=datetime.utcnow() + timedelta(days=3),
            ),
        ]
        session.add_all(tasks)
        
        # =====================================================================
        # CREATE DECISIONS
        # =====================================================================
        print("🎯 Creating demo decisions...")
        
        decisions = [
            Decision(
                id=str(uuid.uuid4()),
                team_id=engineering_team.id,
                title="Use PostgreSQL with pgvector for vector storage",
                summary="After evaluating Pinecone, Weaviate, and pgvector, we decided to use pgvector for its simplicity and lower operational overhead.",
                reasoning="pgvector integrates seamlessly with our existing PostgreSQL setup, reducing complexity. Performance is sufficient for our scale.",
                source_type="discussion",
                decided_by=admin_user.email,
                category="architecture",
                importance="high",
            ),
            Decision(
                id=str(uuid.uuid4()),
                team_id=engineering_team.id,
                title="Adopt Role-Based Access Control (RBAC)",
                summary="Implemented 5-tier role system: owner, admin, manager, member, viewer",
                reasoning="Clear separation of permissions allows for granular access control while keeping the system manageable.",
                source_type="pr",
                decided_by=manager_user.email,
                category="security",
                importance="critical",
            ),
            Decision(
                id=str(uuid.uuid4()),
                team_id=engineering_team.id,
                title="Use React with TanStack Query for frontend",
                summary="Chose React + TanStack Query over Next.js for simpler deployment",
                reasoning="SPA approach fits our use case better. TanStack Query handles caching and synchronization elegantly.",
                source_type="discussion",
                decided_by=member_user.email,
                category="architecture",
                importance="medium",
            ),
        ]
        session.add_all(decisions)
        
        # =====================================================================
        # CREATE KNOWLEDGE ENTRIES
        # =====================================================================
        print("📚 Creating demo knowledge entries...")
        
        knowledge = [
            KnowledgeEntry(
                id=str(uuid.uuid4()),
                content="Our API uses JWT tokens for authentication. Access tokens expire after 24 hours. Refresh tokens last 30 days.",
                source="documentation",
                team_id=engineering_team.id,
                user_id=admin_user.id,
                category="instruction",
                importance_score=0.9,
            ),
            KnowledgeEntry(
                id=str(uuid.uuid4()),
                content="Database backups run daily at 3 AM UTC. Retention period is 30 days. Point-in-time recovery is available.",
                source="documentation",
                team_id=engineering_team.id,
                user_id=admin_user.id,
                category="instruction",
                importance_score=0.8,
            ),
            KnowledgeEntry(
                id=str(uuid.uuid4()),
                content="The Slack bot uses Socket Mode for real-time communication. Commands include /supymem, /remember, /my-tasks.",
                source="slack",
                team_id=engineering_team.id,
                user_id=member_user.id,
                category="note",
                importance_score=0.7,
            ),
            KnowledgeEntry(
                id=str(uuid.uuid4()),
                content="Sprint planning happens every Monday at 10 AM. Standups are daily at 9:30 AM. Retros are bi-weekly on Fridays.",
                source="slack",
                team_id=engineering_team.id,
                user_id=manager_user.id,
                category="announcement",
                importance_score=0.6,
            ),
        ]
        session.add_all(knowledge)
        
        # =====================================================================
        # CREATE AUTOMATION RULES
        # =====================================================================
        print("🤖 Creating demo automation rules...")
        
        automations = [
            AutomationRule(
                id=str(uuid.uuid4()),
                team_id=engineering_team.id,
                created_by=manager_user.email,
                original_instruction="When a task is completed, notify the team lead",
                description="Sends notification to team lead when any task is marked complete",
                trigger_type="task_completed",
                trigger_conditions={"event": "task_completed"},
                action_type="notify_user",
                action_params={"user": manager_user.email, "message": "A task has been completed"},
                status="active",
            ),
            AutomationRule(
                id=str(uuid.uuid4()),
                team_id=engineering_team.id,
                created_by=admin_user.email,
                original_instruction="After PR is merged, create documentation task",
                description="Creates a documentation task when a PR is merged",
                trigger_type="pr_merged",
                trigger_conditions={"event": "pr_merged"},
                action_type="create_task",
                action_params={"title": "Update documentation for merged PR", "assignee": member_user.email},
                status="active",
            ),
        ]
        session.add_all(automations)
        
        # =====================================================================
        # CREATE USER ACTIVITIES
        # =====================================================================
        print("📊 Creating demo activities...")
        
        activities = [
            UserActivity(
                id=str(uuid.uuid4()),
                user_id=member_user.id,
                user_identifier=member_user.email,
                team_id=engineering_team.id,
                activity_type="task_completed",
                title="Completed: Implement user authentication",
                source="api",
                timestamp=datetime.utcnow() - timedelta(hours=2),
            ),
            UserActivity(
                id=str(uuid.uuid4()),
                user_id=admin_user.id,
                user_identifier=admin_user.email,
                team_id=engineering_team.id,
                activity_type="commit",
                title="feat: add organization management",
                source="github",
                lines_added=450,
                lines_removed=20,
                timestamp=datetime.utcnow() - timedelta(hours=5),
            ),
            UserActivity(
                id=str(uuid.uuid4()),
                user_id=manager_user.id,
                user_identifier=manager_user.email,
                team_id=engineering_team.id,
                activity_type="pr_review",
                title="Reviewed PR #42: Add RBAC",
                source="github",
                timestamp=datetime.utcnow() - timedelta(hours=8),
            ),
        ]
        session.add_all(activities)
        
        await session.commit()
        
        print()
        print("=" * 60)
        print("✅ Demo data seeded successfully!")
        print("=" * 60)
        print()
        print("📋 DEMO CREDENTIALS:")
        print("-" * 60)
        print(f"{'Role':<15} {'Email':<25} {'Password':<15}")
        print("-" * 60)
        print(f"{'Owner/Admin':<15} {'admin@demo.com':<25} {DEMO_PASSWORD:<15}")
        print(f"{'Manager':<15} {'manager@demo.com':<25} {DEMO_PASSWORD:<15}")
        print(f"{'Member':<15} {'member@demo.com':<25} {DEMO_PASSWORD:<15}")
        print(f"{'Viewer':<15} {'viewer@demo.com':<25} {DEMO_PASSWORD:<15}")
        print("-" * 60)
        print()
        print("🏢 Organization: Demo Company (demo-org)")
        print("👥 Teams: Engineering, Design, Marketing")
        print()


if __name__ == "__main__":
    asyncio.run(seed_demo_data())

