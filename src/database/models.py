from datetime import datetime
from sqlalchemy import (
    Column, String, Text, DateTime, Boolean, ForeignKey, 
    Index, Float, Integer, Date, JSON
)
from sqlalchemy.orm import DeclarativeBase, relationship
from pgvector.sqlalchemy import Vector
import enum
import uuid


class Base(DeclarativeBase):
    pass


# ============================================================================
# ENUMS
# ============================================================================

class ContentCategory(str, enum.Enum):
    TASK = "task"
    DECISION = "decision"
    INSTRUCTION = "instruction"
    NOTE = "note"
    DEPENDENCY = "dependency"
    PROSPECT = "prospect"
    DISCUSSION = "discussion"
    ANNOUNCEMENT = "announcement"
    QUESTION = "question"
    OTHER = "other"


class TaskStatus(str, enum.Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class TaskPriority(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"


class NotificationType(str, enum.Enum):
    CHANGE_IMPACT = "change_impact"
    BREAKING_CHANGE = "breaking_change"
    TASK_ASSIGNED = "task_assigned"
    TASK_COMPLETED = "task_completed"
    AUTOMATION_TRIGGERED = "automation_triggered"
    MENTION = "mention"
    DECISION_MADE = "decision_made"
    REMINDER = "reminder"


class ActivityType(str, enum.Enum):
    COMMIT = "commit"
    PR_OPENED = "pr_opened"
    PR_MERGED = "pr_merged"
    PR_CLOSED = "pr_closed"
    PR_REVIEW = "pr_review"
    ISSUE_COMMENT = "issue_comment"
    TASK_CREATED = "task_created"
    TASK_COMPLETED = "task_completed"
    TASK_UPDATED = "task_updated"
    KNOWLEDGE_STORED = "knowledge_stored"
    QUERY = "query"


class AutomationTriggerType(str, enum.Enum):
    TASK_COMPLETED = "task_completed"
    PR_MERGED = "pr_merged"
    FILE_CHANGED = "file_changed"
    USER_ACTIVITY = "user_activity"
    TIME_BASED = "time_based"
    KEYWORD_DETECTED = "keyword_detected"


class AutomationActionType(str, enum.Enum):
    NOTIFY_USER = "notify_user"
    CREATE_TASK = "create_task"
    ASSIGN_TASK = "assign_task"
    SEND_MESSAGE = "send_message"
    UPDATE_TASK = "update_task"


# ============================================================================
# ORGANIZATION, USER & TEAM MODELS
# ============================================================================

class UserRole(str, enum.Enum):
    OWNER = "owner"          # Can do everything, including delete org
    ADMIN = "admin"          # Can manage users, teams, settings
    MANAGER = "manager"      # Can manage team members, view analytics
    MEMBER = "member"        # Can view and contribute
    VIEWER = "viewer"        # Read-only access


class Organization(Base):
    """Organizations contain teams and users."""
    __tablename__ = "organizations"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(255), nullable=False)
    slug = Column(String(100), unique=True, nullable=False)
    description = Column(Text, nullable=True)
    logo_url = Column(String(500), nullable=True)
    
    # Billing & Plan
    plan = Column(String(50), default="free")  # free, pro, enterprise
    max_users = Column(Integer, default=10)
    max_teams = Column(Integer, default=3)
    
    # Settings
    settings = Column(JSON, default=dict)
    allowed_domains = Column(JSON, default=list)  # Email domains allowed to join
    
    # Integrations
    github_org = Column(String(100), nullable=True)
    slack_workspace_id = Column(String(100), nullable=True)
    
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    members = relationship("OrganizationMember", back_populates="organization")
    teams = relationship("Team", back_populates="organization")
    invites = relationship("Invite", back_populates="organization")

    __table_args__ = (
        Index("idx_org_slug", "slug"),
    )


class OrganizationMember(Base):
    """User membership in an organization."""
    __tablename__ = "organization_members"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    organization_id = Column(String(36), ForeignKey("organizations.id"), nullable=False)
    role = Column(String(20), default="member")  # Uses UserRole enum
    
    # Permissions override (optional fine-grained control)
    custom_permissions = Column(JSON, default=dict)
    
    joined_at = Column(DateTime, default=datetime.utcnow)
    invited_by = Column(String(36), nullable=True)

    # Relationships
    user = relationship("User", back_populates="org_memberships")
    organization = relationship("Organization", back_populates="members")

    __table_args__ = (
        Index("idx_org_member_user", "user_id"),
        Index("idx_org_member_org", "organization_id"),
    )


class Invite(Base):
    """Pending invitations to join an organization."""
    __tablename__ = "invites"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String(255), nullable=False)
    organization_id = Column(String(36), ForeignKey("organizations.id"), nullable=False)
    team_id = Column(String(36), ForeignKey("teams.id"), nullable=True)
    role = Column(String(20), default="member")
    
    token = Column(String(100), unique=True, nullable=False)
    invited_by = Column(String(36), nullable=False)
    
    status = Column(String(20), default="pending")  # pending, accepted, expired, revoked
    expires_at = Column(DateTime, nullable=False)
    accepted_at = Column(DateTime, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    organization = relationship("Organization", back_populates="invites")

    __table_args__ = (
        Index("idx_invite_email", "email"),
        Index("idx_invite_token", "token"),
        Index("idx_invite_org", "organization_id"),
    )


class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String(255), unique=True, nullable=False)
    name = Column(String(255), nullable=False)
    avatar_url = Column(String(500), nullable=True)
    
    # Authentication
    password_hash = Column(String(255), nullable=True)  # Null for OAuth-only users
    is_email_verified = Column(Boolean, default=False)
    email_verification_token = Column(String(100), nullable=True)
    password_reset_token = Column(String(100), nullable=True)
    password_reset_expires = Column(DateTime, nullable=True)
    
    # External IDs for OAuth
    github_id = Column(String(100), nullable=True, unique=True)
    github_username = Column(String(100), nullable=True)
    slack_id = Column(String(100), nullable=True, unique=True)
    slack_username = Column(String(100), nullable=True)
    google_id = Column(String(100), nullable=True, unique=True)
    
    # Current context (last used org/team)
    current_org_id = Column(String(36), nullable=True)
    current_team_id = Column(String(36), nullable=True)
    
    # Settings
    settings = Column(JSON, default=dict)
    notification_preferences = Column(JSON, default=dict)
    dashboard_layout = Column(JSON, default=dict)  # User's custom dashboard config
    
    # Status
    is_active = Column(Boolean, default=True)
    is_superadmin = Column(Boolean, default=False)  # Platform-level admin
    last_login_at = Column(DateTime, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    org_memberships = relationship("OrganizationMember", back_populates="user")
    team_memberships = relationship("TeamMember", back_populates="user")
    activities = relationship("UserActivity", back_populates="user")
    notifications = relationship("Notification", back_populates="user")

    __table_args__ = (
        Index("idx_user_github", "github_id"),
        Index("idx_user_slack", "slack_id"),
        Index("idx_user_email", "email"),
    )


class Team(Base):
    __tablename__ = "teams"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    organization_id = Column(String(36), ForeignKey("organizations.id"), nullable=False)
    name = Column(String(255), nullable=False)
    slug = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    
    # Connected integrations (can override org-level)
    github_repos = Column(JSON, default=list)  # List of repo full names
    slack_channels = Column(JSON, default=list)  # List of channel IDs to monitor
    
    # Team-specific settings
    settings = Column(JSON, default=dict)
    is_default = Column(Boolean, default=False)  # Default team for new org members
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    organization = relationship("Organization", back_populates="teams")
    members = relationship("TeamMember", back_populates="team")

    __table_args__ = (
        Index("idx_team_slug", "slug"),
        Index("idx_team_org", "organization_id"),
    )


class TeamMember(Base):
    __tablename__ = "team_members"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    team_id = Column(String(36), ForeignKey("teams.id"), nullable=False)
    role = Column(String(20), default="member")  # admin, manager, member
    joined_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="team_memberships")
    team = relationship("Team", back_populates="members")

    __table_args__ = (
        Index("idx_team_member_user", "user_id"),
        Index("idx_team_member_team", "team_id"),
    )


