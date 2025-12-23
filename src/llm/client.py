from typing import List, Dict, AsyncIterator, Optional
from openai import AsyncOpenAI
from src.config.settings import get_settings
from src.config.logging import get_logger

logger = get_logger(__name__)
settings = get_settings()


class LLMClient:
    def __init__(self):
        self.openai_client: Optional[AsyncOpenAI] = None
        self.groq_client: Optional[AsyncOpenAI] = None
        self.ollama_client: Optional[AsyncOpenAI] = None
        
        # Priority 1: OpenAI (if API key provided)
        if settings.openai_api_key:
            self.openai_client = AsyncOpenAI(
                api_key=settings.openai_api_key
            )
            logger.info("Using OpenAI as primary LLM")
        
        # Priority 2: Groq (if API key provided)
        if settings.groq_api_key:
            self.groq_client = AsyncOpenAI(
                base_url="https://api.groq.com/openai/v1",
                api_key=settings.groq_api_key
            )
            if not self.openai_client:
                logger.info("Using Groq as primary LLM")
        
        # Priority 3: Ollama (local, always available as fallback)
        self.ollama_client = AsyncOpenAI(
            base_url=f"{settings.ollama_base_url}/v1",
            api_key="ollama"
        )
        if not self.openai_client and not self.groq_client:
            logger.info("Using Ollama (local) as primary LLM")

    def _get_model_for_client(self, client_type: str, requested_model: str) -> str:
        """Get appropriate model name for each provider."""
        if client_type == "openai":
            # Map to OpenAI models
            return "gpt-4o-mini"  # Fast and cheap, good for most tasks
        elif client_type == "groq":
            return "llama-3.3-70b-versatile"
        else:  # ollama
            return requested_model  # Use requested model (llama3.2, etc.)

    async def complete(
        self,
        messages: List[Dict[str, str]],
        model: str = "llama3.2",
        temperature: float = 0.7,
        max_tokens: int = 2000
    ) -> str:
        """Generate completion with automatic fallback."""
        
        # Try OpenAI first (if configured)
        if self.openai_client:
            try:
                response = await self.openai_client.chat.completions.create(
                    model=self._get_model_for_client("openai", model),
                    messages=messages,
                    temperature=temperature,
                    max_tokens=max_tokens
                )
                return response.choices[0].message.content
            except Exception as e:
                logger.warning("OpenAI failed, trying fallback", error=str(e))
        
        # Try Groq second (if configured)
        if self.groq_client:
            try:
                response = await self.groq_client.chat.completions.create(
                    model=self._get_model_for_client("groq", model),
                    messages=messages,
                    temperature=temperature,
                    max_tokens=max_tokens
                )
                return response.choices[0].message.content
            except Exception as e:
                logger.warning("Groq failed, trying Ollama fallback", error=str(e))
        
        # Fallback to Ollama (local)
        try:
            response = await self.ollama_client.chat.completions.create(
                model=self._get_model_for_client("ollama", model),
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens
            )
            return response.choices[0].message.content
        except Exception as e:
            logger.error("All LLM providers failed", error=str(e))
            raise

    async def stream(
        self,
        messages: List[Dict[str, str]],
        model: str = "llama3.2"
    ) -> AsyncIterator[str]:
        """Stream completion tokens."""
        # Use primary client for streaming
        client = self.openai_client or self.groq_client or self.ollama_client
        stream_model = "gpt-4o-mini" if self.openai_client else (
            "llama-3.3-70b-versatile" if self.groq_client else model
        )
        
        stream = await client.chat.completions.create(
            model=stream_model,
            messages=messages,
            stream=True
        )

        async for chunk in stream:
            if chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content


llm_client = LLMClient()
