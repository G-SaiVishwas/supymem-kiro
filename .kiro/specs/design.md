# Architecture Design - Supymem-Kiro

## System Overview

```mermaid
graph TD
    subgraph "Client Layer"
        A[Web Browser]
        B[VS Code Extension]
        C[Slack Client]
    end
    
    subgraph "API Gateway"
        D[FastAPI Application]
        D1[CORS Middleware]
        D2[Request Logging]
        D3[Team Context]
    end
    
    subgraph "Application Layer"
        E[Knowledge Agent]
        F[Automation Engine]
        G[Analytics Service]
        H[Classification Service]
    end
    
    subgraph "Data Layer"
        I[(PostgreSQL)]
        J[(Redis Cache)]
        K[(Qdrant Vectors)]
    end
    
    subgraph "External Services"
        L[Ollama LLM]
        M[OpenAI API]
        N[Groq API]
        O[GitHub API]
        P[Slack API]
    end
    
    A --> D
    B --> D
    C --> D
    
    D --> D1
    D1 --> D2
    D2 --> D3
    D3 --> E
    D3 --> F
    D3 --> G
    D3 --> H
    
    E --> I
    E --> J
    E --> K
    E --> L
    E --> M
    E --> N
    
    F --> I
    F --> J
    
    G --> I
    
    H --> I
    H --> K
    H --> L
    
    D --> O
    D --> P
```

## Data Flow Architecture

### Knowledge Query Flow

```mermaid
sequenceDiagram
    participant User
    participant API
    participant Cache
    participant Agent
    participant VectorDB
    participant LLM
    participant Database
    
    User->>API: POST /api/v1/query
    API->>Cache: Check L1 (memory)
    
    alt Cache Hit
        Cache-->>API: Return cached result
        API-->>User: Response (50ms)
    else Cache Miss
        Cache->>Cache: Check L2 (Redis)
        
        alt Redis Hit
            Cache-->>API: Return cached result
            API-->>User: Response (75ms)
        else Redis Miss
            API->>Agent: Process query
            Agent->>VectorDB: Semantic search
            VectorDB-->>Agent: Top 5 results
            Agent->>Database: Get full content
            Database-->>Agent: Knowledge entries
            Agent->>LLM: Generate response
            LLM-->>Agent: AI response
            Agent-->>API: Final answer
            API->>Cache: Store in L1 & L2
            API-->>User: Response (1500ms)
        end
    end
```

### Knowledge Storage Flow

```mermaid
sequenceDiagram
    participant User
    participant API
    participant Classifier
    participant Embeddings
    participant VectorDB
    participant Database
    participant Cache
    
    User->>API: POST /api/v1/store
    API->>Classifier: Classify content
    Classifier->>Classifier: LLM classification
    Classifier-->>API: Category & entities
    
    par Parallel Operations
        API->>Embeddings: Generate embeddings
        Embeddings-->>API: Vector (768-dim)
        API->>VectorDB: Store vector + metadata
        
        and
        API->>Database: Store knowledge entry
    end
    
    API->>Cache: Invalidate search cache
    API-->>User: Success (200ms)
```

### Automation Rule Execution

```mermaid
sequenceDiagram
    participant Event
    participant Monitor
    participant RuleEngine
    participant Executor
    participant Slack
    participant Database
    
    Event->>Monitor: Task completed
    Monitor->>Database: Get active rules
    Database-->>Monitor: Matching rules
    
    loop For each rule
        Monitor->>RuleEngine: Check conditions
        RuleEngine->>RuleEngine: Evaluate trigger
        
        alt Conditions Met
            RuleEngine->>Executor: Execute action
            
            alt Action: Notify
                Executor->>Slack: Send message
                Slack-->>Executor: Delivered
            else Action: Create Task
                Executor->>Database: Create task
                Database-->>Executor: Task created
            end
            
            Executor->>Database: Log execution
            
            alt One-time rule
                Executor->>Database: Deactivate rule
            end
        end
    end
```

## Component Architecture

### Multi-Level Caching

```mermaid
graph LR
    subgraph "Cache Hierarchy"
        A[Request] --> B{L1 Cache<br/>Memory LRU}
        B -->|Hit| C[Return 10ms]
        B -->|Miss| D{L2 Cache<br/>Redis}
        D -->|Hit| E[Return 25ms]
        D -->|Miss| F[Database Query]
        F --> G[Store in L2]
        G --> H[Promote to L1]
        H --> I[Return 50ms]
    end
    
    style B fill:#90EE90
    style D fill:#87CEEB
    style F fill:#FFB6C1
```

