"""
Enhanced LLM client with caching and retry logic.
"""
from typing import List, Dict, Optional, AsyncIterator
import asyncio
from openai import AsyncOpenAI, APIError, RateLimitError, APITimeoutError

from src.config.settings import get_settings
from src.config.logging import get_logger
from src.cache.advanced_cache import cache

logger = get_logger(__name__)
settings = get_settings()


class EnhancedLLMClient:
    """Enhanced LLM client with advanced features."""
    
    def __init__(self):
        self.openai_client: Optional[AsyncOpenAI] = None
        self.groq_client: Optional[AsyncOpenAI] = None
        self.ollama_client: Optional[AsyncOpenAI] = None
        
        # Initialize clients
        if settings.openai_api_key:
            self.openai_client = AsyncOpenAI(api_key=settings.openai_api_key)
            logger.info("OpenAI client initialized")
        
        if settings.groq_api_key:
            self.groq_client = AsyncOpenAI(
                base_url="https://api.groq.com/openai/v1",
                api_key=settings.groq_api_key
            )
            logger.info("Groq client initialized")
        
        self.ollama_client = AsyncOpenAI(
            base_url=f"{settings.ollama_base_url}/v1",
            api_key="ollama"
        )
        logger.info("Ollama client initialized")
    
    def _get_model_for_client(self, client_type: str, requested_model: str) -> str:
        """Get appropriate model name for each provider."""
        if client_type == "openai":
            return "gpt-4o-mini"
        elif client_type == "groq":
            return "llama-3.3-70b-versatile"
        else:
            return requested_model
    
    def _get_cache_key(self, messages: List[Dict[str, str]], model: str, temperature: float) -> str:
        """Generate cache key for request."""
        import hashlib
        content = f"{model}:{temperature}:{str(messages)}"
        return f"llm:{hashlib.md5(content.encode()).hexdigest()}"
    
    async def _retry_with_backoff(
        self,
        func,
        max_retries: int = 3,
        base_delay: float = 1.0
    ):
        """Retry function with exponential backoff."""
        for attempt in range(max_retries):
            try:
                return await func()
            except (RateLimitError, APITimeoutError) as e:
                if attempt == max_retries - 1:
                    raise
                delay = base_delay * (2 ** attempt)
                logger.warning(
                    "LLM request failed, retrying",
                    attempt=attempt + 1,
                    delay=delay,
                    error=str(e)
                )
                await asyncio.sleep(delay)
            except APIError as e:
                logger.error("LLM API error", error=str(e))
                raise
    
    async def complete(
        self,
        messages: List[Dict[str, str]],
        model: str = "llama3.2",
        temperature: float = 0.7,
        max_tokens: int = 2000,
        use_cache: bool = True,
        stream: bool = False
    ) -> str:
        """
        Generate completion with caching and retry logic.
        
        Args:
            messages: List of message dicts
            model: Model name
            temperature: Sampling temperature
            max_tokens: Max tokens to generate
            use_cache: Whether to use response caching
            stream: Whether to stream response
        """
        # Check cache first
        if use_cache and not stream:
            cache_key = self._get_cache_key(messages, model, temperature)
            cached_response = await cache.get(cache_key)
            if cached_response:
                logger.debug("LLM cache hit", model=model)
                return cached_response
        
        # Try providers in order
        response = None
        used_model = model
        
        if self.openai_client:
            try:
                used_model = self._get_model_for_client("openai", model)
                response = await self._retry_with_backoff(
                    lambda: self.openai_client.chat.completions.create(
                        model=used_model,
                        messages=messages,
                        temperature=temperature,
                        max_tokens=max_tokens
                    )
                )
            except Exception as e:
                logger.warning("OpenAI failed", error=str(e))
        
        if not response and self.groq_client:
            try:
                used_model = self._get_model_for_client("groq", model)
                response = await self._retry_with_backoff(
                    lambda: self.groq_client.chat.completions.create(
                        model=used_model,
                        messages=messages,
                        temperature=temperature,
                        max_tokens=max_tokens
                    )
                )
            except Exception as e:
                logger.warning("Groq failed", error=str(e))
        
        if not response:
            try:
                used_model = self._get_model_for_client("ollama", model)
                response = await self._retry_with_backoff(
                    lambda: self.ollama_client.chat.completions.create(
                        model=used_model,
                        messages=messages,
                        temperature=temperature,
                        max_tokens=max_tokens
                    )
                )
            except Exception as e:
                logger.error("All LLM providers failed", error=str(e))
                raise
        
        # Extract response
        content = response.choices[0].message.content
        
        logger.info("LLM completion", model=used_model)
        
        # Cache response
        if use_cache:
            cache_key = self._get_cache_key(messages, model, temperature)
            await cache.set(cache_key, content, ttl=3600)  # 1 hour
        
        return content
    
    async def stream_complete(
        self,
        messages: List[Dict[str, str]],
        model: str = "llama3.2",
        temperature: float = 0.7
    ) -> AsyncIterator[str]:
        """Stream completion tokens."""
        client = self.openai_client or self.groq_client or self.ollama_client
        used_model = self._get_model_for_client(
            "openai" if self.openai_client else ("groq" if self.groq_client else "ollama"),
            model
        )
        
        stream = await client.chat.completions.create(
            model=used_model,
            messages=messages,
            temperature=temperature,
            stream=True
        )
        
        async for chunk in stream:
            if chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content


# Global instance
enhanced_llm_client = EnhancedLLMClient()
