from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Database - MUST be set via environment variable
    database_url: str = ""

    # Redis - MUST be set via environment variable
    redis_url: str = ""

    # Qdrant
    qdrant_url: str = "http://localhost:6333"
    qdrant_api_key: str = ""

    # Ollama
    ollama_base_url: str = "http://localhost:11434"

    # LiteLLM - MUST be set via environment variable
    litellm_master_key: str = ""

    # Cloud APIs (optional)
    openai_api_key: str = ""
    groq_api_key: str = ""
    google_api_key: str = ""
    openrouter_api_key: str = ""

    # Slack
    slack_bot_token: str = ""
    slack_app_token: str = ""
    slack_signing_secret: str = ""

    # GitHub
    github_app_id: str = ""
    github_private_key: str = ""
    github_webhook_secret: str = ""

    # App
    log_level: str = "INFO"
    debug: bool = False
    secret_key: str = ""  # MUST be set via environment variable

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"


@lru_cache
def get_settings() -> Settings:
    return Settings()