### LLM Provider Fallback

```mermaid
graph TD
    A[LLM Request] --> B{OpenAI<br/>Configured?}
    B -->|Yes| C[Try OpenAI]
    B -->|No| D{Groq<br/>Configured?}
    
    C -->|Success| E[Return Response]
    C -->|Fail| D
    
    D -->|Yes| F[Try Groq]
    D -->|No| G[Try Ollama]
    
    F -->|Success| E
    F -->|Fail| G
    
    G -->|Success| E
    G -->|Fail| H[Error]
    
    style C fill:#90EE90
    style F fill:#87CEEB
    style G fill:#FFD700
    style H fill:#FF6B6B
```

## Database Schema

### Core Entities

```mermaid
erDiagram
    ORGANIZATION ||--o{ TEAM : contains
    ORGANIZATION ||--o{ USER : has_members
    TEAM ||--o{ USER : has_members
    TEAM ||--o{ KNOWLEDGE_ENTRY : owns
    TEAM ||--o{ DECISION : tracks
    TEAM ||--o{ TASK : manages
    TEAM ||--o{ AUTOMATION_RULE : defines
    
    USER ||--o{ USER_ACTIVITY : performs
    USER ||--o{ NOTIFICATION : receives
    USER ||--o{ AGENT_SESSION : has
    
    KNOWLEDGE_ENTRY ||--o{ DECISION : relates_to
    DECISION ||--o{ DECISION_CHALLENGE : has
    
    AUTOMATION_RULE ||--o{ AUTOMATION_EXECUTION : logs
    
    TASK ||--o{ USER_ACTIVITY : generates
    
    ORGANIZATION {
        string id PK
        string name
        string slug UK
        string plan
        json settings
        timestamp created_at
    }
    
    USER {
        string id PK
        string email UK
        string name
        string password_hash
        string github_id UK
        string slack_id UK
        timestamp created_at
    }
    
    TEAM {
        string id PK
        string organization_id FK
        string name
        string slug
        json github_repos
        json slack_channels
    }
    
    KNOWLEDGE_ENTRY {
        string id PK
        text content
        string team_id FK
        string category
        vector embedding
        json extracted_entities
        timestamp created_at
    }
    
    DECISION {
        string id PK
        string team_id FK
        string title
        text reasoning
        json alternatives_considered
        vector embedding
        timestamp created_at
    }
    
    TASK {
        string id PK
        string team_id FK
        string title
        string status
        string priority
        string assigned_to
        timestamp due_date
    }
    
    AUTOMATION_RULE {
        string id PK
        string team_id FK
        text original_instruction
        string trigger_type
        json trigger_conditions
        string action_type
        json action_params
        string status
    }
```

### Vector Store Schema

```mermaid
graph LR
    subgraph "Qdrant Collection: knowledge"
        A[Point ID: UUID]
        B[Vector: 768-dim]
        C[Payload]
    end
    
    C --> D[content: text]
    C --> E[team_id: string]
    C --> F[source: string]
    C --> G[category: string]
    C --> H[created_at: timestamp]
    
    style A fill:#FFD700
    style B fill:#90EE90
    style C fill:#87CEEB
```

## API Architecture

### RESTful Endpoints

```mermaid
graph TD
    A[/api/v1] --> B[/auth]
    A --> C[/knowledge]
    A --> D[/tasks]
    A --> E[/decisions]
    A --> F[/automation]
    A --> G[/analytics]
    
    B --> B1[POST /register]
    B --> B2[POST /login]
    B --> B3[GET /me]
    
    C --> C1[POST /query]
    C --> C2[POST /store]
    C --> C3[POST /search]
    
    D --> D1[GET /tasks]
    D --> D2[POST /tasks]
    D --> D3[PATCH /tasks/:id]
    
    E --> E1[GET /decisions]
    E --> E2[POST /challenge]
    
    F --> F1[POST /parse]
    F --> F2[GET /rules]
    F --> F3[POST /rules]
    
    G --> G1[GET /productivity/user]
    G --> G2[GET /productivity/team]
    G --> G3[GET /activities]
```

### Middleware Stack

