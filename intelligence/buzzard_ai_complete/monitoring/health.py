from pathlib import Path

from buzzard_ai_complete.config.settings import APP_VERSION, DB_PATH
from buzzard_ai_complete.database.db import connect


def health():
    with connect() as c:
        c.execute("SELECT 1").fetchone()

    payload = {
        "status": "ok",
        "version": APP_VERSION,
        "database": str(Path(DB_PATH).name),
    }

    try:
        from buzzard_ai_complete.runtime.bey_runtime import BeyRuntime

        bey = BeyRuntime().status()
        payload["bey_agents"] = {
            "started": bey["started"],
            "agent_count": bey["agent_count"],
            "agents": [agent["name"] for agent in bey["agents"]],
        }
    except Exception:
        payload["bey_agents"] = {"started": False, "agent_count": 0, "agents": []}

    return payload
