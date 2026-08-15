from pathlib import Path

from buzzard_ai_complete.config.settings import APP_VERSION, DB_PATH
from buzzard_ai_complete.database.db import connect


def health():
    with connect() as c:
        c.execute("SELECT 1").fetchone()
    return {
        "status": "ok",
        "version": APP_VERSION,
        "database": str(Path(DB_PATH).name),
    }
