import os
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
_DEFAULT_DB = ROOT / "database" / "buzzard.db"
DB_PATH = Path(os.getenv("BUZZARD_DB", str(_DEFAULT_DB)))
LOG_DIR = ROOT / "logs"
LOG_DIR.mkdir(exist_ok=True)
DB_PATH.parent.mkdir(parents=True, exist_ok=True)

APP_NAME = "Buzzard AI"
APP_VERSION = "2.0.0"
API_TOKEN = os.getenv("BUZZARD_API_TOKEN", "")
MAX_FETCH_BYTES = int(os.getenv("BUZZARD_MAX_FETCH_BYTES", "2000000"))
REQUEST_TIMEOUT = int(os.getenv("BUZZARD_REQUEST_TIMEOUT", "15"))
DEFAULT_TASK_PRIORITY = "NORMAL"
