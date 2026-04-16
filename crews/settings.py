from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file="../.env", extra="ignore")

    # --- LLM (Ollama Cloud, OpenAI-compatible) ---
    ollama_api_key: str
    ollama_base_url: str = "https://ollama.com/v1"
    ollama_model_heavy: str = "deepseek-v3.1:671b-cloud"
    ollama_model_mid: str = "gpt-oss:120b-cloud"
    ollama_model_light: str = "gpt-oss:20b-cloud"
    ollama_model_code: str = "qwen3-coder:480b-cloud"

    # --- Infra ---
    database_url: str = "postgresql://aic:changeme@localhost:5432/crewai"
    redis_url: str = "redis://:changeme@localhost:6379/1"

    # --- Business integrations ---
    hubspot_access_token: str | None = None
    slack_bot_token: str | None = None
    gmail_refresh_token: str | None = None

    # --- Observability ---
    langsmith_tracing: bool = True
    langsmith_api_key: str | None = None
    langsmith_project: str = "ai-company-prod"

    # --- Ops ---
    approval_slack_channel: str = "#ai-approvals"
    finance_approval_threshold_eur: float = 500.0


@lru_cache
def get_settings() -> Settings:
    return Settings()
