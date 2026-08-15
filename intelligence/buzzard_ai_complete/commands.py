import json
import subprocess
import sys
from pathlib import Path

PACK_DIR = Path(__file__).resolve().parent


def bootstrap():
    from buzzard_ai_complete.core.registry import AgentRegistry
    from buzzard_ai_complete.database.db import init_db

    init_db()
    registry = AgentRegistry()
    registry.register("dogu_bey", "Uzman İstihbarat ve Araştırma AI")
    registry.register("aslan_bey", "Müsteşar / AI Operasyon ve İstihbarat Koordinatörü")
    registry.register("esat_bey", "AI Siber Güvenlik ve Savunma Uzmanı")


def complete_init():
    bootstrap()
    return "Buzzard AI COMPLETE vNext initialized."


def complete_agents():
    bootstrap()
    from buzzard_ai_complete.core.registry import AgentRegistry

    lines = []
    for agent in AgentRegistry().all():
        lines.append(f"{agent['name']} | {agent['role']} | {agent['status']}")
    return "\n".join(lines) if lines else "No agents registered."


def complete_task(title, description, priority="NORMAL"):
    bootstrap()
    from buzzard_ai_complete.agents.aslan_bey import AslanBey

    task_id = AslanBey().create_research_task(title, description, priority)
    return f"Task created: {task_id}"


def complete_dispatch(task_id, url):
    bootstrap()
    from buzzard_ai_complete.agents.aslan_bey import AslanBey

    result = AslanBey().dispatch(task_id, url)
    return json.dumps(result, ensure_ascii=False, indent=2, default=str)


def complete_tasks():
    bootstrap()
    from buzzard_ai_complete.tasks.manager import TaskManager

    return json.dumps(TaskManager().list(), ensure_ascii=False, indent=2, default=str)


def complete_dashboard():
    bootstrap()
    from buzzard_ai_complete.agents.aslan_bey import AslanBey

    return json.dumps(AslanBey().dashboard(), ensure_ascii=False, indent=2, default=str)


def complete_report():
    bootstrap()
    from buzzard_ai_complete.reports.builder import ReportBuilder

    return ReportBuilder().build_executive()


def complete_health():
    bootstrap()
    from buzzard_ai_complete.monitoring.health import health

    return json.dumps(health(), ensure_ascii=False, indent=2)


def complete_ai_status():
    bootstrap()
    from buzzard_ai_complete.ai.provider import AIProvider

    return json.dumps(AIProvider().status(), ensure_ascii=False, indent=2)


def complete_scan(text):
    bootstrap()
    from buzzard_ai_complete.agents.esat_bey import EsatBey

    return json.dumps(EsatBey().scan_text(text), ensure_ascii=False, indent=2)


def complete_policy(action):
    from buzzard_ai_complete.core.policies import BuzzardPolicy

    decision = BuzzardPolicy().decide(action)
    return json.dumps(
        {"action": action, "allowed": decision.allowed, "reason": decision.reason},
        ensure_ascii=False,
        indent=2,
    )


def complete_metrics():
    from buzzard_ai_complete.monitoring.metrics import metrics

    return json.dumps(metrics.snapshot(), ensure_ascii=False, indent=2)


def complete_orchestrate(task_id, objective, priority="NORMAL"):
    bootstrap()
    from buzzard_ai_complete.core.orchestrator import BuzzardOrchestrator

    result = BuzzardOrchestrator().run(task_id, objective, priority)
    payload = {
        "task_id": result["task"].task_id,
        "status": result["task"].status,
        "subtasks": result["task"].subtasks,
        "research": result.get("research"),
        "task_record": result.get("task_record"),
    }
    return json.dumps(payload, ensure_ascii=False, indent=2, default=str)


def _read_doc(name):
    path = PACK_DIR / "docs" / name
    if path.exists():
        return path.read_text(encoding="utf-8")
    return f"Dokument nicht gefunden: {name}"


def complete_tree():
    return _read_doc("COMPLETE_ARCHITECTURE_TREE.md")


def complete_inventory():
    return _read_doc("PROJECT_INVENTORY.md")


def complete_verify():
    result = subprocess.run(
        [sys.executable, str(PACK_DIR / "scripts" / "verify_project.py")],
        cwd=str(PACK_DIR.parent),
        capture_output=True,
        text=True,
    )
    output = (result.stdout or "") + (result.stderr or "")
    if result.returncode != 0:
        raise RuntimeError(output.strip() or f"verify_project exited with {result.returncode}")
    return output.strip()


def run_tests():
    result = subprocess.run(
        [sys.executable, "-m", "pytest", str(PACK_DIR / "tests"), "-q"],
        cwd=str(PACK_DIR.parent),
    )
    return result.returncode
