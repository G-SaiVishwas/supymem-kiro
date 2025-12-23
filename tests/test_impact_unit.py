"""
Unit Tests for Impact Services

Tests FileOwnershipTracker, ImpactAnalyzer, and NotificationService
with mocked database.
"""

import pytest
from unittest.mock import patch, AsyncMock, MagicMock


class TestFileOwnershipTracker:
    """Tests for the FileOwnershipTracker service."""

    @pytest.mark.asyncio
    async def test_get_file_owners(self):
        """Test getting owners for a file."""
        from tests.fixtures.mock_db import MockAsyncSession, MockResult
        
        mock_ownership = MagicMock()
        mock_ownership.user_identifier = "user123"
        mock_ownership.file_path = "src/main.py"
        mock_ownership.score = 100
        
        mock_session = MockAsyncSession()
        
        async def mock_execute(*args, **kwargs):
            return MockResult([mock_ownership])
        
        mock_session.execute = mock_execute
        
        with patch('src.services.impact.ownership.get_session') as mock_get_session:
            mock_get_session.return_value.__aenter__ = AsyncMock(return_value=mock_session)
            mock_get_session.return_value.__aexit__ = AsyncMock(return_value=None)
            
            from src.services.impact.ownership import FileOwnershipTracker
            tracker = FileOwnershipTracker()
            
            result = await tracker.get_file_owners("src/main.py", "team1")
            
            assert result is not None

    @pytest.mark.asyncio
    async def test_get_user_files(self):
        """Test getting files owned by a user."""
        from tests.fixtures.mock_db import MockAsyncSession, MockResult
        
        mock_files = [
            MagicMock(file_path="src/main.py", score=100),
            MagicMock(file_path="src/utils.py", score=50),
        ]
        
        mock_session = MockAsyncSession()
        
        async def mock_execute(*args, **kwargs):
            return MockResult(mock_files)
        
        mock_session.execute = mock_execute
        
        with patch('src.services.impact.ownership.get_session') as mock_get_session:
            mock_get_session.return_value.__aenter__ = AsyncMock(return_value=mock_session)
            mock_get_session.return_value.__aexit__ = AsyncMock(return_value=None)
            
            from src.services.impact.ownership import FileOwnershipTracker
            tracker = FileOwnershipTracker()
            
            result = await tracker.get_user_files("user123", "team1")
            
            assert isinstance(result, list)


class TestImpactAnalyzer:
    """Tests for the ImpactAnalyzer service."""

    @pytest.mark.asyncio
    async def test_analyzer_instantiates(self):
        """Test that analyzer can be instantiated."""
        from src.services.impact.analyzer import ImpactAnalyzer
        analyzer = ImpactAnalyzer()
        assert analyzer is not None

    @pytest.mark.asyncio
    async def test_analyze_methods_exist(self):
        """Test that analyze methods exist."""
        from src.services.impact.analyzer import ImpactAnalyzer
        analyzer = ImpactAnalyzer()
        assert hasattr(analyzer, 'analyze_commit')
        assert hasattr(analyzer, 'analyze_pr')
        assert hasattr(analyzer, 'analyze_files_changed')


class TestNotificationService:
    """Tests for the NotificationService."""

    @pytest.mark.asyncio
    async def test_get_user_notifications(self):
        """Test getting notifications for a user."""
        from tests.fixtures.mock_db import MockAsyncSession, MockResult
        
        mock_notifications = [
            MagicMock(id="n1", title="Test notification", is_read=False),
            MagicMock(id="n2", title="Another notification", is_read=True),
        ]
        
        mock_session = MockAsyncSession()
        
        async def mock_execute(*args, **kwargs):
            return MockResult(mock_notifications)
        
        mock_session.execute = mock_execute
        
        with patch('src.services.impact.notifications.get_session') as mock_get_session:
            mock_get_session.return_value.__aenter__ = AsyncMock(return_value=mock_session)
            mock_get_session.return_value.__aexit__ = AsyncMock(return_value=None)
            
            from src.services.impact.notifications import NotificationService
            service = NotificationService()
            
            result = await service.get_user_notifications("user123", "team1")
            
            assert isinstance(result, list)

    @pytest.mark.asyncio
    async def test_mark_notification_read(self):
        """Test marking a notification as read."""
        from tests.fixtures.mock_db import MockAsyncSession, MockResult
        
        mock_notification = MagicMock(id="n1", is_read=False)
        mock_session = MockAsyncSession()
        
        async def mock_execute(*args, **kwargs):
            return MockResult(mock_notification)
        
        mock_session.execute = mock_execute
        
        with patch('src.services.impact.notifications.get_session') as mock_get_session:
            mock_get_session.return_value.__aenter__ = AsyncMock(return_value=mock_session)
            mock_get_session.return_value.__aexit__ = AsyncMock(return_value=None)
            
            from src.services.impact.notifications import NotificationService
            service = NotificationService()
            
            result = await service.mark_as_read("n1")
            
            assert result is not None or mock_notification.is_read is True