# ============================================================================
# KNOWLEDGE & CONTENT MODELS
# ============================================================================

class KnowledgeEntry(Base):
    __tablename__ = "knowledge_entries"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    content = Column(Text, nullable=False)
    source = Column(String(50), nullable=False)  # slack, github_commit, github_pr, api, etc.
    source_id = Column(String(255), nullable=True)
    source_url = Column(String(500), nullable=True)
    team_id = Column(String(100), nullable=False)
    user_id = Column(String(100), nullable=True)
    
    # Classification
    category = Column(String(50), default="other")  # Uses ContentCategory enum values
    subcategory = Column(String(50), nullable=True)
    importance_score = Column(Float, default=0.5)  # 0-1 scale
    is_actionable = Column(Boolean, default=False)
    
    # Extracted data
    extracted_entities = Column(JSON, default=dict)  # {people: [], files: [], concepts: []}
    extracted_action_items = Column(JSON, default=list)
    
    # Vector embedding
    embedding = Column(Vector(768), nullable=True)
    
    # Metadata
    extra_metadata = Column(JSON, default=dict)
    tags = Column(JSON, default=list)
    
    # Relationships
    related_decision_id = Column(String(36), ForeignKey("decisions.id"), nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    is_deleted = Column(Boolean, default=False)

    __table_args__ = (
        Index("idx_knowledge_team_id", "team_id"),
        Index("idx_knowledge_source", "source"),
        Index("idx_knowledge_category", "category"),
        Index("idx_knowledge_created_at", "created_at"),
        Index("idx_knowledge_actionable", "is_actionable"),
    )


class Decision(Base):
    """Tracks important decisions with their reasoning."""
    __tablename__ = "decisions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    team_id = Column(String(100), nullable=False)
    
    # Decision content
    title = Column(String(500), nullable=False)
    summary = Column(Text, nullable=True)
    reasoning = Column(Text, nullable=True)  # The "why" behind the decision
    alternatives_considered = Column(JSON, default=list)  # [{option: str, pros: [], cons: [], rejected_reason: str}]
    
    # Context
    context = Column(Text, nullable=True)  # Background context
    impact = Column(Text, nullable=True)  # Expected impact
    
    # Source information
    source_type = Column(String(50), nullable=False)  # pr, commit, slack, manual
    source_id = Column(String(255), nullable=True)
    source_url = Column(String(500), nullable=True)
    
    # People involved
    decided_by = Column(String(100), nullable=True)  # User ID or username
    participants = Column(JSON, default=list)  # List of user IDs/usernames involved
    
    # Affected scope
    affected_files = Column(JSON, default=list)
    affected_components = Column(JSON, default=list)
    affected_users = Column(JSON, default=list)
    
    # Classification
    category = Column(String(50), nullable=True)  # architecture, process, tooling, feature, etc.
    tags = Column(JSON, default=list)
    importance = Column(String(20), default="medium")  # low, medium, high, critical
    
    # Status
    status = Column(String(20), default="active")  # active, superseded, reverted
    superseded_by = Column(String(36), nullable=True)  # ID of newer decision
    
    # Vector for similarity search
    embedding = Column(Vector(768), nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    knowledge_entries = relationship("KnowledgeEntry", backref="related_decision")
    challenges = relationship("DecisionChallenge", back_populates="decision")

    __table_args__ = (
        Index("idx_decision_team", "team_id"),
        Index("idx_decision_source", "source_type", "source_id"),
        Index("idx_decision_status", "status"),
        Index("idx_decision_created", "created_at"),
    )


class DecisionChallenge(Base):
    """Tracks challenges/debates about decisions."""
    __tablename__ = "decision_challenges"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    decision_id = Column(String(36), ForeignKey("decisions.id"), nullable=False)
    
    challenger_id = Column(String(100), nullable=False)  # User who challenged
    challenge_reason = Column(Text, nullable=False)
    proposed_alternative = Column(Text, nullable=True)
    
    # AI response
    ai_analysis = Column(Text, nullable=True)
    retrieved_context = Column(JSON, default=list)  # List of relevant knowledge entries
    
    # Resolution
    status = Column(String(20), default="open")  # open, resolved, accepted, rejected
    resolution = Column(Text, nullable=True)
    resolved_by = Column(String(100), nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    resolved_at = Column(DateTime, nullable=True)

    # Relationships
    decision = relationship("Decision", back_populates="challenges")

    __table_args__ = (
        Index("idx_challenge_decision", "decision_id"),
        Index("idx_challenge_status", "status"),
    )


# ============================================================================
# ACTIVITY & OWNERSHIP TRACKING
# ============================================================================

class UserActivity(Base):
    """Tracks all user activities for productivity analysis."""
    __tablename__ = "user_activities"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    user_identifier = Column(String(100), nullable=False)  # Fallback: github username, slack id
    team_id = Column(String(100), nullable=False)
    
    activity_type = Column(String(50), nullable=False)  # Uses ActivityType enum
    
    # Activity details
    title = Column(String(500), nullable=True)
    description = Column(Text, nullable=True)
    source = Column(String(50), nullable=True)  # github, slack, api
    source_id = Column(String(255), nullable=True)
    source_url = Column(String(500), nullable=True)
    
    # Related entities
    related_files = Column(JSON, default=list)
    related_task_id = Column(String(36), nullable=True)
    related_pr_number = Column(Integer, nullable=True)
    related_repo = Column(String(255), nullable=True)
    
    # Metrics
    lines_added = Column(Integer, default=0)
    lines_removed = Column(Integer, default=0)
    files_changed = Column(Integer, default=0)
    
    # Extra data (renamed from 'metadata' to avoid SQLAlchemy reserved word)
    extra_data = Column(JSON, default=dict)
    
    timestamp = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="activities")

    __table_args__ = (
        Index("idx_activity_user", "user_id"),
        Index("idx_activity_user_identifier", "user_identifier"),
        Index("idx_activity_team", "team_id"),
        Index("idx_activity_type", "activity_type"),
        Index("idx_activity_timestamp", "timestamp"),
        Index("idx_activity_source", "source", "source_id"),
    )


class FileOwnership(Base):
    """Tracks file ownership based on commit history."""
    __tablename__ = "file_ownership"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    
    file_path = Column(String(500), nullable=False)
    repo = Column(String(255), nullable=False)
    team_id = Column(String(100), nullable=False)
    
    # Owner information (can have multiple owners per file)
    user_identifier = Column(String(100), nullable=False)  # GitHub username
    user_id = Column(String(36), nullable=True)  # Link to User if available
    
    # Ownership metrics
    ownership_score = Column(Float, default=0.0)  # 0-1, based on contribution
    total_commits = Column(Integer, default=0)
    total_lines_added = Column(Integer, default=0)
    total_lines_removed = Column(Integer, default=0)
    
    # Time-based ownership
    first_commit_at = Column(DateTime, nullable=True)
    last_commit_at = Column(DateTime, nullable=True)
    
    # Recent activity weight
    recent_activity_score = Column(Float, default=0.0)  # Higher if recently active
    
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        Index("idx_ownership_file", "file_path", "repo"),
        Index("idx_ownership_user", "user_identifier"),
        Index("idx_ownership_team", "team_id"),
        Index("idx_ownership_score", "ownership_score"),
    )


# ============================================================================
# NOTIFICATIONS
# ============================================================================

class Notification(Base):
    """Notifications sent to users."""
    __tablename__ = "notifications"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    
    user_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    user_identifier = Column(String(100), nullable=False)  # Fallback identifier
    team_id = Column(String(100), nullable=False)
    
    notification_type = Column(String(50), nullable=False)  # Uses NotificationType enum
    
    # Content
    title = Column(String(500), nullable=False)
    content = Column(Text, nullable=True)
    
    # Source reference
    source_type = Column(String(50), nullable=True)  # pr, commit, task, decision
    source_id = Column(String(255), nullable=True)
    source_url = Column(String(500), nullable=True)
    
    # Related entities
    related_change = Column(JSON, default=dict)  # Details about what changed
    affected_files = Column(JSON, default=list)
    
    # Priority
    priority = Column(String(20), default="normal")  # low, normal, high, urgent
    
    # Status
    is_read = Column(Boolean, default=False)
    is_dismissed = Column(Boolean, default=False)
    is_actioned = Column(Boolean, default=False)
    action_taken = Column(String(100), nullable=True)
    
    # Delivery
    delivery_channels = Column(JSON, default=list)  # ['slack', 'email', 'web']
    delivered_via_slack = Column(Boolean, default=False)
    delivered_via_email = Column(Boolean, default=False)
    slack_message_ts = Column(String(50), nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    read_at = Column(DateTime, nullable=True)

    # Relationships
    user = relationship("User", back_populates="notifications")

    __table_args__ = (
        Index("idx_notification_user", "user_id"),
        Index("idx_notification_user_identifier", "user_identifier"),
        Index("idx_notification_team", "team_id"),
        Index("idx_notification_type", "notification_type"),
        Index("idx_notification_read", "is_read"),
        Index("idx_notification_created", "created_at"),
    )


# ============================================================================
# TASKS (Enhanced)
# ============================================================================

class Task(Base):
    __tablename__ = "tasks"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    title = Column(String(500), nullable=False)
    description = Column(Text, nullable=True)
    
    # Status & Priority
    status = Column(String(20), default="pending")  # Uses TaskStatus enum
    priority = Column(String(10), default="medium")  # Uses TaskPriority enum
    
    # Assignment
    team_id = Column(String(100), nullable=False)
    assigned_to = Column(String(100), nullable=True)  # User identifier
    assigned_to_user_id = Column(String(36), nullable=True)  # User ID if available
    created_by = Column(String(100), nullable=True)
    
    # Source
    source = Column(String(50), nullable=True)  # slack, github, api, automation
    source_id = Column(String(255), nullable=True)
    source_url = Column(String(500), nullable=True)
    
    # Scheduling
    due_date = Column(DateTime, nullable=True)
    estimated_hours = Column(Float, nullable=True)
    
    # Dependencies
    depends_on = Column(JSON, default=list)  # List of task IDs
    blocks = Column(JSON, default=list)  # List of task IDs this blocks
    
    # Related entities
    related_files = Column(JSON, default=list)
    related_prs = Column(JSON, default=list)
    related_decision_id = Column(String(36), nullable=True)
    
    # Classification
    category = Column(String(50), nullable=True)
    tags = Column(JSON, default=list)
    
    # Automation
    created_by_automation = Column(String(36), nullable=True)  # Automation rule ID
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)

    __table_args__ = (
        Index("idx_task_team", "team_id"),
        Index("idx_task_status", "status"),
        Index("idx_task_assigned", "assigned_to"),
        Index("idx_task_priority", "priority"),
        Index("idx_task_due_date", "due_date"),
    )


# ============================================================================
# AUTOMATION
# ============================================================================

class AutomationRule(Base):
    """Natural language automation rules."""
    __tablename__ = "automation_rules"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    team_id = Column(String(100), nullable=False)
    created_by = Column(String(100), nullable=False)
    
    # Original natural language input
    original_instruction = Column(Text, nullable=False)
    
    # Parsed components
    description = Column(Text, nullable=True)  # Human-readable summary
    
    # Trigger configuration
    trigger_type = Column(String(50), nullable=False)  # Uses AutomationTriggerType enum
    trigger_conditions = Column(JSON, nullable=False)  # Parsed conditions
    # Example: {"user": "rahul", "task_type": "CSS", "event": "completed"}
    
    # Action configuration
    action_type = Column(String(50), nullable=False)  # Uses AutomationActionType enum
    action_params = Column(JSON, nullable=False)  # Action parameters
    # Example: {"notify_user": "rahul", "message": "API integration is next priority"}
    
    # Status
    status = Column(String(20), default="active")  # active, paused, completed, failed
    is_one_time = Column(Boolean, default=False)  # If true, deactivate after triggering
    
    # Execution tracking
    execution_count = Column(Integer, default=0)
    last_triggered_at = Column(DateTime, nullable=True)
    last_execution_result = Column(JSON, default=dict)
    
    # Scheduling (for time-based triggers)
    schedule_cron = Column(String(100), nullable=True)
    next_scheduled_run = Column(DateTime, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    expires_at = Column(DateTime, nullable=True)

    # Relationships
    executions = relationship("AutomationExecution", back_populates="rule")

    __table_args__ = (
        Index("idx_automation_team", "team_id"),
        Index("idx_automation_status", "status"),
        Index("idx_automation_trigger", "trigger_type"),
    )


class AutomationExecution(Base):
    """Log of automation rule executions."""
    __tablename__ = "automation_executions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    rule_id = Column(String(36), ForeignKey("automation_rules.id"), nullable=False)
    
    # Trigger details
    triggered_by_event = Column(JSON, nullable=True)  # The event that triggered this
    
    # Execution result
    status = Column(String(20), nullable=False)  # success, failed, skipped
    result = Column(JSON, default=dict)
    error_message = Column(Text, nullable=True)
    
    # Actions taken
    actions_performed = Column(JSON, default=list)
    
    executed_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    rule = relationship("AutomationRule", back_populates="executions")

    __table_args__ = (
        Index("idx_execution_rule", "rule_id"),
        Index("idx_execution_status", "status"),
        Index("idx_execution_time", "executed_at"),
    )


# ============================================================================
# PRODUCTIVITY & ANALYTICS
# ============================================================================

class ProductivitySnapshot(Base):
    """Daily productivity snapshots per user."""
    __tablename__ = "productivity_snapshots"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    
    user_identifier = Column(String(100), nullable=False)
    user_id = Column(String(36), nullable=True)
    team_id = Column(String(100), nullable=False)
    
    snapshot_date = Column(Date, nullable=False)
    
    # Activity counts
    commits_count = Column(Integer, default=0)
    prs_opened = Column(Integer, default=0)
    prs_merged = Column(Integer, default=0)
    prs_reviewed = Column(Integer, default=0)
    issues_closed = Column(Integer, default=0)
    comments_made = Column(Integer, default=0)
    
    # Task metrics
    tasks_created = Column(Integer, default=0)
    tasks_completed = Column(Integer, default=0)
    tasks_in_progress = Column(Integer, default=0)
    
    # Code metrics
    lines_added = Column(Integer, default=0)
    lines_removed = Column(Integer, default=0)
    files_changed = Column(Integer, default=0)
    
    # Knowledge contribution
    knowledge_entries_created = Column(Integer, default=0)
    decisions_made = Column(Integer, default=0)
    
    # Derived metrics
    productivity_score = Column(Float, default=0.0)  # Calculated composite score
    
    # Raw data for detailed analysis
    metrics_detail = Column(JSON, default=dict)
    
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index("idx_snapshot_user", "user_identifier"),
        Index("idx_snapshot_team", "team_id"),
        Index("idx_snapshot_date", "snapshot_date"),
        Index("idx_snapshot_user_date", "user_identifier", "snapshot_date"),
    )


# ============================================================================
# CONVERSATIONS (Enhanced)
# ============================================================================

class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    thread_id = Column(String(255), nullable=False, unique=True)
    team_id = Column(String(100), nullable=False)
    channel_id = Column(String(100), nullable=True)
    user_id = Column(String(100), nullable=True)
    
    # Conversation metadata
    conversation_type = Column(String(50), default="query")  # query, challenge, automation
    
    started_at = Column(DateTime, default=datetime.utcnow)
    last_message_at = Column(DateTime, default=datetime.utcnow)
    message_count = Column(Integer, default=0)
    
    # Summary
    summary = Column(Text, nullable=True)
    extracted_actions = Column(JSON, default=list)
    
    # Status
    status = Column(String(20), default="active")  # active, resolved, archived

    messages = relationship("Message", back_populates="conversation")

    __table_args__ = (
        Index("idx_conversation_thread", "thread_id"),
        Index("idx_conversation_team", "team_id"),
        Index("idx_conversation_type", "conversation_type"),
    )


class Message(Base):
    __tablename__ = "messages"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    conversation_id = Column(String(36), ForeignKey("conversations.id"), nullable=False)
    role = Column(String(20), nullable=False)  # user, assistant, system
    content = Column(Text, nullable=False)
    user_id = Column(String(100), nullable=True)
    
    # Context used for this message
    context_used = Column(JSON, default=list)  # List of knowledge entry IDs used
    
    created_at = Column(DateTime, default=datetime.utcnow)

    conversation = relationship("Conversation", back_populates="messages")

    __table_args__ = (
        Index("idx_message_conversation", "conversation_id"),
        Index("idx_message_created_at", "created_at"),
    )


# ============================================================================
# GITHUB EVENTS (Enhanced)
# ============================================================================

class GitHubEvent(Base):
    __tablename__ = "github_events"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    
    event_type = Column(String(50), nullable=False)
    action = Column(String(50), nullable=True)
    
    repository = Column(String(255), nullable=False)
    sender = Column(String(100), nullable=True)
    sender_id = Column(String(100), nullable=True)
    
    # Event specifics
    pr_number = Column(Integer, nullable=True)
    issue_number = Column(Integer, nullable=True)
    commit_sha = Column(String(40), nullable=True)
    
    # Full payload
    payload = Column(JSON, nullable=True)
    
    # Processing status
    processed = Column(Boolean, default=False)
    processing_result = Column(JSON, default=dict)
    
    # Impact analysis
    impact_analyzed = Column(Boolean, default=False)
    affected_users = Column(JSON, default=list)
    affected_files = Column(JSON, default=list)
    notifications_sent = Column(JSON, default=list)
    
    # Classification
    is_breaking_change = Column(Boolean, default=False)
    change_category = Column(String(50), nullable=True)
    
    team_id = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index("idx_github_event_type", "event_type"),
        Index("idx_github_repository", "repository"),
        Index("idx_github_processed", "processed"),
        Index("idx_github_sender", "sender"),
        Index("idx_github_pr", "pr_number"),
    )


