from dataclasses import dataclass

from buzzard_ai_complete.config import settings as cfg


@dataclass(frozen=True)
class Settings:
    app_env: str = cfg.APP_ENV
    database_url: str = cfg.DATABASE_URL
    llm_api_key: str = cfg.LLM_API_KEY
    llm_model: str = cfg.LLM_MODEL
    search_endpoint: str = cfg.SEARCH_ENDPOINT
    search_api_key: str = cfg.SEARCH_API_KEY
    api_token: str = cfg.API_TOKEN


settings = Settings()