```mermaid
graph TD
    A[Incoming Request] --> B[CORS Middleware]
    B --> C[Request Logging]
    C --> D[Team Context]
    D --> E[Authentication]
    E --> F[Authorization]
    F --> G[Route Handler]
    G --> H[Response]
    
    H --> I[Exception Handler]
    I --> J[Response Logging]
    J --> K[Outgoing Response]
    
    style A fill:#90EE90
    style G fill:#FFD700
    style K fill:#87CEEB
```

## Integration Architecture

### GitHub Integration

```mermaid
sequenceDiagram
    participant GitHub
    participant Webhook
    participant Worker
    participant Classifier
    participant Database
    participant Notifications
    
    GitHub->>Webhook: POST /webhooks/github
    Webhook->>Webhook: Verify signature
    Webhook->>Worker: Queue event
    Webhook-->>GitHub: 200 OK
    
    Worker->>Classifier: Analyze PR/commit
    Classifier->>Classifier: Extract decisions
    Classifier->>Classifier: Detect breaking changes
    Classifier-->>Worker: Analysis results
    
    Worker->>Database: Store knowledge
    Worker->>Database: Store decisions
    Worker->>Database: Update file ownership
    
    alt Breaking changes detected
        Worker->>Notifications: Notify affected users
        Notifications->>Notifications: Get file owners
        Notifications->>Notifications: Send Slack messages
    end
```

### Slack Integration

```mermaid
sequenceDiagram
    participant User
    participant Slack
    participant Bot
    participant Agent
    participant Database
    
    User->>Slack: @supymem What is the auth architecture?
    Slack->>Bot: Event: app_mention
    Bot->>Bot: Extract query
    Bot->>Agent: Process query
    Agent->>Database: Search knowledge
    Database-->>Agent: Results
    Agent->>Agent: Generate response
    Agent-->>Bot: Answer
    Bot->>Slack: Post message
    Slack-->>User: Display response
```

## Deployment Architecture

### Development Environment

```mermaid
graph TD
    subgraph "Local Machine"
        A[Docker Compose]
        A --> B[PostgreSQL:5432]
        A --> C[Redis:6379]
        A --> D[Qdrant:6333]
        A --> E[Ollama:11434]
        
        F[uvicorn] --> G[FastAPI:8000]
        H[npm run dev] --> I[Vite:5173]
    end
    
    G --> B
    G --> C
    G --> D
    G --> E
    
    I --> G
```

### Production Architecture (Planned)

```mermaid
graph TD
    subgraph "Load Balancer"
        A[nginx]
    end
    
    subgraph "Application Servers"
        B[FastAPI Instance 1]
        C[FastAPI Instance 2]
        D[FastAPI Instance 3]
    end
    
    subgraph "Worker Servers"
        E[Worker Pool 1]
        F[Worker Pool 2]
    end
    
    subgraph "Data Layer"
        G[(PostgreSQL Primary)]
        H[(PostgreSQL Replica)]
        I[(Redis Cluster)]
        J[(Qdrant Cluster)]
    end
    
    subgraph "External Services"
        K[Ollama]
        L[OpenAI]
        M[Groq]
    end
    
    A --> B
    A --> C
    A --> D
    
    B --> G
    C --> G
    D --> G
    
    B --> H
    C --> H
    D --> H
    
    B --> I
    C --> I
    D --> I
    
    B --> J
    C --> J
    D --> J
    
    E --> G
    F --> G
    
    B --> K
    B --> L
    B --> M
```

## Security Architecture

### Authentication Flow

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant API
    participant Database
    
    User->>Frontend: Enter credentials
    Frontend->>API: POST /api/v1/login
    API->>Database: Verify user
    Database-->>API: User found
    API->>API: Verify password (bcrypt)
    API->>API: Generate JWT tokens
    API-->>Frontend: Access + Refresh tokens
    Frontend->>Frontend: Store in HttpOnly cookies
    Frontend-->>User: Redirect to dashboard
    
    Note over Frontend,API: Subsequent requests
    Frontend->>API: Request with JWT
    API->>API: Verify JWT signature
    API->>API: Check expiration
    API->>API: Extract user_id
    API->>Database: Get user permissions
    Database-->>API: User + permissions
    API-->>Frontend: Authorized response
```

### Authorization Model

```mermaid
graph TD
    A[User Request] --> B{Authenticated?}
    B -->|No| C[401 Unauthorized]
    B -->|Yes| D{Has Org Access?}
    D -->|No| E[403 Forbidden]
    D -->|Yes| F{Has Team Access?}
    F -->|No| E
    F -->|Yes| G{Has Resource Permission?}
    G -->|No| E
    G -->|Yes| H[Allow Request]
    
    style C fill:#FF6B6B
    style E fill:#FF6B6B
    style H fill:#90EE90
