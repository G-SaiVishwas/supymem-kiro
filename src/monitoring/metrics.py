"""
Prometheus metrics for monitoring application performance.
"""
from prometheus_client import Counter, Histogram, Gauge, Info
from functools import wraps
from time import time
from typing import Callable, TypeVar, ParamSpec

P = ParamSpec('P')
T = TypeVar('T')

# API Metrics
http_requests_total = Counter(
    'http_requests_total',
    'Total HTTP requests',
    ['method', 'endpoint', 'status']
)

http_request_duration_seconds = Histogram(
    'http_request_duration_seconds',
    'HTTP request duration in seconds',
    ['method', 'endpoint']
)

http_requests_in_progress = Gauge(
    'http_requests_in_progress',
    'HTTP requests currently in progress',
    ['method', 'endpoint']
)

# LLM Metrics
llm_requests_total = Counter(
    'llm_requests_total',
    'Total LLM requests',
    ['provider', 'model', 'status']
)

llm_tokens_total = Counter(
    'llm_tokens_total',
    'Total tokens used',
    ['provider', 'model', 'type']  # type: prompt or completion
)

llm_request_duration_seconds = Histogram(
    'llm_request_duration_seconds',
    'LLM request duration in seconds',
    ['provider', 'model']
)

llm_cost_total = Counter(
    'llm_cost_total',
    'Total estimated LLM cost in USD',
    ['provider', 'model']
)

# Vector Store Metrics
vector_search_total = Counter(
    'vector_search_total',
    'Total vector searches',
    ['collection', 'status']
)

vector_search_duration_seconds = Histogram(
    'vector_search_duration_seconds',
    'Vector search duration in seconds',
    ['collection']
)

vector_insert_total = Counter(
    'vector_insert_total',
    'Total vector insertions',
    ['collection']
)

# Database Metrics
db_queries_total = Counter(
    'db_queries_total',
    'Total database queries',
    ['operation', 'table', 'status']
)

db_query_duration_seconds = Histogram(
    'db_query_duration_seconds',
    'Database query duration in seconds',
    ['operation', 'table']
)

db_connections_active = Gauge(
    'db_connections_active',
    'Active database connections'
)

# Cache Metrics
cache_operations_total = Counter(
    'cache_operations_total',
    'Total cache operations',
    ['operation', 'level', 'status']  # level: l1 or l2
)

cache_hit_rate = Gauge(
    'cache_hit_rate',
    'Cache hit rate percentage',
    ['level']
)

# Business Metrics
knowledge_entries_total = Gauge(
    'knowledge_entries_total',
    'Total knowledge entries',
    ['team_id']
)

active_users_total = Gauge(
    'active_users_total',
    'Total active users',
    ['period']  # period: daily, weekly, monthly
)

tasks_total = Gauge(
    'tasks_total',
    'Total tasks',
    ['team_id', 'status']
)

automation_rules_total = Gauge(
    'automation_rules_total',
    'Total automation rules',
    ['team_id', 'status']
)

automation_executions_total = Counter(
    'automation_executions_total',
    'Total automation executions',
    ['team_id', 'status']
)

# System Metrics
app_info = Info('app', 'Application information')
app_info.info({
    'version': '0.1.0',
    'name': 'supymem-kiro'
})


# Decorators for automatic metric tracking
def track_http_request(endpoint: str):
    """Decorator to track HTTP request metrics."""
    def decorator(func: Callable[P, T]) -> Callable[P, T]:
        @wraps(func)
        async def wrapper(*args: P.args, **kwargs: P.kwargs) -> T:
            method = kwargs.get('method', 'GET')
            
            http_requests_in_progress.labels(method=method, endpoint=endpoint).inc()
            start_time = time()
            
            try:
                result = await func(*args, **kwargs)
                status = '200'
                return result
            except Exception as e:
                status = '500'
                raise
            finally:
                duration = time() - start_time
                http_requests_total.labels(
                    method=method,
                    endpoint=endpoint,
                    status=status
                ).inc()
                http_request_duration_seconds.labels(
                    method=method,
                    endpoint=endpoint
                ).observe(duration)
                http_requests_in_progress.labels(
                    method=method,
                    endpoint=endpoint
                ).dec()
        
        return wrapper
    return decorator


def track_llm_request(provider: str, model: str):
    """Decorator to track LLM request metrics."""
    def decorator(func: Callable[P, T]) -> Callable[P, T]:
        @wraps(func)
        async def wrapper(*args: P.args, **kwargs: P.kwargs) -> T:
            start_time = time()
            
            try:
                result = await func(*args, **kwargs)
                status = 'success'
                return result
            except Exception as e:
                status = 'error'
                raise
            finally:
                duration = time() - start_time
                llm_requests_total.labels(
                    provider=provider,
                    model=model,
                    status=status
                ).inc()
                llm_request_duration_seconds.labels(
                    provider=provider,
                    model=model
                ).observe(duration)
        
        return wrapper
    return decorator


def track_vector_search(collection: str):
    """Decorator to track vector search metrics."""
    def decorator(func: Callable[P, T]) -> Callable[P, T]:
        @wraps(func)
        async def wrapper(*args: P.args, **kwargs: P.kwargs) -> T:
            start_time = time()
            
            try:
                result = await func(*args, **kwargs)
                status = 'success'
                return result
            except Exception as e:
                status = 'error'
                raise
            finally:
                duration = time() - start_time
                vector_search_total.labels(
                    collection=collection,
                    status=status
                ).inc()
                vector_search_duration_seconds.labels(
                    collection=collection
                ).observe(duration)
        
        return wrapper
    return decorator


def track_db_query(operation: str, table: str):
    """Decorator to track database query metrics."""
    def decorator(func: Callable[P, T]) -> Callable[P, T]:
        @wraps(func)
        async def wrapper(*args: P.args, **kwargs: P.kwargs) -> T:
            start_time = time()
            
            try:
                result = await func(*args, **kwargs)
                status = 'success'
                return result
            except Exception as e:
                status = 'error'
                raise
            finally:
                duration = time() - start_time
                db_queries_total.labels(
                    operation=operation,
                    table=table,
                    status=status
                ).inc()
                db_query_duration_seconds.labels(
                    operation=operation,
                    table=table
                ).observe(duration)
        
        return wrapper
    return decorator


# Helper functions for updating business metrics
def update_knowledge_entries_count(team_id: str, count: int):
    """Update knowledge entries gauge."""
    knowledge_entries_total.labels(team_id=team_id).set(count)


def update_active_users_count(period: str, count: int):
    """Update active users gauge."""
    active_users_total.labels(period=period).set(count)


def update_tasks_count(team_id: str, status: str, count: int):
    """Update tasks gauge."""
    tasks_total.labels(team_id=team_id, status=status).set(count)


def record_automation_execution(team_id: str, status: str):
    """Record automation execution."""
    automation_executions_total.labels(team_id=team_id, status=status).inc()


def update_cache_hit_rate(level: str, rate: float):
    """Update cache hit rate."""
    cache_hit_rate.labels(level=level).set(rate)
