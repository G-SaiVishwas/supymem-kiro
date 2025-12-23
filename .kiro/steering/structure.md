# Project Structure - Supymem-Kiro

## Directory Overview

```
supymem-kiro/
├── .kiro/                      # Kiro.dev artifacts
│   ├── steering/              # Persistent context files
│   │   ├── product.md         # Product vision & roadmap
│   │   ├── tech.md            # Technology standards
│   │   ├── structure.md       # This file
│   │   └── libraries.md       # Library-specific rules
│   └── specs/                 # Formal specifications
│       ├── requirements.md    # EARS format requirements
│       ├── design.md          # Architecture with Mermaid
│       └── tasks.md           # Implementation checklist
├── src/                       # Python backend
├── frontend/                  # React frontend
├── vscode-extension/          # VS Code extension
├── tests/                     # Test suite
├── scripts/                   # Utility scripts
├── init-scripts/              # Database initialization
├── cli.py                     # Management CLI
├── docker-compose.yml         # Infrastructure
├── requirements.txt           # Python dependencies
├── pyproject.toml             # Python project config
└── README.md                  # Project documentation
```

## Backend Structure (`src/`)

### Core Application
```
src/
├── main.py                    # FastAPI application entry point
│                             # - Lifespan management
│                             # - Middleware configuration
│                             # - Router registration
│                             # - Exception handlers
│
├── __init__.py               # Package marker
```

### API Layer (`src/api/`)
```
src/api/
├── __init__.py
├── middleware.py             # Custom middleware
│                            # - RequestLoggingMiddleware
│                            # - TeamContextMiddleware
│
├── exceptions.py             # Custom exception classes
│                            # - SupymemException (base)
│                            # - AuthenticationError
│                            # - AuthorizationError
│                            # - ResourceNotFoundError
│                            # - ValidationError
│                            # - ConflictError
│                            # - ServiceUnavailableError
│
└── routes/                   # API endpoints
    ├── __init__.py
    ├── auth.py              # Authentication endpoints
    │                        # POST /api/v1/register
    │                        # POST /api/v1/login
    │                        # POST /api/v1/logout
    │                        # GET  /api/v1/me
    │
    ├── knowledge.py         # Knowledge management
    │                        # POST /api/v1/query
    │                        # POST /api/v1/store
    │                        # POST /api/v1/search
    │
    ├── tasks.py             # Task management
    │                        # GET    /api/v1/tasks
    │                        # POST   /api/v1/tasks
    │                        # PATCH  /api/v1/tasks/{id}
    │                        # DELETE /api/v1/tasks/{id}
    │
    ├── automation.py        # Automation rules
    │                        # POST /api/v1/automation/parse
    │                        # GET  /api/v1/automation/rules
    │                        # POST /api/v1/automation/rules
    │
    ├── decisions.py         # Decision tracking
    │                        # GET  /api/v1/decisions
    │                        # POST /api/v1/challenge
    │
    └── analytics.py         # Analytics & metrics
                             # GET /api/v1/productivity/user
                             # GET /api/v1/productivity/team
                             # GET /api/v1/activities
```

### AI Agents (`src/agents/`)
```
src/agents/
├── __init__.py
├── knowledge_agent.py        # LangGraph-based knowledge agent
│                            # - AgentState definition
│                            # - Tool definitions (search, store, memory)
│                            # - Node implementations
│                            # - Graph construction
│                            # - query_agent() convenience function
│
└── memory.py                # Mem0 memory integration
                             # - Memory manager wrapper
                             # - User memory operations
```

### Caching Layer (`src/cache/`)
```
src/cache/
├── __init__.py
├── advanced_cache.py        # Multi-level caching
│                           # - LRUCache (L1 - memory)
│                           # - MultiLevelCache (L1 + L2)
│                           # - @cached decorator
│                           # - Cache warming utilities
│                           # - CacheInvalidation strategies
│
└── redis_client.py         # Redis connection
                            # - Async Redis client
                            # - Connection pooling
```

