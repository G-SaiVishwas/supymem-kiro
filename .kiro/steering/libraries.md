# Library-Specific Rules - Supymem-Kiro

## Core Principles

1. **Always use latest stable versions** - Security and features
2. **Prefer async libraries** - Performance and scalability
3. **No file suffixes** - Never create `.fixed`, `.new`, `.backup` files
4. **Use official packages** - Avoid unmaintained forks
5. **Pin major.minor** - Allow patch updates only

## Python Libraries

### FastAPI
```python
# ✅ GOOD - Async endpoints with proper types
from fastapi import FastAPI, Depends, HTTPException
from pydantic import BaseModel

class TaskCreate(BaseModel):
    title: str
    description: str | None = None

@app.post("/tasks", response_model=Task)
async def create_task(
    task: TaskCreate,
    db: AsyncSession = Depends(get_db)
) -> Task:
    return await task_service.create(db, task)

# ❌ BAD - Sync endpoint, no types
@app.post("/tasks")
def create_task(task):
    return task_service.create(task)
```

**Rules:**
- Always use async endpoints
- Use Pydantic models for request/response
- Use dependency injection for database, auth
- Return proper HTTP status codes
- Use `HTTPException` for errors

### SQLAlchemy 2.0+
```python
# ✅ GOOD - Async queries with proper typing
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

async def get_user(db: AsyncSession, user_id: str) -> User | None:
    result = await db.execute(
        select(User).where(User.id == user_id)
    )
    return result.scalar_one_or_none()

# ❌ BAD - Sync queries, no typing
def get_user(db, user_id):
    return db.query(User).filter_by(id=user_id).first()
```

**Rules:**
- Always use async session (`AsyncSession`)
- Use `select()` instead of `query()`
- Use `scalar_one_or_none()` for single results
- Use `scalars().all()` for multiple results
- Always handle `None` returns

### Pydantic
```python
# ✅ GOOD - Proper validation and types
from pydantic import BaseModel, Field, EmailStr, validator

class UserCreate(BaseModel):
    email: EmailStr
    name: str = Field(..., min_length=1, max_length=255)
    password: str = Field(..., min_length=8)
    
    @validator('password')
    def validate_password(cls, v):
        if not any(c.isupper() for c in v):
            raise ValueError('Password must contain uppercase')
        return v

# ❌ BAD - No validation
class UserCreate(BaseModel):
    email: str
    name: str
    password: str
```

**Rules:**
- Use `Field()` for constraints
- Use specific types (`EmailStr`, `HttpUrl`)
- Add custom validators when needed
- Use `Config` for ORM mode
- Always validate input data

### Redis (async)
```python
# ✅ GOOD - Async Redis operations
from redis.asyncio import Redis

redis = Redis.from_url("redis://localhost")

async def cache_user(user_id: str, data: dict):
    await redis.setex(
        f"user:{user_id}",
        3600,  # TTL in seconds
        json.dumps(data)
    )

# ❌ BAD - Sync Redis (blocks event loop)
import redis
r = redis.Redis()
r.set("key", "value")
```

**Rules:**
- Always use `redis.asyncio`
- Set TTL on all keys
- Use namespaced keys (`user:123`, `task:456`)
- Handle connection errors gracefully
- Use connection pooling

### Qdrant
```python
# ✅ GOOD - Proper vector operations
from qdrant_client import QdrantClient
from qdrant_client.models import PointStruct, VectorParams

client = QdrantClient(url="http://localhost:6333")

# Create collection with proper config
client.create_collection(
    collection_name="knowledge",
    vectors_config=VectorParams(
        size=768,
        distance=Distance.COSINE
    )
)

# Insert with metadata
client.upsert(
    collection_name="knowledge",
    points=[
        PointStruct(
            id=str(uuid.uuid4()),
            vector=embedding,
            payload={"content": text, "team_id": team_id}
        )
    ]
)

# ❌ BAD - No configuration, no metadata
client.create_collection("knowledge")
client.upsert("knowledge", vectors=[embedding])
```

**Rules:**
- Always specify vector size and distance metric
- Include metadata in payload
- Use UUIDs for point IDs
- Create payload indexes for filters
- Handle collection existence checks

### LangGraph
```python
# ✅ GOOD - Proper state management
from langgraph.graph import StateGraph, START, END
from typing import TypedDict, Annotated
import operator

class AgentState(TypedDict):
    messages: Annotated[list, operator.add]
    context: str
    user_id: str

workflow = StateGraph(AgentState)
workflow.add_node("retrieve", retrieve_node)
workflow.add_node("respond", respond_node)
workflow.add_edge(START, "retrieve")
workflow.add_edge("retrieve", "respond")
workflow.add_edge("respond", END)

# ❌ BAD - No type safety
workflow = StateGraph(dict)
workflow.add_node("node1", lambda x: x)
```

**Rules:**
- Define typed state with `TypedDict`
- Use `Annotated` for reducers
- Add proper edges between nodes
- Use checkpointer for persistence
- Handle errors in nodes

