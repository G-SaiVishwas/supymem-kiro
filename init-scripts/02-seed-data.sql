-- ============================================================================
-- Seed Data SQL Script
-- ============================================================================
-- This script populates the database with sample data for development/testing.
-- Run after 01-init.sql
-- ============================================================================

-- Demo Team
INSERT INTO teams (id, name, slug, github_org, slack_workspace_id, created_at, updated_at)
VALUES (
    'team-demo-001',
    'Demo Engineering Team',
    'demo-team',
    'demo-org',
    'T0DEMO001',
    NOW(),
    NOW()
) ON CONFLICT (id) DO NOTHING;

-- Demo Users
INSERT INTO users (id, username, email, github_username, slack_id, team_id, created_at, updated_at)
VALUES 
    ('user-001', 'alice', 'alice@demo.com', 'alice-dev', 'U001ALICE', 'team-demo-001', NOW(), NOW()),
    ('user-002', 'bob', 'bob@demo.com', 'bob-eng', 'U002BOB', 'team-demo-001', NOW(), NOW()),
    ('user-003', 'carol', 'carol@demo.com', 'carol-code', 'U003CAROL', 'team-demo-001', NOW(), NOW()),
    ('user-004', 'dave', 'dave@demo.com', 'dave-dev', 'U004DAVE', 'team-demo-001', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Knowledge Entries
INSERT INTO knowledge_entries (id, content, source, team_id, created_at, updated_at)
VALUES 
    (gen_random_uuid(), 'Our API uses FastAPI with async/await patterns. All endpoints should return JSON responses.', 'documentation', 'team-demo-001', NOW() - interval '7 days', NOW()),
    (gen_random_uuid(), 'We use PostgreSQL as our primary database with SQLAlchemy as the ORM. Alembic handles migrations.', 'documentation', 'team-demo-001', NOW() - interval '14 days', NOW()),
    (gen_random_uuid(), 'For vector embeddings, we use Qdrant with the fastembed library for local embedding generation.', 'documentation', 'team-demo-001', NOW() - interval '5 days', NOW()),
    (gen_random_uuid(), 'The authentication flow uses JWT tokens. Tokens are validated on each request through FastAPI middleware.', 'github', 'team-demo-001', NOW() - interval '21 days', NOW()),
    (gen_random_uuid(), 'We decided to use Python 3.11+ for better async performance and the new typing features.', 'slack', 'team-demo-001', NOW() - interval '30 days', NOW())
ON CONFLICT DO NOTHING;

-- Decisions
INSERT INTO decisions (id, content, rationale, context, status, team_id, created_by, created_at, updated_at)
VALUES 
    (gen_random_uuid(), 
     'Use PostgreSQL instead of MongoDB for ACID compliance and relational data integrity.',
     'Our data model has many relationships and we need strong consistency guarantees.',
     'Database selection meeting - Q1 2024',
     'active',
     'team-demo-001',
     'user-001',
     NOW() - interval '45 days',
     NOW()),
    (gen_random_uuid(), 
     'Implement event-driven architecture using Redis pub/sub for real-time features.',
     'Low latency requirement for collaborative features and notifications.',
     'Architecture review - Sprint 5',
     'active',
     'team-demo-001',
     'user-002',
     NOW() - interval '30 days',
     NOW()),
    (gen_random_uuid(), 
     'Use LangGraph for the AI agent orchestration layer instead of raw LangChain.',
     'Better state management and more predictable conversation flows.',
     'AI Architecture RFC discussion',
     'active',
     'team-demo-001',
     'user-003',
     NOW() - interval '15 days',
     NOW())
ON CONFLICT DO NOTHING;

-- Tasks
INSERT INTO tasks (id, title, description, status, priority, assigned_to, team_id, created_at, updated_at)
VALUES 
    (gen_random_uuid(), 'Implement user authentication', 'Add JWT-based auth flow', 'completed', 'high', 'user-001', 'team-demo-001', NOW() - interval '10 days', NOW()),
    (gen_random_uuid(), 'Set up CI/CD pipeline', 'Configure GitHub Actions for testing and deployment', 'completed', 'high', 'user-002', 'team-demo-001', NOW() - interval '8 days', NOW()),
    (gen_random_uuid(), 'Add rate limiting', 'Implement rate limiting for API endpoints', 'in_progress', 'medium', 'user-003', 'team-demo-001', NOW() - interval '5 days', NOW()),
    (gen_random_uuid(), 'Write API documentation', 'Create OpenAPI docs for all endpoints', 'in_progress', 'medium', 'user-004', 'team-demo-001', NOW() - interval '3 days', NOW()),
    (gen_random_uuid(), 'Performance optimization', 'Profile and optimize slow queries', 'pending', 'low', 'user-001', 'team-demo-001', NOW() - interval '2 days', NOW()),
    (gen_random_uuid(), 'Add logging middleware', 'Implement structured logging for all requests', 'pending', 'medium', 'user-002', 'team-demo-001', NOW() - interval '1 day', NOW())
ON CONFLICT DO NOTHING;

-- User Activities
INSERT INTO user_activities (id, user_identifier, team_id, activity_type, title, source, timestamp)
VALUES 
    (gen_random_uuid(), 'alice', 'team-demo-001', 'commit', 'feat: add authentication middleware', 'github', NOW() - interval '2 hours'),
    (gen_random_uuid(), 'alice', 'team-demo-001', 'pr_opened', 'PR #42: Authentication flow', 'github', NOW() - interval '3 hours'),
    (gen_random_uuid(), 'bob', 'team-demo-001', 'pr_review', 'Reviewed PR #42', 'github', NOW() - interval '1 hour'),
    (gen_random_uuid(), 'bob', 'team-demo-001', 'commit', 'fix: correct database connection pool', 'github', NOW() - interval '5 hours'),
    (gen_random_uuid(), 'carol', 'team-demo-001', 'task_completed', 'Completed: Set up monitoring', 'api', NOW() - interval '4 hours'),
    (gen_random_uuid(), 'carol', 'team-demo-001', 'commit', 'docs: update README', 'github', NOW() - interval '6 hours'),
    (gen_random_uuid(), 'dave', 'team-demo-001', 'pr_merged', 'Merged PR #40: API endpoints', 'github', NOW() - interval '8 hours'),
    (gen_random_uuid(), 'dave', 'team-demo-001', 'issue_created', 'Issue: Performance degradation', 'github', NOW() - interval '12 hours'),
    (gen_random_uuid(), 'alice', 'team-demo-001', 'pr_merged', 'Merged PR #42', 'github', NOW() - interval '30 minutes'),
    (gen_random_uuid(), 'bob', 'team-demo-001', 'task_completed', 'Completed: Database optimization', 'api', NOW() - interval '2 days')
ON CONFLICT DO NOTHING;

-- Automation Rules
INSERT INTO automation_rules (id, trigger_type, trigger_conditions, actions, description, is_active, team_id, created_by, created_at, updated_at)
VALUES 
    (gen_random_uuid(), 
     'task_completed', 
     '{}',
     '[{"type": "notify_user", "params": {"message": "Great job completing the task!"}}]',
     'Congratulate user when task is completed',
     true,
     'team-demo-001',
     'user-001',
     NOW() - interval '7 days',
     NOW()),
    (gen_random_uuid(), 
     'pr_merged', 
     '{"labels": ["critical"]}',
     '[{"type": "send_message", "params": {"channel": "#releases", "message": "Critical PR merged!"}}]',
     'Notify releases channel when critical PR is merged',
     true,
     'team-demo-001',
     'user-002',
     NOW() - interval '5 days',
     NOW())
ON CONFLICT DO NOTHING;

-- File Ownership
INSERT INTO file_ownership (id, file_path, repo, team_id, user_identifier, score, last_modified, created_at, updated_at)
VALUES 
    (gen_random_uuid(), 'src/main.py', 'demo-org/supymem', 'team-demo-001', 'alice', 95, NOW() - interval '3 days', NOW(), NOW()),
    (gen_random_uuid(), 'src/api/routes/knowledge.py', 'demo-org/supymem', 'team-demo-001', 'bob', 80, NOW() - interval '5 days', NOW(), NOW()),
    (gen_random_uuid(), 'src/api/routes/tasks.py', 'demo-org/supymem', 'team-demo-001', 'carol', 75, NOW() - interval '7 days', NOW(), NOW()),
    (gen_random_uuid(), 'src/services/classification/classifier.py', 'demo-org/supymem', 'team-demo-001', 'dave', 90, NOW() - interval '2 days', NOW(), NOW()),
    (gen_random_uuid(), 'src/database/models.py', 'demo-org/supymem', 'team-demo-001', 'alice', 85, NOW() - interval '1 day', NOW(), NOW())
ON CONFLICT DO NOTHING;

-- Verify seeding
DO $$
BEGIN
    RAISE NOTICE '✓ Seed data inserted successfully';
    RAISE NOTICE '  Teams: %', (SELECT COUNT(*) FROM teams WHERE id = 'team-demo-001');
    RAISE NOTICE '  Users: %', (SELECT COUNT(*) FROM users WHERE team_id = 'team-demo-001');
    RAISE NOTICE '  Knowledge: %', (SELECT COUNT(*) FROM knowledge_entries WHERE team_id = 'team-demo-001');
    RAISE NOTICE '  Decisions: %', (SELECT COUNT(*) FROM decisions WHERE team_id = 'team-demo-001');
    RAISE NOTICE '  Tasks: %', (SELECT COUNT(*) FROM tasks WHERE team_id = 'team-demo-001');
    RAISE NOTICE '  Activities: %', (SELECT COUNT(*) FROM user_activities WHERE team_id = 'team-demo-001');
    RAISE NOTICE '  Automation Rules: %', (SELECT COUNT(*) FROM automation_rules WHERE team_id = 'team-demo-001');
    RAISE NOTICE '  File Ownership: %', (SELECT COUNT(*) FROM file_ownership WHERE team_id = 'team-demo-001');
END $$;