### Configuration (`src/config/`)
```
src/config/
├── __init__.py
├── settings.py             # Pydantic settings
│                          # - Database URLs
│                          # - Redis configuration
│                          # - Qdrant configuration
│                          # - LLM API keys
│                          # - Integration credentials
│
└── logging.py             # Logging configuration
                           # - structlog setup
                           # - JSON formatting
                           # - Log levels
```

### Database Layer (`src/database/`)
```
src/database/
├── __init__.py
├── models.py              # SQLAlchemy models (30+ models)
│                         # Organizations & Users:
│                         # - Organization, User, Team
│                         # - OrganizationMember, TeamMember
│                         # - Invite
│                         #
│                         # Knowledge:
│                         # - KnowledgeEntry, Decision
│                         # - DecisionChallenge
│                         # - Conversation, Message
│                         #
│                         # Activity:
│                         # - UserActivity, FileOwnership
│                         # - ProductivitySnapshot
│                         # - GitHubEvent
│                         #
│                         # Tasks & Automation:
│                         # - Task, AutomationRule
│                         # - AutomationExecution
│                         # - Notification
│                         #
│                         # Omni Presence:
│                         # - Project, ProjectDocument
│                         # - EngineerEntry, MediaAsset
│                         # - DailySummary, AgentSession
│                         # - NotesSession
│
└── session.py            # Database session management
                          # - Async session factory
                          # - get_db() dependency
```

### Database Migrations (`src/db/migrations/`)
```
src/db/migrations/
├── README                # Alembic documentation
├── env.py               # Alembic environment
├── script.py.mako       # Migration template
└── versions/            # Migration files
    └── 13cb694df246_initial_schema_with_auth.py
```

### LLM Integration (`src/llm/`)
```
src/llm/
├── __init__.py
├── enhanced_client.py   # Enhanced LLM client
│                       # - Multi-provider support
│                       # - Automatic fallback (OpenAI → Groq → Ollama)
│                       # - Retry with exponential backoff
│                       # - Response caching
│                       # - Streaming support
│
└── client.py           # Basic LLM client
                        # - Simple OpenAI wrapper
                        # - Fallback logic
```

### Business Services (`src/services/`)
```
src/services/
├── __init__.py
│
├── analytics/          # Analytics & metrics
│   ├── __init__.py
│   ├── activity.py    # Activity tracking
│   └── productivity.py # Productivity calculations
│
├── auth/              # Authentication & authorization
│   ├── __init__.py
│   ├── service.py     # Auth business logic
│   ├── dependencies.py # FastAPI dependencies
│   └── schemas.py     # Pydantic models
│
├── automation/        # Natural language automation
│   ├── __init__.py
│   ├── parser.py      # NL → structured rules
│   ├── rules.py       # Rule management
│   ├── executor.py    # Rule execution
│   └── monitor.py     # Event monitoring
│
├── classification/    # Content classification
│   ├── __init__.py
│   ├── classifier.py  # LLM-based classification
│   └── extractors.py  # Entity extraction
│
├── debate/           # Decision challenge system
│   ├── __init__.py
│   └── challenger.py  # Challenge logic
│
└── impact/           # Change impact analysis
    ├── __init__.py
    ├── ownership.py   # File ownership tracking
    ├── analyzer.py    # Impact analysis
    └── notifications.py # Smart notifications
```

### Vector Store (`src/vectors/`)
```
src/vectors/
├── __init__.py
├── qdrant_client.py   # Qdrant integration
│                     # - Collection management
│                     # - Vector insertion
│                     # - Similarity search
│                     # - Filtering
│
└── embeddings.py     # Embedding generation
                      # - nomic-embed-text wrapper
                      # - Batch processing
```

### Background Workers (`src/workers/`)
```
src/workers/
├── __init__.py
├── base.py                  # Base worker class
├── change_processor.py      # Process GitHub events
├── notification_worker.py   # Deliver notifications
└── task_monitor.py         # Monitor task status
```

### Integrations (`src/integrations/`)
```
src/integrations/
├── github/
│   ├── __init__.py
│   ├── client.py      # PyGithub wrapper
│   └── webhooks.py    # Webhook handlers
│
└── slack/
    ├── __init__.py
    ├── bot.py         # Slack Bolt app
    └── handlers.py    # Event & command handlers
```

