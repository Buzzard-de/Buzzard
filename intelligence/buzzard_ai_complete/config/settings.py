import os
from dataclasses import dataclass
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
_DEFAULT_DB = ROOT / "database" / "buzzard_complete.db"
DB_DIR = _DEFAULT_DB.parent
DB_DIR.mkdir(parents=True, exist_ok=True)


@dataclass(frozen=True)
class Settings:
    database_path: str = os.getenv("BUZZARD_COMPLETE_DB", str(_DEFAULT_DB))
    api_token: str = os.getenv("BUZZARD_API_TOKEN", "")
    llm_api_key: str = os.getenv("LLM_API_KEY", "")
    llm_model: str = os.getenv("LLM_MODEL", "")
    search_api_key: str = os.getenv("SEARCH_API_KEY", "")
    search_provider: str = os.getenv("SEARCH_PROVIDER", "")
    app_env: str = os.getenv("APP_ENV", "development")


settings = Settings()
