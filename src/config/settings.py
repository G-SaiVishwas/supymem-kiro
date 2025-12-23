from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Database
    database_url: str = "postgresql+asyncpg://supymem:supymem_secret_change_me@localhost:5432/supymem"

    # Redis
    redis_url: str = "redis://:redis_secret_change_me@localhost:6379/0"

    # Qdrant
    qdrant_url: str = "http://localhost:6333"
    qdrant_api_key: str = ""

    # Ollama
    ollama_base_url: str = "http://localhost:11434"

    # LiteLLM
    litellm_master_key: str = "sk-supymem"

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
    secret_key: str = "change-me"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"


@lru_cache
def get_settings() -> Settings:
    return Settings()
