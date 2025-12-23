"""
Mock LLM Client for Unit Tests

Provides predictable LLM responses without requiring Ollama/OpenAI.
"""

from typing import List, Dict
import json


class MockLLMClient:
    """Mock LLM client that returns predictable responses."""
    
    def __init__(self):
        self.call_history = []
        self._response_overrides = {}
    
    def set_response(self, key: str, response: str):
        """Set a specific response for a key."""
        self._response_overrides[key] = response
    
    async def complete(
        self,
        messages: List[Dict[str, str]],
        model: str = "llama3.2",
        temperature: float = 0.7,
        max_tokens: int = 1000,
        **kwargs
    ) -> str:
        """Mock completion - returns structured responses based on content."""
        self.call_history.append({
            "messages": messages,
            "model": model,
            "temperature": temperature,
            "max_tokens": max_tokens,
        })
        
        # Check for override
        content = messages[-1].get("content", "") if messages else ""
        for key, response in self._response_overrides.items():
            if key.lower() in content.lower():
                return response
        
        # Default responses based on detected intent
        content_lower = content.lower()
        
        # Classification response
        if "classify" in content_lower or "category" in content_lower:
            return json.dumps({
                "category": "information",
                "confidence": 0.85,
                "reasoning": "Content appears to be informational."
            })
        
        # Decision extraction
        if "decision" in content_lower and "extract" in content_lower:
            return json.dumps([{
                "decision": "Use Python for the backend",
                "rationale": "Better async support and ecosystem",
                "context": "Backend technology decision",
                "confidence": 0.9
            }])
        
        # Action item extraction
        if "action" in content_lower and "extract" in content_lower:
            return json.dumps([{
                "action": "Review the PR",
                "assignee": "john",
                "deadline": "2024-01-15",
                "priority": "high"
            }])
        
        # Automation parsing
        if "automation" in content_lower or "rule" in content_lower:
            return json.dumps({
                "trigger": {
                    "type": "task_completed",
                    "conditions": {"task_type": "review"}
                },
                "actions": [{
                    "type": "send_notification",
                    "params": {"channel": "general", "message": "Task completed!"}
                }]
            })
        
        # Challenge/debate response
        if "challenge" in content_lower or "debate" in content_lower:
            return json.dumps({
                "analysis": "The decision was made based on performance requirements.",
                "alternatives": ["Could have used Node.js", "Go was also considered"],
                "recommendation": "The original decision appears sound.",
                "confidence": 0.8
            })
        
        # Default generic response
        return json.dumps({
            "response": "This is a mock LLM response.",
            "confidence": 0.7
        })
    
    async def embed(self, text: str) -> List[float]:
        """Mock embedding - returns fixed-dimension vector."""
        # Return a 384-dimension mock embedding
        import hashlib
        hash_val = int(hashlib.md5(text.encode()).hexdigest(), 16)
        return [(hash_val >> i) % 100 / 100.0 for i in range(384)]


# Singleton instance for easy patching
mock_llm_client = MockLLMClient()


def get_mock_llm_client():
    """Get the mock LLM client instance."""
    return mock_llm_client


def reset_mock_llm():
    """Reset the mock LLM client state."""
    mock_llm_client.call_history = []
    mock_llm_client._response_overrides = {}