# ============================================================================
# OMNI PRESENCE - AGENT-DRIVEN KNOWLEDGE SYSTEM
# ============================================================================

class EntryType(str, enum.Enum):
    """Types of engineer entries."""
    AUDIO_LOG = "audio_log"      # From continuous audio logging
    NOTE = "note"                # From notes mode
    TODO = "todo"                # Extracted or manual todo
    IMAGE_NOTE = "image_note"    # Image with context
    TEXT_LOG = "text_log"        # Manual text entry
    VOICE_COMMAND = "voice_command"  # Direct voice command to agent


class EntryVisibility(str, enum.Enum):
    """Visibility levels for entries."""
    PRIVATE = "private"          # Only visible to the engineer
    PROJECT = "project"          # Visible to project members
    PUBLIC = "public"            # Visible to all org members


class TodoStatus(str, enum.Enum):
    """Status for extracted todos."""
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    DISMISSED = "dismissed"


class MediaType(str, enum.Enum):
    """Types of media assets."""
    IMAGE = "image"
    AUDIO = "audio"
    VIDEO = "video"
    DOCUMENT = "document"


class Project(Base):
    """Engineering projects that contain documents and team context."""
    __tablename__ = "projects"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    organization_id = Column(String(36), ForeignKey("organizations.id"), nullable=False)
    team_id = Column(String(36), ForeignKey("teams.id"), nullable=True)
    
    name = Column(String(255), nullable=False)
    slug = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    
    # Project metadata
    status = Column(String(20), default="active")  # active, archived, completed
    project_type = Column(String(50), nullable=True)  # hardware, software, mixed
    
    # Settings
    settings = Column(JSON, default=dict)
    
    # Repository links
    github_repos = Column(JSON, default=list)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(String(36), ForeignKey("users.id"), nullable=True)

    # Relationships
    documents = relationship("ProjectDocument", back_populates="project")
    entries = relationship("EngineerEntry", back_populates="project")
    summaries = relationship("DailySummary", back_populates="project")

    __table_args__ = (
        Index("idx_project_org", "organization_id"),
        Index("idx_project_team", "team_id"),
        Index("idx_project_slug", "slug"),
    )


