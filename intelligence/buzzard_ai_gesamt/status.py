from pathlib import Path

from buzzard_ai_gesamt.config.settings import APP_NAME, APP_VERSION, DB_PATH

GESAMT_DIR = Path(__file__).resolve().parent


def gesamt_status():
    roadmap = GESAMT_DIR / "docs" / "STATUS_AND_ROADMAP.md"
    lines = [
        "=== BUZZARD AI GESAMT — STATUS ===",
        "",
        f"Platform: {APP_NAME} v{APP_VERSION}",
        f"Unified DB: {DB_PATH}",
        "",
        "Implementiert (GESAMT Platform):",
        "- Doğu Bey Agent: research, memory, claims",
        "- Aslan Bey Agent: task orchestration, dispatch, dashboard",
        "- Esat Bey Agent: security events",
        "- Core: EventBus, AgentRegistry, TaskManager, MemoryStore",
        "- Database: buzzard.db (claims, sources, tasks, memory, events, agents)",
        "",
        "Parallel im Stack (v29/v1):",
        "- verify-*, dogubey-* → buzzard_intelligence/verify.py",
        "- aslan-* → buzzard_intelligence/aslan.py (v1 secretary)",
        "",
        "CLI: gesamt-init, gesamt-agents, gesamt-report, gesamt-dashboard,",
        "     gesamt-task, gesamt-dispatch, gesamt-test, gesamt-status",
        "",
    ]
    if roadmap.exists():
        lines.append(roadmap.read_text(encoding="utf-8"))
    else:
        lines.append("Roadmap-Dokument nicht gefunden.")
    return "\n".join(lines)
