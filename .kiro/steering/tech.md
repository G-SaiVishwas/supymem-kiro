# Technology Standards - Supymem-Kiro

## Technology Stack

### Backend
- **Language**: Python 3.11+
- **Framework**: FastAPI 0.115+
- **Async Runtime**: asyncio with uvicorn
- **API Style**: RESTful with async/await throughout

### Database
- **Primary**: PostgreSQL 17 with pgvector extension
- **ORM**: SQLAlchemy 2.0+ (async)
- **Migrations**: Alembic
- **Connection Pooling**: asyncpg

### Caching
- **L1 Cache**: In-memory LRU (1000 items)
- **L2 Cache**: Redis 8.0+
- **Strategy**: Multi-level with automatic promotion
- **TTL**: Configurable per cache key

### Vector Store
- **Engine**: Qdrant (latest)
- **Embedding Model**: nomic-embed-text (768 dimensions)
- **Index**: HNSW for fast similarity search
- **Distance Metric**: Cosine similarity

### LLM Integration
- **Primary**: Ollama (local, llama3.2)
- **Fallback 1**: Groq (llama-3.3-70b-versatile)
- **Fallback 2**: OpenAI (gpt-4o-mini)
- **Strategy**: Automatic fallback on failure
- **Retry**: Exponential backoff (3 attempts)

### AI Agent
- **Framework**: LangGraph 1.0+
- **Memory**: Mem0 1.0+
- **Tools**: Custom tool definitions
- **State Management**: Persistent checkpoints

### Frontend
- **Framework**: React 18
- **Language**: TypeScript 5+
- **Build Tool**: Vite 5+
- **Styling**: TailwindCSS 3+
- **State**: Redux Toolkit
- **Routing**: React Router v6
- **HTTP Client**: Axios
- **Charts**: Recharts

### Integrations
- **Slack**: Slack Bolt SDK
- **GitHub**: PyGithub + Webhooks
- **VS Code**: TypeScript Extension API

### Monitoring
- **Metrics**: Prometheus
- **Logging**: structlog (JSON format)
- **Tracing**: OpenTelemetry (planned)
- **Alerting**: Prometheus Alertmanager (planned)

### Infrastructure
- **Containerization**: Docker
- **Orchestration**: Docker Compose (dev), Kubernetes (prod planned)
- **Reverse Proxy**: nginx (production)
- **SSL/TLS**: Let's Encrypt

## Coding Standards

### Python

#### Style
- **Formatter**: Black (line length: 88)
- **Linter**: Ruff (replaces flake8, isort, etc.)
- **Type Checker**: mypy (strict mode)
- **Import Order**: stdlib → third-party → local

#### Type Hints
```python
# ✅ GOOD - Complete type hints
async def get_user(user_id: str) -> Optional[User]:
    return await db.query(User).filter_by(id=user_id).first()

# ❌ BAD - No type hints
async def get_user(user_id):
    return await db.query(User).filter_by(id=user_id).first()
```

#### Async/Await
```python
# ✅ GOOD - Async throughout
async def process_data(data: dict) -> Result:
    cached = await cache.get(key)
    if not cached:
        result = await expensive_operation(data)
        await cache.set(key, result)
    return result

# ❌ BAD - Mixing sync and async
def process_data(data: dict) -> Result:
    cached = cache.get(key)  # Blocking!
    if not cached:
        result = expensive_operation(data)
        cache.set(key, result)
    return result
```

#### Error Handling
```python
# ✅ GOOD - Custom exceptions with context
from src.api.exceptions import ResourceNotFoundError

async def get_task(task_id: str) -> Task:
    task = await db.get(Task, task_id)
    if not task:
        raise ResourceNotFoundError("Task", task_id)
    return task

# ❌ BAD - Generic exceptions
async def get_task(task_id: str) -> Task:
    task = await db.get(Task, task_id)
    if not task:
        raise Exception(f"Task {task_id} not found")
    return task
```

#### Logging
```python
# ✅ GOOD - Structured logging
from src.config.logging import get_logger

logger = get_logger(__name__)

async def process_request(user_id: str):
    logger.info("Processing request", user_id=user_id, action="start")
    try:
        result = await do_work(user_id)
        logger.info("Request completed", user_id=user_id, result=result)
        return result
    except Exception as e:
        logger.error("Request failed", user_id=user_id, error=str(e))
        raise

# ❌ BAD - String logging
async def process_request(user_id: str):
    print(f"Processing request for {user_id}")
    result = await do_work(user_id)
    print(f"Done: {result}")
    return result
```

