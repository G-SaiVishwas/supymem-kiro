"""
Unit Tests for Analytics and Debate Services

Tests ActivityTracker, ProductivityAnalytics, and ChallengeService
with mocked dependencies.
"""

import pytest
from unittest.mock import patch, AsyncMock, MagicMock


class TestActivityTracker:
    """Tests for the ActivityTracker service."""

    @pytest.mark.asyncio
    async def test_track_activity(self):
        """Test tracking a user activity."""
        from tests.fixtures.mock_db import MockAsyncSession
        
        mock_session = MockAsyncSession()
        
        with patch('src.services.analytics.activity.get_session') as mock_get_session:
            mock_get_session.return_value.__aenter__ = AsyncMock(return_value=mock_session)
            mock_get_session.return_value.__aexit__ = AsyncMock(return_value=None)
            
            from src.services.analytics.activity import ActivityTracker
            tracker = ActivityTracker()
            
            result = await tracker.track(
                user_identifier="user123",
                team_id="team1",
                activity_type="commit",
                title="Fixed bug in auth",
                description="Fixed login issue",
                source="github",
                source_id="abc123"
            )
            
            assert len(mock_session._pending_adds) > 0 or len(mock_session._committed) > 0 or result is not None

    @pytest.mark.asyncio
    async def test_get_user_activities(self):
        """Test getting activities for a user."""
        from tests.fixtures.mock_db import MockAsyncSession, MockResult
        
        mock_activities = [
            MagicMock(id="a1", activity_type="commit", title="Commit 1"),
            MagicMock(id="a2", activity_type="pr_review", title="Review 1"),
        ]
        
        mock_session = MockAsyncSession()
        
        async def mock_execute(*args, **kwargs):
            return MockResult(mock_activities)
        
        mock_session.execute = mock_execute
        
        with patch('src.services.analytics.activity.get_session') as mock_get_session:
            mock_get_session.return_value.__aenter__ = AsyncMock(return_value=mock_session)
            mock_get_session.return_value.__aexit__ = AsyncMock(return_value=None)
            
            from src.services.analytics.activity import ActivityTracker
            tracker = ActivityTracker()
            
            result = await tracker.get_user_activities("user123", "team1", limit=10)
            
            assert isinstance(result, list)

    @pytest.mark.asyncio
    async def test_get_team_activities(self):
        """Test getting activities for a team."""
        from tests.fixtures.mock_db import MockAsyncSession, MockResult
        
        mock_activities = [
            MagicMock(id="a1", user_identifier="user1", activity_type="commit"),
            MagicMock(id="a2", user_identifier="user2", activity_type="task_completed"),
        ]
        
        mock_session = MockAsyncSession()
        
        async def mock_execute(*args, **kwargs):
            return MockResult(mock_activities)
        
        mock_session.execute = mock_execute
        
        with patch('src.services.analytics.activity.get_session') as mock_get_session:
            mock_get_session.return_value.__aenter__ = AsyncMock(return_value=mock_session)
            mock_get_session.return_value.__aexit__ = AsyncMock(return_value=None)
            
            from src.services.analytics.activity import ActivityTracker
            tracker = ActivityTracker()
            
            result = await tracker.get_team_activities("team1", limit=50)
            
            assert isinstance(result, list)


class TestProductivityAnalytics:
    """Tests for the ProductivityAnalytics service."""

    @pytest.mark.asyncio
    async def test_analytics_instantiates(self):
        """Test that analytics can be instantiated."""
        from src.services.analytics.productivity import ProductivityAnalytics
        analytics = ProductivityAnalytics()
        assert analytics is not None

    @pytest.mark.asyncio
    async def test_productivity_methods_exist(self):
        """Test that productivity methods exist."""
        from src.services.analytics.productivity import ProductivityAnalytics
        analytics = ProductivityAnalytics()
        assert hasattr(analytics, 'get_user_productivity')
        assert hasattr(analytics, 'get_team_productivity')


class TestChallengeService:
    """Tests for the ChallengeService (Debate)."""

    @pytest.mark.asyncio
    async def test_service_instantiates(self):
        """Test that challenge service can be instantiated."""
        from src.services.debate.challenger import ChallengeService
        service = ChallengeService()
        assert service is not None

    @pytest.mark.asyncio
    async def test_challenge_method_exists(self):
        """Test that challenge method exists."""
        from src.services.debate.challenger import ChallengeService
        service = ChallengeService()
        assert hasattr(service, 'challenge')
        assert callable(service.challenge)

    @pytest.mark.asyncio
    async def test_get_decision_history(self):
        """Test getting decision history."""
        from tests.fixtures.mock_db import MockAsyncSession, MockResult
        
        mock_decisions = [
            MagicMock(id="d1", content="Use PostgreSQL"),
            MagicMock(id="d2", content="Use React"),
        ]
        
        mock_session = MockAsyncSession()
        
        async def mock_execute(*args, **kwargs):
            return MockResult(mock_decisions)
        
        mock_session.execute = mock_execute
        
        with patch('src.services.debate.challenger.get_session') as mock_get_session:
            mock_get_session.return_value.__aenter__ = AsyncMock(return_value=mock_session)
            mock_get_session.return_value.__aexit__ = AsyncMock(return_value=None)
            
            from src.services.debate.challenger import ChallengeService
            service = ChallengeService()
            
            result = await service.get_decision_history("team1")
            
            assert isinstance(result, list)
