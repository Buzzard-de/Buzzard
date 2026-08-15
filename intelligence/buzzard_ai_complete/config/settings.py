import os
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
_DEFAULT_DB = ROOT / "database" / "buzzard_complete.db"
DB_PATH = Path(os.getenv("BUZZARD_COMPLETE_DB", os.getenv("BUZZARD_DB", str(_DEFAULT_DB))))
LOG_DIR = ROOT / "logs"
DATA_DIR = ROOT / "data"
LOG_DIR.mkdir(exist_ok=True)
DATA_DIR.mkdir(exist_ok=True)
DB_PATH.parent.mkdir(parents=True, exist_ok=True)

APP_NAME = "Buzzard AI COMPLETE"
APP_VERSION = "2.2.0"
API_TOKEN = os.getenv("BUZZARD_API_TOKEN", os.getenv("API_TOKEN", ""))
MAX_FETCH_BYTES = int(os.getenv("BUZZARD_MAX_FETCH_BYTES", "2000000"))
REQUEST_TIMEOUT = int(os.getenv("BUZZARD_REQUEST_TIMEOUT", "15"))
APP_ENV = os.getenv("APP_ENV", "development")
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{DB_PATH}")
LLM_API_KEY = os.getenv("LLM_API_KEY", "")
LLM_MODEL = os.getenv("LLM_MODEL", "")
SEARCH_ENDPOINT = os.getenv("SEARCH_ENDPOINT", "")
SEARCH_API_KEY = os.getenv("SEARCH_API_KEY", "")