class ProjectDocument(Base):
    """Authoritative documents within a project - source of truth."""
    __tablename__ = "project_documents"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(String(36), ForeignKey("projects.id"), nullable=False)
    
    title = Column(String(500), nullable=False)
    content = Column(Text, nullable=False)
    document_type = Column(String(50), nullable=True)  # design_doc, spec, decision_record
    
    # Source tracking
    source_url = Column(String(1000), nullable=True)  # GitHub, Confluence, etc.
    source_type = Column(String(50), nullable=True)
    
    # Versioning
    version = Column(Integer, default=1)
    last_synced_at = Column(DateTime, nullable=True)
    
    # Embedding for semantic search
    embedding = Column(Vector(1536), nullable=True)
    
    # Metadata
    tags = Column(JSON, default=list)
    doc_metadata = Column(JSON, default=dict)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(String(36), ForeignKey("users.id"), nullable=True)

    # Relationships
    project = relationship("Project", back_populates="documents")
    chunks = relationship("ProjectChunk", back_populates="document")

    __table_args__ = (
        Index("idx_project_doc_project", "project_id"),
    )


class ProjectChunk(Base):
    """Chunked portions of documents for efficient retrieval."""
    __tablename__ = "project_chunks"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    document_id = Column(String(36), ForeignKey("project_documents.id"), nullable=False)
    
    content = Column(Text, nullable=False)
    chunk_index = Column(Integer, nullable=False)
    
    # Embedding for semantic search
    embedding = Column(Vector(1536), nullable=True)
    
    # Context
    section_title = Column(String(500), nullable=True)
    chunk_metadata = Column(JSON, default=dict)
    
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    document = relationship("ProjectDocument", back_populates="chunks")

    __table_args__ = (
        Index("idx_chunk_document", "document_id"),
    )