```

## Monitoring Architecture

### Metrics Collection

```mermaid
graph LR
    subgraph "Application"
        A[FastAPI] --> B[Prometheus Client]
    end
    
    subgraph "Metrics"
        B --> C[HTTP Metrics]
        B --> D[Database Metrics]
        B --> E[Cache Metrics]
        B --> F[Vector Metrics]
        B --> G[Business Metrics]
    end
    
    subgraph "Collection"
        C --> H[Prometheus Server]
        D --> H
        E --> H
        F --> H
        G --> H
    end
    
    subgraph "Visualization"
        H --> I[Grafana]
    end
    
    subgraph "Alerting"
        H --> J[Alertmanager]
        J --> K[Slack/Email]
    end
```

### Logging Pipeline

```mermaid
graph LR
    A[Application] --> B[structlog]
    B --> C[JSON Format]
    C --> D[stdout]
    D --> E[Log Aggregator]
    E --> F[Elasticsearch]
    F --> G[Kibana]
    
    style B fill:#90EE90
    style C fill:#87CEEB
    style F fill:#FFD700
```

## Performance Optimization

### Query Optimization Strategy

```mermaid
graph TD
    A[Query Request] --> B{In Cache?}
    B -->|Yes| C[Return Cached<br/>10-50ms]
    B -->|No| D{Simple Query?}
    D -->|Yes| E[Direct DB Query<br/>10-50ms]
    D -->|No| F{Needs Vector Search?}
    F -->|Yes| G[Qdrant Search<br/>50-75ms]
    F -->|No| H{Needs LLM?}
    H -->|Yes| I[LLM Processing<br/>500-2000ms]
    H -->|No| E
    
    G --> J[Combine Results]
    I --> J
    J --> K[Cache Result]
    K --> L[Return Response]
    
    style C fill:#90EE90
    style E fill:#90EE90
    style G fill:#FFD700
    style I fill:#FFB6C1
```

## Scalability Considerations

### Horizontal Scaling

```mermaid
graph TD
    subgraph "Stateless Layer - Easy to Scale"
        A[API Servers]
        B[Worker Processes]
    end
    
    subgraph "Stateful Layer - Requires Planning"
        C[PostgreSQL - Replication]
        D[Redis - Clustering]
        E[Qdrant - Sharding]
    end
    
    subgraph "External Services"
        F[LLM APIs - Rate Limited]
    end
    
    A --> C
    A --> D
    A --> E
    A --> F
    
    B --> C
    B --> D
    
    style A fill:#90EE90
    style B fill:#90EE90
    style C fill:#FFD700
    style D fill:#FFD700
    style E fill:#FFD700
    style F fill:#FFB6C1
```

## Technology Stack Summary

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | React 18 + TypeScript | User interface |
| **API** | FastAPI + Python 3.11 | REST API server |
| **Database** | PostgreSQL 17 + pgvector | Relational data + vectors |
| **Cache** | Redis 8.0 | L2 caching |
| **Vector Store** | Qdrant | Semantic search |
| **LLM** | Ollama/OpenAI/Groq | AI processing |
| **Agent** | LangGraph | AI agent framework |
| **Memory** | Mem0 | User memory |
| **Monitoring** | Prometheus + Grafana | Metrics & dashboards |
| **Logging** | structlog | Structured logging |
| **Integrations** | Slack Bolt, PyGithub | External services |

## Design Principles

1. **Async First** - All I/O operations are async
2. **Cache Aggressively** - Multi-level caching for performance
3. **Fail Gracefully** - Automatic fallbacks and retries
4. **Type Safety** - Full type hints in Python, TypeScript in frontend
5. **Observability** - Comprehensive logging and metrics
6. **Security by Default** - Authentication, authorization, encryption
7. **Scalability** - Stateless design, horizontal scaling ready
8. **Developer Experience** - Clear APIs, good documentation

## Future Enhancements

1. **Distributed Tracing** - OpenTelemetry integration
2. **GraphQL API** - Alternative to REST
3. **Real-time Updates** - WebSocket support
4. **Mobile Apps** - iOS and Android clients
5. **Advanced Analytics** - ML-powered insights
6. **Multi-region** - Geographic distribution
7. **Edge Deployment** - CDN integration
8. **Custom Plugins** - Extensibility framework
