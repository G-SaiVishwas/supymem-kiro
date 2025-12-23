"""
Unit Tests for Automation Services

Tests NLCommandParser, AutomationRuleManager, ConditionMonitor, and ActionExecutor
with mocked dependencies.
"""

import pytest
from unittest.mock import patch, AsyncMock, MagicMock


class TestNLCommandParser:
    """Tests for the NLCommandParser service."""

    @pytest.mark.asyncio
    async def test_parser_instantiates(self):
        """Test that parser can be instantiated."""
        from src.services.automation.parser import NLCommandParser
        parser = NLCommandParser()
        assert parser is not None

    @pytest.mark.asyncio
    async def test_parse_method_exists(self):
        """Test that parse method exists."""
        from src.services.automation.parser import NLCommandParser
        parser = NLCommandParser()
        assert hasattr(parser, 'parse')
        assert callable(parser.parse)


class TestAutomationRuleManager:
    """Tests for the AutomationRuleManager service."""

    @pytest.mark.asyncio
    async def test_get_active_rules(self):
        """Test getting active automation rules."""
        from tests.fixtures.mock_db import MockAsyncSession, MockResult
        
        mock_rules = [
            MagicMock(id="r1", trigger_type="task_completed", is_active=True),
            MagicMock(id="r2", trigger_type="pr_merged", is_active=True),
        ]
        
        mock_session = MockAsyncSession()
        
        async def mock_execute(*args, **kwargs):
            return MockResult(mock_rules)
        
        mock_session.execute = mock_execute
        
        with patch('src.services.automation.rules.get_session') as mock_get_session:
            mock_get_session.return_value.__aenter__ = AsyncMock(return_value=mock_session)
            mock_get_session.return_value.__aexit__ = AsyncMock(return_value=None)
            
            from src.services.automation.rules import AutomationRuleManager
            manager = AutomationRuleManager()
            
            result = await manager.get_active_rules("team1")
            
            assert isinstance(result, list)

    @pytest.mark.asyncio
    async def test_list_rules(self):
        """Test listing all rules for a team."""
        from tests.fixtures.mock_db import MockAsyncSession, MockResult
        
        mock_rules = [
            MagicMock(id="r1", trigger_type="task_completed", is_active=True),
        ]
        
        mock_session = MockAsyncSession()
        
        async def mock_execute(*args, **kwargs):
            return MockResult(mock_rules)
        
        mock_session.execute = mock_execute
        
        with patch('src.services.automation.rules.get_session') as mock_get_session:
            mock_get_session.return_value.__aenter__ = AsyncMock(return_value=mock_session)
            mock_get_session.return_value.__aexit__ = AsyncMock(return_value=None)
            
            from src.services.automation.rules import AutomationRuleManager
            manager = AutomationRuleManager()
            
            result = await manager.list_rules("team1")
            
            assert isinstance(result, list)


class TestConditionMonitor:
    """Tests for the ConditionMonitor service."""

    @pytest.mark.asyncio
    async def test_monitor_instantiates(self):
        """Test that monitor can be instantiated."""
        from src.services.automation.monitor import ConditionMonitor
        monitor = ConditionMonitor()
        assert monitor is not None

    @pytest.mark.asyncio
    async def test_check_methods_exist(self):
        """Test that check methods exist."""
        from src.services.automation.monitor import ConditionMonitor
        monitor = ConditionMonitor()
        assert hasattr(monitor, 'check_task_completed')
        assert hasattr(monitor, 'check_pr_merged')


class TestActionExecutor:
    """Tests for the ActionExecutor service."""

    @pytest.mark.asyncio
    async def test_executor_instantiates(self):
        """Test that executor can be instantiated."""
        from src.services.automation.executor import ActionExecutor
        executor = ActionExecutor()
        assert executor is not None

    @pytest.mark.asyncio
    async def test_execute_method_exists(self):
        """Test that execute method exists."""
        from src.services.automation.executor import ActionExecutor
        executor = ActionExecutor()
        assert hasattr(executor, 'execute')
        assert callable(executor.execute)
