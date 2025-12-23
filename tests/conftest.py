"""
Pytest Configuration and Fixtures
"""

import pytest
import asyncio
import os
import sys

# Add src to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))


@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


def pytest_configure(config):
    """Configure pytest."""
    config.addinivalue_line(
        "markers", "anyio: mark test as async"
    )


# ============================================================================
# Mock Fixtures
# ============================================================================

@pytest.fixture
def mock_db_session():
    """Provide a mock database session."""
    from tests.fixtures.mock_db import MockAsyncSession
    return MockAsyncSession()


@pytest.fixture
def mock_llm():
    """Provide a mock LLM client."""
    from tests.fixtures.mock_llm import MockLLMClient
    return MockLLMClient()


@pytest.fixture
def mock_vector_store():
    """Provide a mock vector store."""
    from tests.fixtures.mock_vector_store import MockVectorStore
    return MockVectorStore()


@pytest.fixture
def sample_user_data():
    """Sample user data for tests."""
    return {
        "id": "user123",
        "username": "testuser",
        "email": "test@example.com",
        "team_id": "team1"
    }


@pytest.fixture
def sample_team_data():
    """Sample team data for tests."""
    return {
        "id": "team1",
        "name": "Test Team",
        "slug": "test-team"
    }


@pytest.fixture
def sample_task_data():
    """Sample task data for tests."""
    return {
        "id": "task123",
        "title": "Test Task",
        "description": "A test task description",
        "status": "pending",
        "priority": "medium",
        "team_id": "team1",
        "assigned_to": "user123"
    }


@pytest.fixture
def sample_decision_data():
    """Sample decision data for tests."""
    return {
        "id": "dec123",
        "content": "Use PostgreSQL for the database",
        "rationale": "ACID compliance and reliability",
        "context": "Database selection meeting",
        "team_id": "team1",
        "created_by": "user123"
    }


@pytest.fixture
def sample_activity_data():
    """Sample activity data for tests."""
    return {
        "id": "act123",
        "user_id": "user123",
        "team_id": "team1",
        "activity_type": "commit",
        "title": "Fixed authentication bug",
        "source": "github",
        "source_id": "abc123def"
    }


@pytest.fixture
def sample_automation_rule_data():
    """Sample automation rule data for tests."""
    return {
        "id": "rule123",
        "name": "Notify on task completion",
        "description": "Send notification when task is completed",
        "team_id": "team1",
        "trigger_type": "task_completed",
        "trigger_conditions": {},
        "actions": [
            {"type": "send_notification", "params": {"message": "Task done!"}}
        ],
        "is_active": True
    }