### Structlog
```python
# ✅ GOOD - Structured logging with context
from src.config.logging import get_logger

logger = get_logger(__name__)

async def process_task(task_id: str):
    logger.info("Processing task", task_id=task_id, status="started")
    try:
        result = await do_work(task_id)
        logger.info("Task completed", task_id=task_id, result=result)
        return result
    except Exception as e:
        logger.error("Task failed", task_id=task_id, error=str(e))
        raise

# ❌ BAD - String logging, no context
import logging
logging.info(f"Processing task {task_id}")
```

**Rules:**
- Always use structured logging (key=value)
- Include relevant context (IDs, status)
- Use appropriate log levels
- Never log sensitive data (passwords, tokens)
- Use `get_logger(__name__)` for module loggers

## TypeScript/React Libraries

### React 18
```typescript
// ✅ GOOD - Functional components with hooks
import React, { useState, useEffect } from 'react';

interface TaskListProps {
  teamId: string;
}

export const TaskList: React.FC<TaskListProps> = ({ teamId }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchTasks(teamId).then(setTasks).finally(() => setLoading(false));
  }, [teamId]);
  
  if (loading) return <div>Loading...</div>;
  return <div>{tasks.map(task => <TaskCard key={task.id} task={task} />)}</div>;
};

// ❌ BAD - Class components, no types
export class TaskList extends React.Component {
  render() {
    return <div>{this.props.tasks.map(t => <TaskCard task={t} />)}</div>;
  }
}
```

**Rules:**
- Always use functional components
- Use TypeScript for all components
- Define prop interfaces
- Use hooks (useState, useEffect, etc.)
- Memoize expensive computations with useMemo

### Axios
```typescript
// ✅ GOOD - Typed API client with error handling
import axios, { AxiosError } from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8000/api/v1',
  timeout: 10000,
});

interface Task {
  id: string;
  title: string;
  status: string;
}

async function getTasks(): Promise<Task[]> {
  try {
    const response = await api.get<Task[]>('/tasks');
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('API error:', error.response?.data);
    }
    throw error;
  }
}

// ❌ BAD - No types, no error handling
async function getTasks() {
  const response = await axios.get('/tasks');
  return response.data;
}
```

**Rules:**
- Create axios instance with baseURL
- Set reasonable timeout
- Type all responses
- Handle errors properly
- Use interceptors for auth tokens

### TailwindCSS
```typescript
// ✅ GOOD - Semantic class names, responsive
export const Button: React.FC<ButtonProps> = ({ children, variant = 'primary' }) => {
  const baseClasses = 'px-4 py-2 rounded-lg font-medium transition-colors';
  const variantClasses = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white',
    secondary: 'bg-gray-200 hover:bg-gray-300 text-gray-900',
  };
  
  return (
    <button className={`${baseClasses} ${variantClasses[variant]}`}>
      {children}
    </button>
  );
};

// ❌ BAD - Inline styles, no variants
export const Button = ({ children }) => {
  return (
    <button style={{ padding: '8px 16px', background: 'blue' }}>
      {children}
    </button>
  );
};
```

**Rules:**
- Use Tailwind classes, not inline styles
- Create reusable component variants
- Use responsive classes (sm:, md:, lg:)
- Extract common patterns to components
- Use @apply sparingly in CSS

### Redux Toolkit
```typescript
// ✅ GOOD - Typed slices with proper actions
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface TasksState {
  items: Task[];
  loading: boolean;
  error: string | null;
}

const initialState: TasksState = {
  items: [],
  loading: false,
  error: null,
};

const tasksSlice = createSlice({
  name: 'tasks',
  initialState,
  reducers: {
    setTasks: (state, action: PayloadAction<Task[]>) => {
      state.items = action.payload;
      state.loading = false;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
  },
});

// ❌ BAD - No types, manual action creators
const tasksReducer = (state = [], action) => {
  switch (action.type) {
    case 'SET_TASKS':
      return action.payload;
    default:
      return state;
  }
};
```

**Rules:**
- Always use Redux Toolkit, not plain Redux
- Type all state and actions
- Use `createSlice` for reducers
- Use `createAsyncThunk` for async actions
- Use selectors with `useSelector`

## Security Libraries

### Passlib (Python)
```python
# ✅ GOOD - Proper password hashing
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)

# ❌ BAD - Weak hashing
import hashlib
hashed = hashlib.md5(password.encode()).hexdigest()
```

**Rules:**
- Always use bcrypt (cost factor 12+)
- Never store plain passwords
- Use `verify()` for checking
- Don't implement your own crypto

### PyJWT
```python
# ✅ GOOD - Proper JWT handling
import jwt
from datetime import datetime, timedelta

def create_token(user_id: str, secret: str) -> str:
    payload = {
        "sub": user_id,
        "exp": datetime.utcnow() + timedelta(minutes=15),
        "iat": datetime.utcnow(),
    }
    return jwt.encode(payload, secret, algorithm="HS256")

def verify_token(token: str, secret: str) -> str:
    try:
        payload = jwt.decode(token, secret, algorithms=["HS256"])
        return payload["sub"]
    except jwt.ExpiredSignatureError:
        raise AuthenticationError("Token expired")
    except jwt.InvalidTokenError:
        raise AuthenticationError("Invalid token")

# ❌ BAD - No expiry, no error handling
def create_token(user_id: str) -> str:
    return jwt.encode({"user_id": user_id}, "secret")
```

