import json
import subprocess
import sys
from pathlib import Path

PACK_DIR = Path(__file__).resolve().parent


def bootstrap():
    from buzzard_ai_gesamt.core.registry import AgentRegistry
    from buzzard_ai_gesamt.database.db import init_db

    init_db()
    registry = AgentRegistry()
    registry.register("dogu_bey", "Uzman İstihbarat ve Araştırma AI")
    registry.register("aslan_bey", "Müsteşar / AI Operasyon ve İstihbarat Koordinatörü")
    registry.register("esat_bey", "AI Siber Güvenlik ve Savunma Uzmanı")


def gesamt_init():
    bootstrap()
    return "Buzzard AI GESAMT initialized."


def gesamt_agents():
    bootstrap()
    from buzzard_ai_gesamt.core.registry import AgentRegistry

    lines = []
    for agent in AgentRegistry().all():
        lines.append(f"{agent['name']} | {agent['role']} | {agent['status']}")
    return "\n".join(lines) if lines else "No agents registered."


def gesamt_report():
    bootstrap()
    from buzzard_ai_gesamt.reports.builder import ReportBuilder

    return ReportBuilder().build_executive()


def gesamt_dashboard():
    bootstrap()
    from buzzard_ai_gesamt.agents.aslan_bey import AslanBey

    return json.dumps(AslanBey().dashboard(), ensure_ascii=False, indent=2, default=str)


def gesamt_task(title, description, priority="NORMAL"):
    bootstrap()
    from buzzard_ai_gesamt.agents.aslan_bey import AslanBey

    task_id = AslanBey().create_research_task(title, description, priority)
    return f"Task created: {task_id}"


def gesamt_dispatch(task_id, url):
    bootstrap()
    from buzzard_ai_gesamt.agents.aslan_bey import AslanBey

    result = AslanBey().dispatch(task_id, url)
    return json.dumps(result, ensure_ascii=False, indent=2, default=str)


def run_tests():
    result = subprocess.run(
        [sys.executable, "-m", "pytest", str(PACK_DIR / "tests"), "-q"],
        cwd=str(PACK_DIR.parent),
    )
    return result.returncode