### TypeScript

#### Style
- **Formatter**: Prettier
- **Linter**: ESLint with TypeScript plugin
- **Type Checking**: Strict mode enabled

#### Component Structure
```typescript
// ✅ GOOD - Typed props, clear structure
interface TaskCardProps {
  task: Task;
  onComplete: (taskId: string) => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({ task, onComplete }) => {
  const handleClick = () => onComplete(task.id);
  
  return (
    <div className="task-card">
      <h3>{task.title}</h3>
      <button onClick={handleClick}>Complete</button>
    </div>
  );
};

// ❌ BAD - No types, unclear structure
export const TaskCard = ({ task, onComplete }) => {
  return (
    <div className="task-card">
      <h3>{task.title}</h3>
      <button onClick={() => onComplete(task.id)}>Complete</button>
    </div>
  );
};
```

## File Organization

### Backend Structure
```
src/
├── api/                    # FastAPI routes and middleware
│   ├── routes/            # Endpoint definitions
│   ├── middleware.py      # Custom middleware
│   └── exceptions.py      # Custom exceptions
├── agents/                # LangGraph AI agents
│   ├── knowledge_agent.py
│   └── memory.py
├── cache/                 # Caching layer
│   ├── advanced_cache.py  # Multi-level cache
│   └── redis_client.py    # Redis connection
├── config/                # Configuration
│   ├── settings.py        # Pydantic settings
│   └── logging.py         # Logging setup
├── database/              # Database layer
│   ├── models.py          # SQLAlchemy models
│   └── session.py         # DB session management
├── llm/                   # LLM integration
│   ├── enhanced_client.py # LLM client with fallbacks
│   └── client.py          # Basic client
├── services/              # Business logic
│   ├── analytics/
│   ├── automation/
│   ├── classification/
│   └── ...
├── vectors/               # Vector store
│   ├── qdrant_client.py
│   └── embeddings.py
├── workers/               # Background jobs
│   ├── base.py
│   ├── change_processor.py
│   └── ...
└── main.py               # Application entry point
```

### Frontend Structure
```
frontend/src/
├── api/                   # API client
│   └── client.ts
├── components/            # Reusable components
│   ├── effects/          # Visual effects
│   └── ...
├── contexts/              # React contexts
│   ├── AuthContext.tsx
│   └── ...
├── hooks/                 # Custom hooks
│   └── useVoiceRecording.ts
├── layouts/               # Layout components
│   └── MainLayout.tsx
├── pages/                 # Route pages
│   ├── Dashboard.tsx
│   ├── Tasks.tsx
│   └── ...
├── types/                 # TypeScript types
│   └── index.ts
├── App.tsx               # Root component
└── main.tsx              # Entry point
```

## Naming Conventions

### Python
- **Files**: `snake_case.py`
- **Classes**: `PascalCase`
- **Functions**: `snake_case`
- **Constants**: `UPPER_SNAKE_CASE`
- **Private**: `_leading_underscore`

### TypeScript
- **Files**: `PascalCase.tsx` (components), `camelCase.ts` (utilities)
- **Components**: `PascalCase`
- **Functions**: `camelCase`
- **Constants**: `UPPER_SNAKE_CASE`
- **Interfaces**: `PascalCase` (no `I` prefix)
- **Types**: `PascalCase`

### Database
- **Tables**: `snake_case` (plural)
- **Columns**: `snake_case`
- **Indexes**: `idx_table_column`
- **Foreign Keys**: `fk_table_column`

## Dependencies Management

### Python
- **Package Manager**: pip with requirements.txt
- **Version Pinning**: Pin major.minor, allow patch updates
- **Example**: `fastapi>=0.115.0,<0.116.0`
- **Updates**: Review monthly, test thoroughly

### Node.js
- **Package Manager**: npm (not yarn or pnpm)
- **Lock File**: Always commit package-lock.json
- **Version Pinning**: Use exact versions for critical deps
- **Updates**: Review quarterly, test thoroughly

## Security Standards

### Authentication
- **Method**: JWT tokens with refresh
- **Storage**: HttpOnly cookies (web), secure storage (mobile)
- **Expiry**: Access token 15min, refresh token 7 days
- **Hashing**: bcrypt for passwords (cost factor 12)

### Authorization
- **Model**: Role-based access control (RBAC)
- **Levels**: Organization → Team → Resource
- **Enforcement**: Middleware + service layer

