import json
import os
import sys
from pathlib import Path

MODULE_ROOT = Path(__file__).resolve().parents[2]
CONFIG = MODULE_ROOT / "config" / "integrations.production.json"


def run_preflight(env=None):
    env = env if env is not None else os.environ
    cfg = json.loads(CONFIG.read_text(encoding="utf-8"))
    required = ["APP_BASE_URL", "POSTGRES_DB", "POSTGRES_USER", "POSTGRES_PASSWORD"]
    missing = [name for name in required if not env.get(name)]
    if missing:
        return {"status": "missing_env", "missing": missing}
    if not cfg["deployment"]["https_required"]:
        return {"status": "warning", "message": "HTTPS requirement disabled"}
    return {"status": "ok", "message": "PREFLIGHT_OK"}


def main():
    result = run_preflight()
    if result["status"] == "missing_env":
        print("MISSING_ENV:", ",".join(result["missing"]))
        sys.exit(2)
    if result["status"] == "warning":
        print("WARNING:", result["message"])
    print(result.get("message", "PREFLIGHT_OK"))


if __name__ == "__main__":
    main()
