"""
API Integration Tests

Tests the FastAPI endpoints.

NOTE: Tests marked with @pytest.mark.integration require running infrastructure:
- PostgreSQL (port 5432)
- Redis (port 6379)  
- Qdrant (port 6333)

Run with: docker-compose up -d
Then: pytest tests/test_api.py -v

To skip integration tests: pytest -m "not integration"
"""

import pytest
from httpx import AsyncClient, ASGITransport


# Custom marker for tests requiring infrastructure
integration = pytest.mark.integration


@pytest.fixture
async def client():
    from src.main import app
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


class TestHealthEndpoints:
    """Test health and root endpoints - no infrastructure needed."""

    @pytest.mark.asyncio
    async def test_health(self, client):
        response = await client.get("/health")
        assert response.status_code == 200
        assert response.json()["status"] == "healthy"

    @pytest.mark.asyncio
    async def test_root(self, client):
        response = await client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "version" in data


@pytest.mark.integration
class TestKnowledgeAPI:
    """Test knowledge endpoints - requires PostgreSQL + Qdrant."""

    @pytest.mark.asyncio
    async def test_store_knowledge(self, client):
        response = await client.post(
            "/api/v1/store",
            json={
                "content": "Test knowledge entry for API testing",
                "source": "test",
                "team_id": "test_team"
            }
        )
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_search_knowledge(self, client):
        # First store something
        await client.post(
            "/api/v1/store",
            json={
                "content": "Python is a programming language",
                "source": "test",
                "team_id": "test_team"
            }
        )
        
        # Then search
        response = await client.post(
            "/api/v1/search",
            json={
                "query": "What is Python?",
                "team_id": "test_team"
            }
        )
        assert response.status_code == 200
        assert "results" in response.json()


@pytest.mark.integration
class TestTasksAPI:
    """Test task endpoints - requires PostgreSQL."""

    @pytest.mark.asyncio
    async def test_create_task(self, client):
        response = await client.post(
            "/api/v1/tasks",
            json={
                "title": "Test Task",
                "description": "Test task description",
                "priority": "medium",
                "team_id": "test_team"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "Test Task"
        assert data["status"] == "pending"
        return data["id"]

    @pytest.mark.asyncio
    async def test_list_tasks(self, client):
        # Create a task first
        await client.post(
            "/api/v1/tasks",
            json={
                "title": "List Test Task",
                "team_id": "test_team"
            }
        )
        
        response = await client.get("/api/v1/tasks?team_id=test_team")
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    @pytest.mark.asyncio
    async def test_update_task(self, client):
        # Create a task
        create_response = await client.post(
            "/api/v1/tasks",
            json={
                "title": "Update Test Task",
                "team_id": "test_team"
            }
        )
        task_id = create_response.json()["id"]
        
        # Update it
        response = await client.patch(
            f"/api/v1/tasks/{task_id}",
            json={"status": "completed"}
        )
        assert response.status_code == 200
        assert response.json()["status"] == "completed"

    @pytest.mark.asyncio
    async def test_delete_task(self, client):
        # Create a task
        create_response = await client.post(
            "/api/v1/tasks",
            json={
                "title": "Delete Test Task",
                "team_id": "test_team"
            }
        )
        task_id = create_response.json()["id"]
        
        # Delete it
        response = await client.delete(f"/api/v1/tasks/{task_id}")
        assert response.status_code == 200


@pytest.mark.integration
class TestAutomationAPI:
    """Test automation endpoints - requires PostgreSQL."""

    @pytest.mark.asyncio
    async def test_parse_automation(self, client):
        response = await client.post(
            "/api/v1/automation/parse",
            json={
                "instruction": "When John finishes CSS tasks, notify him about API work",
                "team_id": "test_team"
            }
        )
        assert response.status_code == 200
        # May succeed or fail depending on LLM availability

    @pytest.mark.asyncio
    async def test_list_automation_rules(self, client):
        response = await client.get("/api/v1/automation/rules?team_id=test_team")
        assert response.status_code == 200
        assert isinstance(response.json(), list)


@pytest.mark.integration
class TestDecisionsAPI:
    """Test decisions endpoints - requires PostgreSQL + Qdrant."""

    @pytest.mark.asyncio
    async def test_list_decisions(self, client):
        response = await client.get("/api/v1/decisions?team_id=test_team")
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    @pytest.mark.asyncio
    async def test_challenge_decision(self, client):
        response = await client.post(
            "/api/v1/challenge",
            json={
                "question": "Why did we use Python?",
                "team_id": "test_team"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "challenge_id" in data
        assert "ai_analysis" in data


@pytest.mark.integration
class TestAnalyticsAPI:
    """Test analytics endpoints - requires PostgreSQL."""

    @pytest.mark.asyncio
    async def test_get_activities(self, client):
        response = await client.get("/api/v1/activities?user=test_user&team_id=test_team")
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    @pytest.mark.asyncio
    async def test_get_team_activities(self, client):
        response = await client.get("/api/v1/activities/team?team_id=test_team")
        assert response.status_code == 200
        assert isinstance(response.json(), list)
