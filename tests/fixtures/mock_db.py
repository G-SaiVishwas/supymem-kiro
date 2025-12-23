"""
Mock Database Session for Unit Tests

Provides mock async session that doesn't require a real database.
"""

from contextlib import asynccontextmanager
from typing import Any
import uuid
from datetime import datetime


class MockResult:
    """Mock SQLAlchemy result object."""
    
    def __init__(self, data: Any = None):
        self._data = data if data is not None else []
    
    def scalar_one_or_none(self):
        if isinstance(self._data, list):
            return self._data[0] if self._data else None
        return self._data
    
    def scalar_one(self):
        if isinstance(self._data, list):
            if not self._data:
                raise Exception("No result found")
            return self._data[0]
        return self._data
    
    def scalars(self):
        return self
    
    def all(self):
        if isinstance(self._data, list):
            return self._data
        return [self._data] if self._data else []
    
    def first(self):
        if isinstance(self._data, list):
            return self._data[0] if self._data else None
        return self._data


class MockAsyncSession:
    """Mock async database session."""
    
    def __init__(self):
        self._storage = {}  # In-memory storage for mock data
        self._pending_adds = []
        self._committed = []
    
    async def execute(self, statement, *args, **kwargs):
        """Mock execute - returns empty result by default."""
        return MockResult([])
    
    def add(self, obj):
        """Add object to pending."""
        if not hasattr(obj, 'id') or obj.id is None:
            obj.id = str(uuid.uuid4())
        if not hasattr(obj, 'created_at') or obj.created_at is None:
            obj.created_at = datetime.utcnow()
        if not hasattr(obj, 'updated_at') or obj.updated_at is None:
            obj.updated_at = datetime.utcnow()
        self._pending_adds.append(obj)
    
    async def commit(self):
        """Mock commit - moves pending to committed."""
        self._committed.extend(self._pending_adds)
        self._pending_adds = []
    
    async def rollback(self):
        """Mock rollback - clears pending."""
        self._pending_adds = []
    
    async def refresh(self, obj):
        """Mock refresh - no-op."""
        pass
    
    async def flush(self):
        """Mock flush - no-op."""
        pass
    
    async def close(self):
        """Mock close."""
        pass
    
    async def __aenter__(self):
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.close()


@asynccontextmanager
async def mock_get_session():
    """Mock get_session context manager."""
    session = MockAsyncSession()
    try:
        yield session
    finally:
        await session.close()


async def mock_get_db():
    """Mock get_db dependency."""
    async with mock_get_session() as session:
        yield session


# Pre-configured mock session for simple tests
def create_mock_session_with_data(data: dict = None):
    """Create a mock session pre-populated with test data."""
    session = MockAsyncSession()
    if data:
        session._storage = data
    return session