class EngineerEntry(Base):
    """
    Primary knowledge capture from engineers.
    This is the core of Omni Presence - capturing tacit knowledge.
    """
    __tablename__ = "engineer_entries"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    project_id = Column(String(36), ForeignKey("projects.id"), nullable=True)
    organization_id = Column(String(36), ForeignKey("organizations.id"), nullable=False)
    
    # Entry classification
    entry_type = Column(String(30), nullable=False)  # Uses EntryType enum
    visibility = Column(String(20), default="project")  # Uses EntryVisibility enum
    
    # Content
    content = Column(Text, nullable=True)  # Transcribed text or written notes
    raw_transcript = Column(Text, nullable=True)  # Original STT output before processing
    
    # For todos extracted from content
    todo_status = Column(String(20), nullable=True)  # Uses TodoStatus enum
    todo_priority = Column(String(20), nullable=True)
    todo_due_date = Column(DateTime, nullable=True)
    
    # Embedding for semantic search
    embedding = Column(Vector(1536), nullable=True)
    
    # Quality signals
    word_count = Column(Integer, default=0)
    confidence_score = Column(Float, nullable=True)  # STT confidence
    is_valid = Column(Boolean, default=True)  # Passed validation threshold
    
    # Attribution
    context_tags = Column(JSON, default=list)  # Auto-extracted context tags
    mentioned_users = Column(JSON, default=list)  # User IDs mentioned
    mentioned_decisions = Column(JSON, default=list)  # Decision IDs referenced
    
    # Session tracking (for Notes Mode)
    session_id = Column(String(36), nullable=True)
    
    # Timestamps
    recorded_at = Column(DateTime, nullable=True)  # When audio/note was captured
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User")
    project = relationship("Project", back_populates="entries")
    media_assets = relationship("MediaAsset", back_populates="entry")

    __table_args__ = (
        Index("idx_entry_user", "user_id"),
        Index("idx_entry_project", "project_id"),
        Index("idx_entry_org", "organization_id"),
        Index("idx_entry_type", "entry_type"),
        Index("idx_entry_visibility", "visibility"),
        Index("idx_entry_session", "session_id"),
        Index("idx_entry_created", "created_at"),
    )


