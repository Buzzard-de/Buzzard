import json
import subprocess
import sys
from pathlib import Path

PACK_DIR = Path(__file__).resolve().parent

_runtime = None


def _get_runtime():
    global _runtime
    if _runtime is None:
        from buzzard_ai_complete.platform import build

        _runtime = build()
    return _runtime


def complete_init():
    ctx = _get_runtime()
    names = [a["name"] for a in ctx["agents"].list()]
    return f"Buzzard AI COMPLETE initialized: {', '.join(names)}"


def complete_agents():
    ctx = _get_runtime()
    lines = []
    for agent in ctx["agents"].list():
        lines.append(f"{agent['name']} | {agent['role']} | {agent['status']}")
    return "\n".join(lines) if lines else "No agents registered."


def complete_task(title, description, priority="NORMAL"):
    ctx = _get_runtime()
    task_id = ctx["aslan_bey"].delegate_research(title, description, priority)
    return f"Task created: {task_id}"


def complete_tasks():
    ctx = _get_runtime()
    return json.dumps(ctx["tasks"].list(), ensure_ascii=False, indent=2, default=str)


def complete_health():
    from buzzard_ai_complete.monitoring.health import health

    ctx = _get_runtime()
    return json.dumps(health(ctx["db"]), ensure_ascii=False, indent=2)


def complete_scan(text):
    ctx = _get_runtime()
    return json.dumps(ctx["esat_bey"].scan_text(text), ensure_ascii=False, indent=2)


def run_tests():
    result = subprocess.run(
        [sys.executable, "-m", "pytest", str(PACK_DIR / "tests"), "-q"],
        cwd=str(PACK_DIR.parent),
    )
    return result.returncode
