"""
Unit Tests for Classification Services

Tests ContentClassifier, DecisionExtractor, and ActionItemExtractor
with mocked LLM responses.
"""

import pytest
from unittest.mock import patch


class TestContentClassifier:
    """Tests for the ContentClassifier service."""

    @pytest.mark.asyncio
    async def test_classify_returns_result(self):
        """Test that classifier returns a valid result."""
        from tests.fixtures.mock_llm import MockLLMClient
        
        mock_client = MockLLMClient()
        
        with patch('src.services.classification.classifier.llm_client', mock_client):
            from src.services.classification.classifier import ContentClassifier
            classifier = ContentClassifier()
            
            result = await classifier.classify("We decided to use PostgreSQL for the database.")
            
            assert result is not None
            assert hasattr(result, 'category')

    @pytest.mark.asyncio
    async def test_classify_task_content(self):
        """Test classification of task-related content."""
        from tests.fixtures.mock_llm import MockLLMClient
        
        mock_client = MockLLMClient()
        
        with patch('src.services.classification.classifier.llm_client', mock_client):
            from src.services.classification.classifier import ContentClassifier
            classifier = ContentClassifier()
            
            result = await classifier.classify("TODO: Review the API documentation")
            
            assert result is not None
            assert hasattr(result, 'category')

    @pytest.mark.asyncio
    async def test_classify_handles_empty_content(self):
        """Test classifier handles empty content gracefully."""
        from tests.fixtures.mock_llm import MockLLMClient
        
        mock_client = MockLLMClient()
        
        with patch('src.services.classification.classifier.llm_client', mock_client):
            from src.services.classification.classifier import ContentClassifier
            classifier = ContentClassifier()
            
            result = await classifier.classify("")
            
            assert result is not None


class TestDecisionExtractor:
    """Tests for the DecisionExtractor service."""

    @pytest.mark.asyncio
    async def test_extractor_instantiates(self):
        """Test that decision extractor can be instantiated."""
        from src.services.classification.extractors import DecisionExtractor
        extractor = DecisionExtractor()
        assert extractor is not None

    @pytest.mark.asyncio
    async def test_extract_method_exists(self):
        """Test that extract method exists."""
        from src.services.classification.extractors import DecisionExtractor
        extractor = DecisionExtractor()
        assert hasattr(extractor, 'extract')
        assert callable(extractor.extract)


class TestActionItemExtractor:
    """Tests for the ActionItemExtractor service."""

    @pytest.mark.asyncio
    async def test_extractor_instantiates(self):
        """Test that action item extractor can be instantiated."""
        from src.services.classification.extractors import ActionItemExtractor
        extractor = ActionItemExtractor()
        assert extractor is not None

    @pytest.mark.asyncio
    async def test_extract_method_exists(self):
        """Test that extract method exists."""
        from src.services.classification.extractors import ActionItemExtractor
        extractor = ActionItemExtractor()
        assert hasattr(extractor, 'extract')
        assert callable(extractor.extract)