class MediaAsset(Base):
    """
    Media files attached to engineer entries.
    Images, audio recordings, etc.
    """
    __tablename__ = "media_assets"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    entry_id = Column(String(36), ForeignKey("engineer_entries.id"), nullable=True)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    organization_id = Column(String(36), ForeignKey("organizations.id"), nullable=False)
    
    # File info
    media_type = Column(String(20), nullable=False)  # Uses MediaType enum
    file_name = Column(String(500), nullable=False)
    file_path = Column(String(1000), nullable=False)  # S3 path or local path
    file_size = Column(Integer, nullable=True)  # In bytes
    mime_type = Column(String(100), nullable=True)
    
    # For audio files
    duration_seconds = Column(Float, nullable=True)
    transcript = Column(Text, nullable=True)
    
    # For images
    image_description = Column(Text, nullable=True)  # AI-generated description
    extracted_text = Column(Text, nullable=True)  # OCR text
    
    # Embedding (for image semantic search via CLIP or description)
    embedding = Column(Vector(1536), nullable=True)
    
    # Processing status
    processed = Column(Boolean, default=False)
    processing_error = Column(Text, nullable=True)
    
    # Timestamps
    captured_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    entry = relationship("EngineerEntry", back_populates="media_assets")

    __table_args__ = (
        Index("idx_media_entry", "entry_id"),
        Index("idx_media_user", "user_id"),
        Index("idx_media_type", "media_type"),
    )