### Data Protection
- **In Transit**: TLS 1.3 minimum
- **At Rest**: Database encryption (planned)
- **PII**: Detect and mask in logs
- **Secrets**: Environment variables, never in code

### API Security
- **CORS**: Whitelist specific origins in production
- **CSRF**: Token-based protection
- **SQL Injection**: Parameterized queries (SQLAlchemy)
- **XSS**: React auto-escaping + CSP headers

## Performance Standards

### API Response Times
- **p50**: <50ms
- **p95**: <100ms
- **p99**: <200ms

### Database Queries
- **Simple**: <10ms
- **Complex**: <50ms
- **With joins**: <100ms

### Vector Search
- **Semantic search**: <75ms
- **Batch operations**: <200ms

### Cache Hit Rates
- **L1 (memory)**: >80%
- **L2 (Redis)**: >70%
- **Overall**: >70%

### LLM Response
- **Cached**: <50ms
- **Uncached**: <2s
- **Streaming**: First token <500ms

## Testing Standards

### Coverage Targets
- **Unit Tests**: 85%+ coverage
- **Integration Tests**: Critical paths covered
- **E2E Tests**: Happy paths covered

### Test Structure
```python
# ✅ GOOD - Clear, isolated, fast
@pytest.mark.asyncio
async def test_get_user_returns_user_when_exists():
    # Arrange
    user = await create_test_user()
    
    # Act
    result = await get_user(user.id)
    
    # Assert
    assert result.id == user.id
    assert result.email == user.email

# ❌ BAD - Unclear, coupled, slow
async def test_user():
    user = await create_test_user()
    result = await get_user(user.id)
    assert result
```

### Mocking
- **Use fixtures** for common test data
- **Mock external services** (LLM, vector store)
- **Don't mock** internal business logic

## Documentation Standards

### Code Comments
```python
# ✅ GOOD - Explains why, not what
async def retry_with_backoff(func, max_retries=3):
    """
    Retry function with exponential backoff.
    
    We use exponential backoff to avoid overwhelming
    external services during outages.
    """
    for attempt in range(max_retries):
        try:
            return await func()
        except Exception:
            await asyncio.sleep(2 ** attempt)
    raise

# ❌ BAD - Explains what (obvious from code)
async def retry_with_backoff(func, max_retries=3):
    """Retries a function."""
    for attempt in range(max_retries):  # Loop through attempts
        try:
            return await func()  # Try to call function
        except Exception:  # If it fails
            await asyncio.sleep(2 ** attempt)  # Wait
    raise  # Raise error
```

### API Documentation
- **Use OpenAPI/Swagger** (FastAPI auto-generates)
- **Include examples** for all endpoints
- **Document error responses**
- **Keep up to date** with code changes

## Prohibited Practices

### ❌ Never Do This

1. **No file suffixes**
   - ❌ `file.py.fixed`, `file.py.new`, `file.py.backup`
   - ✅ Use git for versioning

2. **No print statements**
   - ❌ `print("Debug info")`
   - ✅ `logger.debug("Debug info", context=data)`

3. **No hardcoded values**
   - ❌ `API_KEY = "sk-1234..."`
   - ✅ `API_KEY = settings.api_key`

4. **No blocking I/O in async**
   - ❌ `time.sleep(1)` in async function
   - ✅ `await asyncio.sleep(1)`

5. **No bare except**
   - ❌ `except:` or `except Exception:`
   - ✅ `except SpecificError as e:`

6. **No mutable defaults**
   - ❌ `def func(items=[]):`
   - ✅ `def func(items=None): items = items or []`

7. **No SQL string concatenation**
   - ❌ `f"SELECT * FROM users WHERE id = {user_id}"`
   - ✅ Use SQLAlchemy or parameterized queries

## Development Workflow

1. **Create feature branch** from main
2. **Write tests first** (TDD when possible)
3. **Implement feature** with type hints
4. **Run linters** (black, ruff, mypy)
5. **Run tests** (pytest with coverage)
6. **Create PR** with clear description
7. **Code review** (at least one approval)
8. **Merge** to main (squash commits)

## Version Control

- **Branch naming**: `feature/description`, `fix/description`, `docs/description`
- **Commit messages**: Conventional commits format
- **PR size**: <500 lines changed (ideally <200)
- **Review time**: <24 hours for small PRs

## Deployment

- **Environment**: dev → staging → production
- **Strategy**: Blue-green deployment
- **Rollback**: Automated on health check failure
- **Monitoring**: 5-minute alert window