**Rules:**
- Always set expiration (`exp`)
- Use strong secrets (environment variables)
- Specify algorithm explicitly
- Handle all JWT exceptions
- Use refresh tokens for long sessions

## Testing Libraries

### Pytest
```python
# ✅ GOOD - Clear, isolated tests
import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_create_task_returns_201(client: AsyncClient, auth_headers: dict):
    # Arrange
    task_data = {"title": "Test task", "description": "Test"}
    
    # Act
    response = await client.post("/api/v1/tasks", json=task_data, headers=auth_headers)
    
    # Assert
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == task_data["title"]
    assert "id" in data

# ❌ BAD - Unclear, coupled
async def test_task():
    response = await client.post("/tasks", json={"title": "Test"})
    assert response.status_code == 201
```

**Rules:**
- Use `@pytest.mark.asyncio` for async tests
- Follow Arrange-Act-Assert pattern
- Use fixtures for common setup
- Test one thing per test
- Use descriptive test names

## Prohibited Libraries

### ❌ Never Use These

1. **requests** (sync) → Use **httpx** (async)
2. **time.sleep()** → Use **asyncio.sleep()**
3. **threading** → Use **asyncio**
4. **pickle** → Use **json** or **msgpack**
5. **eval()** → Never use, security risk
6. **exec()** → Never use, security risk
7. **MD5/SHA1** for passwords → Use **bcrypt**
8. **Plain Redis** → Use **redis.asyncio**

## Version Management

### Python (requirements.txt)
```txt
# ✅ GOOD - Pin major.minor, allow patch
fastapi>=0.115.0,<0.116.0
sqlalchemy>=2.0.36,<2.1.0
pydantic>=2.9.0,<3.0.0

# ❌ BAD - No pinning or too strict
fastapi
sqlalchemy==2.0.36
```

### Node.js (package.json)
```json
{
  "dependencies": {
    "react": "^18.2.0",
    "axios": "^1.6.0"
  },
  "devDependencies": {
    "typescript": "~5.3.0",
    "vite": "^5.0.0"
  }
}
```

**Rules:**
- Use `^` for minor updates (1.2.x → 1.3.0)
- Use `~` for patch updates (1.2.3 → 1.2.4)
- Pin exact versions for critical deps
- Always commit lock files

## Update Strategy

### Monthly Review
1. Check for security updates
2. Review changelog for breaking changes
3. Update in dev environment first
4. Run full test suite
5. Deploy to staging
6. Monitor for issues
7. Deploy to production

### Security Updates
- Apply immediately
- Skip staging if critical
- Monitor closely after deployment

## Dependency Conflicts

### Resolution Priority
1. **Security** - Always use secure version
2. **Compatibility** - Ensure all deps work together
3. **Features** - Prefer newer features
4. **Stability** - Prefer stable over beta

### When Conflicts Arise
1. Check if both deps are needed
2. Look for alternative packages
3. Pin to compatible versions
4. Consider forking if necessary (last resort)

## Package Management

### Python
```bash
# ✅ GOOD - Use pip with requirements.txt
pip install -r requirements.txt
pip freeze > requirements.txt

# ❌ BAD - Install without tracking
pip install fastapi
```

### Node.js
```bash
# ✅ GOOD - Use npm with package-lock.json
npm install
npm install --save axios

# ❌ BAD - Use different package managers
yarn add axios  # Don't mix with npm
```

**Rules:**
- Stick to one package manager per project
- Always commit lock files
- Use virtual environments (Python)
- Don't commit node_modules or venv

## Custom Wrappers

### When to Wrap Libraries
1. **Consistent interface** across the app
2. **Add logging/monitoring**
3. **Simplify complex APIs**
4. **Enable easy swapping** of implementations

### Example: LLM Client Wrapper
```python
# ✅ GOOD - Wrapper provides consistent interface
class EnhancedLLMClient:
    def __init__(self):
        self.openai_client = AsyncOpenAI()
        self.groq_client = AsyncOpenAI(base_url="...")
        self.ollama_client = AsyncOpenAI(base_url="...")
    
    async def complete(self, messages: list, model: str) -> str:
        # Try providers in order with fallback
        # Add caching, retry logic, logging
        pass

# Usage is simple and consistent
client = EnhancedLLMClient()
response = await client.complete(messages, "llama3.2")
```

## Documentation Requirements

### For Each Library
1. **Why we use it** - Justification
2. **How to use it** - Examples
3. **Common patterns** - Best practices
4. **Gotchas** - Known issues
5. **Alternatives** - What we considered

### Keep Updated
- Update when library versions change
- Add new patterns as discovered
- Remove deprecated patterns
- Link to official docs
