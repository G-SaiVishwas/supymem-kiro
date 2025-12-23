-- ============================================================================
-- SUPYMEM DATABASE INITIALIZATION
-- ============================================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================================================
-- USERS & TEAMS
-- ============================================================================

CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    email VARCHAR(255) UNIQUE,
    name VARCHAR(255) NOT NULL,
    avatar_url VARCHAR(500),
    github_id VARCHAR(100) UNIQUE,
    github_username VARCHAR(100),
    slack_id VARCHAR(100) UNIQUE,
    slack_username VARCHAR(100),
    settings JSONB DEFAULT '{}',
    notification_preferences JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_github ON users(github_id);
CREATE INDEX IF NOT EXISTS idx_user_slack ON users(slack_id);
CREATE INDEX IF NOT EXISTS idx_user_email ON users(email);

CREATE TABLE IF NOT EXISTS teams (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    github_org VARCHAR(100),
    github_repos JSONB DEFAULT '[]',
    slack_workspace_id VARCHAR(100),
    slack_channels JSONB DEFAULT '[]',
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_team_slug ON teams(slug);

CREATE TABLE IF NOT EXISTS team_members (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    user_id VARCHAR(36) REFERENCES users(id),
    team_id VARCHAR(36) REFERENCES teams(id),
    role VARCHAR(20) DEFAULT 'member',
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_team_member_user ON team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_team_member_team ON team_members(team_id);

-- ============================================================================
-- KNOWLEDGE & DECISIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS decisions (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    team_id VARCHAR(100) NOT NULL,
    title VARCHAR(500) NOT NULL,
    summary TEXT,
    reasoning TEXT,
    alternatives_considered JSONB DEFAULT '[]',
    context TEXT,
    impact TEXT,
    source_type VARCHAR(50) NOT NULL,
    source_id VARCHAR(255),
    source_url VARCHAR(500),
    decided_by VARCHAR(100),
    participants JSONB DEFAULT '[]',
    affected_files JSONB DEFAULT '[]',
    affected_components JSONB DEFAULT '[]',
    affected_users JSONB DEFAULT '[]',
    category VARCHAR(50),
    tags JSONB DEFAULT '[]',
    importance VARCHAR(20) DEFAULT 'medium',
    status VARCHAR(20) DEFAULT 'active',
    superseded_by VARCHAR(36),
    embedding vector(768),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_decision_team ON decisions(team_id);
CREATE INDEX IF NOT EXISTS idx_decision_source ON decisions(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_decision_status ON decisions(status);
CREATE INDEX IF NOT EXISTS idx_decision_created ON decisions(created_at);

CREATE TABLE IF NOT EXISTS knowledge_entries (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    content TEXT NOT NULL,
    source VARCHAR(50) NOT NULL,
    source_id VARCHAR(255),
    source_url VARCHAR(500),
    team_id VARCHAR(100) NOT NULL,
    user_id VARCHAR(100),
    category VARCHAR(50) DEFAULT 'other',
    subcategory VARCHAR(50),
    importance_score FLOAT DEFAULT 0.5,
    is_actionable BOOLEAN DEFAULT FALSE,
    extracted_entities JSONB DEFAULT '{}',
    extracted_action_items JSONB DEFAULT '[]',
    embedding vector(768),
    extra_metadata JSONB DEFAULT '{}',
    tags JSONB DEFAULT '[]',
    related_decision_id VARCHAR(36) REFERENCES decisions(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_knowledge_team_id ON knowledge_entries(team_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_source ON knowledge_entries(source);
CREATE INDEX IF NOT EXISTS idx_knowledge_category ON knowledge_entries(category);
CREATE INDEX IF NOT EXISTS idx_knowledge_created_at ON knowledge_entries(created_at);
CREATE INDEX IF NOT EXISTS idx_knowledge_actionable ON knowledge_entries(is_actionable);

-- Vector similarity index for knowledge
CREATE INDEX IF NOT EXISTS knowledge_embedding_idx 
ON knowledge_entries 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 128);

-- Text search index
CREATE INDEX IF NOT EXISTS knowledge_content_trgm_idx 
ON knowledge_entries 
USING gin (content gin_trgm_ops);

CREATE TABLE IF NOT EXISTS decision_challenges (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    decision_id VARCHAR(36) REFERENCES decisions(id) NOT NULL,
    challenger_id VARCHAR(100) NOT NULL,
    challenge_reason TEXT NOT NULL,
    proposed_alternative TEXT,
    ai_analysis TEXT,
    retrieved_context JSONB DEFAULT '[]',
    status VARCHAR(20) DEFAULT 'open',
    resolution TEXT,
    resolved_by VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_challenge_decision ON decision_challenges(decision_id);
CREATE INDEX IF NOT EXISTS idx_challenge_status ON decision_challenges(status);

-- ============================================================================
-- ACTIVITY & OWNERSHIP
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_activities (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    user_id VARCHAR(36) REFERENCES users(id),
    user_identifier VARCHAR(100) NOT NULL,
    team_id VARCHAR(100) NOT NULL,
    activity_type VARCHAR(50) NOT NULL,
    title VARCHAR(500),
    description TEXT,
    source VARCHAR(50),
    source_id VARCHAR(255),
    source_url VARCHAR(500),
    related_files JSONB DEFAULT '[]',
    related_task_id VARCHAR(36),
    related_pr_number INTEGER,
    related_repo VARCHAR(255),
    lines_added INTEGER DEFAULT 0,
    lines_removed INTEGER DEFAULT 0,
    files_changed INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_activity_user ON user_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_user_identifier ON user_activities(user_identifier);
CREATE INDEX IF NOT EXISTS idx_activity_team ON user_activities(team_id);
CREATE INDEX IF NOT EXISTS idx_activity_type ON user_activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_activity_timestamp ON user_activities(timestamp);
CREATE INDEX IF NOT EXISTS idx_activity_source ON user_activities(source, source_id);

CREATE TABLE IF NOT EXISTS file_ownership (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    file_path VARCHAR(500) NOT NULL,
    repo VARCHAR(255) NOT NULL,
    team_id VARCHAR(100) NOT NULL,
    user_identifier VARCHAR(100) NOT NULL,
    user_id VARCHAR(36),
    ownership_score FLOAT DEFAULT 0.0,
    total_commits INTEGER DEFAULT 0,
    total_lines_added INTEGER DEFAULT 0,
    total_lines_removed INTEGER DEFAULT 0,
    first_commit_at TIMESTAMP WITH TIME ZONE,
    last_commit_at TIMESTAMP WITH TIME ZONE,
    recent_activity_score FLOAT DEFAULT 0.0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ownership_file ON file_ownership(file_path, repo);
CREATE INDEX IF NOT EXISTS idx_ownership_user ON file_ownership(user_identifier);
CREATE INDEX IF NOT EXISTS idx_ownership_team ON file_ownership(team_id);
CREATE INDEX IF NOT EXISTS idx_ownership_score ON file_ownership(ownership_score);

-- ============================================================================
-- NOTIFICATIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS notifications (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    user_id VARCHAR(36) REFERENCES users(id),
    user_identifier VARCHAR(100) NOT NULL,
    team_id VARCHAR(100) NOT NULL,
    notification_type VARCHAR(50) NOT NULL,
    title VARCHAR(500) NOT NULL,
    content TEXT,
    source_type VARCHAR(50),
    source_id VARCHAR(255),
    source_url VARCHAR(500),
    related_change JSONB DEFAULT '{}',
    affected_files JSONB DEFAULT '[]',
    priority VARCHAR(20) DEFAULT 'normal',
    is_read BOOLEAN DEFAULT FALSE,
    is_dismissed BOOLEAN DEFAULT FALSE,
    is_actioned BOOLEAN DEFAULT FALSE,
    action_taken VARCHAR(100),
    delivery_channels JSONB DEFAULT '[]',
    delivered_via_slack BOOLEAN DEFAULT FALSE,
    delivered_via_email BOOLEAN DEFAULT FALSE,
    slack_message_ts VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_notification_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_user_identifier ON notifications(user_identifier);
CREATE INDEX IF NOT EXISTS idx_notification_team ON notifications(team_id);
CREATE INDEX IF NOT EXISTS idx_notification_type ON notifications(notification_type);
CREATE INDEX IF NOT EXISTS idx_notification_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notification_created ON notifications(created_at);

-- ============================================================================
-- TASKS
-- ============================================================================

CREATE TABLE IF NOT EXISTS tasks (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    priority VARCHAR(10) DEFAULT 'medium',
    team_id VARCHAR(100) NOT NULL,
    assigned_to VARCHAR(100),
    assigned_to_user_id VARCHAR(36),
    created_by VARCHAR(100),
    source VARCHAR(50),
    source_id VARCHAR(255),
    source_url VARCHAR(500),
    due_date TIMESTAMP WITH TIME ZONE,
    estimated_hours FLOAT,
    depends_on JSONB DEFAULT '[]',
    blocks JSONB DEFAULT '[]',
    related_files JSONB DEFAULT '[]',
    related_prs JSONB DEFAULT '[]',
    related_decision_id VARCHAR(36),
    category VARCHAR(50),
    tags JSONB DEFAULT '[]',
    created_by_automation VARCHAR(36),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_task_team ON tasks(team_id);
CREATE INDEX IF NOT EXISTS idx_task_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_task_assigned ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_task_priority ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_task_due_date ON tasks(due_date);

-- ============================================================================
-- AUTOMATION
-- ============================================================================

CREATE TABLE IF NOT EXISTS automation_rules (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    team_id VARCHAR(100) NOT NULL,
    created_by VARCHAR(100) NOT NULL,
    original_instruction TEXT NOT NULL,
    description TEXT,
    trigger_type VARCHAR(50) NOT NULL,
    trigger_conditions JSONB NOT NULL,
    action_type VARCHAR(50) NOT NULL,
    action_params JSONB NOT NULL,
    status VARCHAR(20) DEFAULT 'active',
    is_one_time BOOLEAN DEFAULT FALSE,
    execution_count INTEGER DEFAULT 0,
    last_triggered_at TIMESTAMP WITH TIME ZONE,
    last_execution_result JSONB DEFAULT '{}',
    schedule_cron VARCHAR(100),
    next_scheduled_run TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_automation_team ON automation_rules(team_id);
CREATE INDEX IF NOT EXISTS idx_automation_status ON automation_rules(status);
CREATE INDEX IF NOT EXISTS idx_automation_trigger ON automation_rules(trigger_type);

CREATE TABLE IF NOT EXISTS automation_executions (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    rule_id VARCHAR(36) REFERENCES automation_rules(id) NOT NULL,
    triggered_by_event JSONB,
    status VARCHAR(20) NOT NULL,
    result JSONB DEFAULT '{}',
    error_message TEXT,
    actions_performed JSONB DEFAULT '[]',
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_execution_rule ON automation_executions(rule_id);
CREATE INDEX IF NOT EXISTS idx_execution_status ON automation_executions(status);
CREATE INDEX IF NOT EXISTS idx_execution_time ON automation_executions(executed_at);

-- ============================================================================
-- PRODUCTIVITY
-- ============================================================================

CREATE TABLE IF NOT EXISTS productivity_snapshots (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    user_identifier VARCHAR(100) NOT NULL,
    user_id VARCHAR(36),
    team_id VARCHAR(100) NOT NULL,
    snapshot_date DATE NOT NULL,
    commits_count INTEGER DEFAULT 0,
    prs_opened INTEGER DEFAULT 0,
    prs_merged INTEGER DEFAULT 0,
    prs_reviewed INTEGER DEFAULT 0,
    issues_closed INTEGER DEFAULT 0,
    comments_made INTEGER DEFAULT 0,
    tasks_created INTEGER DEFAULT 0,
    tasks_completed INTEGER DEFAULT 0,
    tasks_in_progress INTEGER DEFAULT 0,
    lines_added INTEGER DEFAULT 0,
    lines_removed INTEGER DEFAULT 0,
    files_changed INTEGER DEFAULT 0,
    knowledge_entries_created INTEGER DEFAULT 0,
    decisions_made INTEGER DEFAULT 0,
    productivity_score FLOAT DEFAULT 0.0,
    metrics_detail JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_snapshot_user ON productivity_snapshots(user_identifier);
CREATE INDEX IF NOT EXISTS idx_snapshot_team ON productivity_snapshots(team_id);
CREATE INDEX IF NOT EXISTS idx_snapshot_date ON productivity_snapshots(snapshot_date);
CREATE INDEX IF NOT EXISTS idx_snapshot_user_date ON productivity_snapshots(user_identifier, snapshot_date);

-- ============================================================================
-- CONVERSATIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS conversations (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    thread_id VARCHAR(255) NOT NULL UNIQUE,
    team_id VARCHAR(100) NOT NULL,
    channel_id VARCHAR(100),
    user_id VARCHAR(100),
    conversation_type VARCHAR(50) DEFAULT 'query',
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_message_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    message_count INTEGER DEFAULT 0,
    summary TEXT,
    extracted_actions JSONB DEFAULT '[]',
    status VARCHAR(20) DEFAULT 'active'
);

CREATE INDEX IF NOT EXISTS idx_conversation_thread ON conversations(thread_id);
CREATE INDEX IF NOT EXISTS idx_conversation_team ON conversations(team_id);
CREATE INDEX IF NOT EXISTS idx_conversation_type ON conversations(conversation_type);

CREATE TABLE IF NOT EXISTS messages (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    conversation_id VARCHAR(36) REFERENCES conversations(id) NOT NULL,
    role VARCHAR(20) NOT NULL,
    content TEXT NOT NULL,
    user_id VARCHAR(100),
    context_used JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_message_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_message_created_at ON messages(created_at);

-- ============================================================================
-- GITHUB EVENTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS github_events (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    event_type VARCHAR(50) NOT NULL,
    action VARCHAR(50),
    repository VARCHAR(255) NOT NULL,
    sender VARCHAR(100),
    sender_id VARCHAR(100),
    pr_number INTEGER,
    issue_number INTEGER,
    commit_sha VARCHAR(40),
    payload JSONB,
    processed BOOLEAN DEFAULT FALSE,
    processing_result JSONB DEFAULT '{}',
    impact_analyzed BOOLEAN DEFAULT FALSE,
    affected_users JSONB DEFAULT '[]',
    affected_files JSONB DEFAULT '[]',
    notifications_sent JSONB DEFAULT '[]',
    is_breaking_change BOOLEAN DEFAULT FALSE,
    change_category VARCHAR(50),
    team_id VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_github_event_type ON github_events(event_type);
CREATE INDEX IF NOT EXISTS idx_github_repository ON github_events(repository);
CREATE INDEX IF NOT EXISTS idx_github_processed ON github_events(processed);
CREATE INDEX IF NOT EXISTS idx_github_sender ON github_events(sender);
CREATE INDEX IF NOT EXISTS idx_github_pr ON github_events(pr_number);
