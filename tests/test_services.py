"""
Service Unit Tests

Tests the core services.
"""

import pytest


class TestClassificationService:
    """Test the classification service."""

    @pytest.mark.asyncio
    async def test_classifier_import(self):
        """Test that classifier can be imported."""
        from src.services.classification import classifier, ContentClassifier
        assert classifier is not None
        assert isinstance(classifier, ContentClassifier)

    @pytest.mark.asyncio
    async def test_decision_extractor_import(self):
        """Test that decision extractor can be imported."""
        from src.services.classification import decision_extractor, DecisionExtractor
        assert decision_extractor is not None
        assert isinstance(decision_extractor, DecisionExtractor)

    @pytest.mark.asyncio
    async def test_action_extractor_import(self):
        """Test that action extractor can be imported."""
        from src.services.classification import action_extractor, ActionItemExtractor
        assert action_extractor is not None
        assert isinstance(action_extractor, ActionItemExtractor)


class TestImpactServices:
    """Test the impact services."""

    @pytest.mark.asyncio
    async def test_ownership_tracker_import(self):
        """Test that ownership tracker can be imported."""
        from src.services.impact import ownership_tracker, FileOwnershipTracker
        assert ownership_tracker is not None
        assert isinstance(ownership_tracker, FileOwnershipTracker)

    @pytest.mark.asyncio
    async def test_impact_analyzer_import(self):
        """Test that impact analyzer can be imported."""
        from src.services.impact import impact_analyzer, ImpactAnalyzer
        assert impact_analyzer is not None
        assert isinstance(impact_analyzer, ImpactAnalyzer)

    @pytest.mark.asyncio
    async def test_notification_service_import(self):
        """Test that notification service can be imported."""
        from src.services.impact import notification_service, NotificationService
        assert notification_service is not None
        assert isinstance(notification_service, NotificationService)


class TestAutomationServices:
    """Test the automation services."""

    @pytest.mark.asyncio
    async def test_nl_parser_import(self):
        """Test that NL parser can be imported."""
        from src.services.automation import nl_parser, NLCommandParser
        assert nl_parser is not None
        assert isinstance(nl_parser, NLCommandParser)

    @pytest.mark.asyncio
    async def test_rule_manager_import(self):
        """Test that rule manager can be imported."""
        from src.services.automation import rule_manager, AutomationRuleManager
        assert rule_manager is not None
        assert isinstance(rule_manager, AutomationRuleManager)

    @pytest.mark.asyncio
    async def test_condition_monitor_import(self):
        """Test that condition monitor can be imported."""
        from src.services.automation import condition_monitor, ConditionMonitor
        assert condition_monitor is not None
        assert isinstance(condition_monitor, ConditionMonitor)

    @pytest.mark.asyncio
    async def test_action_executor_import(self):
        """Test that action executor can be imported."""
        from src.services.automation import action_executor, ActionExecutor
        assert action_executor is not None
        assert isinstance(action_executor, ActionExecutor)


class TestAnalyticsServices:
    """Test the analytics services."""

    @pytest.mark.asyncio
    async def test_activity_tracker_import(self):
        """Test that activity tracker can be imported."""
        from src.services.analytics import activity_tracker, ActivityTracker
        assert activity_tracker is not None
        assert isinstance(activity_tracker, ActivityTracker)

    @pytest.mark.asyncio
    async def test_productivity_analytics_import(self):
        """Test that productivity analytics can be imported."""
        from src.services.analytics import productivity_analytics, ProductivityAnalytics
        assert productivity_analytics is not None
        assert isinstance(productivity_analytics, ProductivityAnalytics)


class TestDebateService:
    """Test the debate/challenge service."""

    @pytest.mark.asyncio
    async def test_challenge_service_import(self):
        """Test that challenge service can be imported."""
        from src.services.debate import challenge_service, ChallengeService
        assert challenge_service is not None
        assert isinstance(challenge_service, ChallengeService)


class TestDatabaseModels:
    """Test database models."""

    def test_models_import(self):
        """Test that all models can be imported."""
        from src.database.models import (
            Base,
            User,
            Team,
            KnowledgeEntry,
            Decision,
            Task,
            AutomationRule,
        )
        
        assert Base is not None
        assert User is not None
        assert Team is not None
        assert KnowledgeEntry is not None
        assert Decision is not None
        assert Task is not None
        assert AutomationRule is not None

    def test_enums_import(self):
        """Test that enums can be imported."""
        from src.database.models import (
            ContentCategory,
            TaskStatus,
            NotificationType,
        )
        
        assert ContentCategory.TASK.value == "task"
        assert TaskStatus.PENDING.value == "pending"
        assert NotificationType.CHANGE_IMPACT.value == "change_impact"
