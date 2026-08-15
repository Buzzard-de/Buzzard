from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DB_PATH = ROOT / "database" / "buzzard.db"
LOG_DIR = ROOT / "logs"
LOG_DIR.mkdir(exist_ok=True)
DB_PATH.parent.mkdir(exist_ok=True)

APP_NAME = "Buzzard AI"
APP_VERSION = "1.0.0"
DEFAULT_TASK_PRIORITY = "NORMAL"
