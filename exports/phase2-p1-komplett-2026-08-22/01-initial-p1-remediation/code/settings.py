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

# Phase 2 AI Core
BUZZARD_AI_CORE_V2 = os.getenv("BUZZARD_AI_CORE_V2", "false").lower() in {"1", "true", "yes", "on"}
_DEFAULT_TAXONOMY = ROOT / "master_taxonomy_48_maximal" / "data" / "taxonomy.json"
BUZZARD_MASTER_TAXONOMY_PATH = Path(
    os.getenv("BUZZARD_MASTER_TAXONOMY_PATH", str(_DEFAULT_TAXONOMY))
)
APPROVER_ROLES = frozenset(
    r.strip().lower()
    for r in os.getenv("BUZZARD_APPROVER_ROLES", "admin,operator,approver").split(",")
    if r.strip()
)
DEFAULT_API_ROLE = os.getenv("BUZZARD_DEFAULT_API_ROLE", "api-user").strip().lower()
ALLOW_ROLE_HEADER = os.getenv("BUZZARD_ALLOW_ROLE_HEADER", "false").lower() in {"1", "true", "yes", "on"}


def _parse_token_roles(raw: str) -> dict[str, str]:
    mapping: dict[str, str] = {}
    for part in raw.split(","):
        piece = part.strip()
        if not piece or ":" not in piece:
            continue
        token, role = piece.split(":", 1)
        token = token.strip()
        role = role.strip().lower()
        if token and role:
            mapping[token] = role
    return mapping


API_TOKEN_ROLES = _parse_token_roles(os.getenv("BUZZARD_API_TOKEN_ROLES", ""))
RATE_LIMIT_PER_MINUTE = int(os.getenv("BUZZARD_RATE_LIMIT_PER_MINUTE", "60"))
BUZZARD_WORKER_POLL_INTERVAL_SECONDS = int(os.getenv("BUZZARD_WORKER_POLL_INTERVAL_SECONDS", "30"))