### Monitoring (`src/monitoring/`)
```
src/monitoring/
├── __init__.py
└── metrics.py         # Prometheus metrics
                       # - HTTP metrics
                       # - LLM metrics (removed)
                       # - Vector store metrics
                       # - Database metrics
                       # - Cache metrics
                       # - Business metrics
```

## Frontend Structure (`frontend/`)

```
frontend/
├── src/
│   ├── main.tsx              # Application entry point
│   ├── App.tsx               # Root component
│   ├── App.css               # Global styles
│   ├── index.css             # Base styles
│   │
│   ├── api/                  # API client
│   │   └── client.ts         # Axios configuration
│   │
│   ├── components/           # Reusable components
│   │   ├── ProtectedRoute.tsx
│   │   ├── SmartDashboard.tsx
│   │   └── effects/          # Visual effects
│   │       ├── AnimatedCounter.tsx
│   │       ├── CursorGlow.tsx
│   │       ├── MagneticButton.tsx
│   │       ├── ParticleField.tsx
│   │       └── index.ts
│   │
│   ├── contexts/             # React contexts
│   │   ├── AuthContext.tsx
│   │   └── DashboardModeContext.tsx
│   │
│   ├── hooks/                # Custom hooks
│   │   └── useVoiceRecording.ts
│   │
│   ├── layouts/              # Layout components
│   │   └── MainLayout.tsx
│   │
│   ├── pages/                # Route pages
│   │   ├── LandingPage.tsx
│   │   ├── Login.tsx
│   │   ├── Register.tsx
│   │   ├── Dashboard.tsx
│   │   ├── OmniDashboard.tsx
│   │   ├── AskAgent.tsx
│   │   ├── Tasks.tsx
│   │   ├── Decisions.tsx
│   │   ├── Automations.tsx
│   │   ├── Analytics.tsx
│   │   ├── Team.tsx
│   │   ├── Notes.tsx
│   │   ├── Media.tsx
│   │   ├── Summaries.tsx
│   │   ├── Todos.tsx
│   │   └── Settings.tsx
│   │
│   └── types/                # TypeScript types
│       └── index.ts
│
├── public/                   # Static assets
│   └── vite.svg
│
├── index.html               # HTML template
├── package.json             # Dependencies
├── tsconfig.json            # TypeScript config
├── vite.config.ts           # Vite configuration
└── eslint.config.js         # ESLint configuration
```

## VS Code Extension (`vscode-extension/`)

```
vscode-extension/
├── src/
│   ├── extension.ts         # Extension entry point
│   ├── api.ts              # API client
│   └── providers/          # Tree view providers
│       ├── tasks.ts
│       ├── decisions.ts
│       └── activity.ts
│
├── out/                    # Compiled JavaScript
├── resources/              # Extension resources
│   └── icon.svg
│
├── package.json            # Extension manifest
└── tsconfig.json           # TypeScript config
```

## Tests (`tests/`)

```
tests/
├── __init__.py
├── conftest.py             # Pytest configuration
│
├── fixtures/               # Test fixtures
│   ├── __init__.py
│   ├── mock_db.py
│   ├── mock_llm.py
│   └── mock_vector_store.py
│
├── test_api.py             # API endpoint tests
├── test_services.py        # Service layer tests
├── test_workers.py         # Worker tests
├── test_automation_unit.py
├── test_classification_unit.py
├── test_impact_unit.py
└── test_analytics_debate_unit.py
```

## Scripts (`scripts/`)

```
scripts/
├── seed_data.py            # Seed production data
└── seed_demo_data.py       # Seed demo/test data
```

## Database Initialization (`init-scripts/`)

```
init-scripts/
├── 01-init.sql             # Initial schema setup
└── 02-seed-data.sql        # Seed data
```

## Root Level Files