class DailySummary(Base):
    """
    AI-generated daily summaries for engineers and projects.
    Created by end-of-day cron job.
    """
    __tablename__ = "daily_summaries"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"), nullable=True)  # Null for project summaries
    project_id = Column(String(36), ForeignKey("projects.id"), nullable=True)
    organization_id = Column(String(36), ForeignKey("organizations.id"), nullable=False)
    
    # Summary date
    summary_date = Column(Date, nullable=False)
    summary_type = Column(String(20), nullable=False)  # "engineer", "project", "team"
    
    # Content
    summary = Column(Text, nullable=False)
    
    # Structured breakdown
    work_performed = Column(JSON, default=list)  # List of work items
    key_decisions = Column(JSON, default=list)  # Decisions made
    open_todos = Column(JSON, default=list)  # Unfinished todos
    blockers = Column(JSON, default=list)  # Identified blockers
    highlights = Column(JSON, default=list)  # Notable achievements
    
    # Metrics
    entries_processed = Column(Integer, default=0)
    audio_minutes = Column(Float, default=0)
    todos_created = Column(Integer, default=0)
    todos_completed = Column(Integer, default=0)
    
    # Embedding for searching summaries
    embedding = Column(Vector(1536), nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    project = relationship("Project", back_populates="summaries")

    __table_args__ = (
        Index("idx_summary_user", "user_id"),
        Index("idx_summary_project", "project_id"),
        Index("idx_summary_date", "summary_date"),
        Index("idx_summary_type", "summary_type"),
    )


class AgentSession(Base):
    """
    Persistent agent session for each engineer.
    Each engineer has one dedicated agent.
    """
    __tablename__ = "agent_sessions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, unique=True)
    organization_id = Column(String(36), ForeignKey("organizations.id"), nullable=False)
    
    # Agent state
    agent_name = Column(String(100), nullable=True)  # Optional personalized name
    system_prompt = Column(Text, nullable=True)  # Customized system prompt
    
    # Context awareness
    current_project_id = Column(String(36), ForeignKey("projects.id"), nullable=True)
    active_context = Column(JSON, default=dict)  # Current working context
    
    # Memory state
    short_term_memory = Column(JSON, default=list)  # Recent conversation context
    working_memory = Column(JSON, default=dict)  # Current task state
    
    # Settings
    voice_enabled = Column(Boolean, default=True)
    auto_listen = Column(Boolean, default=True)  # Continuous audio logging
    notification_settings = Column(JSON, default=dict)
    
    # Stats
    total_messages = Column(Integer, default=0)
    total_audio_minutes = Column(Float, default=0)
    last_active_at = Column(DateTime, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    messages = relationship("AgentMessage", back_populates="session")

    __table_args__ = (
        Index("idx_agent_session_user", "user_id"),
        Index("idx_agent_session_org", "organization_id"),
    )


class AgentMessage(Base):
    """
    Messages between engineer and their personal agent.
    """
    __tablename__ = "agent_messages"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id = Column(String(36), ForeignKey("agent_sessions.id"), nullable=False)
    
    role = Column(String(20), nullable=False)  # "user", "assistant", "system"
    content = Column(Text, nullable=False)
    
    # Input type
    input_type = Column(String(20), default="text")  # "text", "voice", "image"
    
    # For voice inputs
    audio_asset_id = Column(String(36), ForeignKey("media_assets.id"), nullable=True)
    
    # Context used for response
    context_entries = Column(JSON, default=list)  # Entry IDs used for context
    context_documents = Column(JSON, default=list)  # Document IDs used
    
    # Attribution for response
    sources = Column(JSON, default=list)  # Sources cited in response
    confidence = Column(Float, nullable=True)
    
    # Extracted information
    extracted_todos = Column(JSON, default=list)  # Todos extracted from this message
    extracted_decisions = Column(JSON, default=list)  # Decisions referenced
    
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    session = relationship("AgentSession", back_populates="messages")

    __table_args__ = (
        Index("idx_agent_msg_session", "session_id"),
        Index("idx_agent_msg_created", "created_at"),
    )


class NotesSession(Base):
    """
    Tracks Notes Mode sessions for batch uploads.
    """
    __tablename__ = "notes_sessions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    project_id = Column(String(36), ForeignKey("projects.id"), nullable=True)
    organization_id = Column(String(36), ForeignKey("organizations.id"), nullable=False)
    
    # Session timing
    started_at = Column(DateTime, nullable=False)
    ended_at = Column(DateTime, nullable=True)
    duration_seconds = Column(Float, nullable=True)
    
    # Content captured
    total_audio_chunks = Column(Integer, default=0)
    total_images = Column(Integer, default=0)
    total_text_notes = Column(Integer, default=0)
    
    # Processing status
    status = Column(String(20), default="active")  # active, processing, completed, failed
    processed_at = Column(DateTime, nullable=True)
    processing_error = Column(Text, nullable=True)
    
    # Summary generated from session
    session_summary = Column(Text, nullable=True)
    extracted_todos = Column(JSON, default=list)
    
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index("idx_notes_session_user", "user_id"),
        Index("idx_notes_session_project", "project_id"),
        Index("idx_notes_session_status", "status"),
    )


# ============================================================================
# CENTRAL KNOWLEDGE DATABASE
# ============================================================================

class CentralKnowledgeStatus(str, enum.Enum):
    """Status for central knowledge entries."""
    DRAFT = "draft"
    PUBLISHED = "published"
    ARCHIVED = "archived"


class CentralKnowledgeCategory(str, enum.Enum):
    """Categories for central knowledge entries."""
    PROCESS = "process"           # Team processes, workflows
    CONVENTION = "convention"     # Coding standards, naming conventions
    ARCHITECTURE = "architecture" # System design, architecture decisions
    ONBOARDING = "onboarding"     # New member info, setup guides
    GUIDELINE = "guideline"       # Best practices, recommendations
    FAQ = "faq"                   # Frequently asked questions
    OTHER = "other"


class CentralKnowledge(Base):
    """
    Central Knowledge Database - Curated, authoritative team knowledge.
    Created and managed by admins and managers as the source of truth.
    """
    __tablename__ = "central_knowledge"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    organization_id = Column(String(36), ForeignKey("organizations.id"), nullable=False)
    team_id = Column(String(36), ForeignKey("teams.id"), nullable=True)  # None = org-wide
    
    # Content
    title = Column(String(500), nullable=False)
    content = Column(Text, nullable=False)  # Markdown content
    summary = Column(Text, nullable=True)   # AI-generated or manual summary
    category = Column(String(50), nullable=False)  # Uses CentralKnowledgeCategory
    
    # Status & Versioning
    status = Column(String(20), default="draft")  # Uses CentralKnowledgeStatus
    version = Column(Integer, default=1)
    
    # Vector embedding for semantic search
    embedding = Column(Vector(768), nullable=True)
    
    # Attribution
    created_by = Column(String(36), ForeignKey("users.id"), nullable=False)
    last_edited_by = Column(String(36), ForeignKey("users.id"), nullable=True)
    
    # Metadata
    tags = Column(JSON, default=list)
    related_documents = Column(JSON, default=list)  # IDs of related knowledge entries
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    published_at = Column(DateTime, nullable=True)

    # Relationships
    creator = relationship("User", foreign_keys=[created_by])
    editor = relationship("User", foreign_keys=[last_edited_by])
    organization = relationship("Organization")
    team = relationship("Team")

    __table_args__ = (
        Index("idx_central_knowledge_org", "organization_id"),
        Index("idx_central_knowledge_team", "team_id"),
        Index("idx_central_knowledge_status", "status"),
        Index("idx_central_knowledge_category", "category"),
        Index("idx_central_knowledge_created", "created_at"),
    )