```
supymem-kiro/
├── cli.py                  # Management CLI tool
│                          # Commands:
│                          # - db: migrate, create-migration, seed
│                          # - cache: clear, stats
│                          # - user: create, make-admin
│                          # - vector: info, recreate
│                          # - health, version
│
├── docker-compose.yml      # Infrastructure services
│                          # - postgres (pgvector)
│                          # - redis
│                          # - qdrant
│                          # - ollama
│
├── requirements.txt        # Python dependencies
├── pyproject.toml         # Python project metadata
├── pytest.ini             # Pytest configuration
├── alembic.ini            # Alembic configuration
│
├── run_slack_bot.py       # Slack bot runner
├── run_workers.py         # Background workers runner
│
├── .env                   # Environment variables (gitignored)
├── .gitignore            # Git ignore rules
│
└── README.md             # Project documentation
```

## Documentation Files

```
supymem-kiro/
├── README.md                      # Main project documentation
├── PRODUCTION_CHECKLIST.md       # Production deployment guide
├── IMPLEMENTATION_SUMMARY.md     # Architecture overview
├── ENHANCEMENTS.md               # Enhancement details
├── MIGRATION_COMPLETE.md         # Migration guide
├── FINAL_SUMMARY.md              # Project summary
├── KIRO_STYLE_DEVELOPMENT.md     # Kiro.dev methodology
└── CHANGES_SUMMARY.md            # Recent changes
```

## Key Patterns

### Dependency Injection
```python
# FastAPI dependencies
from fastapi import Depends
from src.database.session import get_db

async def get_current_user(
    db: AsyncSession = Depends(get_db),
    token: str = Depends(oauth2_scheme)
) -> User:
    # Validate token and return user
    pass
```

### Service Layer Pattern
```python
# Business logic in services, not routes
# routes/tasks.py
@router.post("/tasks")
async def create_task(
    task_data: TaskCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    service = TaskService(db)
    return await service.create_task(task_data, user)

# services/tasks.py
class TaskService:
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def create_task(self, data: TaskCreate, user: User) -> Task:
        # Business logic here
        pass
```

### Repository Pattern (Implicit)
```python
# Database operations through SQLAlchemy
from sqlalchemy import select

async def get_user(db: AsyncSession, user_id: str) -> Optional[User]:
    result = await db.execute(
        select(User).where(User.id == user_id)
    )
    return result.scalar_one_or_none()
```

## File Naming Conventions

### Python Files
- **Modules**: `snake_case.py`
- **Tests**: `test_*.py`
- **Scripts**: `snake_case.py`

### TypeScript Files
- **Components**: `PascalCase.tsx`
- **Utilities**: `camelCase.ts`
- **Types**: `camelCase.ts` or `index.ts`

### Configuration Files
- **Lowercase with hyphens**: `docker-compose.yml`
- **Dotfiles**: `.gitignore`, `.env`

## Import Order

### Python
```python
# 1. Standard library
import asyncio
from datetime import datetime
from typing import Optional

# 2. Third-party
from fastapi import FastAPI, Depends
from sqlalchemy import select

# 3. Local
from src.config.settings import get_settings
from src.database.models import User
from src.api.exceptions import ResourceNotFoundError
```

### TypeScript
```typescript
// 1. React
import React from 'react';
import { useState, useEffect } from 'react';

// 2. Third-party
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

// 3. Local
import { AuthContext } from '../contexts/AuthContext';
import { Task } from '../types';
```

## Module Boundaries

### Clear Separation
- **API layer**: HTTP concerns only
- **Service layer**: Business logic
- **Database layer**: Data access
- **Integration layer**: External services

### No Circular Dependencies
- Use dependency injection
- Import from parent, not sibling
- Use interfaces/protocols for decoupling

## Growth Strategy

### Adding New Features
1. Create service in `src/services/feature/`
2. Add routes in `src/api/routes/feature.py`
3. Add models in `src/database/models.py`
4. Create migration with Alembic
5. Add tests in `tests/test_feature.py`
6. Update documentation

### Scaling Considerations
- Services can be extracted to microservices
- Workers can run on separate machines
- Database can be sharded by team_id
- Cache can be distributed
- Frontend can be CDN-hosted
